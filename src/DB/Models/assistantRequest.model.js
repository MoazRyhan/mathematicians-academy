import mongoose from "mongoose";
import { ASSISTANT_REQUEST_STATUS } from "../../Constants/constants.js";

const assistantRequestSchema = new mongoose.Schema({
  assistant: { type: mongoose.Schema.Types.ObjectId, ref: 'Assistant', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },

  type: {
    type: String,
    enum: ['video_extension', 'free_session', 'submission_override'], // ✅ الأنواع كلها في مكان واحد
    required: true
  },

  // ✅ ID الديناميك حسب النوع
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetModel' // يحدد الموديل المناسب
  },

  // ✅ الموديل المناسب حسب النوع
  targetModel: {
    type: String,
    enum: ['Video', 'Session', 'Submission'],
    required: true
  },

  reason: { type: String, trim: true },

  status: {
    type: String,
    enum: Object.values(ASSISTANT_REQUEST_STATUS),
    default: ASSISTANT_REQUEST_STATUS.PENDING
  }

}, { timestamps: true });

const AssistantRequest = mongoose.models.AssistantRequest || mongoose.model('AssistantRequest', assistantRequestSchema);

export default AssistantRequest;
