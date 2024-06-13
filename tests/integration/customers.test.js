const request = require('supertest');
const express = require('express');
const customersRouter = require('../../src/routes/customers.js');
const db = require('../../src/firebase.js');
const { setupFirebaseTestEnv, teardownFirebaseTestEnv } = require('../firebaseTestEnv.js');
const { publishMessage } = require('../../src/services/pubsub.js');

jest.mock('../../src/services/pubsub.js', () => ({
    publishMessage: jest.fn()
}));

const ApiKey = process.env.API_KEY

const app = express();
app.use(express.json());
app.use('/customers', customersRouter);

describe('Customers API', () => {
    beforeAll(async () => {
        await setupFirebaseTestEnv();
    });
    
    afterAll(async () => {
        await teardownFirebaseTestEnv();
    });

    let customerId;

    const getCustomersWithApiKey = async (apiKey = ApiKey) => {
        return await request(app)
            .get('/customers')
            .set('x-api-key', apiKey);
    };

    const createCustomer = async (customerData) => {
        return await request(app)
            .post('/customers')
            .send(customerData);
    };

    const updateCustomer = async (id, customerData) => {
        return await request(app)
            .put(`/customers/${id}`)
            .send(customerData);
    };

    const deleteCustomer = async (id) => {
        return await request(app)
            .delete(`/customers/${id}`);
    };
 
    const verifyClientPubSub = async (clientId) => {
        const message = Buffer.from(JSON.stringify({ action: 'VERIF_CLIENT', clientId })).toString('base64');
        return await request(app)
            .post('/customers/pubsub')
            .send({ message: { data: message } });
    };

    describe('ClientAPI', () => {
        test('Création Client', async () => {
            const response = await createCustomer({ nom: 'Test', email: 'jesuis.untest@exemple.com' });

            expect(response.status).toBe(201);
            expect(response.text).toMatch(/Client créé avec son ID : /);

            // Extrait l'ID du Client pour les futurs tests
            customerId = response.text.split('Client créé avec son ID : ')[1];
        });

        test('Récupération de tous les clients', async () => {
            const response = await getCustomersWithApiKey();
            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBeGreaterThan(0);
        });

        test('Récuparation Client via ID', async () => {
            const response = await request(app).get(`/customers/${customerId}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id', customerId);
        });

        test('Mis à jour Client', async () => {
            const response = await updateCustomer(customerId, { nom: 'Test-Deux', email: 'jesuis.untest2@exemple.com' });

            expect(response.status).toBe(200);
            expect(response.text).toBe('Client mis à jour');
        });

        test('Pub/Sub - VERIF_CLIENT - Client Existe', async () => {
            const response = await verifyClientPubSub(customerId);
            expect(response.status).toBe(200);
            expect(response.text).toBe('Client vérifié');
        });

        test('Suppression Client', async () => {
            const response = await deleteCustomer(customerId);
            expect(response.status).toBe(200);
            expect(response.text).toBe('Client supprimé');
        });
    });


    describe('Tests Pub/Sub', () => {
        test('Pub/Sub - VERIF_CLIENT - Client Inexistant', async () => {
            const invalidClientId = 'nonexistent-client-id';
            publishMessage.mockResolvedValueOnce();

            const response = await verifyClientPubSub(invalidClientId);
            expect(response.status).toBe(200);
            expect(response.text).toBe('Action de suppression publiée');
            expect(publishMessage).toHaveBeenCalledWith('client-actions', {
                action: 'DELETE_CLIENT',
                clientId: invalidClientId,
                message: 'Client account deletion'
            });
        });

        test('Pub/Sub - Action Inconnue', async () => {
            const message = {
                message: {
                    data: Buffer.from(JSON.stringify({ action: 'UNKNOWN_ACTION' })).toString('base64')
                }
            };

            const response = await request(app)
                .post('/customers/pubsub')
                .send(message);
            expect(response.status).toBe(400);
            expect(response.text).toBe('Action non reconnue');
        });

        test('Pub/Sub - Echec ( Format non valide )', async () => {
            const message = {
                message: {}
            };

            const response = await request(app)
                .post('/customers/pubsub')
                .send(message);
            expect(response.status).toBe(400);
            expect(response.text).toBe('Format de message non valide');
        });

        test('Pub/Sub - VERIF_CLIENT - Echec ( Test 500 )', async () => {
            const message = {
                message: {
                    data: Buffer.from(JSON.stringify({
                        action: 'VERIF_CLIENT',
                        clientId: 'nonExistentClient'
                    })).toString('base64')
                }
            };
    
            jest.spyOn(db, 'collection').mockImplementationOnce(() => {
                return {
                    doc: jest.fn().mockReturnThis(),
                    get: jest.fn().mockRejectedValue(new Error('Test error'))
                };
            });
    
            const response = await request(app)
                .post('/customers/pubsub')
                .send(message);
            expect(response.status).toBe(500);
            expect(response.text).toMatch(/Erreur lors de la vérification du client : /);
        });
    });


    describe('Tests403', () => {
        test('Erreur_403_GetCustomers', async () => {
            const invalidApiKey = 'invalid-api-key';
            const response = await getCustomersWithApiKey(invalidApiKey);
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('message', 'Forbidden: Invalid API Key');
        });
    });

    describe('Tests404', () => {
        const invalidCustomerId = 'test';

        test('Erreur_404_GetClients', async () => {
            const response = await request(app).get(`/customers/${invalidCustomerId}`);
            expect(response.status).toBe(404);
            expect(response.text).toBe('Client non trouvé');
        });

        test('Erreur_404_UpdateClient', async () => {
            const response = await updateCustomer(invalidCustomerId, { nom: 'ValeurTest' });
            expect(response.status).toBe(404);
            expect(response.text).toMatch(/Client non trouvé/);
        });

        test('Erreur_404_DeleteClient', async () => {
            const response = await deleteCustomer(invalidCustomerId);
            expect(response.status).toBe(404);
            expect(response.text).toMatch(/Client non trouvé/);
        });
    });

    describe('Tests400', () => {
        test('Erreur_400_CreateCustomer_XEmail', async () => {
            const response = await createCustomer({ nom: 'Test' }); 

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ email est obligatoire.');
        });

        test('Erreur_400_CreateCustomer_ValidEMail', async () => {
            const response = await createCustomer({ nom: 'Test', email: 'invalid-email' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ email doit être une adresse email valide.');
        });

        test('Erreur_400_CreateCustomer_ValidParams', async () => {
            const response = await createCustomer({ email: 'abc.def@gmail.com', name: 'ABCDEF' }); 

            expect(response.status).toBe(400);
            expect(response.text).toBe('Les champs suivants ne sont pas autorisés : name');
        });

        test('Erreur_400_UpdateCustomer_EditID', async () => {
            const response = await updateCustomer(customerId, { id_client: 'newId', nom: 'Test 2', email: 'jesuis.untest2@exemple.com' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ id_client ne peut pas être modifié.');
        });

        test('Erreur_400_UpdateCustomer_ValidEmail', async () => {
            const response = await updateCustomer(customerId, { email: 'test' }); 

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ email doit être une adresse email valide.');
        });

        test('Erreur_400_UpdateCustomer_ValidParams', async () => {
            const response = await updateCustomer(customerId, { e_mail: 'test' }); 

            expect(response.status).toBe(400);
            expect(response.text).toBe('Les champs suivants ne sont pas autorisés : e_mail');
        });

        // Tests Regex pour création et mise à jour
        test('Erreur_400_CreateCustomer_InvalidName', async () => {
            const response = await createCustomer({ nom: 'Invalid@Name', email: 'jesuis.untest@exemple.com' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ nom contient des caractères invalides.');
        });

        test('Erreur_400_CreateCustomer_InvalidAddress', async () => {
            const response = await createCustomer({ nom: 'Test', email: 'jesuis.untest@exemple.com', adresse: '123 Main St. @' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ adresse contient des caractères invalides.');
        });

        test('Erreur_400_CreateCustomer_InvalidCity', async () => {
            const response = await createCustomer({ nom: 'Test', email: 'jesuis.untest@exemple.com', ville: 'C1ty' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ ville contient des caractères invalides.');
        });

        test('Erreur_400_CreateCustomer_InvalidPostalCode', async () => {
            const response = await createCustomer({ nom: 'Test', email: 'jesuis.untest@exemple.com', code_postal: 'ABCDE' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ code postal doit être un code postal valide.');
        });

        test('Erreur_400_CreateCustomer_InvalidCountry', async () => {
            const response = await createCustomer({ nom: 'Test', email: 'jesuis.untest@exemple.com', pays: 'Fr@nc3' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ pays contient des caractères invalides.');
        });

        test('Erreur_400_UpdateCustomer_InvalidName', async () => {
            const response = await updateCustomer(customerId, { nom: 'Invalid@Name' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ nom contient des caractères invalides.');
        });

        test('Erreur_400_UpdateCustomer_InvalidAddress', async () => {
            const response = await updateCustomer(customerId, { adresse: '123 Main St. @' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ adresse contient des caractères invalides.');
        });

        test('Erreur_400_UpdateCustomer_InvalidCity', async () => {
            const response = await updateCustomer(customerId, { ville: 'C1ty' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ ville contient des caractères invalides.');
        });

        test('Erreur_400_UpdateCustomer_InvalidPostalCode', async () => {
            const response = await updateCustomer(customerId, { code_postal: 'ABCDE' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ code postal doit être un code postal valide.');
        });

        test('Erreur_400_UpdateCustomer_InvalidCountry', async () => {
            const response = await updateCustomer(customerId, { pays: 'Fr@nc3' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ pays contient des caractères invalides.');
        });
    });

    describe('Tests500', () => {
        test('Erreur_500_GetClients', async () => {
            jest.spyOn(db, 'collection').mockImplementation(() => { throw new Error(); });
            const response = await getCustomersWithApiKey();
            expect(response.status).toBe(500);
            expect(response.text).toMatch(/Erreur lors de la récupération des clients : /);
        });

        test('Erreur_500_GetClientByID', async () => {
            jest.spyOn(db, 'collection').mockImplementation(() => { throw new Error(); });
            const response = await request(app).get('/customers/test');
            expect(response.status).toBe(500);
            expect(response.text).toMatch(/Erreur lors de la récupération du client par ID : /);
        });

        test('Erreur_500_CreateClient', async () => {
            jest.spyOn(db, 'collection').mockImplementation(() => { throw new Error(); });
            const response = await createCustomer({ nom: 'Test', email: 'jesuis.untest@exemple.com' });
            expect(response.status).toBe(500);
            expect(response.text).toMatch(/Erreur lors de la création du client : /);
        });

        test('Erreur_500_UpdateClient', async () => {
            jest.spyOn(db, 'collection').mockImplementation(() => { throw new Error(); });
            const response = await updateCustomer('test', { nom: 'ValeurTest' });
            expect(response.status).toBe(500);
            expect(response.text).toMatch(/Erreur lors de la mise à jour du client : /);
        });

        test('Erreur_500_DeleteClient', async () => {
            jest.spyOn(db, 'collection').mockImplementation(() => { throw new Error(); });
            const response = await deleteCustomer('test');
            expect(response.status).toBe(500);
            expect(response.text).toMatch(/Erreur lors de la suppression du client : /);
        });
    });
});
