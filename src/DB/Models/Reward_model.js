import mongoose from "mongoose";

const CoinActivity_schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  coins: Number,
  activityType: String
}, { timestamps: true });

const CoinActivity_model = mongoose.models.CoinActivity || mongoose.model("CoinActivity", CoinActivity_schema);

export default CoinActivity_model;