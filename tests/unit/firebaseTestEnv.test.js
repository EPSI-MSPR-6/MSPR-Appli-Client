const admin = require('firebase-admin');
const { setupFirebaseTestEnv, teardownFirebaseTestEnv } = require('../firebaseTestEnv');

jest.mock('firebase-admin', () => {
    const firestore = {
        listCollections: jest.fn().mockResolvedValue([]),
    };
    return {
        initializeApp: jest.fn(),
        credential: {
            cert: jest.fn(),
        },
        firestore: jest.fn(() => firestore),
        apps: [],
    };
});

describe('Configuration et Nettoyage de Firebase', () => {
    beforeEach(() => {
        admin.initializeApp.mockClear();
        admin.apps = [];
    });

    test('Initialiser Firebase si non initialisé', async () => {
        await setupFirebaseTestEnv();
        expect(admin.initializeApp).toHaveBeenCalledTimes(1);
    });

    test('Ne pas réinitialiser Firebase si déjà initialisé', async () => {
        admin.apps = [{}];
        await setupFirebaseTestEnv();
        expect(admin.initializeApp).not.toHaveBeenCalled();
    });

    test('Nettoyage des collections pendant la configuration', async () => {
        const mockCollection = {
            get: jest.fn().mockResolvedValue({
                forEach: jest.fn(callback => callback({ ref: { delete: jest.fn() } })),
            }),
        };
        admin.firestore().listCollections.mockResolvedValue([mockCollection]);

        await setupFirebaseTestEnv();
        expect(mockCollection.get).toHaveBeenCalledTimes(1);
    });

    test('Nettoyage des collections pendant après les tests', async () => {
        const mockCollection = {
            get: jest.fn().mockResolvedValue({
                forEach: jest.fn(callback => callback({ ref: { delete: jest.fn() } })),
            }),
        };
        admin.firestore().listCollections.mockResolvedValue([mockCollection]);

        await teardownFirebaseTestEnv();
        expect(mockCollection.get).toHaveBeenCalledTimes(1);
    });
});
