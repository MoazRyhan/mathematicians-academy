
import User from "../../../DB/Models/user.model.js";
import { decryption } from "../../../Utils/encryption.utils.js";
import Session from "../../../DB/Models/session.model.js";
import Teacher from "./../../../DB/Models/teacher.model.js";
import Homework from "../../../DB/Models/homework.model.js";
import Section from "../../../DB/Models/section.model.js";
import { SESSION_TIME, STUDENT_ENUMS ,EXAM_TYPE  } from "../../../Constants/constants.js";
import Exam from "../../../DB/Models/exam.model.js";
import mongoose from "mongoose";





export const get_teacher_data = async (req, res) => {
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

// ======================== add del update things

export const add_Session_teacher_service = async (req, res) => {
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

export const update_session_teacher_service = async (req, res) => {
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

export const delete_session_teacher_service = async (req, res) => {
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

// 👨‍🏫 Teacher Add Monthly Exam
export const add_monthly_exam_teacher_service = async (req, res) => {
  try {
    const { _id } = req.login_user;
    const {
      title,
      questions,
      relatedSession,
      timeType,
      startTime,
      endTime,
      duration,
      deadline,
      allowFileUpload,
      month,
      
    } = req.body;

    // ✅ تحقق أن المستخدم Teacher
    const teacher = await Teacher.findOne({ user: _id });
    if (!teacher) {
      return res.status(403).json({ message: "❌ Only teachers can add monthly exams" });
    }

    // ✅ لازم month يتبعت
    if (!month) {
      return res.status(400).json({ message: "❌ Month is required for monthly exams" });
    }

    const newExam = await Exam.create({
      title,
      examType: EXAM_TYPE.MONTHLY, // ✅ هنا ثابت
      questions,
      relatedSession,
      timeType,
      startTime,
      endTime,
      duration,
      deadline,
      createdBy: teacher._id, // teacher id
      allowFileUpload,
      month,
    });

    return res.status(201).json({
      message: "✅ Monthly Exam created successfully by teacher",
      exam: newExam,
    });
  } catch (error) {
    console.error("❌ error in teacher_add_monthly_exam:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// any thing below is under testing
//===========================================





//=============== un-tested   ( GPT )
// ✅ 1. Add Homework to a Session
export const addHomeworkToSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title, description, resources, questions, totalPoints, availableFrom, deadline } = req.body;


    const sessionExist = await Session.findById(sessionId);
    if (!sessionExist) {
      return res.status(403).json({ message: "❌ this session is not available" });
    }


    // Create new homework
    const newHomework = new Homework({
      title,
      description,
      session: sessionId,
      resources,
      questions,
      totalPoints,
      availableFrom,
      deadline
    });
    await newHomework.save();

    // Link homework to session
    await Session.findByIdAndUpdate(sessionId, { homework: newHomework._id });

    return res.status(201).json({ message: "✅ Homework added to session", homework: newHomework });
  } catch (error) {
    console.error("❌ Error in addHomeworkToSession:=========>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ 2. Add Quiz to a Session
export const addQuizToSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionText, options, correctAnswer, showAtTime, passingGrade } = req.body;

    const updatedSession = await Session.findByIdAndUpdate(
      sessionId,
      {
        $push: {
          videoQuizzes: {
            questionText,
            options,
            correctAnswer,
            showAtTime,
            passingGrade
          }
        }
      },
      { new: true }
    );

    return res.status(201).json({ message: "✅ Quiz added to session", session: updatedSession });
  } catch (error) {
    console.error("❌ Error in addQuizToSession:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ 3. Add Section to a Session
export const addSectionToSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title, description, materials } = req.body;

    // Create new section
    const newSection = new Section({
      title,
      description,
      materials,
      session: sessionId,
    });
    await newSection.save();

    // Link section to session
    await Session.findByIdAndUpdate(sessionId, { section: newSection._id });

    return res.status(201).json({ message: "✅ Section added to session", section: newSection });
  } catch (error) {
    console.error("❌ Error in addSectionToSession:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

