const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const customerRoutes = require('./routes/customers.js');
const app = express()
const port = 8080


app.use(bodyParser.json());
app.use('/customers', customerRoutes);

app.listen(port, () => {
    console.log(`L'API Clients est exécutée à partir du port ${port}`);
});