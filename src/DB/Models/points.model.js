import mongoose from "mongoose";
import { POINTS_TRANSACTION_TYPE } from "../../Constants/constants.js";

const pointsTransactionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  points: { type: Number, required: true },
  transactionType: { type: String, enum: Object.values(POINTS_TRANSACTION_TYPE), required: true },
  description: { type: String },
  relatedEntity: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });

const PointsTransaction = mongoose.models.PointsTransaction || mongoose.model('PointsTransaction', pointsTransactionSchema);
export default PointsTransaction;
