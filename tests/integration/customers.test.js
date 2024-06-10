const request = require('supertest');
const express = require('express');
const customersRouter = require('../../src/routes/customers.js');
const db = require('../../src/firebase.js');
const { setupFirebaseTestEnv, teardownFirebaseTestEnv } = require('../firebaseTestEnv.js');

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

    describe('ClientAPI', () => {
        test('Création Client', async () => {
            const response = await request(app)
                .post('/customers')
                .send({ nom: 'Test', email: 'jesuis.untest@exemple.com' });

            expect(response.status).toBe(201);
            expect(response.text).toMatch(/Client créé avec son ID : /);

            // Extrait l'ID du Client pour les futurs tests
            customerId = response.text.split('Client créé avec son ID : ')[1];
        });

        test('Récupération de tous les clients', async () => {
            const response = await request(app).get('/customers');
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
            const response = await request(app)
                .put(`/customers/${customerId}`)
                .send({ nom: 'Test-Deux', email: 'jesuis.untest2@exemple.com' });

            expect(response.status).toBe(200);
            expect(response.text).toBe('Client mis à jour');
        });

        test('Suppression Client', async () => {
            const response = await request(app).delete(`/customers/${customerId}`);
            expect(response.status).toBe(200);
            expect(response.text).toBe('Client supprimé');
        });
    });

    describe('Tests404', () => {
        test('Erreur_404_GetClients', async () => {
            const response = await request(app).get('/customers/test');
            expect(response.status).toBe(404);
            expect(response.text).toBe('Client non trouvé');
        });

        test('Erreur_404_UpdateClient', async () => {
            const response = await request(app)
                .put('/customers/test')
                .send({ nom: 'ValeurTest' });

            expect(response.status).toBe(404);
            expect(response.text).toMatch(/Client non trouvé/);
        });

        test('Erreur_404_DeleteClient', async () => {
            const response = await request(app).delete('/customers/test');
            expect(response.status).toBe(404);
            expect(response.text).toMatch(/Client non trouvé/);
        });
    });

    describe('Tests400', () => {
        test('Erreur_400_CreateCustomer_XEmail', async () => {
            const response = await request(app)
                .post('/customers')
                .send({ nom: 'Test' }); 

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ email est obligatoire.');
        });

        test('Erreur_400_CreateCustomer_ValidEMail', async () => {
            const response = await request(app)
                .post('/customers')
                .send({ nom: 'Test', email: 'invalid-email' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ email doit être une adresse email valide.');
        });

        test('Erreur_400_CreateCustomer_ValidParams', async () => {
            const response = await request(app)
                .post(`/customers`)
                .send({ email: 'abc.def@gmail.com', name: 'ABCDEF' }); 

            expect(response.status).toBe(400);
            expect(response.text).toBe('Les champs suivants ne sont pas autorisés : name');
        });

        test('Erreur_400_UpdateCustomer_EditID', async () => {
            const response = await request(app)
                .put(`/customers/${customerId}`)
                .send({ id_client: 'newId', nom: 'Test 2', email: 'jesuis.untest2@exemple.com' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ id_client ne peut pas être modifié.');
        });

        test('Erreur_400_UpdateCustomer_ValidEmail', async () => {
            const response = await request(app)
                .put(`/customers/${customerId}`)
                .send({ email: 'test' }); 

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ email doit être une adresse email valide.');
        });

        test('Erreur_400_UpdateCustomer_ValidParams', async () => {
            const response = await request(app)
                .put(`/customers/${customerId}`)
                .send({ e_mail: 'test' }); 

            expect(response.status).toBe(400);
            expect(response.text).toBe('Les champs suivants ne sont pas autorisés : e_mail');
        });

        // Tests Regex pour création et mise à jour
        test('Erreur_400_CreateCustomer_InvalidName', async () => {
            const response = await request(app)
                .post('/customers')
                .send({ nom: 'Invalid@Name', email: 'jesuis.untest@exemple.com' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ nom contient des caractères invalides.');
        });

        test('Erreur_400_CreateCustomer_InvalidAddress', async () => {
            const response = await request(app)
                .post('/customers')
                .send({ nom: 'Test', email: 'jesuis.untest@exemple.com', adresse: '123 Main St. @' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ adresse contient des caractères invalides.');
        });

        test('Erreur_400_CreateCustomer_InvalidCity', async () => {
            const response = await request(app)
                .post('/customers')
                .send({ nom: 'Test', email: 'jesuis.untest@exemple.com', ville: 'C1ty' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ ville contient des caractères invalides.');
        });

        test('Erreur_400_CreateCustomer_InvalidPostalCode', async () => {
            const response = await request(app)
                .post('/customers')
                .send({ nom: 'Test', email: 'jesuis.untest@exemple.com', code_postal: 'ABCDE' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ code postal doit être un code postal valide.');
        });

        test('Erreur_400_CreateCustomer_InvalidCountry', async () => {
            const response = await request(app)
                .post('/customers')
                .send({ nom: 'Test', email: 'jesuis.untest@exemple.com', pays: 'Fr@nc3' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ pays contient des caractères invalides.');
        });

        test('Erreur_400_UpdateCustomer_InvalidName', async () => {
            const response = await request(app)
                .put(`/customers/${customerId}`)
                .send({ nom: 'Invalid@Name' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ nom contient des caractères invalides.');
        });

        test('Erreur_400_UpdateCustomer_InvalidAddress', async () => {
            const response = await request(app)
                .put(`/customers/${customerId}`)
                .send({ adresse: '123 Main St. @' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ adresse contient des caractères invalides.');
        });

        test('Erreur_400_UpdateCustomer_InvalidCity', async () => {
            const response = await request(app)
                .put(`/customers/${customerId}`)
                .send({ ville: 'C1ty' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ ville contient des caractères invalides.');
        });

        test('Erreur_400_UpdateCustomer_InvalidPostalCode', async () => {
            const response = await request(app)
                .put(`/customers/${customerId}`)
                .send({ code_postal: 'ABCDE' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ code postal doit être un code postal valide.');
        });

        test('Erreur_400_UpdateCustomer_InvalidCountry', async () => {
            const response = await request(app)
                .put(`/customers/${customerId}`)
                .send({ pays: 'Fr@nc3' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Le champ pays contient des caractères invalides.');
        });
    });

    describe('Tests500', () => {
        test('Erreur_500_GetClients', async () => {
            db.collection = function(){throw new Error()}
            const response = await request(app).get('/customers');
            expect(response.status).toBe(500);
            expect(response.text).toMatch(/Erreur lors de la récupération des clients : /);
        });

        test('Erreur_500_GetClientByID', async () => {
            const response = await request(app).get('/customers/test');
            expect(response.status).toBe(500);
            expect(response.text).toMatch(/Erreur lors de la récupération du client par ID : /);
        });

        test('Erreur_500_CreateClient', async () => {
            const response = await request(app)
                .post('/customers')
                .send({ nom: 'Test', email: 'jesuis.untest@exemple.com' });

            expect(response.status).toBe(500);
            expect(response.text).toMatch(/Erreur lors de la création du client : /);
        });

        test('Erreur_500_UpdateClient', async () => {
            const response = await request(app)
                .put('/customers/test')
                .send({ nom: 'ValeurTest' });

            expect(response.status).toBe(500);
            expect(response.text).toMatch(/Erreur lors de la mise à jour du client : /);
        });

        test('Erreur_500_DeleteClient', async () => {
            const response = await request(app).delete('/customers/test');
            expect(response.status).toBe(500);
            expect(response.text).toMatch(/Erreur lors de la suppression du client : /);
        });
    });
});
