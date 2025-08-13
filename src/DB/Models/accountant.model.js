const accountantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  payments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }],
}, { timestamps: true });

export const Accountant = mongoose.models.Accountant || mongoose.model('Accountant', accountantSchema);