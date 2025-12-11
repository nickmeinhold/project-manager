import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "../db";

// Stale token threshold: 30 days in milliseconds
const STALE_TOKEN_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 30;

/**
 * Scheduled function to clean up stale FCM tokens.
 * Runs daily at 2:00 AM UTC.
 * Per Firebase best practices, tokens inactive for 30+ days are considered stale.
 * https://firebase.google.com/docs/cloud-messaging/manage-tokens
 */
export const cleanupStaleFcmTokens = onSchedule(
  {
    schedule: "0 2 * * *", // Daily at 2:00 AM UTC
    timeZone: "UTC",
  },
  async () => {
    console.log("🧹 Starting stale FCM token cleanup...");

    const cutoffDate = new Date(Date.now() - STALE_TOKEN_THRESHOLD_MS);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

    try {
      const staleTokensSnapshot = await db
        .collection("fcmTokens")
        .where("updatedAt", "<", cutoffTimestamp)
        .get();

      if (staleTokensSnapshot.empty) {
        console.log("✅ No stale tokens found");
        return;
      }

      const totalTokens = await db.collection("fcmTokens").count().get();
      console.log(`Total FCM tokens in database: ${totalTokens.data().count}`);

      console.log(`Found ${staleTokensSnapshot.size} stale FCM tokens`);

      // Delete in batches of 500 (Firestore batch limit)
      const batchSize = 500;
      const tokens = staleTokensSnapshot.docs;

      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = db.batch();
        const chunk = tokens.slice(i, i + batchSize);

        chunk.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(
          `Deleted batch ${Math.floor(i / batchSize) + 1}: ${
            chunk.length
          } tokens`
        );
      }

      console.log(
        `🗑️ Successfully deleted ${staleTokensSnapshot.size} stale FCM tokens`
      );
    } catch (error) {
      console.error("Error cleaning up stale tokens:", error);
      throw error;
    }
  }
);
