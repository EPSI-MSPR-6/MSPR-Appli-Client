const express = require('express');
const router = express.Router();
const db = require('../firebase');

const allowedFields = ['nom', 'adresse', 'ville', 'code_postal', 'pays', 'email'];

const validateCreateCustomer = (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).send('Le champ email est obligatoire.');
    }
    if (typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).send('Le champ email doit être une adresse email valide.');
    }

    const keys = Object.keys(req.body);
    const invalidKeys = keys.filter(key => !allowedFields.includes(key));
    if (invalidKeys.length > 0) {
        return res.status(400).send(`Les champs suivants ne sont pas autorisés : ${invalidKeys.join(', ')}`);
    }
    next();
};

// Middleware pour valider les champs du client lors de la mise à jour
const validateUpdateCustomer = (req, res, next) => {
    const { email } = req.body;

    if (req.body.id_client) {
        return res.status(400).send("Le champ id_client ne peut pas être modifié.");
    }
    if (email && (typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email))) {
        return res.status(400).send('Le champ email doit être une adresse email valide.');
    }

    const keys = Object.keys(req.body);
    const invalidKeys = keys.filter(key => !allowedFields.includes(key));

    if (invalidKeys.length > 0) {
        return res.status(400).send(`Les champs suivants ne sont pas autorisés : ${invalidKeys.join(', ')}`);
    }
    next();
};

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
router.post('/', validateCreateCustomer, async (req, res) => {
    try {
        const newCustomer = req.body;
        const docRef = await db.collection('customers').add(newCustomer);
        res.status(201).send('Client créé avec son ID : ' + docRef.id);
    } catch (error) {
        res.status(500).send('Erreur lors de la création du client : ' + error.message);
    }
});

// Met à jour un client
router.put('/:id', validateUpdateCustomer, async (req, res) => {
    try {
        const customerDoc = await db.collection('customers').doc(req.params.id).get();
        if (!customerDoc.exists) {
            res.status(404).send('Client non trouvé');
        } else {
            const updatedCustomer = req.body;
            await db.collection('customers').doc(req.params.id).set(updatedCustomer, { merge: true });
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
            res.status(200).send('Client supprimé');
        }
    } catch (error) {
        res.status(500).send('Erreur lors de la suppression du client : ' + error.message);
    }
});

module.exports = router;
