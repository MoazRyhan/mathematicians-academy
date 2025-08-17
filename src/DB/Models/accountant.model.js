import mongoose from "mongoose";

const accountantSchema = new mongoose.Schema({
  
  
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  admin: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }],
  
  payments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }],
  
  
}, { timestamps: true });


const Accountant = mongoose.models.Accountant || mongoose.model('Accountant', accountantSchema);

 export default Accountant