import cron from "node-cron";

import Analytics from "../models/Analytics";

import reportService from "../services/analytics/report.service";
import insightService from "../services/analytics/insight.service";

/**
 * Runs every day at midnight.
 *
 * Generates analytics reports and refreshes
 * business insights.
 */
export const analyticsJob = () => {
  cron.schedule(
    "0 0 * * *",
    async () => {
      console.log(
        "[ANALYTICS JOB] Started..."
      );

      try {
        /**
         * Get all businesses that currently
         * have analytics.
         */
        const businesses =
          await Analytics.distinct(
            "business"
          );

        for (const businessId of businesses) {
          try {
            await reportService.getWeeklyReport(
              businessId.toString()
            );

            await reportService.getMonthlyReport(
              businessId.toString()
            );

            await insightService.generateInsights(
              businessId.toString()
            );

            console.log(
              `[ANALYTICS JOB] Updated analytics for business ${businessId}`
            );
          } catch (error) {
            console.error(
              `[ANALYTICS JOB] Failed for business ${businessId}:`,
              error
            );
          }
        }

        console.log(
          "[ANALYTICS JOB] Completed."
        );
      } catch (error) {
        console.error(
          "[ANALYTICS JOB] Failed:",
          error
        );
      }
    },
    {
      timezone: "Africa/Lagos",
    }
  );
};

export default analyticsJob;