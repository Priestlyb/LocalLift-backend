import "./config/env";

console.log(
  "SERVER PAYSTACK:",
  process.env.PAYSTACK_SECRET_KEY
);

console.log(
  "SERVER KORA:",
  process.env.KORA_SECRET_KEY
);

import app from "./app";
import { connectDB } from "./config/database";
import { startSubscriptionJob } from "./jobs/subscription.job";

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();

    startSubscriptionJob();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();