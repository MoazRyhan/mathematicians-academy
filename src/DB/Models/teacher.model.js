import mongoose from "mongoose";
const teacherSchema = new mongoose.Schema({
  
  
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  admin: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }],
  
  Sessions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Session' }],
  
  
  exams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exam' }],
  
  
  supervisors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Supervisor' }],


  
  
  assistants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Assistant' }],
}, { timestamps: true });

 const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema);

 export default Teacher