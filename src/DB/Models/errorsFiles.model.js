import mongoose from "mongoose";
import { ERROR_FILE_TYPE } from "../../Constants/constants.js";

const errorFileSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },

  questions: [{
    questionText: { type: String },
    studentAnswer: { type: String },
    correctAnswer: { type: String },
    type: { type: String, enum: Object.values(ERROR_FILE_TYPE) },
  }],
  
  generationDate: { type: Date, default: Date.now },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Supervisor' },
}, { timestamps: true });

const ErrorFile = mongoose.models.ErrorFile || mongoose.model('ErrorFile', errorFileSchema);



export default ErrorFile;
