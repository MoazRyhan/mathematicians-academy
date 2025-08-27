import mongoose from "mongoose";
import { GROUP_STATUS } from "../../Constants/constants.js";

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },

  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],

  assistants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Assistant' }],

  supervisors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Supervisor' }], // ✅ جديد

  sessions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Session' }], // ✅ جديد

  status: {
    type: String,
    enum:  Object.values(GROUP_STATUS),
    default: GROUP_STATUS.ACTIVE
  }

}, { timestamps: true });

const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);
export default Group;
