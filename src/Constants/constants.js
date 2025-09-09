

// 📂 system.enum.js
export const system_role = {
    STUDENT : 'student',
    TEACHER : 'teacher',
    SUPERVISOR : 'supervisor',
    ASSISTANT : 'assistant',
    ADMIN : 'admin',
    ACCOUNTANT : 'accountant',
    PARENT : 'parent'
}

const { USER , ADMIN  } = system_role


// 📂 admin.enum.js
export const ATTENDANCE_TYPE = {
    QR : "qr", 
    MANUAL :"manual"
}


// 📂 student.enum.js
export const STUDENT_ENUMS = {
  GRADE: {
    FIRST_SECONDARY: 'first_secondary',
    SECOND_SECONDARY: 'second_secondary',
    THIRD_SECONDARY: 'third_secondary'
  },
  DIVISION: {
    SCIENTIFIC: 'scientific',
    LITERARY: 'literary',
    STATISTICS: 'statistics'
  },
  ATTENDANCE_LOCATION: {
    ONLINE: 'online',
    CENTER: 'center'
  },
  STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
  }
};










// 📂 points.enum.js

export const POINTS_TRANSACTION_TYPE = {
    EARN: 'earn',
    REDEEM: 'redeem',
    ADMIN_ADD: 'admin_add',
    ADMIN_DEDUCT: 'admin_deduct'
};






// 📂 submission.enum.js

export const SUBMISSION_TYPE = {
    HOMEWORK: 'homework',
    SECTION: 'section',
    EXAM: 'exam',
    MONTHLY_EXAM: 'monthly_exam',
};

export const SUBMISSION_REVIEW_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
};




// 📂 exam.enum.js

export const EXAM_TYPE = {
    SESSION: 'session',
    MONTHLY : "monthly"
};


export const EXAM_TIME_TYPE = {
    FIXED_TIME: 'fixed_time',
    DEADLINE: 'deadline'
};




// 📂 errorFile.enum.js

export const ERROR_FILE_TYPE = {
    HOMEWORK: 'homework',
    SECTION: 'section',
    EXAM: 'exam'
};


// 📂 session.enum.js

export const SESSION_TIME = {
    IMMEDIATE: 'immediate',
    SCHEDULED: 'scheduled' 
}


// 📂 payment.enum.js

export const PAYMENT_TYPE = {
    CODE: 'code',
    VODAFONE_CASH: 'vodafone_cash' 
}


// 📂 group & CorrectionRequest & CorrectionReview & ASSISTANT_REQUEST.enum.js

export const GROUP_STATUS = {
    ACTIVE: 'active',
    COMPLETED : 'completed' 
}

export const CORRECTION_REQUEST_STATUS = {
    PENDING: 'pending',
    REVIEWED: 'reviewed' 
}

export const CORRECTION_REVIEW_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
};

export const ASSISTANT_REQUEST_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
};

export const ASSISTANT_REQUEST_TYPE = {
  VIDEO_EXTENSION: 'video_extension',
   FREE_SESSION:'free_session' ,
   SUBMISSION_OVERRIDE :'submission_override'
};

export const TARGET_MODEL_TYPE = {
 VIDEO : 'Video',
 SESSION : 'Session',
 SUBMISSION:'Submission', // important
 SUBMISSION_HOMEWORK:'Submission:Homework',
 SUBMISSION_SECTION :'Submission:Section',
 SUBMISSION_EXAM :'Submission:Exam',
};


// homework

export const HOMEWORK_QUESTION_TYPE = {
 MULTIPLE_CHOICE: "multiple_choice",
 ESSAY :"essay"
};

export const SECTION_QUESTION_TYPE = {
 MULTIPLE_CHOICE: "multiple_choice",
 ESSAY :"essay"
};


// for cloudnary
export const ImageExtensions = ['image/jpg' , 'image/jpeg',  'image/png']
export const VideoExtensions = [ ' video/mp4' , 'video/avi' ,'Video/mov' ]
export const PDFExtension = [ 'application/pdf' ]
