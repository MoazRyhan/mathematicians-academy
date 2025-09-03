import mongoose from "mongoose";
import { ATTENDANCE_TYPE } from "../../Constants/constants.js";

const adminSchema = new mongoose.Schema(
  {
    // Link admin to main user
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Manage other roles
    teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Teacher" }],
    supervisors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Supervisor" }],
    assistants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Assistant" }],
    accountants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Accountant" }],

    // Sessions and exams managed by admin
    sessions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Session" }],
    exams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Exam" }],

    // Points management (add/deduct points from students) =====> ( 007 )
    managedPoints: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
        points: { type: Number, default: 0 },
        reason: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],

    // Global statistics (cached or calculated) =====> ( 007 )
    statistics: {
      totalStudents: { type: Number, default: 0 },
      totalAssistants: { type: Number, default: 0 },
      totalSupervisors: { type: Number, default: 0 },
      totalTeachers: { type: Number, default: 0 },
      totalAccountants: { type: Number, default: 0 },
      totalSessions: { type: Number, default: 0 },
      totalExams: { type: Number, default: 0 },
      totalPayments: { type: Number, default: 0 },
    },

    // Sessions opened manually by admin =====> ( 007 )
    openedSessions: [
      {
        session: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
        openedAt: { type: Date, default: Date.now },
        reason: { type: String },
      },
    ],

    // Manual/QR attendance records
    manualAttendance: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
        session: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
        attendedAt: { type: Date, default: Date.now },
        method: { type: String, enum: Object.values(ATTENDANCE_TYPE) , default: ATTENDANCE_TYPE.QR  },
      },
    ],
  },
  { timestamps: true }
);

const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);

export default Admin;
