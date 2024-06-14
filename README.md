
# API Clients NodeJS

## Description
Répositoire git d'une des trois API indépendantes (Clients) permettant de gérer les clients.

## Prérequis

- Node.js (version 14 ou supérieure)
- npm (version 6 ou supérieure)

## Installation

1. Clonez ce dépôt :

   ```bash
   git clone https://github.com/EPSI-MSPR-6/MSPR-Appli-Client.git
   cd MSPR-Appli-Client
   ```

2. Installez les dépendances :

   ```bash
   npm install
   ```

3. Créez un fichier `.env` et `.env.test` à la racine du projet et ajoutez les variables d'environnement communiquées

4. Démarrez le serveur :

   ```bash
   npm start
   ```
L'API sera accessible à l'adresse `http://localhost:8080` ( ou modifiez le port utilisé dans index.js s'il est déjà utilisé ).

5. Démarrez les tests grâce à jest :

   ```bash
   npm test
   ```

## Objectif de l'API

L'objectif de cette API est de gérer les informations des clients, y compris la création, la lecture, la mise à jour et la suppression des données des clients.

## Endpoints de l'API

| Méthode | Endpoint                  | Description                                 |
|---------|---------------------------|---------------------------------------------|
| POST    | /customers                | Crée un nouveau client                      |
| GET     | /customers                | Récupère une liste de clients               |
| GET     | /customers/{id}           | Récupère un client par son identifiant      |
| GET     | /customers/{id}/orders    | Récupère la liste des commandes du client   |
| PUT     | /customers/{id}           | Met à jour une fiche client                 |
| DELETE  | /customers/{id}           | Supprime une fiche client                   |
| POST    | /customers/pubsub         | Lecture PubSub + Fonctions                  |
