import dotenv from "dotenv";
import { startSubscriptionJob }
  from "./jobs/subscription.job";

startSubscriptionJob();

dotenv.config();

import app from "./app";
import { connectDB } from "./config/database";

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();