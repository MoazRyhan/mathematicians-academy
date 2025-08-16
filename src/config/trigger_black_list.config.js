import cron from "node-cron";
import blackListModel from "../DB/Models/blackList.model.js";

// every day at 12 pm
cron.schedule("0 0 * * *", async () => {
  try {
    const now = new Date();

    // امسح أي records تاريخ الانتهاء بتاعها أقل من الوقت الحالي
    const result = await blackListModel.deleteMany({
      Expires_at: { $lt: now },
    });

    if (result.deletedCount > 0) {
      console.log(`🧹 Deleted ${result.deletedCount} expired blacklist entries.`);
    }
  } catch (error) {
    console.error("❌ Failed to clean the blacklist:", error.message);
  }
});
