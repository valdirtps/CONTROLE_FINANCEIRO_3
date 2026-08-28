const { initializeApp } = require('firebase/app');
const { initializeFirestore, getFirestore } = require('firebase/firestore');

const app = initializeApp({ projectId: 'test' });
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, 'testdb');
console.log(db);
