'use client';

import { useState } from 'react';
import { Button, Typography, Paper } from '@mui/material';
import { messaging } from '../lib/firebase';
import { getToken } from 'firebase/messaging';

export default function NotificationPermission() {
  const [permission, setPermission] = useState(Notification.permission);

  const requestPermission = async () => {
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted') {
        console.log('Notification permission granted.');
        // Get the token
        const vapidKey = "BJRiF8tiN4l1QHCuKQ3ePrLsSMBlyDIJcKdnU5TWQK2bhjpmEckbqgUjsm3cYgYr4xMqRDAF1QOHyw7xJ8L3Gqc";
        const fcmToken = await getToken(messaging(), { vapidKey });
        
        if (fcmToken) {
          console.log('FCM Token:', fcmToken);
          // Send this token to your server to save it
          try {
            const response = await fetch('/api/save-fcm-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ token: fcmToken }),
            });

            if (response.ok) {
              console.log('FCM token sent to server successfully.');
              setPermission('granted'); // Hide component on success
            } else {
              console.error('Failed to send FCM token to server:', await response.text());
            }
          } catch (error) {
            console.error('Error sending FCM token to server:', error);
          }
        } else {
          console.log('Can not get token, need to ask user to enable it in browser settings.');
        }
      } else {
        console.log('Notification permission denied.');
      }
    } catch (error) {
      console.error('An error occurred while requesting permission ', error);
    }
  };

  if (permission === 'granted') {
    return null; // Don't show anything if permission is already granted
  }

  return (
    <Paper sx={{ p: 3, mt: 4, textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom>
        Stay Updated!
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Enable push notifications to receive important updates and alerts.
      </Typography>
      <Button variant="contained" color="primary" onClick={requestPermission}>
        Enable Notifications
      </Button>
    </Paper>
  );
}
