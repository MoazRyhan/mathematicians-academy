const paymentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['code', 'vodafone_cash'], required: true },
  paymentCode: { type: String },
  vodafoneCashNumber: { type: String },
  vodafoneCashImage: { type: String },
  isConfirmed: { type: Boolean, default: false },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Accountant' },
  relatedCourse: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
}, { timestamps: true });

export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);