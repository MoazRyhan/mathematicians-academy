
import User from "../../../DB/Models/user.model.js";
import { decryption } from "../../../Utils/encryption.utils.js";
import Session from "../../../DB/Models/session.model.js";
import Teacher from "./../../../DB/Models/teacher.model.js";
import Homework from "../../../DB/Models/homework.model.js";
import Section from "../../../DB/Models/section.model.js";
import { SESSION_TIME, STUDENT_ENUMS ,EXAM_TYPE,  EXAM_TIME_TYPE, system_role, HOMEWORK_QUESTION_TYPE, SECTION_QUESTION_TYPE  } from "../../../Constants/constants.js";
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
      return res.status(404).json({ message: " User not found" });
    }

    // 3️⃣ Find the teacher linked with this user
    const teacher = await Teacher.findOne({ user: user._id } , "-admin" )
      .populate("Sessions") // 
      .populate("exams")   // 
      .populate({ path: "supervisors", select: "-password -admin" })
      .populate({ path: "assistants", select: "-password -admin " })

    if (!teacher) {
      return res.status(404).json({ message: " Teacher not found" });
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
    console.log(" Error from get_teacher_data =====>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ======================== 👨‍🏫 teacher add session ❤

export const add_Session_teacher_service = async (req, res) => {
  try {
    const {
      title,
      mathBranch,
      prerequisites,
      videoLink,
      grade,
      division,
      segments,
      isActive,
      availabilityType,
      availableAt,
      availableTill,
      videoWatchPoints
    } = req.body;

    const { _id: loginUserId, role: ROLE } = req.login_user;

    let createdByTeacher;
    let createdByAdmin;
    
    if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(404).json({ message: " Teacher not found" });
      }
      createdByTeacher = teacher._id;
    } else if (ROLE === system_role.ADMIN) {
      const admin = await Admin.findOne({ user: loginUserId });
      if (!admin) {
        return res.status(404).json({ message: " Admin not found" });
      }
      createdByAdmin = admin._id;
    } else {
      return res.status(403).json({ message: " You are not allowed to perform this action" });
    }
    
    if (!availableTill || !videoLink || !title || !grade || !division || !availabilityType || !videoWatchPoints ) {
      return res.status(400).json({ message: " availableTill || videoLink || title || grade || division || availabilityType || videoWatchPoints are required" });
    }
    
    if (grade && !Object.values(STUDENT_ENUMS.GRADE).includes(grade)) {
      return res.status(400).json({ message: " Invalid grade" });
    }

    if (division && !Object.values(STUDENT_ENUMS.DIVISION).includes(division)) {
      return res.status(400).json({ message: " Invalid division" });
    }

    if (!Object.values(SESSION_TIME).includes(availabilityType)) {
      return res.status(400).json({ message: " Invalid availabilityType" });
    }

    if (grade == STUDENT_ENUMS.GRADE.FIRST_SECONDARY &&
      (division == STUDENT_ENUMS.DIVISION.SCIENTIFIC || STUDENT_ENUMS.DIVISION.LITERARY)) {
      return res.status(400).json({ message: " there is no division with the grade" });
    }

    if (
      (grade === STUDENT_ENUMS.GRADE.SECOND_SECONDARY || grade === STUDENT_ENUMS.GRADE.THIRD_SECONDARY) &&
      ![STUDENT_ENUMS.DIVISION.SCIENTIFIC, STUDENT_ENUMS.DIVISION.LITERARY].includes(division)
    ) {
      return res.status(400).json({ message: " 2 and 3 grade must have division literary or scientific" });
    }

    if (availabilityType === SESSION_TIME.SCHEDULED && !availableAt) {
      return res.status(400).json({ message: " availableAt is required when availabilityType is SCHEDULED" });
    }

    if (availabilityType === SESSION_TIME.IMMEDIATE && availableAt) {
      return res.status(400).json({ message: " availableAt is not required when availabilityType is 'immediate'" });
    }

    // ✅ Validate prerequisites
    if (prerequisites) {
      if (!Array.isArray(prerequisites)) {
        return res.status(400).json({ message: " prerequisites must be an array of session IDs" });
      }

      const allValid = prerequisites.every(id => mongoose.Types.ObjectId.isValid(id));
      if (!allValid) {
        return res.status(400).json({ message: " prerequisites contains invalid ObjectId(s)" });
      }

      const foundSessions = await Session.find({ _id: { $in: prerequisites } }).select("_id");
      if (foundSessions.length !== prerequisites.length) {
        return res.status(400).json({ message: " One or more prerequisite sessions not found" });
      }
    }


    if (!Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({ message: " segments are required and must be an array" });
    }

    // ✅ Validate segments
    let totalPoints = 0;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];

      if (!seg.title || seg.startTime == null || seg.endTime == null || seg.passingScore == null) {
        return res.status(400).json({ message: " Each segment must have title, startTime, endTime, and passingScore" });
      }

      if (!Array.isArray(seg.questions) || seg.questions.length === 0) {
        return res.status(400).json({ message: " Each segment must have questions" });
      }

      for (let q of seg.questions) {
        if (!q.questionText || !q.correctAnswer || !Array.isArray(q.options) || q.options.length < 2) {
          return res.status(400).json({ message: " Each question must have questionText, correctAnswer, and options (min 2)" });
        }
        if (q.point == null) {
          q.point = 1;
        }
      }

      // ✅ Calculate points for this segment
      const segPoints = seg.questions.reduce((sum, q) => sum + (q.point || 0), 0);
      seg.points = segPoints;
      totalPoints += segPoints;

      // ✅ Ensure passingScore is not greater than points
      if (seg.passingScore > segPoints) {
        return res.status(400).json({
          message: `Segment "${seg.title}" passingScore cannot exceed total points (${segPoints})`
        });
      }

      // ✅ Ensure correct time sequence (startTime == previous endTime)
      if (i > 0) {
        const prevSeg = segments[i - 1];
        if (seg.startTime !== prevSeg.endTime) {
          return res.status(400).json({
            message: `Segment "${seg.title}" startTime must be exactly equal to previous segment's endTime`
          });
        }
      }

      // ✅ Ensure startTime < endTime
      if (seg.startTime >= seg.endTime) {
        return res.status(400).json({
          message: `Segment "${seg.title}" startTime must be less than endTime`
        });
      }
    }

    const newSession = new Session({
      title,
      mathBranch,
      prerequisites,
      videoLink,
      grade,
      division,
      segments,
      totalPoints,
      isActive,
      availabilityType,
      availableAt: availabilityType === SESSION_TIME.SCHEDULED ? availableAt : Date.now(),
      availableTill,
      createdByTeacher: createdByTeacher || null,
      createdByAdmin: createdByAdmin || null,
      videoWatchPoints ,
    });

    await newSession.save();

    return res.status(201).json({
      message: "✅ Session created successfully",
      session: newSession
    });

  } catch (error) {
    console.log(" Error in addSession_service =====>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const update_session_teacher_service = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { _id: loginUserId, role: ROLE } = req.login_user;
    const updates = req.body;

    // ✅ Get current session
    const currentSession = await Session.findById(sessionId);
    if (!currentSession) {
      return res.status(404).json({ message: " Session not found" });
    }


    if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(404).json({ message: " Teacher not found" });
      }
    } else if (ROLE === system_role.ADMIN) {
      const admin = await Admin.findOne({ user: loginUserId });
      if (!admin) {
        return res.status(404).json({ message: " Admin not found" });
      }
    } else {
      return res.status(403).json({ message: " You are not allowed to perform this action" });
    }

    // ✅ Allowed fields for update (excluding segments)
    const allowedFields = [
      "title",
      "mathBranch",
      "prerequisites",
      "videoLink",
      "grade",
      "division",
      "homework",
      "section",
      "exam",
      "isActive",
      "availabilityType",
      "availableAt",
      "availableTill"
    ];

    // ✅ Validate grade if provided
    if (updates.grade && !Object.values(STUDENT_ENUMS.GRADE).includes(updates.grade)) {
      return res.status(400).json({ message: " Invalid grade" });
    }

    // ✅ Validate division if provided
    if (updates.division && !Object.values(STUDENT_ENUMS.DIVISION).includes(updates.division)) {
      return res.status(400).json({ message: " Invalid division" });
    }

    // ✅ Validate grade/division compatibility
    if (updates.grade == STUDENT_ENUMS.GRADE.FIRST_SECONDARY &&
      (updates.division == STUDENT_ENUMS.DIVISION.SCIENTIFIC || updates.division == STUDENT_ENUMS.DIVISION.LITERARY)) {
      return res.status(400).json({ message: " there is no division with the grade" });
    }

    if (
      (updates.grade === STUDENT_ENUMS.GRADE.SECOND_SECONDARY || updates.grade === STUDENT_ENUMS.GRADE.THIRD_SECONDARY) &&
      updates.division &&
      ![STUDENT_ENUMS.DIVISION.SCIENTIFIC, STUDENT_ENUMS.DIVISION.LITERARY].includes(updates.division)
    ) {
      return res.status(400).json({ message: " 2 and 3 grade must have division literary or scientific" });
    }

    // ✅ Validate availabilityType if provided
    if (updates.availabilityType && !Object.values(SESSION_TIME).includes(updates.availabilityType)) {
      return res.status(400).json({ message: " Invalid availabilityType" });
    }

    // ✅ Handle availabilityType logic
    if (updates.availabilityType === SESSION_TIME.SCHEDULED && !updates.availableAt) {
      return res.status(400).json({ message: " availableAt is required when availabilityType is SCHEDULED" });
    }

    if (updates.availabilityType === SESSION_TIME.IMMEDIATE) {
      // لو غير من SCHEDULED لـ IMMEDIATE، نحط availableAt = Date.now()
      updates.availableAt = Date.now();
    }

    if (updates.availabilityType === SESSION_TIME.IMMEDIATE && updates.availableAt ) {
      return res.status(400).json({ message: " availableAt is not required when availabilityType is IMMEDIATE" });
    }

    // ✅ Validate prerequisites if provided
    if (updates.prerequisites) {
      if (!Array.isArray(updates.prerequisites)) {
        return res.status(400).json({ message: " prerequisites must be an array of session IDs" });
      }

      const allValid = updates.prerequisites.every(id => mongoose.Types.ObjectId.isValid(id));
      if (!allValid) {
        return res.status(400).json({ message: " prerequisites contains invalid ObjectId(s)" });
      }

      const foundSessions = await Session.find({ _id: { $in: updates.prerequisites } }).select("_id");
      if (foundSessions.length !== updates.prerequisites.length) {
        return res.status(400).json({ message: " One or more prerequisite sessions not found" });
      }
    }

    // ✅ Validate Homework, Section, Exam if provided
    if (updates.homework) {
      const homeworkExists = await Homework.findById(updates.homework);
      if (!homeworkExists) {
        return res.status(400).json({ message: " Homework not found" });
      }
    }

    if (updates.section) {
      const sectionExists = await Section.findById(updates.section);
      if (!sectionExists) {
        return res.status(400).json({ message: " Section not found" });
      }
    }

    if (updates.exam) {
      const examExists = await Exam.findById(updates.exam);
      if (!examExists) {
        return res.status(400).json({ message: " Exam not found" });
      }
    }

    // ✅ Filter allowed fields only
    const filteredUpdates = {};
    for (let key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    // ✅ Check if any actual change
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
    ).populate("prerequisites homework section exam createdByTeacher createdByAdmin");

    return res.status(200).json({
      message: "✅ Session updated successfully",
      session: updatedSession
    });

  } catch (error) {
    console.log(" Error in update_session_teacher_service_teacher =====>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const delete_session_teacher_service  = async (req, res) => {
  try {
    const { _id :loginUserId ,role: ROLE  } = req.login_user;
    const { sessionId } = req.params;

    if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(404).json({ message: " Teacher not found" });
      }
    } else if (ROLE === system_role.ADMIN) {
      const admin = await Admin.findOne({ user: loginUserId });
      if (!admin) {
        return res.status(404).json({ message: " Admin not found" });
      }
    } else {
      return res.status(403).json({ message: " You are not allowed to perform this action" });
    }

    const currentSession = await Session.findById(sessionId);
    if (!currentSession) {
      return res.status(404).json({ message: " Session not found" });
    }

    const deletedSession = await Session.findByIdAndDelete(sessionId);

    return res.status(200).json({
      message: "✅ Session deleted successfully",
      session: deletedSession,
    });
  } catch (error) {
    console.log(" error in delete_session_teacher_service ===========> ", error);
    return res.status(500).json({ message: "internal server error" });
  }
};








//===================== ✅ 1.👨‍🏫 Teacher  / admin ==> homework ❤
export const add_Homework_ToSession_service = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { _id: loginUserId, role: ROLE } = req.login_user;
    const {
      title,
      description,
      isActive ,
      availableFrom,
      deadline,
      questions,
      expectedMCQCount,
      expectedEssayCount,
      totalGrade,
      expectedPoints
    } = req.body;


    let  assignedByAdmin;
    let  assignedByTeacher;

    if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(404).json({ message: " Teacher not found" });
      }
      assignedByTeacher = teacher._id;
    } else if (ROLE === system_role.ADMIN) {
      const admin = await Admin.findOne({ user: loginUserId });
      if (!admin) {
        return res.status(404).json({ message: " Admin not found for provided teacherIdForAssign" });
      }
       assignedByAdmin = admin._id;
    } else {
      return res.status(403).json({ message: " You are not allowed to perform this action" });
    }

    if (!title) {
      return res.status(400).json({ message: " You must fill the title" });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: " You must provide at least one question" });
    }

    if (!expectedMCQCount || !expectedEssayCount || !totalGrade || !expectedPoints ) {
      return res.status(400).json({ message: " You must provide expectedMCQCount, expectedEssayCount, and totalGrade , expectedPoints" });
    }

    // ✅ Counters
    let totalPoints = 0;
    let totalGradeFromQuestions = 0;
    let countEssayQuestions = 0;
    let countMCQQuestions = 0;

    // ✅ Validate each question
    for (const q of questions) {
      if (!q.questionText || !q.type || !q.points || !q.grade ) {
        return res.status(400).json({
          message: " Each question must include questionText, type, points, grade, and correctAnswer"
        });
      }

      totalPoints += q.points;
      totalGradeFromQuestions += q.grade;

      if (q.type === HOMEWORK_QUESTION_TYPE.ESSAY) {
        countEssayQuestions++;
        if (q.options && q.options.length > 0) {
          return res.status(400).json({
            message: " Essay questions should not have options"
          });
        }
        if (q.correctAnswer) {
          return res.status(400).json({
            message: " Essay questions should not have any correctAnswer"
          });
        }
      }

      if (q.type === HOMEWORK_QUESTION_TYPE.MULTIPLE_CHOICE) {
        countMCQQuestions++;
        if (!Array.isArray(q.options) || q.options.length < 2) {
          return res.status(400).json({
            message: " Multiple choice questions must have at least 2 options"
          });
        }
        if (!q.options.includes(q.correctAnswer)) {
          return res.status(400).json({
            message: " correctAnswer must be one of the options"
          });
        }
      }
    }

    // ✅ Validate counts
    if (countMCQQuestions !== expectedMCQCount) {
      return res.status(400).json({
        message: ` Expected ${expectedMCQCount} MCQ questions, but got ${countMCQQuestions}`
      });
    }

    if (countEssayQuestions !== expectedEssayCount) {
      return res.status(400).json({
        message: ` Expected ${expectedEssayCount} Essay questions, but got ${countEssayQuestions}`
      });
    }

    // ✅ Validate total grade
    if (totalGrade !== totalGradeFromQuestions) {
      return res.status(400).json({
        message: ` totalGrade (${totalGrade}) does not match sum of question grades (${totalGradeFromQuestions})`
      });
    }

       // ✅ Validate total points
    if (expectedPoints !== totalPoints) {
      return res.status(400).json({
        message: ` expectedPoints (${expectedPoints}) does not match sum of question points (${totalPoints})`
      });
    }

    // ✅ Get session
    const sessionExist = await Session.findById(sessionId);
    if (!sessionExist) {
      return res.status(404).json({ message: " Session not found" });
    }

    // ✅ Create new homework
    const newHomework = new Homework({
      title,
      description,
      session: sessionId,
      availableFrom: availableFrom || sessionExist.createdAt || sessionExist.availableAt,
      deadline: deadline || new Date(sessionExist.createdAt).setDate(new Date(sessionExist.createdAt).getDate() + 7),
      grade: sessionExist.grade,
      division: sessionExist.division,
      assignedByTeacher:  assignedByTeacher || null ,
      assignedByAdmin:  assignedByAdmin || null ,
      isActive,
      questions,
      totalQuestions: questions.length,
      totalPoints,
      totalGrade,
      countEssayQuestions,
      countMCQQuestions
    });

    await newHomework.save();

    await Session.findByIdAndUpdate(sessionId, { homework: newHomework._id });

    return res.status(201).json({ message: "✅ Homework linked to session", homework: newHomework });

  } catch (error) {
    console.error(" Error in add_Homework_ToSession_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const update_Homework_service = async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const { _id: loginUserId, role: ROLE } = req.login_user;
    const {
      title,
      description,
      availableFrom,
      deadline,
      questions,
      expectedMCQCount,
      expectedEssayCount,
      totalGrade,
      expectedPoints
    } = req.body;

    // ✅ Get homework
    const homework = await Homework.findById(homeworkId);
    if (!homework) {
      return res.status(404).json({ message: " Homework not found" });
    }

    // ✅ Role validation
    if (ROLE === system_role.ADMIN) {
      const adminExist = await Admin.findOne({ user: loginUserId });
      if (!adminExist) {
        return res.status(403).json({ message: " You are not a valid admin" });
      }
    } else if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(403).json({ message: " You are not a valid teacher" });
      }
    } else {
      return res.status(403).json({ message: " You are not allowed to perform this action" });
    }

    // ✅ Prepare updates
    let updates = {};
    if (title && title !== homework.title) updates.title = title;
    if (description && description !== homework.description) updates.description = description;
    if (availableFrom && new Date(availableFrom).toISOString() !== homework.availableFrom.toISOString()) updates.availableFrom = availableFrom;
    if (deadline && new Date(deadline).toISOString() !== homework.deadline.toISOString()) updates.deadline = deadline;

    // ✅ Handle Questions Update
    if (questions) {
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: " You must provide at least one question" });
      }

      const updatedQuestions = [...homework.questions]; // copy old questions

      // ✅ Merge & Add new questions
      for (const q of questions) {
        if (!q.questionText || !q.type || !q.points || !q.grade) {
          return res.status(400).json({
            message: " Each question must include questionText, type, points, grade, and correctAnswer"
          });
        }

        if (q._id) {
          const index = updatedQuestions.findIndex(existingQ => existingQ._id.toString() === q._id);
          if (index === -1) {
            return res.status(404).json({ message: ` Question with ID ${q._id} not found` });
          }
          updatedQuestions[index] = { ...updatedQuestions[index]._doc, ...q };
        } else {
          updatedQuestions.push(q);
        }
      }

// ✅ Validate counts & totals
let totalPoints = 0;
let totalGradeFromQuestions = 0;
let countEssayQuestions = 0;
let countMCQQuestions = 0;

for (const q of updatedQuestions) {
  totalPoints += q.points;
  totalGradeFromQuestions += q.grade;

  if (q.type === SECTION_QUESTION_TYPE.ESSAY) {
    countEssayQuestions++;
    if (q.options && q.options.length > 0) {
      return res.status(400).json({ message: " Essay questions should not have options" });
    }
    if (q.correctAnswer) {
      return res.status(400).json({ message: " Essay questions should not have any correctAnswer" });
    }
  }

  if (q.type === SECTION_QUESTION_TYPE.MULTIPLE_CHOICE) {
    countMCQQuestions++;
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return res.status(400).json({ message: " Multiple choice questions must have at least 2 options" });
    }
    if (!q.options.includes(q.correctAnswer)) {
      return res.status(400).json({ message: " correctAnswer must be one of the options" });
    }
  }
}

// ✅ Instead of returning error, auto-fix or override
if (expectedMCQCount && expectedMCQCount !== countMCQQuestions) {
  console.warn(` expectedMCQCount (${expectedMCQCount}) != actual (${countMCQQuestions}) → Adjusting`);
}

if (expectedEssayCount && expectedEssayCount !== countEssayQuestions) {
  console.warn(` expectedEssayCount (${expectedEssayCount}) != actual (${countEssayQuestions}) → Adjusting`);
}

if (totalGrade && totalGrade !== totalGradeFromQuestions) {
  console.warn(` totalGrade (${totalGrade}) != actual (${totalGradeFromQuestions}) → Adjusting`);
}

if (expectedPoints && expectedPoints !== totalPoints) {
  console.warn(` expectedPoints (${expectedPoints}) != actual (${totalPoints}) → Adjusting`);
}

// ✅ Always set correct values
updates.questions = updatedQuestions;
updates.totalQuestions = updatedQuestions.length;
updates.totalPoints = totalPoints;
updates.totalGrade = totalGradeFromQuestions;
updates.countEssayQuestions = countEssayQuestions;
updates.countMCQQuestions = countMCQQuestions;

    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: " No changes detected" });
    }

    // ✅ Save updates
    const updatedHomework = await Homework.findByIdAndUpdate(homeworkId, updates, { new: true });

    return res.status(200).json({ message: "✅ Homework updated successfully", homework: updatedHomework });

  } catch (error) {
    console.error(" Error in update_Homework_service:", error);
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
      return res.status(404).json({ message: " Homework not found" });
    }

    // ✅ Check roles
    if (ROLE === system_role.ADMIN) {
      const adminExist = await Admin.findOne({ user: loginUserId });
      if (!adminExist) {
        return res.status(403).json({ message: " You are not a valid admin" });
      }
    } else if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(403).json({ message: " You are not a valid teacher" });
      }
    } else {
      return res.status(403).json({ message: " You are not allowed to perform this action" });
    }

    // ✅ Delete homework
    await Homework.findByIdAndDelete(homeworkId);

    // ✅ Remove homework reference from session
    await Session.findByIdAndUpdate(homework.session, { $unset: { homework: "" } });

    return res.status(200).json({ message: "✅ Homework deleted successfully" });

  } catch (error) {
    console.error(" Error in deleteHomework:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};







//===================== ✅ 2. 👨‍🏫 Teacher  / admin ==> Section  ❤
export const add_Section_ToSession_service = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { _id: loginUserId, role: ROLE } = req.login_user;
    const {
      title,
      description,
      isActive ,
      availableFrom,
      deadline,
      questions,
      expectedMCQCount,
      expectedEssayCount,
      totalGrade,
      expectedPoints
    } = req.body;
    
    
    let assignedByAdmin;
    let assignedByTeacher;

    if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(404).json({ message: " Teacher not found" });
      }
      assignedByTeacher = teacher._id;
    } else if (ROLE === system_role.ADMIN) {
      const admin = await Admin.findOne({ user: loginUserId });
      if (!admin) {
        return res.status(404).json({ message: " Admin not found" });
      }
      assignedByAdmin = admin._id;
    } else {
      return res.status(403).json({ message: " You are not allowed to perform this action" });
    }


    if (!title) {
      return res.status(400).json({ message: " You must fill the title" });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: " You must provide at least one question" });
    }

    if (!expectedMCQCount || !expectedEssayCount || !totalGrade || !expectedPoints) {
      return res.status(400).json({
        message: " You must provide expectedMCQCount, expectedEssayCount, totalGrade, and expectedPoints"
      });
    }

    // ✅ Counters
    let totalPoints = 0;
    let totalGradeFromQuestions = 0;
    let countEssayQuestions = 0;
    let countMCQQuestions = 0;

    // ✅ Validate questions
    for (const q of questions) {
      if (!q.questionText || !q.type || !q.points || !q.grade) {
        return res.status(400).json({
          message: " Each question must include questionText, type, points, grade, and correctAnswer"
        });
      }

      totalPoints += q.points;
      totalGradeFromQuestions += q.grade;

      if (q.type === SECTION_QUESTION_TYPE.ESSAY) {
        countEssayQuestions++;
        if (q.options && q.options.length > 0) {
          return res.status(400).json({
            message: " Essay questions should not have options"
          });
        }
        if (q.correctAnswer) {
          return res.status(400).json({
            message: " Essay questions should not have any correctAnswer"
          });
        }
      }

      if (q.type === SECTION_QUESTION_TYPE.MULTIPLE_CHOICE) {
        countMCQQuestions++;
        if (!Array.isArray(q.options) || q.options.length < 2) {
          return res.status(400).json({
            message: " Multiple choice questions must have at least 2 options"
          });
        }
        if (!q.options.includes(q.correctAnswer)) {
          return res.status(400).json({
            message: " correctAnswer must be one of the options"
          });
        }
      }
    }

    // ✅ Validate counts
    if (countMCQQuestions !== expectedMCQCount) {
      return res.status(400).json({
        message: ` Expected ${expectedMCQCount} MCQ questions, but got ${countMCQQuestions}`
      });
    }

    if (countEssayQuestions !== expectedEssayCount) {
      return res.status(400).json({
        message: ` Expected ${expectedEssayCount} Essay questions, but got ${countEssayQuestions}`
      });
    }

    // ✅ Validate total grade
    if (totalGrade !== totalGradeFromQuestions) {
      return res.status(400).json({
        message: ` totalGrade (${totalGrade}) does not match sum of question grades (${totalGradeFromQuestions})`
      });
    }

    // ✅ Validate total points
    if (expectedPoints !== totalPoints) {
      return res.status(400).json({
        message: ` expectedPoints (${expectedPoints}) does not match sum of question points (${totalPoints})`
      });
    }

    // ✅ Get session
    const sessionExist = await Session.findById(sessionId);
    if (!sessionExist) {
      return res.status(404).json({ message: " Session not found" });
    }


    // ✅ Create new section
    const newSection = new Section({
      title,
      description,
      session: sessionId,
      availableFrom: availableFrom || sessionExist.createdAt || sessionExist.availableAt,
      deadline: deadline || new Date(sessionExist.createdAt).setDate(new Date(sessionExist.createdAt).getDate() + 7),
      grade: sessionExist.grade,
      division: sessionExist.division,
      assignedByTeacher: assignedByTeacher || null,
      assignedByAdmin: assignedByAdmin || null,
      isActive,
      questions,
      totalQuestions: questions.length,
      totalPoints,
      totalGrade,
      countEssayQuestions,
      countMCQQuestions
    });

    await newSection.save();

    await Session.findByIdAndUpdate(sessionId, { section: newSection._id });

    return res.status(201).json({ message: "✅ Section added successfully", section: newSection });

  } catch (error) {
    console.error(" Error in add_Section_ToSession_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const update_Section_service = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { _id: loginUserId, role: ROLE } = req.login_user;
    const {
      title,
      description,
      availableFrom,
      deadline,
      questions,
      expectedMCQCount,
      expectedEssayCount,
      totalGrade,
      expectedPoints
    } = req.body;

    // ✅ Get section
    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ message: " Section not found" });
    }

    // ✅ Role validation
    if (ROLE === system_role.ADMIN) {
      const adminExist = await Admin.findOne({ user: loginUserId });
      if (!adminExist) {
        return res.status(403).json({ message: " You are not a valid admin" });
      }
    } else if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(403).json({ message: " You are not a valid teacher" });
      }
    } else {
      return res.status(403).json({ message: " You are not allowed to perform this action" });
    }

    // ✅ Prepare updates
    let updates = {};
    if (title && title !== section.title) updates.title = title;
    if (description && description !== section.description) updates.description = description;
    if (availableFrom && new Date(availableFrom).toISOString() !== section.availableFrom.toISOString()) updates.availableFrom = availableFrom;
    if (deadline && new Date(deadline).toISOString() !== section.deadline.toISOString()) updates.deadline = deadline;

    // ✅ Handle Questions Update
    if (questions) {
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: " You must provide at least one question" });
      }

      const updatedQuestions = [...section.questions]; // copy old questions

      // ✅ Merge & Add new questions
      for (const q of questions) {
        if (!q.questionText || !q.type || !q.points || !q.grade) {
          return res.status(400).json({
            message: " Each question must include questionText, type, points, grade, and correctAnswer"
          });
        }

        if (q._id) {
          const index = updatedQuestions.findIndex(existingQ => existingQ._id.toString() === q._id);
          if (index === -1) {
            return res.status(404).json({ message: ` Question with ID ${q._id} not found` });
          }
          updatedQuestions[index] = { ...updatedQuestions[index]._doc, ...q };
        } else {
          updatedQuestions.push(q);
        }
      }

      // ✅ Validate counts & totals
      let totalPoints = 0;
      let totalGradeFromQuestions = 0;
      let countEssayQuestions = 0;
      let countMCQQuestions = 0;

      for (const q of updatedQuestions) {
        totalPoints += q.points;
        totalGradeFromQuestions += q.grade;

        if (q.type === HOMEWORK_QUESTION_TYPE.ESSAY) {
          countEssayQuestions++;
          if (q.options && q.options.length > 0) {
            return res.status(400).json({ message: " Essay questions should not have options" });
          }
          if (q.correctAnswer) {
            return res.status(400).json({ message: " Essay questions should not have any correctAnswer" });
          }
        }

        if (q.type === HOMEWORK_QUESTION_TYPE.MULTIPLE_CHOICE) {
          countMCQQuestions++;
          if (!Array.isArray(q.options) || q.options.length < 2) {
            return res.status(400).json({ message: " Multiple choice questions must have at least 2 options" });
          }
          if (!q.options.includes(q.correctAnswer)) {
            return res.status(400).json({ message: " correctAnswer must be one of the options" });
          }
        }
      }

      // ✅ Instead of returning error, auto-fix or override
      if (expectedMCQCount && expectedMCQCount !== countMCQQuestions) {
        console.warn(` expectedMCQCount (${expectedMCQCount}) != actual (${countMCQQuestions}) → Adjusting`);
      }

      if (expectedEssayCount && expectedEssayCount !== countEssayQuestions) {
        console.warn(` expectedEssayCount (${expectedEssayCount}) != actual (${countEssayQuestions}) → Adjusting`);
      }

      if (totalGrade && totalGrade !== totalGradeFromQuestions) {
        console.warn(` totalGrade (${totalGrade}) != actual (${totalGradeFromQuestions}) → Adjusting`);
      }

      if (expectedPoints && expectedPoints !== totalPoints) {
        console.warn(` expectedPoints (${expectedPoints}) != actual (${totalPoints}) → Adjusting`);
      }

      // ✅ Always set correct values
      updates.questions = updatedQuestions;
      updates.totalQuestions = updatedQuestions.length;
      updates.totalPoints = totalPoints;
      updates.totalGrade = totalGradeFromQuestions;
      updates.countEssayQuestions = countEssayQuestions;
      updates.countMCQQuestions = countMCQQuestions;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: " No changes detected" });
    }

    // ✅ Save updates
    const updatedSection = await Section.findByIdAndUpdate(sectionId, updates, { new: true });

    return res.status(200).json({ message: "✅ Section updated successfully", section: updatedSection });

  } catch (error) {
    console.error(" Error in update_Section_service:", error);
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
      return res.status(404).json({ message: " Section not found" });
    }

    // ✅ Check roles
    if (ROLE === system_role.ADMIN) {
      const adminExist = await Admin.findOne({ user: loginUserId });
      if (!adminExist) {
        return res.status(403).json({ message: " You are not a valid admin" });
      }
    } else if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(403).json({ message: " You are not a valid teacher" });
      }
    } else {
      return res.status(403).json({ message: " You are not allowed to perform this action" });
    }

    // ✅ Delete section
    await Section.findByIdAndDelete(sectionId);

    // ✅ Remove section reference from session
    await Session.findByIdAndUpdate(section.session, { $unset: { section: "" } });

    return res.status(200).json({ message: "✅ Section deleted successfully" });

  } catch (error) {
    console.error(" Error in deleteSection:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};




// =================👨‍🏫 Teacher Add  Exam ❤

// all kind of exams even monthly
export const add_exam_service = async (req, res) => {
  try {
    const { _id: loginUserId, role: ROLE } = req.login_user;
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
      isActive,
      grade,
      division
    } = req.body;

    // ✅ تحقق من الحقول الأساسية
    if (!title || !examType || !timeType || !questions || !grade || !division || !duration ) {
      return res.status(400).json({ message: " Please fill in all required fields" });
    }

    let createdByAdmin;
    let createdByTeacher;
    if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(404).json({ message: " Teacher not found" });
      }
      createdByTeacher = teacher._id;
    } else if (ROLE === system_role.ADMIN) {
      const admin = await Admin.findOne({ user: loginUserId });
      if (!admin) {
        return res.status(404).json({ message: " Admin not found" });
      }
      createdByAdmin = admin._id;
    } else {
      return res.status(403).json({ message: " You are not allowed to perform this action" });
    }

    // if the exam is monthly
    if (examType === EXAM_TYPE.MONTHLY ) {

    if (grade && !Object.values(STUDENT_ENUMS.GRADE).includes(grade)) {
      return res.status(400).json({ message: " Invalid grade" });
    }

    if (division && !Object.values(STUDENT_ENUMS.DIVISION).includes(division)) {
      return res.status(400).json({ message: " Invalid division" });
    }

    if (grade == STUDENT_ENUMS.GRADE.FIRST_SECONDARY &&
      (division == STUDENT_ENUMS.DIVISION.SCIENTIFIC || STUDENT_ENUMS.DIVISION.LITERARY)) {
      return res.status(400).json({ message: " there is no division with the grade" });
    }

    if (
      (grade === STUDENT_ENUMS.GRADE.SECOND_SECONDARY || grade === STUDENT_ENUMS.GRADE.THIRD_SECONDARY) &&
      ![STUDENT_ENUMS.DIVISION.SCIENTIFIC, STUDENT_ENUMS.DIVISION.LITERARY].includes(division)
    ) {
      return res.status(400).json({ message: " 2 and 3 grade must have division literary or scientific" });
    }

    }
    if (examType === EXAM_TYPE.MONTHLY && !month) {
   return res.status(400).json({ message: " Month is required for monthly exams" });
    }   
    if (examType === EXAM_TYPE.MONTHLY && relatedSession) {
      return res.status(400).json({ message: " Monthly exams cannot have relatedSession" });
    }
    




    // if the exam is session
    let sessionId = null
    let sessionGrade = null
    let sessionDivision = null

    if (examType === EXAM_TYPE.SESSION ) {
      const session = await Session.findById(relatedSession);
      if (!session) {
        return res.status(400).json({ message: " Related session not found" });
      }
      sessionId = session._id
      sessionGrade = session.grade
      sessionDivision = session.division
    }

    if (examType === EXAM_TYPE.SESSION && !relatedSession) {
      return res.status(400).json({ message: " You must provide relatedSession for session exams" });
    }




    // time check
    if (timeType === EXAM_TIME_TYPE.FIXED_TIME &&  (!startTime || !endTime ) ) {
      return res.status(400).json({ message: " when the exam is fixed need to have start and end time" });
    }

    if (timeType === EXAM_TIME_TYPE.DEADLINE &&  !deadline   ) {
      return res.status(400).json({ message: " when the exam is deadline need to have deadline" });
    }



    // questions check
    if (!questions.multipleChoices && !questions.essay && !questions.questionBank) {
      return res.status(400).json({ message: " You must provide at least one question set (MCQ, Essay, or Question Bank)" });
    }

    let totalPoints = 0;
    let totalGrades = 0;

    // ✅ فحص multipleChoices
    if (questions.multipleChoices && questions.multipleChoices.length > 0) {
      for (const q of questions.multipleChoices) {
        if (!q.questionText || !Array.isArray(q.options) || q.options.length < 2 || !q.correctAnswer) {
          return res.status(400).json({ message: " Each multiple choice question must have questionText, options (min 2), and correctAnswer" });
        }
        if (!q.options.includes(q.correctAnswer)) {
          return res.status(400).json({ message: " correctAnswer must be one of the options" });
        }
        if (q.point <= 0 || q.grade <= 0) {
          return res.status(400).json({ message: " Each MCQ must have positive point and grade" });
        }
        totalPoints += q.point;
        totalGrades += q.grade;
      }
    }

    // ✅ فحص essay
    if (questions.essay && questions.essay.length > 0) {
      for (const q of questions.essay) {
        if (!q.questionText || q.options ) {
          return res.status(400).json({ message: " Each essay question must have questionText and no options " });
        }
        if (q.correctAnswer) {
          return res.status(400).json({ message: " Essay questions should not have a correctAnswer" });
        }
        if (q.point <= 0 || q.grade <= 0) {
          return res.status(400).json({ message: " Each essay question must have positive point and grade" });
        }
        totalPoints += q.point;
        totalGrades += q.grade;
      }
    }

    // ✅ فحص questionBank
    if (questions.questionBank && questions.questionBank.length > 0) {
      for (const group of questions.questionBank) {
        if (!group.questionsGroupName || !group.questions || group.questions.length === 0) {
          return res.status(400).json({ message: " Each question bank group must have a name and at least one question" });
        }
        for (const q of group.questions) {
          if (!q.questionText || !Array.isArray(q.options) || q.options.length < 2 || !q.correctAnswer) {
            return res.status(400).json({ message: " Each question in question bank must have questionText, options (min 2), and correctAnswer" });
          }
          if (!q.options.includes(q.correctAnswer)) {
            return res.status(400).json({ message: " correctAnswer in question bank must be one of the options" });
          }
          if (q.point <= 0 || q.grade <= 0) {
            return res.status(400).json({ message: " Each question in question bank must have positive point and grade" });
          }
          totalPoints += q.point;
          totalGrades += q.grade;
        }
      }
    }


    // ✅ إنشاء الامتحان
    const newExam = await Exam.create({
      title,
      examType,
      questions,
      relatedSession: examType == EXAM_TYPE.SESSION ? sessionId : null,
      timeType,
      startTime,
      endTime,
      duration,
      deadline,
      createdByTeacher: createdByTeacher || null,
      createdByAdmin: createdByAdmin || null,
      month,
      isActive,
      grade : examType == EXAM_TYPE.MONTHLY ? grade : sessionGrade ,
      division : examType == EXAM_TYPE.MONTHLY ? division : sessionDivision ,
      totalPoints,
      totalGrades
    });



    if (examType === EXAM_TYPE.SESSION) {
      const session = await Session.findById(sessionId);
      if (!session) {
        return res.status(404).json({ message: " Session not found while linking exam" });
      }
      session.exam = newExam._id;
      await session.save();
    }

    return res.status(201).json({
      message: "✅ Exam created successfully",
      exam: newExam
    });
  } catch (error) {
    console.error(" Error in add_exam_service_teacher:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//==================== still under testing ==================
export const update_exam_service = async (req, res) => {
  try {
    const { examId } = req.params;
    const { _id: loginUserId, role: ROLE } = req.login_user;
    const { updates } = req.body;

    // ✅ Role Validation
    if (ROLE === system_role.ADMIN) {
      const adminExist = await Admin.findOne({ user: loginUserId });
      if (!adminExist) {
        return res.status(403).json({ message: " You are not a valid admin" });
      }
    } else if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(403).json({ message: " You are not a valid teacher" });
      }
    } else {
      return res.status(403).json({ message: " You are not allowed to perform this action" });
    }

    // ✅ Fetch Exam
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: " Exam not found" });
    }

    // ✅ Session Handling if examType changed or relatedSession changed
    let sessionId = exam.relatedSession;
    let sessionGrade = exam.grade;
    let sessionDivision = exam.division;

    if (updates?.examType ) {
    if (updates.examType === EXAM_TYPE.SESSION || (exam.examType === EXAM_TYPE.SESSION && updates.relatedSession)) {
      if (!updates.relatedSession && !exam.relatedSession) {
        return res.status(400).json({ message: " relatedSession is required for session exams" });
      }
      const session = await Session.findById(updates.relatedSession || exam.relatedSession);
      if (!session) {
        return res.status(400).json({ message: " Related session not found" });
      }
      sessionId = session._id;
      sessionGrade = session.grade;
      sessionDivision = session.division;
    }

    // ✅ Monthly Exam Checks
    if (updates.examType === EXAM_TYPE.MONTHLY || (exam.examType === EXAM_TYPE.MONTHLY && updates.grade)) {
      if (!updates.month && !exam.month) {
        return res.status(400).json({ message: " Month is required for monthly exams" });
      }
      if (updates.relatedSession) {
        return res.status(400).json({ message: " Monthly exams cannot have relatedSession" });
      }

      const gradeToCheck = updates.grade || exam.grade;
      const divisionToCheck = updates.division || exam.division;

      if (!Object.values(STUDENT_ENUMS.GRADE).includes(gradeToCheck)) {
        return res.status(400).json({ message: " Invalid grade" });
      }
      if (!Object.values(STUDENT_ENUMS.DIVISION).includes(divisionToCheck)) {
        return res.status(400).json({ message: " Invalid division" });
      }

      if (gradeToCheck === STUDENT_ENUMS.GRADE.FIRST_SECONDARY &&
        (divisionToCheck === STUDENT_ENUMS.DIVISION.SCIENTIFIC || divisionToCheck === STUDENT_ENUMS.DIVISION.LITERARY)) {
        return res.status(400).json({ message: " there is no division with the grade" });
      }

      if (
        (gradeToCheck === STUDENT_ENUMS.GRADE.SECOND_SECONDARY || gradeToCheck === STUDENT_ENUMS.GRADE.THIRD_SECONDARY) &&
        ![STUDENT_ENUMS.DIVISION.SCIENTIFIC, STUDENT_ENUMS.DIVISION.LITERARY].includes(divisionToCheck)
      ) {
        return res.status(400).json({ message: " 2 and 3 grade must have division literary or scientific" });
      }
    }

    // ✅ Time Checks
    if (updates.timeType === EXAM_TIME_TYPE.FIXED_TIME || exam.timeType === EXAM_TIME_TYPE.FIXED_TIME) {
      const start = updates.startTime || exam.startTime;
      const end = updates.endTime || exam.endTime;
      if (!start || !end) {
        return res.status(400).json({ message: " Fixed time exams require start and end time" });
      }
    }
    if (updates.timeType === EXAM_TIME_TYPE.DEADLINE || exam.timeType === EXAM_TIME_TYPE.DEADLINE) {
      const deadline = updates.deadline || exam.deadline;
      if (!deadline) {
        return res.status(400).json({ message: " Deadline exams require a deadline" });
      }
    }}

    // ✅ Update Basic Fields
    for (const key in updates) {
      if (key !== 'questions') {
        exam[key] = updates[key];
      }
    }

    let { multipleChoices, essay, questionBank } = updates?.questions || {};

    // ✅ Update Multiple Choice Questions
    if (multipleChoices && multipleChoices.length > 0) {
      for (const q of multipleChoices) {
        if (q._id) {
          const existingQ = exam.questions.multipleChoices.id(q._id);
          if (existingQ) {
            Object.assign(existingQ, q);
          }
        } else {
          if (!q.questionText || !Array.isArray(q.options) || q.options.length < 2 || !q.correctAnswer) {
            return res.status(400).json({ message: " Each MCQ must have questionText, options (min 2), and correctAnswer" });
          }
          if (!q.options.includes(q.correctAnswer)) {
            return res.status(400).json({ message: " correctAnswer must be one of the options" });
          }
          if (q.point <= 0 || q.grade <= 0) {
            return res.status(400).json({ message: " Each MCQ must have positive point and grade" });
          }
          exam.questions.multipleChoices.push(q);
        }
      }
    }

    // ✅ Update Essay Questions
    if (essay && essay.length > 0) {
      for (const q of essay) {
        if (q._id) {
          const existingQ = exam.questions.essay.id(q._id);
          if (existingQ) {
            Object.assign(existingQ, q);
          }
        } else {
          if (!q.questionText || q.options || q.correctAnswer) {
            return res.status(400).json({ message: " Essay question must have questionText only" });
          }
          if (q.point <= 0 || q.grade <= 0) {
            return res.status(400).json({ message: " Each essay question must have positive point and grade" });
          }
          exam.questions.essay.push(q);
        }
      }
    }

    // ✅ Update Question Bank
    if (questionBank && questionBank.length > 0) {
      for (const group of questionBank) {
        if (group._id) {
          const existingGroup = exam.questions.questionBank.id(group._id);
          if (existingGroup) {
            existingGroup.questionsGroupName = group.questionsGroupName || existingGroup.questionsGroupName;
            if (group.questions && group.questions.length > 0) {
              for (const q of group.questions) {
                if (q._id) {
                  const existingQ = existingGroup.questions.id(q._id);
                  if (existingQ) {
                    Object.assign(existingQ, q);
                  }
                } else {
                  if (!q.questionText || !Array.isArray(q.options) || q.options.length < 2 || !q.correctAnswer) {
                    return res.status(400).json({ message: " Each question in question bank must have questionText, options (min 2), and correctAnswer" });
                  }
                  if (!q.options.includes(q.correctAnswer)) {
                    return res.status(400).json({ message: " correctAnswer must be one of the options" });
                  }
                  if (q.point <= 0 || q.grade <= 0) {
                    return res.status(400).json({ message: " Each question must have positive point and grade" });
                  }
                  existingGroup.questions.push(q);
                }
              }
            }
          }
        } else {
          if (!group.questionsGroupName || !group.questions || group.questions.length === 0) {
            return res.status(400).json({ message: " Each question bank group must have a name and questions" });
          }
          for (const q of group.questions) {
            if (!q.questionText || !Array.isArray(q.options) || q.options.length < 2 || !q.correctAnswer) {
              return res.status(400).json({ message: " Each question in question bank must have questionText, options (min 2), and correctAnswer" });
            }
            if (!q.options.includes(q.correctAnswer)) {
              return res.status(400).json({ message: " correctAnswer must be one of the options" });
            }
            if (q.point <= 0 || q.grade <= 0) {
              return res.status(400).json({ message: " Each question must have positive point and grade" });
            }
          }
          exam.questions.questionBank.push(group);
        }
      }
    }

    await exam.save();
    return res.status(200).json({
      message: "✅ Exam updated successfully",
      exam,
    });

  } catch (error) {
    console.error(" error in update_exam_service_teacher:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

  
export const delete_exam_service = async (req, res) => {
  try {
    const { examId } = req.params;
    const { _id : loginUserId , role :ROLE } = req.login_user;

    // ✅ Role validation
    if (ROLE === system_role.ADMIN) {
      const adminExist = await Admin.findOne({ user: loginUserId });
      if (!adminExist) {
        return res.status(403).json({ message: " You are not a valid admin" });
      }
    } else if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(403).json({ message: " You are not a valid teacher" });
      }
    } else {
      return res.status(403).json({ message: " You are not allowed to perform this action" });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: " Exam not found" });
    }

    
    if (exam.examType == EXAM_TYPE.SESSION  ) {
      const  session  = await Session.findById(exam.relatedSession);
      if (!session) {
        return res.status(403).json({ message: " there is no session like this " });
      }

      if (session._id == exam.relatedSession  ) {
              
      session.exam = null
      await session.save()
    }
    await exam.deleteOne();

    }

    return res.status(200).json({ message: "✅ Exam deleted successfully" });
  } catch (error) {
    console.error(" error in delete_exam_service_teacher:", error);
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
      return res.status(404).json({ message: " Session not found" });
    }

        // ✅ Validate videoQuizzes
    if (videoQuizzes && Array.isArray(videoQuizzes)) {
      for (let quiz of videoQuizzes) {
        if (!quiz.questionText || !quiz.correctAnswer || !quiz.showAtTime) {
          return res.status(400).json({ message: " Each quiz must have questionText, correctAnswer, and showAtTime" });
        }
        if (!Array.isArray(quiz.options) || quiz.options.length < 2) {
          return res.status(400).json({ message: " Each quiz must have at least 2 options" });
        }
      }
    }

    // ✅ Determine who is assigning
    let isAdminAddIt = false;

    if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(404).json({ message: " Teacher not found" });
      }

    } else if (ROLE === system_role.ADMIN) {
      isAdminAddIt = true;

    } else {
      return res.status(403).json({ message: " You are not allowed to perform this action" });
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
    console.error(" Error in add_video_Quiz_ToSession_service:", error);
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
      return res.status(404).json({ message: " Session not found" });
    }

    // ✅ تحقق من الصلاحيات
    if (ROLE === system_role.ADMIN) {
      const adminExist = await Admin.findOne({ user: loginUserId });
      if (!adminExist) {
        return res.status(403).json({ message: " You are not a valid admin" });
      }
    } else if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(403).json({ message: " You are not a valid teacher" });
      }
    } else {
      return res.status(403).json({ message: " You are not allowed to perform this action" });
    }

    // ✅ ابحث عن الكويز
    const quizIndex = sessionExist.videoQuizzes.findIndex(q => q._id.toString() === quizId);
    if (quizIndex === -1) {
      return res.status(404).json({ message: " Quiz not found" });
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
        return res.status(400).json({ message: " correctAnswer must be one of the options" });
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
    console.error(" Error in update_video_Quiz_inSession_service:", error);
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
      return res.status(404).json({ message: " Session not found" });
    }

    // ✅ Check roles
    if (ROLE === system_role.ADMIN) {
      const adminExist = await Admin.findOne({ user: loginUserId });
      if (!adminExist) {
        return res.status(403).json({ message: " You are not a valid admin" });
      }
    } else if (ROLE === system_role.TEACHER) {
      const teacher = await Teacher.findOne({ user: loginUserId });
      if (!teacher) {
        return res.status(403).json({ message: " You are not a valid teacher" });
      }
    } else {
      return res.status(403).json({ message: " You are not allowed to perform this action" });
    }

    // ✅ تحقق من وجود الكويز واحذفه
    const quizIndex = sessionExist.videoQuizzes.findIndex(q => q._id.toString() === quizId);
    if (quizIndex === -1) {
      return res.status(404).json({ message: " Quiz not found" });
    }

    sessionExist.videoQuizzes.splice(quizIndex, 1);
    await sessionExist.save();

    return res.status(200).json({ message: "✅ Video quiz deleted successfully" });

  } catch (error) {
    console.error(" Error in delete_video_Quiz_fromSession_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};








// any thing below is under testing
//===========================================


