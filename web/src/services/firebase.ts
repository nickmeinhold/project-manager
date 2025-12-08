import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyA30tVSjp3Pzaaf4dRexu9HtZYpcKbefXI",
  authDomain: "project-manager-9ed58.firebaseapp.com",
  projectId: "project-manager-9ed58",
  storageBucket: "project-manager-9ed58.firebasestorage.app",
  messagingSenderId: "695574562874",
  appId: "1:695574562874:web:69bc8faaf4809e472a8d03"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Cloud Messaging (optional, may fail in some environments)
let messaging: any = null;
try {
  messaging = getMessaging(app);
} catch (error) {
  console.warn('Firebase Messaging not available:', error);
}

export { messaging };

// Request notification permission and get FCM token
export const requestNotificationPermission = async (): Promise<string | null> => {
  if (!messaging) {
    console.warn('Messaging not initialized');
    return null;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'YOUR_VAPID_KEY' // You'll need to generate this in Firebase Console
      });
      console.log('FCM Token:', token);
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = () =>
  new Promise((resolve, reject) => {
    if (!messaging) {
      reject(new Error('Messaging not initialized'));
      return;
    }
    onMessage(messaging, (payload) => {
      console.log('Message received:', payload);
      resolve(payload);
    });
  });

export default app;
