
// Scripts for Firebase v9+
self.importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js');
self.importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyABreq9YVCdK7k_t6bShsigK8Rmiiz5Um0",
  authDomain: "pharmastackx-a3beb.firebaseapp.com",
  projectId: "pharmastackx-a3beb",
  storageBucket: "pharmastackx-a3beb.appspot.com",
  messagingSenderId: "438683670037",
  appId: "1:438683670037:web:1424ea0ad070281c5de01c",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );

  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png',
    data: {
        // This is the important part: we're passing the URL from the
        // remote payload to the notification's data object.
        url: payload.data.url
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);

  // This is the new code to broadcast a message to the app
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    if (windowClients && windowClients.length) {
      windowClients.forEach((client) => {
        client.postMessage({
          type: 'NEW_DISPATCH_REQUEST'
        });
      });
    }
  });

  // By returning a promise, we keep the service worker alive until the message is sent.
  return promiseChain;
});

// This is the new event listener for notification clicks.
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click Received.', event.notification);

  // Close the notification when it's clicked.
  event.notification.close();

  // This looks for the url we passed in the data object.
  const urlToOpen = event.notification.data.url || '/';

  // This will open the URL in a new window/tab.
  // If a window with that URL is already open, it will focus that window.
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((clientList) => {
    let client = null;

    for (let i = 0; i < clientList.length; i++) {
      if (clientList[i].url === urlToOpen) {
        client = clientList[i];
        break;
      }
    }

    if (client) {
      return client.focus();
    } else {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});

// ** THE NEW, PROACTIVE FIX IS HERE **
// This event fires when the push subscription token changes.
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription has changed. Attempting to re-sync with server.');

  event.waitUntil(
    handleTokenRefresh()
  );
});

async function handleTokenRefresh() {
    try {
        const vapidKey = "BJRiF8tiN4l1QHCuKQ3ePrLsSMBlyDIJcKdnU5TWQK2bhjpmEckbqgUjsm3cYgYr4xMqRDAF1QOHyw7xJ8L3Gqc";
        const newToken = await messaging.getToken({ vapidKey });
        
        if (newToken) {
            console.log('New FCM token obtained:', newToken);
            // We send the token to the server. The user's session cookie will be
            // included automatically if it exists, allowing the server to identify the user.
            const response = await fetch('/api/save-fcm-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: newToken }),
                credentials: 'include', // This is crucial! It includes the session cookie.
            });

            if (response.ok) {
                console.log('New FCM token saved to server successfully.');
            } else {
                console.error('Failed to save new FCM token to server. Status:', response.status);
            }
        } else {
            console.error('Could not get new FCM token after subscription change.');
        }
    } catch (error) {
        console.error('Error handling token refresh:', error);
    }
}
