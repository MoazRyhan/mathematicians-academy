import mongoose from "mongoose";
import { SUBMISSION_TYPE, SUBMISSION_REVIEW_STATUS, HOMEWORK_QUESTION_TYPE } from "../../Constants/constants.js";


const submissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  homework: { type: mongoose.Schema.Types.ObjectId, ref: 'Homework' },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },

  submissionType: { 
    type: String, 
    enum: Object.values(SUBMISSION_TYPE), 
    required: true 
  },

  pdfSolution: {
    files: {
      public_id: String,
      secure_url: String
    },
    folderId: String
  },

  
    // this is for homework / section result
  studentResultHS: {
  totalGrade :{ type: Number }, // all the grade  before student answer
  totalPoints :{ type: Number }, // all the points  before student answer
  passingScore: { type: Number, default: 50 }, // the score that we should pass

  studentGrade :{ type: Number }, // all the grade  after student answer
  studentPoints :{ type: Number }, // all the points  after student answer
  percentage  :{ type: Number }, 
  passed :{ type: Boolean , default :false } ,

    answers: {
      questions: [
        {
        questionId : { type: mongoose.Schema.Types.ObjectId, required: true } , 
        questionText: { type: String, required: true },
        type: { 
          type: String, 
          enum: Object.values(HOMEWORK_QUESTION_TYPE) , 
          required: true 
        }, 
        options: [{ type: String }], 
        studentAnswer :{ type: String } ,
        correctAnswer :{ type: String }, 

          
        isCorrect :{ type: Boolean , default :null }, // this is for the assistant if he correct it or not
        didSomeThingWrong :{ type: Boolean , default :false }, 
        point:{ type: Number , default : 0  },  
        grade :{ type: Number },
        gradeAfter :{ type: Number  },
        assistantNotes :{ type: String }, 
        supervisorComment :{ type: String } 
        }
      ]
    }
  },


  // this is for exam result
 studentResult: {
  totalGrade :{ type: Number }, // all the grade  before student answer
  totalPoints :{ type: Number }, // all the points  before student answer
  passingScore: { type: Number, default: 50 }, // the score that we should pass

  studentGrade :{ type: Number }, // all the grade  after student answer
  studentPoints :{ type: Number }, // all the points  after student answer
  percentage  :{ type: Number }, 
  passed :{ type: Boolean , default :false } ,
  answers: {
    questionBank: [
      { questionsGroupName :{ type: String } ,
        questions: [ 
        {questionId : { type: mongoose.Schema.Types.ObjectId, required: true } , 
        questionText: { type: String, required: true },
        options: [{ type: String }], 
        studentAnswer :{ type: String } ,
        correctAnswer :{ type: String }, 
        isCorrect :{ type: Boolean , default :null }, // this is for the assistant if he correct it or not
        didSomeThingWrong :{ type: Boolean , default :false }, 
        point:{ type: Number , default : 0  },  
        grade :{ type: Number },
        gradeAfter :{ type: Number  },
        assistantNotes :{ type: String }, 
        supervisorComment :{ type: String } 
       } ] 
      }
    ],
    multipleChoices: [ 
      {questionId : { type: mongoose.Schema.Types.ObjectId, required: true } , 
        questionText: { type: String, required: true },
        options: [{ type: String }], 
        studentAnswer :{ type: String } ,
        correctAnswer :{ type: String }, 
        isCorrect :{ type: Boolean , default :null }, // this is for the assistant if he correct it or not
        didSomeThingWrong :{ type: Boolean , default :false }, 
        point:{ type: Number , default : 0  },  
        grade :{ type: Number },
        gradeAfter :{ type: Number  },
        assistantNotes :{ type: String },
        supervisorComment :{ type: String }  
      } ],
    essay: [ 
      {questionId : { type: mongoose.Schema.Types.ObjectId, required: true } , 
        questionText: { type: String, required: true },
        studentAnswer :{ type: String } ,
        correctAnswer :{ type: String }, 
        isCorrect :{ type: Boolean , default :null }, // this is for the assistant if he correct it or not
        didSomeThingWrong :{ type: Boolean , default :false }, 
        point:{ type: Number , default : 0  },  
        grade :{ type: Number },
        gradeAfter :{ type: Number  },
        assistantNotes :{ type: String },
        supervisorComment :{ type: String } 
       } ]
  }
} ,


  // Assistant grading
  grade: { type: Number },
  isCorrected: { type: Boolean, default: false },
  correctedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Assistant' },

  // Supervisor review
  reviewStatus: { 
    type: String, 
    enum: Object.values(SUBMISSION_REVIEW_STATUS), 
    default: SUBMISSION_REVIEW_STATUS.PENDING 
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Supervisor' },
  isReviewed: { type: Boolean, default: false },
  supervisorComment: { type: String },

  finalGrade: { type: Number },
  finalPercentage : { type: Number },
  finalPoints : { type: Number },

  deadline: { type: Date, required: true ,  },
  submissionTime: { type: Date, required: true }
}, { timestamps: true });

const Submission = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);

export default Submission;
