const pointsTransactionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  points: { type: Number, required: true },
  transactionType: { type: String, enum: ['earn', 'redeem', 'admin_add', 'admin_deduct'], required: true },
  description: { type: String },
  relatedEntity: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });

export const PointsTransaction = mongoose.models.PointsTransaction || mongoose.model('PointsTransaction', pointsTransactionSchema);