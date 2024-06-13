const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nameRegex = /^[a-zA-Z\s'-]+$/;
const addressRegex = /^[a-zA-Z0-9\s,'-]+$/;
const cityRegex = /^[a-zA-Z\s'-]+$/;
const postalCodeRegex = /^\d{5}(-\d{4})?$/;
const countryRegex = /^[a-zA-Z\s'-]+$/;
const allowedFields = ['nom', 'adresse', 'ville', 'code_postal', 'pays', 'email'];

const validateFields = (fields, isCreate) => {
    const { email, nom, adresse, ville, code_postal, pays } = fields;

    if (isCreate && !email) {
        return 'Le champ email est obligatoire.';
    }
    if (email && (typeof email !== 'string' || !emailRegex.test(email))) {
        return 'Le champ email doit être une adresse email valide.';
    }
    if (nom && !nameRegex.test(nom)) {
        return 'Le champ nom contient des caractères invalides.';
    }
    if (adresse && !addressRegex.test(adresse)) {
        return 'Le champ adresse contient des caractères invalides.';
    }
    if (ville && !cityRegex.test(ville)) {
        return 'Le champ ville contient des caractères invalides.';
    }
    if (code_postal && !postalCodeRegex.test(code_postal)) {
        return 'Le champ code postal doit être un code postal valide.';
    }
    if (pays && !countryRegex.test(pays)) {
        return 'Le champ pays contient des caractères invalides.';
    }

    const keys = Object.keys(fields);
    const invalidKeys = keys.filter(key => !allowedFields.includes(key));
    if (invalidKeys.length > 0) {
        return `Les champs suivants ne sont pas autorisés : ${invalidKeys.join(', ')}`;
    }

    return null;
};

const validateCreateCustomer = (req, res, next) => {
    const error = validateFields(req.body, true);
    if (error) {
        return res.status(400).send(error);
    }
    next();
};

const validateUpdateCustomer = (req, res, next) => {
    if (req.body.id_client) {
        return res.status(400).send("Le champ id_client ne peut pas être modifié.");
    }
    const error = validateFields(req.body, false);
    if (error) {
        return res.status(400).send(error);
    }
    next();
};

const checkApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === process.env.API_KEY) {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Invalid API Key' });
    }
};


module.exports = {
    validateCreateCustomer,
    validateUpdateCustomer,
    checkApiKey
};
