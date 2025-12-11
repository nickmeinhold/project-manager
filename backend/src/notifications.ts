import * as admin from "firebase-admin";
import { db } from "./db";

// Send notification
export async function sendNotification(
  projectId: string,
  stepId: string,
  userId: string,
  notification: { title: string; body: string; type: string }
) {
  // Save notification to Firestore
  await db.collection("notifications").add({
    userId,
    projectId,
    stepId,
    title: notification.title,
    body: notification.body,
    type: notification.type,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
  });

  // Send push notification via FCM to user's registered devices only
  try {
    const tokensSnapshot = await db
      .collection("fcmTokens")
      .where("userId", "==", userId)
      .get();

    if (tokensSnapshot.empty) {
      console.log("No FCM tokens found");
      return;
    }

    const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);

    if (tokens.length > 0) {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          projectId: projectId,
          stepId: stepId,
          type: notification.type,
        },
        tokens: tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(
        `✅ Successfully sent ${response.successCount} notifications`
      );

      if (response.failureCount > 0) {
        console.log(`❌ Failed to send ${response.failureCount} notifications`);
        // Clean up invalid tokens
        const tokensToDelete: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const errorCode = resp.error.code;
            console.error(
              `Error sending to token ${tokens[idx]}: ${errorCode}`
            );
            // Delete tokens that are no longer valid per Firebase best practices
            // https://firebase.google.com/docs/cloud-messaging/manage-tokens
            if (
              errorCode === "messaging/registration-token-not-registered" ||
              errorCode === "messaging/invalid-registration-token" ||
              errorCode === "messaging/invalid-argument"
            ) {
              tokensToDelete.push(tokens[idx]);
            }
          }
        });

        // Delete invalid tokens from Firestore
        if (tokensToDelete.length > 0) {
          console.log(
            `🗑️ Deleting ${tokensToDelete.length} invalid FCM tokens`
          );
          const deletePromises = tokensToDelete.map((token) =>
            db.collection("fcmTokens").doc(token).delete()
          );
          await Promise.all(deletePromises);
        }
      }
    }
  } catch (error) {
    console.error("Error sending push notification:", error);
  }

  console.log(`Notification logged: ${notification.title}`);
}
