const userSchema = new mongoose.Schema({
  name: { type: String, required: true },

  email: { type: String, required: true, unique: true },

  password: { type: String, required: true },

  role: { type: String, enum: ['student', 'teacher', 'supervisor', 'assistant', 'admin', 'accountant', 'parent'], required: true },
  
  phoneNumber: { type: String },

  isActive: { type: Boolean, default: true },
  
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema);