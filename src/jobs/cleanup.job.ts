import cron from "node-cron";

import Content from "../models/Content";

/**
 * Removes old generated content.
 *
 * Currently deletes content that is over
 * one year old.
 *
 * Runs every day at 3:00 AM.
 */
class CleanupJob {
  start() {
    cron.schedule(
      "0 3 * * *",
      async () => {
        try {
          const cutoff = new Date();

          cutoff.setFullYear(
            cutoff.getFullYear() - 1
          );

          const result =
            await Content.deleteMany({
              createdAt: {
                $lt: cutoff,
              },
            });

          console.log(
            `[CleanupJob] Deleted ${result.deletedCount} old content records.`
          );
        } catch (error) {
          console.error(
            "[CleanupJob]",
            error
          );
        }
      }
    );

    console.log(
      "[CleanupJob] Scheduled."
    );
  }
}

export default new CleanupJob();