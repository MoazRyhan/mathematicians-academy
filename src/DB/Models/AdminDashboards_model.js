import mongoose from "mongoose";

const AdminDashboard_schema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Admin User
  analyticsEnabled: { type: Boolean, default: true },
  paymentReviewRequired: { type: Boolean, default: true },
  rewardConfig: {
    autoApprove: { type: Boolean, default: false },
    thresholds: [
      {
        coins: Number,
        rewardName: String
      }
    ]
  },
  lastLoginAt: { type: Date, default: Date.now },
  notes: { type: String }
}, { timestamps: true });

const AdminDashboard_model = mongoose.models.AdminDashboard || mongoose.model("AdminDashboard", AdminDashboard_schema);

export default AdminDashboard_model;