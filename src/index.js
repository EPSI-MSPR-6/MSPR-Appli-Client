const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const customerRoutes = require('./routes/customers.js');
const app = express();
const port = 8082;

app.use(bodyParser.json());
app.use('/customers', customerRoutes);

app.get('/', (req, res) => {
    res.send('Bienvenue');
});

app.post('/', (req, res) => {
    res.status(405).send('Méthode non autorisée');
});

app.listen(port, () => {
    console.log(`L'API Clients est exécutée à partir du port ${port}`);
});
