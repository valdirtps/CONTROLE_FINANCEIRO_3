const { initializeApp } = require('firebase/app');
const { initializeFirestore, getFirestore } = require('firebase/firestore');

const app = initializeApp({ projectId: 'test' });
try {
  initializeFirestore(app, { experimentalForceLongPolling: true }, 'testdb');
  console.log("Success with experimentalForceLongPolling");
} catch(e) {
  console.log("Error:", e.message);
}
