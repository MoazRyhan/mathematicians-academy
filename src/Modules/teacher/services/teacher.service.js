
import User from "../../../DB/Models/user.model.js";
import { decryption } from "../../../Utils/encryption.utils.js";
import Session from "../../../DB/Models/session.model.js";
import Teacher from "./../../../DB/Models/teacher.model.js";
import Homework from "../../../DB/Models/homework.model.js";
import Section from "../../../DB/Models/section.model.js";
import { SESSION_TIME, STUDENT_ENUMS ,EXAM_TYPE, EXAM_QUESTION_TYPE, EXAM_TIME_TYPE  } from "../../../Constants/constants.js";
import Exam from "../../../DB/Models/exam.model.js";
import mongoose from "mongoose";





export const get_teacher_data_service = async (req, res) => {
  try {
    // 1️⃣ Get the email of the logged-in user
    const { email } = req.login_user;

    // 2️⃣ Find the user by email
    const user = await User.findOne({ email }, "-password");
    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

    // 3️⃣ Find the teacher linked with this user
    const teacher = await Teacher.findOne({ user: user._id } , "-admin" )
      .populate("Sessions") // 
      .populate("exams")   // 
      .populate({ path: "supervisors", select: "-password -admin" })
      .populate({ path: "assistants", select: "-password -admin " })

    if (!teacher) {
      return res.status(404).json({ message: "❌ Teacher not found" });
    }

    // 4️⃣ Decrypt sensitive fields from User
    const decryptedUser = {
      ...user.toObject(),
      phoneNumber: user.phoneNumber
        ? await decryption({
            cipher: user.phoneNumber,
            secret_key: process.env.PHONE_ENCRYPTION_SECRET,
          })
        : null,
    };

    // 5️⃣ Prepare teacher data
    const teacherData = {
      ...teacher.toObject(),
      // teacher schema ما فيهوش nationalId أو parentPhoneNumber
      // بس لو ضفت أي فيلدات حساسة بعدين ممكن نفكها هنا زي ما عملنا مع الطالب
    };

    // 6️⃣ Return response
    return res.status(200).json({
      message: "✅ User and Teacher data retrieved successfully",
      user: decryptedUser,
      teacher: teacherData,
    });
  } catch (error) {
    console.log("❌ Error from get_teacher_data =====>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ======================== add delete update things

export const add_Session_teacher_service_teacher = async (req, res) => {
  try {
    const {
      title,
      mathBranch,
      prerequisites,   // 🆕 array of session IDs
      videoLink,
      grade,
      division,
      videoQuizzes,    // 🆕
      homework,        // 🆕 homeworkId
      section,         // 🆕 sectionId
      exam,            // 🆕 examId
      points,          // 🆕 number
      isActive,        // 🆕 boolean
      price,
      availabilityType,
      availableAt
    } = req.body;

    const { _id } = req.login_user; // userId from token

    // ✅ Check if user is a Teacher
    const teacher = await Teacher.findOne({ user: _id });
    if (!teacher) {
      return res.status(403).json({ message: "❌ Only teachers can add sessions" });
    }

    // ✅ Validate grade
    if (grade && !Object.values(STUDENT_ENUMS.GRADE).includes(grade)) {
      return res.status(400).json({ message: "❌ Invalid grade" });
    }

    // ✅ Validate division
    if (division && !Object.values(STUDENT_ENUMS.DIVISION).includes(division)) {
      return res.status(400).json({ message: "❌ Invalid division" });
    }

    // ✅ Validate availability
    if (!Object.values(SESSION_TIME).includes(availabilityType)) {
      return res.status(400).json({ message: "❌ Invalid availabilityType" });
    }

    if (availabilityType === SESSION_TIME.SCHEDULED && !availableAt) {
      return res.status(400).json({ message: "❌ availableAt is required when availabilityType is SCHEDULED" });
    }

    if (availabilityType === SESSION_TIME.IMMEDIATE && availableAt) {
      return res.status(400).json({ message: "❌ availableAt is not required when availabilityType is 'immediate'" });
    }

    // ✅ Validate prerequisites
    if (prerequisites) {
      if (!Array.isArray(prerequisites)) {
        return res.status(400).json({ message: "❌ prerequisites must be an array of session IDs" });
      }

      const allValid = prerequisites.every(id => mongoose.Types.ObjectId.isValid(id));
      if (!allValid) {
        return res.status(400).json({ message: "❌ prerequisites contains invalid ObjectId(s)" });
      }

      // 🔎 Ensure sessions exist
      const foundSessions = await Session.find({ _id: { $in: prerequisites } }).select("_id");
      if (foundSessions.length !== prerequisites.length) {
        return res.status(400).json({ message: "❌ One or more prerequisite sessions not found" });
      }
    }

    // ✅ Validate Homework
    if (homework) {
      const homeworkExists = await Homework.findById(homework);
      if (!homeworkExists) {
        return res.status(400).json({ message: "❌ Homework not found" });
      }
    }

    // ✅ Validate Section
    if (section) {
      const sectionExists = await Section.findById(section);
      if (!sectionExists) {
        return res.status(400).json({ message: "❌ Section not found" });
      }
    }

    // ✅ Validate Exam
    if (exam) {
      const examExists = await Exam.findById(exam);
      if (!examExists) {
        return res.status(400).json({ message: "❌ Exam not found" });
      }
    }

    // ✅ Create session
    const newSession = new Session({
      title,
      mathBranch,
      prerequisites,
      videoLink,
      grade,
      division,
      videoQuizzes,
      homework,
      section,
      exam,
      points,
      isActive,
      price,
      availabilityType,
      availableAt: availabilityType === SESSION_TIME.SCHEDULED ? availableAt : null,
      createdBy: teacher._id
    });

    await newSession.save();

    // ✅ Link session to teacher
    teacher.Sessions.push(newSession._id);
    await teacher.save();

    return res.status(201).json({
      message: "✅ Session created successfully",
      session: newSession
    });

  } catch (error) {
    console.log("❌ Error in addSession_service =====>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const update_session_teacher_service_teacher  = async (req, res) => {
  try {
    const { _id } = req.login_user; // المدرس اللي عامل لوجين
    const { sessionId } = req.params;
    const updates = req.body;

    // ✅ Allowed fields for update
    const allowedFields = [
      "title",
      "mathBranch",
      "prerequisites",
      "videoLink",
      "grade",
      "division",
      "videoQuizzes",
      "homework",
      "section",
      "exam",
      "points",
      "isActive",
      "price",
      "availabilityType",
      "availableAt",
    ];

    // ✅ Check teacher
    const teacherRecord = await Teacher.findOne({ user: _id });
    if (!teacherRecord) {
      return res.status(403).json({ message: "❌ Only teachers can update sessions" });
    }

    // ✅ Get current session
    const currentSession = await Session.findById(sessionId);
    if (!currentSession) {
      return res.status(404).json({ message: "❌ Session not found" });
    }

    // ✅ Ensure session belongs to this teacher
    if (currentSession.createdBy.toString() !== teacherRecord._id.toString()) {
      return res.status(403).json({ message: "❌ You can only update your own sessions" });
    }

    // 🔹 Validate grade
    if (updates?.grade && !Object.values(STUDENT_ENUMS.GRADE).includes(updates.grade)) {
      return res.status(400).json({ message: "❌ Invalid grade" });
    }

    // 🔹 Validate division
    if (updates?.division && !Object.values(STUDENT_ENUMS.DIVISION).includes(updates.division)) {
      return res.status(400).json({ message: "❌ Invalid division" });
    }

    // 🔹 Validate availability
    if (updates?.availabilityType && !Object.values(SESSION_TIME).includes(updates.availabilityType)) {
      return res.status(400).json({ message: "❌ Invalid availabilityType" });
    }

    if (updates?.availabilityType === SESSION_TIME.SCHEDULED && !updates?.availableAt) {
      return res.status(400).json({ message: "❌ availableAt is required when availabilityType is SCHEDULED" });
    }

    if (updates?.availabilityType === SESSION_TIME.IMMEDIATE && updates?.availableAt) {
      return res.status(400).json({ message: "❌ availableAt is not required when availabilityType is 'immediate'" });
    }

    // ✅ Validate prerequisites
    if (updates.prerequisites) {
      if (!Array.isArray(updates.prerequisites)) {
        return res.status(400).json({ message: "❌ prerequisites must be an array of session IDs" });
      }

      const allValid = updates.prerequisites.every(id => mongoose.Types.ObjectId.isValid(id));
      if (!allValid) {
        return res.status(400).json({ message: "❌ prerequisites contains invalid ObjectId(s)" });
      }

      const foundSessions = await Session.find({ _id: { $in: updates.prerequisites } }).select("_id");
      if (foundSessions.length !== updates.prerequisites.length) {
        return res.status(400).json({ message: "❌ One or more prerequisite sessions not found" });
      }
    }

    // ✅ Check Homework exists
    if (updates.homework) {
      const homeworkExists = await Homework.findById(updates.homework);
      if (!homeworkExists) {
        return res.status(400).json({ message: "❌ Homework not found" });
      }
    }

    // ✅ Check Section exists
    if (updates.section) {
      const sectionExists = await Section.findById(updates.section);
      if (!sectionExists) {
        return res.status(400).json({ message: "❌ Section not found" });
      }
    }

    // ✅ Check Exam exists
    if (updates.exam) {
      const examExists = await Exam.findById(updates.exam);
      if (!examExists) {
        return res.status(400).json({ message: "❌ Exam not found" });
      }
    }

    // ✅ Filter allowed fields
    const filteredUpdates = {};
    for (let key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    // ✅ Update session
    const updatedSession = await Session.findByIdAndUpdate(
      sessionId,
      filteredUpdates,
      { new: true }
    ).populate("prerequisites homework section exam createdBy");

    return res.status(200).json({
      message: "✅ Session updated successfully",
      session: updatedSession,
    });

  } catch (error) {
    console.log("❌ error in update_session_teacher_service ===========> ", error);
    return res.status(500).json({ message: "internal server error" });
  }
};

export const delete_session_teacher_service_teacher  = async (req, res) => {
  try {
    const { _id } = req.login_user;
    const { sessionId } = req.params;

    // ✅ Check teacher
    const teacherRecord = await Teacher.findOne({ user: _id });
    if (!teacherRecord) {
      return res.status(403).json({ message: "❌ Only teachers can delete sessions" });
    }

    const currentSession = await Session.findById(sessionId);
    if (!currentSession) {
      return res.status(404).json({ message: "❌ Session not found" });
    }

    // ✅ Ensure session belongs to this teacher
    if (currentSession.createdBy.toString() !== teacherRecord._id.toString()) {
      return res.status(403).json({ message: "❌ You can only delete your own sessions" });
    }

    const deletedSession = await Session.findByIdAndDelete(sessionId);

    return res.status(200).json({
      message: "✅ Session deleted successfully",
      session: deletedSession,
    });
  } catch (error) {
    console.log("❌ error in delete_session_teacher_service ===========> ", error);
    return res.status(500).json({ message: "internal server error" });
  }
};



// =================👨‍🏫 Teacher Add  Exam

// all kind of exams even monthly
export const add_exam_service_teacher = async (req, res) => {
  try {
    const { _id } = req.login_user;
    const {
      title,
      examType,
      questions,
      relatedSession,
      timeType,
      startTime,
      endTime,
      duration,
      deadline,
      allowFileUpload,
      month,
      isActive ,
      division ,
      grade
    } = req.body;

    // ✅ التحقق من الحقول الأساسية
    if (!relatedSession || !timeType || !examType || !title || !questions || !grade || division ) {
      return res.status(400).json({ message: "Please fill in all required fields" });
    }

    // ✅ check teacher
    const teacherRecord = await Teacher.findOne({ user: _id });
    if (!teacherRecord) {
      return res.status(403).json({ message: "❌ Only teachers can add exams" });
    }

    // ✅ لو Monthly → لازم month
    if (examType === EXAM_TYPE.MONTHLY && !month) {
      return res.status(400).json({ message: "❌ Month is required for monthly exams" });
    }

    // ✅ Validate Questions
    for (const question of questions) {
      if (!question.questionText || !question.questionType || !question.points) {
        return res.status(400).json({ message: "❌ Each question must have questionText, questionType and points" });
      }

      if (question.questionType === EXAM_QUESTION_TYPE.MULTIPLE_CHOICE) {
        if (!question.options || question.options.length < 2) {
          return res.status(400).json({ message: "❌ MULTIPLE_CHOICE must have at least 2 options" });
        }
        if (!question.correctAnswer) {
          return res.status(400).json({ message: "❌ MULTIPLE_CHOICE must have correctAnswer" });
        }
      }

      if (question.questionType === EXAM_QUESTION_TYPE.ESSAY) {
        if (!question.questionBank || question.questionBank.length === 0) {
          return res.status(400).json({ message: "❌ QUESTION_BANK must have at least one question in questionBank" });
        }
        for (const subQ of question.questionBank) {
          if (!subQ.questionText || !subQ.options || subQ.options.length < 2 || !subQ.correctAnswer) {
            return res.status(400).json({ message: "❌ Each question in questionBank must have questionText, options (min 2), and correctAnswer" });
          }
        }
      }
    }

    // ✅ إنشاء الامتحان
    const newExam = await Exam.create({
      title,
      examType,
      questions,
      relatedSession,
      timeType,
      startTime,
      endTime,
      duration,
      deadline,
      createdBy: teacherRecord._id,
      allowFileUpload,
      month,
      isActive ,
      grade ,
      division
    });

    return res.status(201).json({
      message: "✅ Exam created successfully",
      exam: newExam,
    });
  } catch (error) {
    console.error("❌ error in add_exam_service_teacher:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const update_exam_service_teacher = async (req, res) => {
  try {
    const { examId } = req.params;
    const { _id } = req.login_user;
    const updates = req.body;

    // ✅ Check teacher
    const teacherRecord = await Teacher.findOne({ user: _id });
    if (!teacherRecord) {
      return res.status(403).json({ message: "❌ Only teachers can update exams" });
    }

    // ✅ Find Exam
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "❌ Exam not found" });
    }

    // ✅ Ensure teacher owns this exam
    if (exam.createdBy.toString() !== teacherRecord._id.toString()) {
      return res.status(403).json({ message: "❌ You can only update your own exams" });
    }

    // ✅ If examType is changing to monthly, require month
    if (updates.examType === EXAM_TYPE.MONTHLY && !updates.month) {
      return res.status(400).json({ message: "❌ Month is required for monthly exams" });
    }

    // ✅ Validate questions if provided
    if (updates.questions && Array.isArray(updates.questions)) {
      for (const question of updates.questions) {
        if (!question.questionText || !question.questionType || !question.points) {
          return res.status(400).json({ message: "❌ Each question must have questionText, questionType, and points" });
        }

        if (question.questionType === "MULTIPLE_CHOICE") {
          if (!question.options || question.options.length < 2) {
            return res.status(400).json({ message: "❌ MULTIPLE_CHOICE must have at least 2 options" });
          }
          if (!question.correctAnswer) {
            return res.status(400).json({ message: "❌ MULTIPLE_CHOICE must have correctAnswer" });
          }
        }

        if (question.questionType === "QUESTION_BANK") {
          if (!question.questionBank || question.questionBank.length === 0) {
            return res.status(400).json({ message: "❌ QUESTION_BANK must have at least one question in questionBank" });
          }
          for (const subQ of question.questionBank) {
            if (!subQ.questionText || !subQ.options || subQ.options.length < 2 || !subQ.correctAnswer) {
              return res.status(400).json({ message: "❌ Each question in questionBank must have questionText, options (min 2), and correctAnswer" });
            }
          }
        }
      }
    }

    // ✅ Apply updates
    Object.assign(exam, updates);
    await exam.save();

    return res.status(200).json({
      message: "✅ Exam updated successfully",
      exam,
    });
  } catch (error) {
    console.error("❌ error in update_exam_service_teacher:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
  
export const delete_exam_service_teacher = async (req, res) => {
  try {
    const { examId } = req.params;
    const { _id } = req.login_user;

    // ✅ check teacher
    const teacherRecord = await Teacher.findOne({ user: _id });
    if (!teacherRecord) {
      return res.status(403).json({ message: "❌ Only teachers can delete exams" });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "❌ Exam not found" });
    }

    // ✅ Ensure teacher owns this exam
    if (exam.createdBy.toString() !== teacherRecord._id.toString()) {
      return res.status(403).json({ message: "❌ You can only delete your own exams" });
    }

    await exam.deleteOne();

    return res.status(200).json({ message: "✅ Exam deleted successfully" });
  } catch (error) {
    console.error("❌ error in delete_exam_service_teacher:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


//===================== ✅ 1. Add Homework to a Session
export const add_Homework_ToSession_service = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {_id: teacherId} = req.login_user
    const { title, description , availableFrom , deadline } = req.body;

      if (!title) {
        return res.status(400).json({ message: "❌ you must full the filed" });
      }

    const teacher = await Teacher.findOne({user : teacherId});
    if (!teacher) {
      return res.status(404).json({ message: "❌ teacher not found" });
    }

    const sessionExist = await Session.findById(sessionId);
    if (!sessionExist) {
      return res.status(404).json({ message: "❌ Session not found" });
    }

    const newHomework = new Homework({
      title,
      description,
      session: sessionId,
      availableFrom: availableFrom || sessionExist.availableAt || sessionExist.createdAt,
      deadline: deadline || new Date(sessionExist.createdAt).setDate(new Date(sessionExist.createdAt).getDate() + 7), // for 7 days
      grade : sessionExist.grade ,
      division : sessionExist.division ,
      assignedBy : teacher._id , 
      session : sessionExist._id
    });

    // console.log( newHomework , "tttttt");
    
    await newHomework.save();

    await Session.findByIdAndUpdate(sessionId, { homework: newHomework._id });

    return res.status(201).json({ message: "✅ Homework linked to session", homework: newHomework });
  } catch (error) {
    console.error("❌ Error in addHomeworkToSession:=============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



//===================== ✅ 2. Add Section to a Session
export const add_Section_ToSession_service = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {_id: teacherId} = req.login_user
    const { title, description , availableFrom , deadline } = req.body;

      if (!title) {
        return res.status(400).json({ message: "❌ you must full the filed" });
      }

    const teacher = await Teacher.findOne({user : teacherId});
    if (!teacher) {
      return res.status(404).json({ message: "❌ teacher not found" });
    }

    const sessionExist = await Session.findById(sessionId);
    if (!sessionExist) {
      return res.status(404).json({ message: "❌ Session not found" });
    }

    const newSection = new Section({
      title,
      description,
      session: sessionId,
      availableFrom: availableFrom || sessionExist.availableAt || sessionExist.createdAt,
      deadline: deadline || new Date(sessionExist.createdAt).setDate(new Date(sessionExist.createdAt).getDate() + 7), // for 7 days
      grade : sessionExist.grade ,
      division : sessionExist.division ,
      assignedBy : teacher._id , 
      session : sessionExist._id
    });

    // console.log( newHomework , "tttttt");
    
    await newSection.save();

    await Session.findByIdAndUpdate(sessionId, {  section: newSection._id });

    return res.status(201).json({ message: "✅ Section added successfully", section: newSection });
  } catch (error) {
    console.error("❌ Error in addSectionToSession:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



// ✅ ====================3. Add Quiz to a Session
export const add_Quiz_ToSession_service = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { quizzes } = req.body; // quizzes: [ { questionText, options, correctAnswer, showAtTime, passingGrade }, ... ]

    const sessionExist = await Session.findById(sessionId);
    if (!sessionExist) {
      return res.status(404).json({ message: "❌ Session not found" });
    }

    // Validate quizzes array
    if (!Array.isArray(quizzes) || quizzes.length === 0) {
      return res.status(400).json({ message: "❌ quizzes array is required and cannot be empty" });
    }

    // Check all quizzes have required fields
    for (const quiz of quizzes) {
      if (!quiz.questionText || !quiz.correctAnswer || !quiz.showAtTime) {
        return res.status(400).json({ message: "❌ Each quiz must have questionText, correctAnswer, and showAtTime" });
      }
    }

    // Push multiple quizzes at once
    const updatedSession = await Session.findByIdAndUpdate(
      sessionId,
      {
        $push: {
          videoQuizzes: { $each: quizzes }
        }
      },
      { new: true }
    );

    return res.status(201).json({ message: "✅ Quizzes added to session", session: updatedSession });
  } catch (error) {
    console.error("❌ Error in addQuizToSession:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};





// any thing below is under testing
//===========================================

export const update_teacher_service = async (req, res) => {
  try {
    // 1️⃣ Get logged-in user email
    const { email } = req.login_user;

    // 2️⃣ Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

    // 3️⃣ Find teacher linked with this user
    const teacher = await Teacher.findOne({ user: user._id });
    if (!teacher) {
      return res.status(404).json({ message: "❌ Teacher not found" });
    }

    // 4️⃣ Extract updates from body
    const { name, email: newEmail, phoneNumber, ...teacherUpdates } = req.body;

    let isChanged = false;
    const userUpdates = {};

    // ✅ Update name
    if (name && user.name !== name) {
      userUpdates.name = name;
      isChanged = true;
    }

    // ✅ Update email
    if (newEmail) {
      const normalizedEmail = newEmail.trim().toLowerCase();

      if (normalizedEmail !== user.email) {
        const emailExists = await User.findOne({
          email: normalizedEmail,
          _id: { $ne: user._id },
        });

        if (emailExists) {
          return res.status(400).json({ message: "❌ Email already in use" });
        }

        userUpdates.email = normalizedEmail;
        isChanged = true;
      }
    }

    // ✅ Update phone number (with encryption/decryption)
    if (phoneNumber) {
      const decryptedPhone = await decryption({
        cipher: user.phoneNumber,
        secret_key: process.env.PHONE_ENCRYPTION_SECRET,
      });

      if (decryptedPhone !== phoneNumber) {
        const encryptedPhone = await encryption({
          value: phoneNumber,
          secret_key: process.env.PHONE_ENCRYPTION_SECRET,
        });
        userUpdates.phoneNumber = encryptedPhone;
        isChanged = true;
      }
    }

    // ✅ Teacher-specific updates
    for (let key in teacherUpdates) {
      if (
        teacherUpdates[key] !== undefined &&
        teacher[key] != teacherUpdates[key]
      ) {
        isChanged = true;
        break;
      }
    }

    if (!isChanged) {
      return res.status(400).json({
        message:
          "⚠️ No changes detected. Data is already up to date.",
        teacher,
        user,
      });
    }

    // ✅ Apply updates
    let updatedUser = user;
    if (Object.keys(userUpdates).length > 0) {
      updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $set: userUpdates },
        { new: true, select: "-password" }
      );
    }

    let updatedTeacher = teacher;
    if (Object.keys(teacherUpdates).length > 0) {
      updatedTeacher = await Teacher.findByIdAndUpdate(
        teacher._id,
        { $set: teacherUpdates },
        { new: true }
      );
    }

    return res.status(200).json({
      message: "✅ Teacher & User data updated successfully",
      teacher: updatedTeacher,
      user: updatedUser,
    });
  } catch (error) {
    console.log("❌ Error from update_teacher_service =====>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const delete_teacher_service = async (req, res) => {
  try {
    // 1️⃣ Get logged-in user id
    const { _id } = req.login_user;

    // 2️⃣ Delete user
    const deletedUser = await User.findByIdAndDelete(_id);
    if (!deletedUser) {
      return res.status(404).json({ message: "❌ No account found with this ID" });
    }

    // 3️⃣ Delete related Teacher document
    const deletedTeacher = await Teacher.findOneAndDelete({ user: _id });

    // 4️⃣ Delete other relations if needed (e.g., Sessions, Exams) 
    // ⚠️ لو عايز نمسح الـ Sessions المرتبطة بالمدرس
    if (deletedTeacher?.Sessions?.length > 0) {
      await Session.deleteMany({ _id: { $in: deletedTeacher.Sessions } });
    }

    if (deletedTeacher?.exams?.length > 0) {
      await Exam.deleteMany({ _id: { $in: deletedTeacher.exams } });
    }

    // 5️⃣ Return success
    return res.status(200).json({
      message: "✅ Teacher account and related data deleted successfully",
    });
  } catch (error) {
    console.log("❌ Error from delete_teacher_service =====>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


