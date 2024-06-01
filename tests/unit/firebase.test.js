const db = require('../../src/firebase');

test('Firestore should be initialized',() => {
    expect(db).toBeDefined();
});
