const express = require('express');
const router = express.Router();
const db = require('../firebase.js');
const { validateCreateCustomer, validateUpdateCustomer, checkApiKey } = require('../services/middlewares.js');
const { publishMessage, subscribeMessage } = require('../services/pubsub.js');

// Fonction Vérification Mail Unique
const checkDuplicateEmail = async (email, customerId = null) => {
    try {
        let query = db.collection('customers').where('email', '==', email);
        const customersSnapshot = await query.get();
        if (!customersSnapshot.empty) {
            if (customerId) {
                return customersSnapshot.docs.some(doc => doc.id !== customerId);
            }
            return true;
        }
        return false;
    } catch (error) {
        throw new Error('Erreur lors de la vérification des doublons d\'email : ' + error.message);
    }
};

// Création d'un Client
router.post('/', validateCreateCustomer, async (req, res) => {
    try {
        const newCustomer = req.body;

        const isDuplicate = await checkDuplicateEmail(newCustomer.email);
        if (isDuplicate) {
            return res.status(400).send('Un client avec cet email existe déjà.');
        }

        const docRef = await db.collection('customers').add(newCustomer);
        res.status(201).send('Client créé avec son ID : ' + docRef.id);
    } catch (error) {
        res.status(500).send('Erreur lors de la création du client : ' + error.message);
    }
});

// Récupération de la liste des clients
router.get('/', checkApiKey, async (req, res) => {
    try {
        const customersSnapshot = await db.collection('customers').get();
        const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(customers);
    } catch (error) {
        res.status(500).send('Erreur lors de la récupération des clients : ' + error.message);
    }
});

// Récupération d'un client via son ID
router.get('/:id', async (req, res) => {
    try {
        const customerDoc = await db.collection('customers').doc(req.params.id).get();
        if (!customerDoc.exists) {
            res.status(404).send('Client non trouvé');
        } else {
            res.status(200).json({ id: customerDoc.id, ...customerDoc.data() });
        }
    } catch (error) {
        res.status(500).send('Erreur lors de la récupération du client par ID : ' + error.message);
    }
});

// Récupération de la liste des commandes d'un client
router.get('/:id/orders', async (req, res) => {
    try {
        const clientId = req.params.id;
        const customerDoc = await db.collection('customers').doc(clientId).get();
        if (!customerDoc.exists) {
            return res.status(400).send('Le client n\'existe pas');
        }

        await publishMessage('client-getting-orders-actions', {
            action: 'GET_ORDERS_BY_CLIENT',
            clientId: clientId,
            message: 'Get orders for client'
        });

        subscribeMessage('projects/mspr-payetonkawa-58875/subscriptions/my-orders', async (message) => {

            const data = Buffer.from(message.data, 'base64').toString();
            const parsedData = JSON.parse(data);

            if (parsedData.clientId === clientId && parsedData.action === 'ORDERS_BY_CLIENT') {
                res.status(200).json(parsedData.orders);
            }
        });
    } catch (error) {
        res.status(500).send('Erreur lors de la récupération des commandes du client : ' + error.message);
    }
});

// Mis à jour d'un client 
router.put('/:id', validateUpdateCustomer, async (req, res) => {
    try {
        const customerDoc = await db.collection('customers').doc(req.params.id).get();
        if (!customerDoc.exists) {
            res.status(404).send('Client non trouvé');
            return;
        }
        
        const updatedCustomer = req.body;
        
        const isDuplicate = await checkDuplicateEmail(updatedCustomer.email, req.params.id);
        if (isDuplicate) {
            return res.status(400).send('Un client avec cet email existe déjà.');
        }

        await db.collection('customers').doc(req.params.id).set(updatedCustomer, { merge: true });
        res.status(200).send('Client mis à jour');
    } catch (error) {
        res.status(500).send('Erreur lors de la mise à jour du client : ' + error.message);
    }
});

// Suppression d'un client
router.delete('/:id', async (req, res) => {
    try {
        const customerDoc = await db.collection('customers').doc(req.params.id).get();
        if (!customerDoc.exists) {
            res.status(404).send('Client non trouvé');
        } else {
            await db.collection('customers').doc(req.params.id).delete();

            // Publication Message Pub/Sub
            await publishMessage('client-actions', {
                action: 'DELETE_CLIENT',
                clientId: req.params.id,
                message: 'Client account deletion'
            });

            res.status(200).send('Client supprimé');
        }
    } catch (error) {
        res.status(500).send('Erreur lors de la suppression du client : ' + error.message);
    }
});

// Récupération des messages Pubsubs ( Abonnement Push )
router.post('/pubsub', async (req, res) => {
    try {
        const message = req.body.message;

        if (!message || !message.data) {
            return res.status(400).send('Format de message non valide');
        }

        const data = Buffer.from(message.data, 'base64').toString();
        const parsedData = JSON.parse(data);

        if (parsedData.action === 'VERIF_CLIENT') {
            const clientId = parsedData.clientId;
            const customerDoc = await db.collection('customers').doc(clientId).get();

            if (!customerDoc.exists) {
                await publishMessage('client-actions', {
                    action: 'DELETE_CLIENT',
                    clientId: clientId,
                    message: 'Client account deletion'
                });
                return res.status(200).send('Action de suppression publiée');
            } else {
                return res.status(200).send('Client vérifié');
            }
        } else {
            return res.status(400).send('Action non reconnue');
        }
    } catch (error) {
        return res.status(500).send('Erreur lors de la vérification du client : ' + error.message);
    }
});

module.exports = router;