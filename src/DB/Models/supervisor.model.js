import mongoose from "mongoose";
const supervisorSchema = new mongoose.Schema({
  
  
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  admin: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }],
  
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  
  
  assistants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Assistant' }],
  
  
  correctionReviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CorrectionReview' }],
  
}, { timestamps: true });


const Supervisor = mongoose.models.Supervisor || mongoose.model('Supervisor', supervisorSchema);

 export default Supervisor