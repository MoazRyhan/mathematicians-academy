
import User from "../../../DB/Models/user.model.js";
import { decryption } from "../../../Utils/encryption.utils.js";
import Session from "../../../DB/Models/session.model.js";
import Teacher from "./../../../DB/Models/teacher.model.js";
import Homework from "../../../DB/Models/homework.model.js";
import Section from "../../../DB/Models/section.model.js";
import { SESSION_TIME, STUDENT_ENUMS ,EXAM_TYPE, EXAM_QUESTION_TYPE, EXAM_TIME_TYPE, system_role  } from "../../../Constants/constants.js";
import Exam from "../../../DB/Models/exam.model.js";
import mongoose from "mongoose";
import Admin from "../../../DB/Models/admin.model.js";





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

// ======================== 👨‍🏫 teacher add session 

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

        // ✅ Validate videoQuizzes
    if (videoQuizzes && Array.isArray(videoQuizzes)) {
      for (let quiz of videoQuizzes) {
        if (!quiz.questionText || !quiz.correctAnswer || !quiz.showAtTime) {
          return res.status(400).json({ message: "❌ Each quiz must have questionText, correctAnswer, and showAtTime" });
        }
        if (!Array.isArray(quiz.options) || quiz.options.length < 2) {
          return res.status(400).json({ message: "❌ Each quiz must have at least 2 options" });
        }
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

    // ✅ Filter allowed fields only
    const filteredUpdates = {};
    for (let key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    // ✅ Check if any change happened
    let isChanged = false;

    for (let key of Object.keys(filteredUpdates)) {
      const oldVal = currentSession[key];

      if (Array.isArray(filteredUpdates[key])) {
        const newArr = filteredUpdates[key].map(v => v.toString());
        const oldArr = (oldVal || []).map(v => v.toString());

        if (newArr.length !== oldArr.length || !newArr.every(v => oldArr.includes(v))) {
          isChanged = true;
          break;
        }
      } else if (typeof oldVal === "object" && oldVal?._id) {
        if (oldVal.toString() !== filteredUpdates[key].toString()) {
          isChanged = true;
          break;
        }
      } else {
        if (filteredUpdates[key].toString() !== (oldVal ?? "").toString()) {
          isChanged = true;
          break;
        }
      }
    }

    if (!isChanged) {
      return res.status(400).json({ message: "⚠️ No changes detected" });
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
      month,
      isActive ,
      grade ,
      division 
    } = req.body;
    
    if (  ( examType == EXAM_TYPE.FIXED  || examType == EXAM_TYPE.QUESTION_BANK )  && !relatedSession  ) {
      return res.status(400).json({ message: "you must add the relatedSession" });
    }

        // ✅ لو Monthly → لازم month
    if (examType === EXAM_TYPE.MONTHLY && !month) {
      return res.status(400).json({ message: "❌ Month is required for monthly exams" });
    }

    if (examType === EXAM_TYPE.MONTHLY && relatedSession) {
      return res.status(400).json({ message: "❌ related session not with monthly exams" });
    }
     
    // ✅ التحقق من الحقول الأساسية
    if ( !timeType || !examType || !title || !questions || !grade || !division ) {
      return res.status(400).json({ message: "Please fill in all required fields" });
    }

    // ✅ check teacher
    const teacherRecord = await Teacher.findOne({ user: _id });
    if (!teacherRecord) {
      return res.status(403).json({ message: "❌ Only teachers can add exams" });
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
      month,
      isActive ,
      grade ,
      division
    });

    if ( relatedSession  ) {
     const session = await Session.findOne({ _id:relatedSession })
     if (!session) {
      return res.status(400).json({ message: "this session is not found" });
     }
      session.exam = newExam._id
      await session.save()
    }

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








//===================== ✅ 1.👨‍🏫 Teacher  / admin ==> homework 
export const add_Homework_ToSession_service = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { _id: loginUserId, role: ROLE } = req.login_user;
    const { title, description, availableFrom, deadline, teacherIdForAssign } = req.body;

    if (!title) {
      return res.status(400).json({ message: "❌ you must fill the title" });
    }

    // ✅ Get session
    const sessionExist = await Session.findById(sessionId);
    if (!sessionExist) {
      return res.status(404).json({ message: "❌ Session not found" });
    }

    let assignedByTeacherId;
    let isAdminAddIt = false; // Default

    if (ROLE === system_role.TEACHER) {
      // ✅ If role = teacher
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(404).json({ message: "❌ Teacher not found" });
      }
      assignedByTeacherId = teacher._id;

    } else if (ROLE === system_role.ADMIN) {
      // ✅ If role = admin → must send teacherIdForAssign
      if (!teacherIdForAssign) {
        return res.status(400).json({ message: "❌ teacherIdForAssign is required for admins" });
      }

      const teacher = await Teacher.findById(teacherIdForAssign);
      if (!teacher) {
        return res.status(404).json({ message: "❌ Teacher not found for provided teacherIdForAssign" });
      }
      assignedByTeacherId = teacher._id;
      isAdminAddIt = true; // ✅ Admin added it
    } else {
      return res.status(403).json({ message: "❌ You are not allowed to perform this action" });
    }

    // ✅ Create new homework
    const newHomework = new Homework({
      title,
      description,
      session: sessionId,
      availableFrom: availableFrom || sessionExist.availableAt || sessionExist.createdAt,
      deadline: deadline || new Date(sessionExist.createdAt).setDate(new Date(sessionExist.createdAt).getDate() + 7), // 7 days
      grade: sessionExist.grade,
      division: sessionExist.division,
      assignedBy: assignedByTeacherId,
      isAdminAddIt, // ✅ Added this
    });

    await newHomework.save();

    // ✅ Update session with homework ID
    await Session.findByIdAndUpdate(sessionId, { homework: newHomework._id });

    return res.status(201).json({ message: "✅ Homework linked to session", homework: newHomework });

  } catch (error) {
    console.error("❌ Error in addHomeworkToSession:=============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const update_Homework_service = async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const { _id: loginUserId, role: ROLE } = req.login_user;
    const { title, description, availableFrom, deadline } = req.body;

    // ✅ Get homework
    const homework = await Homework.findById(homeworkId);
    if (!homework) {
      return res.status(404).json({ message: "❌ Homework not found" });
    }

    // ✅ Check roles
    if (ROLE === system_role.ADMIN) {
      const adminExist = await Admin.findOne({ user: loginUserId });
      if (!adminExist) {
        return res.status(403).json({ message: "❌ You are not a valid admin" });
      }
    } else if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(403).json({ message: "❌ You are not a valid teacher" });
      }
    } else {
      return res.status(403).json({ message: "❌ You are not allowed to perform this action" });
    }

    // ✅ Compare old values with new ones
    const updates = {};
    if (title && title !== homework.title) updates.title = title;
    if (description && description !== homework.description) updates.description = description;
    if (availableFrom && new Date(availableFrom).toISOString() !== homework.availableFrom.toISOString()) updates.availableFrom = availableFrom;
    if (deadline && new Date(deadline).toISOString() !== homework.deadline.toISOString()) updates.deadline = deadline;

    // ✅ If no changes
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "❌ No changes detected" });
    }

    // ✅ Update homework
    const updatedHomework = await Homework.findByIdAndUpdate(homeworkId, updates, { new: true });

    return res.status(200).json({ message: "✅ Homework updated successfully", homework: updatedHomework });

  } catch (error) {
    console.error("❌ Error in updateHomework:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const delete_Homework_service = async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const { _id: loginUserId, role: ROLE } = req.login_user;

    // ✅ Get homework
    const homework = await Homework.findById(homeworkId);
    if (!homework) {
      return res.status(404).json({ message: "❌ Homework not found" });
    }

    // ✅ Check roles
    if (ROLE === system_role.ADMIN) {
      const adminExist = await Admin.findOne({ user: loginUserId });
      if (!adminExist) {
        return res.status(403).json({ message: "❌ You are not a valid admin" });
      }
    } else if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(403).json({ message: "❌ You are not a valid teacher" });
      }
    } else {
      return res.status(403).json({ message: "❌ You are not allowed to perform this action" });
    }

    // ✅ Delete homework
    await Homework.findByIdAndDelete(homeworkId);

    // ✅ Remove homework reference from session
    await Session.findByIdAndUpdate(homework.session, { $unset: { homework: "" } });

    return res.status(200).json({ message: "✅ Homework deleted successfully" });

  } catch (error) {
    console.error("❌ Error in deleteHomework:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};







//===================== ✅ 2. 👨‍🏫 Teacher  / admin ==> Section 
export const add_Section_ToSession_service = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { _id: loginUserId, role: ROLE } = req.login_user;
    const { title, description, availableFrom, deadline, teacherIdForAssign } = req.body;

    if (!title) {
      return res.status(400).json({ message: "❌ you must fill the title" });
    }

    // ✅ Get session
    const sessionExist = await Session.findById(sessionId);
    if (!sessionExist) {
      return res.status(404).json({ message: "❌ Session not found" });
    }

    let assignedByTeacherId;
    let isAdminAddIt = false;

    if (ROLE === system_role.TEACHER) {
      // ✅ Teacher case
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(404).json({ message: "❌ Teacher not found" });
      }
      assignedByTeacherId = teacher._id;

    } else if (ROLE === system_role.ADMIN) {
      // ✅ Admin case → teacherIdForAssign is required
      if (!teacherIdForAssign) {
        return res.status(400).json({ message: "❌ teacherIdForAssign is required for admins" });
      }

      const teacher = await Teacher.findById(teacherIdForAssign);
      if (!teacher) {
        return res.status(404).json({ message: "❌ Teacher not found for provided teacherIdForAssign" });
      }
      assignedByTeacherId = teacher._id;
      isAdminAddIt = true;

    } else {
      return res.status(403).json({ message: "❌ You are not allowed to perform this action" });
    }

    // ✅ Create new section
    const newSection = new Section({
      title,
      description,
      session: sessionId,
      availableFrom: availableFrom || sessionExist.availableAt || sessionExist.createdAt,
      deadline: deadline || new Date(sessionExist.createdAt).setDate(new Date(sessionExist.createdAt).getDate() + 7),
      grade: sessionExist.grade,
      division: sessionExist.division,
      assignedBy: assignedByTeacherId,
      isAdminAddIt, // ✅ Added this
    });

    await newSection.save();

    // ✅ Update session with section ID
    await Session.findByIdAndUpdate(sessionId, { section: newSection._id });

    return res.status(201).json({ message: "✅ Section added successfully", section: newSection });

  } catch (error) {
    console.error("❌ Error in addSectionToSession:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const update_Section_service = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { _id: loginUserId, role: ROLE } = req.login_user;
    const { title, description, availableFrom, deadline } = req.body;

    // ✅ Get section
    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ message: "❌ Section not found" });
    }

    // ✅ Check roles
    if (ROLE === system_role.ADMIN) {
      const adminExist = await Admin.findOne({ user: loginUserId });
      if (!adminExist) {
        return res.status(403).json({ message: "❌ You are not a valid admin" });
      }
    } else if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(403).json({ message: "❌ You are not a valid teacher" });
      }
    } else {
      return res.status(403).json({ message: "❌ You are not allowed to perform this action" });
    }

    // ✅ Compare old values with new ones
    const updates = {};
    if (title && title !== section.title) updates.title = title;
    if (description && description !== section.description) updates.description = description;
    if (availableFrom && new Date(availableFrom).toISOString() !== section.availableFrom.toISOString()) updates.availableFrom = availableFrom;
    if (deadline && new Date(deadline).toISOString() !== section.deadline.toISOString()) updates.deadline = deadline;

    // ✅ If no changes
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "❌ No changes detected" });
    }

    // ✅ Update section
    const updatedSection = await Section.findByIdAndUpdate(sectionId, updates, { new: true });

    return res.status(200).json({ message: "✅ Section updated successfully", section: updatedSection });

  } catch (error) {
    console.error("❌ Error in updateSection:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const delete_Section_service = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { _id: loginUserId, role: ROLE } = req.login_user;

    // ✅ Get section
    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ message: "❌ Section not found" });
    }

    // ✅ Check roles
    if (ROLE === system_role.ADMIN) {
      const adminExist = await Admin.findOne({ user: loginUserId });
      if (!adminExist) {
        return res.status(403).json({ message: "❌ You are not a valid admin" });
      }
    } else if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(403).json({ message: "❌ You are not a valid teacher" });
      }
    } else {
      return res.status(403).json({ message: "❌ You are not allowed to perform this action" });
    }

    // ✅ Delete section
    await Section.findByIdAndDelete(sectionId);

    // ✅ Remove section reference from session
    await Session.findByIdAndUpdate(section.session, { $unset: { section: "" } });

    return res.status(200).json({ message: "✅ Section deleted successfully" });

  } catch (error) {
    console.error("❌ Error in deleteSection:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};








// ✅ ====================3. 👨‍🏫 Teacher  / admin ==> videoQuiz 
export const add_video_Quiz_ToSession_service = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { videoQuizzes } = req.body; // quizzes: [ { questionText, options, correctAnswer, showAtTime, passingGrade }, ... ]
    const { _id: loginUserId, role: ROLE } = req.login_user;

    const sessionExist = await Session.findById(sessionId);
    if (!sessionExist) {
      return res.status(404).json({ message: "❌ Session not found" });
    }

        // ✅ Validate videoQuizzes
    if (videoQuizzes && Array.isArray(videoQuizzes)) {
      for (let quiz of videoQuizzes) {
        if (!quiz.questionText || !quiz.correctAnswer || !quiz.showAtTime) {
          return res.status(400).json({ message: "❌ Each quiz must have questionText, correctAnswer, and showAtTime" });
        }
        if (!Array.isArray(quiz.options) || quiz.options.length < 2) {
          return res.status(400).json({ message: "❌ Each quiz must have at least 2 options" });
        }
      }
    }

    // ✅ Determine who is assigning
    let isAdminAddIt = false;

    if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(404).json({ message: "❌ Teacher not found" });
      }

    } else if (ROLE === system_role.ADMIN) {
      isAdminAddIt = true;

    } else {
      return res.status(403).json({ message: "❌ You are not allowed to perform this action" });
    }

    // ✅ Add extra fields to each quiz
    const quizzesWithMeta = quizzes.map(q => ({
      ...q,
      isAdminAddIt
    }));

    // ✅ Push multiple quizzes at once
    const updatedSession = await Session.findByIdAndUpdate(
      sessionId,
      {
        $push: {
          videoQuizzes: { $each: quizzesWithMeta }
        }
      },
      { new: true }
    );

    return res.status(201).json({
      message: "✅ Quizzes added to session",
      session: updatedSession
    });
  } catch (error) {
    console.error("❌ Error in add_video_Quiz_ToSession_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const update_video_Quiz_inSession_service = async (req, res) => {
  try {
    const { sessionId, quizId } = req.params;
    const { questionText, options, correctAnswer, showAtTime, passingGrade } = req.body;
    const { _id: loginUserId, role: ROLE } = req.login_user;

    // ✅ تحقق من وجود السيشن
    const sessionExist = await Session.findById(sessionId);
    if (!sessionExist) {
      return res.status(404).json({ message: "❌ Session not found" });
    }

    // ✅ تحقق من الصلاحيات
    if (ROLE === system_role.ADMIN) {
      const adminExist = await Admin.findOne({ user: loginUserId });
      if (!adminExist) {
        return res.status(403).json({ message: "❌ You are not a valid admin" });
      }
    } else if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(403).json({ message: "❌ You are not a valid teacher" });
      }
    } else {
      return res.status(403).json({ message: "❌ You are not allowed to perform this action" });
    }

    // ✅ ابحث عن الكويز
    const quizIndex = sessionExist.videoQuizzes.findIndex(q => q._id.toString() === quizId);
    if (quizIndex === -1) {
      return res.status(404).json({ message: "❌ Quiz not found" });
    }

    const currentQuiz = sessionExist.videoQuizzes[quizIndex];
    let isChanged = false;

    // ✅ التحقق من القيم وتحديث فقط إذا في فرق
    if (questionText && questionText !== currentQuiz.questionText) {
      currentQuiz.questionText = questionText;
      isChanged = true;
    }
    if (options && Array.isArray(options) && options.length >= 2 && JSON.stringify(options) !== JSON.stringify(currentQuiz.options)) {
      currentQuiz.options = options;
      isChanged = true;
    }
    if (correctAnswer && correctAnswer !== currentQuiz.correctAnswer) {
      if (options && !options.includes(correctAnswer)) {
        return res.status(400).json({ message: "❌ correctAnswer must be one of the options" });
      }
      currentQuiz.correctAnswer = correctAnswer;
      isChanged = true;
    }
    if (showAtTime !== undefined && typeof showAtTime === "number" && showAtTime !== currentQuiz.showAtTime) {
      currentQuiz.showAtTime = showAtTime;
      isChanged = true;
    }
    // if (passingGrade !== undefined && passingGrade !== currentQuiz.passingGrade) {
    //   currentQuiz.passingGrade = passingGrade;
    //   isChanged = true;
    // }

    if (!isChanged) {
      return res.status(200).json({ message: "✅ No changes detected" });
    }

    await sessionExist.save();

    return res.status(200).json({
      message: "✅ Video quiz updated successfully",
      updatedQuiz: currentQuiz
    });

  } catch (error) {
    console.error("❌ Error in update_video_Quiz_inSession_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const delete_video_Quiz_fromSession_service = async (req, res) => {
  try {
    const { sessionId, quizId } = req.params;
    const { _id: loginUserId, role: ROLE } = req.login_user;

    // ✅ تحقق من وجود السيشن
    const sessionExist = await Session.findById(sessionId);
    if (!sessionExist) {
      return res.status(404).json({ message: "❌ Session not found" });
    }

    // ✅ Check roles
    if (ROLE === system_role.ADMIN) {
      const adminExist = await Admin.findOne({ user: loginUserId });
      if (!adminExist) {
        return res.status(403).json({ message: "❌ You are not a valid admin" });
      }
    } else if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(403).json({ message: "❌ You are not a valid teacher" });
      }
    } else {
      return res.status(403).json({ message: "❌ You are not allowed to perform this action" });
    }

    // ✅ تحقق من وجود الكويز واحذفه
    const quizIndex = sessionExist.videoQuizzes.findIndex(q => q._id.toString() === quizId);
    if (quizIndex === -1) {
      return res.status(404).json({ message: "❌ Quiz not found" });
    }

    sessionExist.videoQuizzes.splice(quizIndex, 1);
    await sessionExist.save();

    return res.status(200).json({ message: "✅ Video quiz deleted successfully" });

  } catch (error) {
    console.error("❌ Error in delete_video_Quiz_fromSession_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};








// any thing below is under testing
//===========================================


