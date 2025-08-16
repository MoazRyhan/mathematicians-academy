import mongoose from "mongoose";

const assistantSchema = new mongoose.Schema({
  


  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },


  supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'Supervisor', required: true },


  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],


  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],


  correctionRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CorrectionRequest' }],


  performanceScore: { type: Number, default: 100 },
}, { timestamps: true });


const Assistant = mongoose.models.Assistant || mongoose.model('Assistant', assistantSchema);

 export default Assistant