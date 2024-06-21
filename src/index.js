const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const customerRoutes = require('./routes/customers.js');
const app = express();
const port = 8080;

const swaggerPath = path.join(__dirname, 'swagger.json');
const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));

app.use(bodyParser.json());
app.use('/customers', customerRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
    res.send('Bienvenue sur l\'API Clients');
});

app.listen(port, () => {
    console.log(`L'API Clients est exécutée à partir du port ${port}`);
});
