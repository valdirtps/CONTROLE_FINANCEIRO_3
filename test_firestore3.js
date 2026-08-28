const { initializeApp } = require('firebase/app');
const { initializeFirestore, getFirestore } = require('firebase/firestore');

const app = initializeApp({ projectId: 'test' });
console.log("Init 1");
initializeFirestore(app, { experimentalForceLongPolling: true }, 'testdb');
console.log("Init 2");
try {
  initializeFirestore(app, { experimentalForceLongPolling: true }, 'testdb');
  console.log("Success 2");
} catch(e) {
  console.log("Error 2:", e);
}
