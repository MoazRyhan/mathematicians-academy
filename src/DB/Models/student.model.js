import mongoose from "mongoose";
import { STUDENT_ENUMS } from "../../Constants/constants.js";

const studentSchema = new mongoose.Schema({

  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  fullName: { type: String, required: true },

  birthDate: { type: Date, required: true },

  school: { type: String, required: true },

  grade: {
    type: String,
    enum: Object.values(STUDENT_ENUMS.GRADE),
    required: true
  },

  division: {
    type: String,
    enum: Object.values(STUDENT_ENUMS.DIVISION)
  },

  governorate: { type: String, required: true },

  area: { type: String, required: true },

  address: { type: String, required: true },

  parentPhoneNumber: { type: String, required: true },

  fatherJob: { type: String },

  motherJob: { type: String },

  nationalId: { type: String },

  nationalIdImage: {
        images :[
        {public_id : String,
        secure_url : String }
    ],
        folderId : String 
},

  attendanceLocation: {
    type: String,
    enum: Object.values(STUDENT_ENUMS.ATTENDANCE_LOCATION),
    required: true
  },

  center: { type: mongoose.Schema.Types.ObjectId, ref: 'Center' },

  status: {
    type: String,
    enum: Object.values(STUDENT_ENUMS.STATUS),
    default: STUDENT_ENUMS.STATUS.PENDING
  },

  studentCode: { type: String, unique: true },

  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent' },

  assistant: { type: mongoose.Schema.Types.ObjectId, ref: 'Assistant' },

  assistantName: { type: String} ,

  totalPoints: { type: Number, default: 0 },

  redeemablePoints: { type: Number, default: 0 },

  coursesProgress: [{
  
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  
    isPaid: { type: Boolean, default: false },
  
    paymentDetails: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  
    expirationDate: { type: Date },
  
    watchedVideoProgress: { type: Number, default: 0 }, // From 0 to 100
  
    submissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Submission' }],
  
    isSectionSubmitted: { type: Boolean, default: false },
  
    isHomeworkSubmitted: { type: Boolean, default: false },
  
    isQuizSubmitted: { type: Boolean, default: false },
  
    attendanceRegistered: { type: Boolean, default: false },
  }],

}, { timestamps: true });

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

export default Student;
