import mongoose from "mongoose";

const assistantSchema = new mongoose.Schema({
  
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  admin: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }],

  supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'Supervisor', required: true },

  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],

  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],

  assistantRequest: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AssistantRequest' }], 

  performanceScore: { type: Number, default: 100 },

  WrongQuestions: { type: Number },
  
}, { timestamps: true });


const Assistant = mongoose.models.Assistant || mongoose.model('Assistant', assistantSchema);

 export default Assistant