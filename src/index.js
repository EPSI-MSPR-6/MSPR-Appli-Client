const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
require('dotenv').config();
const customerRoutes = require('./routes/customers.js');
const app = express();
const port = 8081;

const swaggerDocument = JSON.parse(fs.readFileSync('./src/swagger.json', 'utf8'));

app.use(cors());
app.use(bodyParser.json());
app.use('/customers', customerRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
    res.send('Bienvenue sur l\'API Clients');
});

app.listen(port, () => {
    console.log(`L'API Clients est exécutée à partir du port ${port}`);
});
