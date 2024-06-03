const express = require('express');
const router = express.Router();
const db = require('../firebase');
const { publishMessage } = require('../services/pubsub');

const PUBSUB_URL = process.env.PUBSUB_URL;

// Récupération des clients
router.get('/', async (req, res) => {
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

// Création d'un client
router.post('/', async (req, res) => {
    try {
        const newCustomer = req.body;
        const docRef = await db.collection('customers').add(newCustomer);
        await publishMessage(PUBSUB_URL, { action: 'create', id: docRef.id, data: newCustomer });
        res.status(201).send('Client créé avec son ID : ' + docRef.id);
    } catch (error) {
        res.status(500).send('Erreur lors de la création du client : ' + error.message);
    }
});

// Met à jour un client
router.put('/:id', async (req, res) => {
    try {
        const customerDoc = await db.collection('customers').doc(req.params.id).get();
        if (!customerDoc.exists) {
            res.status(404).send('Client non trouvé');
        } else {
            const updatedCustomer = req.body;
            await db.collection('customers').doc(req.params.id).set(updatedCustomer, { merge: true });
            await publishMessage(PUBSUB_URL, { action: 'update', id: req.params.id, data: updatedCustomer });
            res.status(200).send('Client mis à jour');
        }
    } catch (error) {
        res.status(500).send('Erreur lors de la mise à jour du client : ' + error.message);
    }
});

// Supprime un client
router.delete('/:id', async (req, res) => {
    try {
        const customerDoc = await db.collection('customers').doc(req.params.id).get();
        if (!customerDoc.exists) {
            res.status(404).send('Client non trouvé');
        } else {
            await db.collection('customers').doc(req.params.id).delete();
            await publishMessage(PUBSUB_URL, { action: 'delete', id: req.params.id });
            res.status(200).send('Client supprimé');
        }
    } catch (error) {
        res.status(500).send('Erreur lors de la suppression du client : ' + error.message);
    }
});

module.exports = router;
