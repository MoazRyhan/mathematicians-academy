import mongoose from "mongoose";
import { ASSISTANT_REQUEST_STATUS, ASSISTANT_REQUEST_TYPE, TARGET_MODEL_TYPE } from "../../Constants/constants.js";

const assistantRequestSchema = new mongoose.Schema({
  assistant: { type: mongoose.Schema.Types.ObjectId, ref: 'Assistant', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },

  type: {
    type: String,
    enum: Object.values(ASSISTANT_REQUEST_TYPE),
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
    enum: Object.values(TARGET_MODEL_TYPE),
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
