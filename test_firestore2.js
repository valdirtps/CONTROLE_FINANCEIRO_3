const { initializeApp } = require('firebase/app');
const { initializeFirestore, getFirestore } = require('firebase/firestore');

const app = initializeApp({ projectId: 'test' });
initializeFirestore(app, { experimentalForceLongPolling: true }, 'testdb');
try {
  initializeFirestore(app, { experimentalForceLongPolling: true }, 'testdb');
} catch(e) {
  console.log("Error:", e.message);
}
