const express = require('express');
const router = express.Router();
const db = require('../firebase.js');
const { validateCreateCustomer, validateUpdateCustomer, checkApiKey } = require('../services/middlewares.js');
const { publishMessage } = require('../services/pubsub.js');

router.get('/', checkApiKey, async (req, res) => {
    try {
        const customersSnapshot = await db.collection('customers').get();
        const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(customers);
    } catch (error) {
        res.status(500).send('Erreur lors de la récupération des clients : ' + error.message);
    }
});

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

router.post('/', validateCreateCustomer, async (req, res) => {
    try {
        const newCustomer = req.body;
        const docRef = await db.collection('customers').add(newCustomer);
        res.status(201).send('Client créé avec son ID : ' + docRef.id);
    } catch (error) {
        res.status(500).send('Erreur lors de la création du client : ' + error.message);
    }
});

router.put('/:id', validateUpdateCustomer, async (req, res) => {
    try {
        const customerDoc = await db.collection('customers').doc(req.params.id).get();
        if (!customerDoc.exists) {
            res.status(404).send('Client non trouvé');
            return;
        }
        
        const updatedCustomer = req.body;
        
        await db.collection('customers').doc(req.params.id).set(updatedCustomer, { merge: true });
        res.status(200).send('Client mis à jour');
    } catch (error) {
        res.status(500).send('Erreur lors de la mise à jour du client : ' + error.message);
    }
});

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
