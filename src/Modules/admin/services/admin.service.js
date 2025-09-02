import { hashSync } from "bcrypt";
import { STUDENT_ENUMS, system_role } from "../../../Constants/constants.js";
import Admin from "../../../DB/Models/admin.model.js";
import Teacher from "../../../DB/Models/teacher.model.js";
import User from "../../../DB/Models/user.model.js";
import { decryption, encryption } from "../../../Utils/encryption.utils.js";
import Supervisor from "../../../DB/Models/supervisor.model.js";
import Assistant from "../../../DB/Models/assistant.model.js";
import Accountant from "../../../DB/Models/accountant.model.js";
import Student from "../../../DB/Models/student.model.js";
import Session from "../../../DB/Models/session.model.js";
import { SESSION_TIME , EXAM_TYPE, EXAM_QUESTION_TYPE, EXAM_TIME_TYPE  } from "../../../Constants/constants.js";
import Homework from "../../../DB/Models/homework.model.js";
import Section from './../../../DB/Models/section.model.js';
import Exam from "../../../DB/Models/exam.model.js";
import PaymentCode from "../../../DB/Models/paymentCode.model.js";
import crypto from "crypto";
import mongoose from "mongoose";
import Group from "../../../DB/Models/group.model.js";

/**
 * Get admin details
 */
export const get_admin_service = async (req, res) => {
  try {
    const { _id } = req.login_user; // this is the userId from token

    // 🔎 Find the admin linked to this user
    const adminRecord = await Admin.findOne({ user: _id });
    if (!adminRecord) {
      return res.status(404).json({ message: "Admin profile not found for this user" });
    }

    // Now use the found adminId
    const admin = await Admin.findById(adminRecord._id)
      .populate({ path: "user", select: "-password" })
      .populate({ path: "teachers", select: "-password" })
      .populate({ path: "supervisors", select: "-password" })
      .populate({ path: "assistants", select: "-password" })
      .populate({ path: "accountants", select: "-password" })
      .populate({ path: "sessions", select: "-password" })
      .populate({ path: "exams", select: "-password" });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    return res.status(200).json({
      message: "Admin fetched successfully",
      admin,
    });
  } catch (error) {
    console.log("error in get_admin_service ===========> ", error);
    return res.status(500).json({ message: "internal server error" });
  }
};


export const update_admin_service = async (req, res) => {
  try {
    const { _id } = req.login_user; // userId from token
    const updates = req.body;

    // 1️⃣ Find the admin linked to this user
    const adminRecord = await Admin.findOne({ user: _id });
    if (!adminRecord) {
      return res.status(404).json({ message: "❌ Admin profile not found for this user" });
    }



    // 2️⃣ Get the current user
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

    // 3️⃣ Allow only specific fields to be updated
    const allowedFields = ["name", "email", "phoneNumber"];
    const filteredUpdates = {};

    for (let key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    let isChanged = false;

    // 4️⃣ Check name
    if (filteredUpdates.name && filteredUpdates.name !== user.name) {
      isChanged = true;
    }

    // 5️⃣ Check email
    if (filteredUpdates.email && filteredUpdates.email !== user.email) {
      isChanged = true;
    }

    // 6️⃣ Handle phoneNumber (decrypt before compare)
    if (filteredUpdates.phoneNumber) {
      const decryptedPhone = await decryption({
        cipher: user.phoneNumber,
        secret_key: process.env.PHONE_ENCRYPTION_SECRET,
      });

      if (decryptedPhone !== filteredUpdates.phoneNumber) {
        filteredUpdates.phoneNumber = await encryption({
          value: filteredUpdates.phoneNumber,
          secret_key: process.env.PHONE_ENCRYPTION_SECRET,
        });
        isChanged = true;
      } else {
        delete filteredUpdates.phoneNumber; // no change
      }
    }

    // 7️⃣ If nothing changed
    if (!isChanged) {
      return res.status(400).json({ message: "⚠️ No changes detected" });
    }

    // 8️⃣ Update user data
    await User.findByIdAndUpdate(_id, filteredUpdates, {
      new: true,
      select: "-password",
    });

    // 9️⃣ Get the admin again with populated user
    const updatedAdmin = await Admin.findById(adminRecord._id)
      .populate({ path: "user", select: "-password" })
      .populate("teachers supervisors assistants accountants sessions exams");

    // 🔟 Send response
    return res.status(200).json({
      message: "✅ Admin data updated successfully",
      admin: updatedAdmin,
    });
  } catch (error) {
    console.log("❌ Error in update_admin_service ===========> ", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const delete_admin_service = async (req, res) => {
  try {
    const { _id } = req.login_user; // userId from token

    // Find the admin linked to this user
    const adminRecord = await Admin.findOne({ user: _id });
    if (!adminRecord) {
      return res.status(404).json({ message: "❌ Admin profile not found for this user" });
    }

    // Delete the admin
    const deletedAdmin = await Admin.findByIdAndDelete(adminRecord._id);
    if (!deletedAdmin) {
      return res.status(404).json({ message: "❌ Admin not found" });
    }

    // Delete the linked user
    const deletedUser = await User.findByIdAndDelete(_id);

    return res.status(200).json({
      message: "✅ Admin & User deleted successfully",
      admin: deletedAdmin,
      user: deletedUser,
    });
  } catch (error) {
    console.log("❌ error in delete_admin_service ===========> ", error);
    return res.status(500).json({ message: "internal server error" });
  }
};

// ==================================

/**
 * manipulation  the users
 */

// 📌 Add Teacher
export const add_teacher_service = async (req, res) => {
  try {
    const { _id } = req.login_user; // admin user id from token
    const { name, email, phoneNumber, password, rePassword } = req.body;

    // ✅ check passwords match
    if (password !== rePassword) {
      return res.status(400).json({ message: "❌ Password and Re-Password do not match" });
    }

    // ✅ check admin exists
    const adminRecord = await Admin.findOne({ user: _id });
    if (!adminRecord) {
      return res.status(403).json({ message: "❌ Only admins can add teachers" });
    }

        // ✅ check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "❌ Email already in use" });
    }

    // ✅ encrypt phone
    const encryptedPhone = await encryption({
      value: phoneNumber,
      secret_key: process.env.PHONE_ENCRYPTION_SECRET,
    });

    // ✅ hash password
    const hashedPassword = await hashSync(password , +process.env.PASSWORD_SALT );


    // ✅ create user first
    const newUser = await User.create({
      name,
      email,
      phoneNumber: encryptedPhone,
      password: hashedPassword,
      role: system_role.TEACHER,
    });

    // ✅ create teacher linked to user + admin
    const newTeacher = await Teacher.create({
      user: newUser._id,
      admin: adminRecord._id,
    });

    // ✅ link teacher to admin
    adminRecord.teachers.push(newTeacher._id);
    await adminRecord.save();

    return res.status(201).json({
      message: "✅ Teacher created successfully",
      teacher: await newTeacher.populate("user", "-password"),
    });
  } catch (error) {
    console.log("❌ error in add_teacher_service ===========> ", error);
    return res.status(500).json({ message: "internal server error" });
  }
};

// 📌 Add Supervisor
export const add_supervisor_service = async (req, res) => {
  try {
    const { _id } = req.login_user;
    const { name, email, phoneNumber, password, rePassword, teacherId } = req.body;

    // ✅ check passwords match
    if (password !== rePassword) {
      return res.status(400).json({ message: "❌ Password and Re-Password do not match" });
    }

    // ✅ check admin exists
    const adminRecord = await Admin.findOne({ user: _id });
    if (!adminRecord) {
      return res.status(403).json({ message: "❌ Only admins can add supervisors" });
    }

    // ✅ teacher is required
    if (!teacherId) {
      return res.status(400).json({ message: "❌ Teacher is required" });
    }

    // ✅ check teacher exists
    const teacherRecord = await Teacher.findById(teacherId);
    if (!teacherRecord) {
      return res.status(404).json({ message: "❌ Teacher not found" });
    }

    // ✅ check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "❌ Email already in use" });
    }

    // ✅ encrypt phone
    const encryptedPhone = await encryption({
      value: phoneNumber,
      secret_key: process.env.PHONE_ENCRYPTION_SECRET,
    });

    // ✅ hash password
    const hashedPassword = hashSync(password, +process.env.PASSWORD_SALT);

    const newUser = await User.create({
      name,
      email,
      phoneNumber: encryptedPhone,
      password: hashedPassword,
      role: system_role.SUPERVISOR,
    });

    const newSupervisor = await Supervisor.create({
      user: newUser._id,
      admin: adminRecord._id,
      teacher: teacherRecord._id, // ✅ 
    });

    // ✅ push supervisor to admin
    adminRecord.supervisors.push(newSupervisor._id);
    await adminRecord.save();

    // ✅ link supervisor to teacher
    teacherRecord.supervisor = newSupervisor._id;
    await teacherRecord.save();

    return res.status(201).json({
      message: "✅ Supervisor created successfully and linked with teacher",
      supervisor: await newSupervisor.populate("user", "-password"),
    });
  } catch (error) {
    console.log("❌ error in add_supervisor_service ===========> ", error);
    return res.status(500).json({ message: "internal server error" });
  }
};


// 📌 Add Assistant
export const add_assistant_service = async (req, res) => {
  try {
    const { _id } = req.login_user;
    const { name, email, phoneNumber, password, rePassword, supervisorId } = req.body;

    // ✅ check passwords match
    if (password !== rePassword) {
      return res.status(400).json({ message: "❌ Password and Re-Password do not match" });
    }

    // ✅ check admin exists
    const adminRecord = await Admin.findOne({ user: _id });
    if (!adminRecord) {
      return res.status(403).json({ message: "❌ Only admins can add assistants" });
    }

    // ✅ supervisor is required
    if (!supervisorId) {
      return res.status(400).json({ message: "❌ Supervisor is required" });
    }

    // ✅ check supervisor exists
    const supervisorRecord = await Supervisor.findById(supervisorId);
    if (!supervisorRecord) {
      return res.status(404).json({ message: "❌ Supervisor not found" });
    }

    // ✅ check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "❌ Email already in use" });
    }

    // ✅ encrypt phone
    const encryptedPhone = await encryption({
      value: phoneNumber,
      secret_key: process.env.PHONE_ENCRYPTION_SECRET,
    });

    // ✅ hash password
    const hashedPassword = hashSync(password, +process.env.PASSWORD_SALT);

    // ✅ create new user
    const newUser = await User.create({
      name,
      email,
      phoneNumber: encryptedPhone,
      password: hashedPassword,
      role: system_role.ASSISTANT,
    });

    // ✅ create new assistant linked to admin + supervisor
    const newAssistant = await Assistant.create({
      user: newUser._id,
      admin: adminRecord._id,
      supervisor: supervisorRecord._id, 
    })

    // ✅ link assistant to admin
    adminRecord.assistants.push(newAssistant._id);
    await adminRecord.save();

    // ✅ link assistant to supervisor
    supervisorRecord.assistants.push(newAssistant._id); // assuming عندك array assistants
    await supervisorRecord.save();

    return res.status(201).json({
      message: "✅ Assistant created successfully and linked with supervisor",
      assistant: await newAssistant.populate("user", "-password"),
    });
  } catch (error) {
    console.log("❌ error in add_assistant_service ===========> ", error);
    return res.status(500).json({ message: "internal server error" });
  }
};

// 📌 Add Accountant
export const add_accountant_service = async (req, res) => {
  try {
    const { _id } = req.login_user;
    const { name, email, phoneNumber, password, rePassword } = req.body;

    if (password !== rePassword) {
      return res.status(400).json({ message: "❌ Password and Re-Password do not match" });
    }

    const adminRecord = await Admin.findOne({ user: _id });
    if (!adminRecord) {
      return res.status(403).json({ message: "❌ Only admins can add accountants" });
    }

        // ✅ check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "❌ Email already in use" });
    }

    const encryptedPhone = await encryption({
      value: phoneNumber,
      secret_key: process.env.PHONE_ENCRYPTION_SECRET,
    });

    // ✅ hash password
    const hashedPassword = await hashSync(password , +process.env.PASSWORD_SALT );

    const newUser = await User.create({
      name,
      email,
      phoneNumber: encryptedPhone,
      password: hashedPassword,
      role: system_role.ACCOUNTANT,
    });

    const newAccountant = await Accountant.create({
      user: newUser._id,
      admin: adminRecord._id,
    });

    adminRecord.accountants.push(newAccountant._id);
    await adminRecord.save();

    return res.status(201).json({
      message: "✅ Accountant created successfully",
      accountant: await newAccountant.populate("user", "-password"),
    });
  } catch (error) {
    console.log("❌ error in add_accountant_service ===========> ", error);
    return res.status(500).json({ message: "internal server error" });
  }
};

export const update_user_service = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // 1️⃣ Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

      if (user.role === system_role.ADMIN) {
      return res.status(403).json({ message: "⛔ You cannot update an Admin user" });
    }

    // 2️⃣ Allow only specific fields
    const allowedFields = ["name", "email", "phoneNumber"];
    const filteredUpdates = {};
    for (let key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    let isChanged = false;

    // 3️⃣ Check name
    if (filteredUpdates.name && filteredUpdates.name !== user.name) {
      isChanged = true;
    }

    // 4️⃣ Check email + make sure not already taken
    if (filteredUpdates.email) {
      if (filteredUpdates.email !== user.email) {
        const emailExists = await User.findOne({
          email: filteredUpdates.email.trim().toLowerCase(),
          _id: { $ne: userId }, // exclude current user
        });

        if (emailExists) {
          return res.status(400).json({ message: "❌ use another email " });
        }

        // normalize email to lowercase before saving
        filteredUpdates.email = filteredUpdates.email.trim().toLowerCase();
        isChanged = true;
      } else {
        delete filteredUpdates.email; // no change
      }
    }

    // 5️⃣ Handle phoneNumber (decrypt before compare)
    if (filteredUpdates.phoneNumber) {
      const decryptedPhone = await decryption({
        cipher: user.phoneNumber,
        secret_key: process.env.PHONE_ENCRYPTION_SECRET,
      });

      if (decryptedPhone !== filteredUpdates.phoneNumber) {
        filteredUpdates.phoneNumber = await encryption({
          value: filteredUpdates.phoneNumber,
          secret_key: process.env.PHONE_ENCRYPTION_SECRET,
        });
        isChanged = true;
      } else {
        delete filteredUpdates.phoneNumber; // no change
      }
    }

    // 6️⃣ If nothing changed
    if (!isChanged) {
      return res.status(400).json({ message: "⚠️ No changes detected. User is already up to date." });
    }

    // 7️⃣ Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: filteredUpdates },
      { new: true, select: "-password" }
    );

    return res.status(200).json({
      message: "✅ User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.log("❌ Error in update_user_service =====> ", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const remove_user_service = async (req, res) => {
  try {
    const { userId } = req.params;
    const { _id } = req.login_user; // userId from token

    const adminRecord = await Admin.findOne({ user: _id });
    if (!adminRecord) {
      return res.status(403).json({ message: "❌ Only admins can remove users" });
    }

    // 1️⃣ هات اليوزر
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

    // 2️⃣ امنع حذف الأدمن
    if (user.role === system_role.ADMIN) {
      return res.status(403).json({ message: "⛔ You cannot remove an Admin user" });
    }

    // 3️⃣ احذف البروفايل المرتبط (طالب / مدرس / مشرف / مساعد / محاسب)
    await Promise.all([
      Student.findOneAndDelete({ user: userId }),
      Teacher.findOneAndDelete({ user: userId }),
      Supervisor.findOneAndDelete({ user: userId }),
      Assistant.findOneAndDelete({ user: userId }),
      Accountant.findOneAndDelete({ user: userId }),
    ]);

    // 4️⃣ احذف اليوزر نفسه
    const deletedUser = await User.findByIdAndDelete(userId);

    return res.status(200).json({
      message: "✅ User and related profile removed successfully",
      deletedUser,
    });
  } catch (error) {
    console.log("❌ Error in remove_user_service =====> ", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



//===============================

/**
 * manipulation  things
 */

export const add_session_service = async (req, res) => {
  try {
    const { _id } = req.login_user;
    const {
      title,
      mathBranch,
      videoLink,
      grade,
      division,
      price,
      availabilityType,
      availableAt,
      createdBy, // teacherId
      isAdminAddIt,
      prerequisites,
      homework,
      section,
      exam,
      videoQuizzes,
      points,
      isActive,
    } = req.body;

    // ✅ Check admin
    const adminRecord = await Admin.findOne({ user: _id });
    if (!adminRecord) {
      return res.status(403).json({ message: "❌ Only admins can add sessions" });
    }

    // ✅ Check teacher exists
    const teacher = await Teacher.findById(createdBy);
    if (!teacher) {
      return res.status(404).json({ message: "❌ Teacher not found" });
    }

    // ✅ Validate grade
    if (!Object.values(STUDENT_ENUMS.GRADE).includes(grade)) {
      return res.status(400).json({ message: "❌ Invalid grade" });
    }

    // ✅ Validate division
    if (!Object.values(STUDENT_ENUMS.DIVISION).includes(division)) {
      return res.status(400).json({ message: "❌ Invalid division" });
    }

    // ✅ Validate availabilityType
    if (!Object.values(SESSION_TIME).includes(availabilityType)) {
      return res.status(400).json({ message: "❌ Invalid availabilityType" });
    }

    if (availabilityType === SESSION_TIME.SCHEDULED && !availableAt) {
      return res.status(400).json({ message: "❌ availableAt is required when availabilityType = 'scheduled'" });
    }

    if (availabilityType === SESSION_TIME.IMMEDIATE && availableAt) {
      return res.status(400).json({ message: "❌ availableAt is not allowed when availabilityType = 'immediate'" });
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
    }

    // ✅ Check Homework exists
    if (homework) {
      const homeworkExists = await Homework.findById(homework);
      if (!homeworkExists) {
        return res.status(400).json({ message: "❌ Homework not found" });
      }
    }

    // ✅ Check Section exists
    if (section) {
      const sectionExists = await Section.findById(section);
      if (!sectionExists) {
        return res.status(400).json({ message: "❌ Section not found" });
      }
    }

    // ✅ Check Exam exists
    if (exam) {
      const examExists = await Exam.findById(exam);
      if (!examExists) {
        return res.status(400).json({ message: "❌ Exam not found" });
      }
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

  // 🔎 Check if all sessions exist
  const foundSessions = await Session.find({ _id: { $in: prerequisites } }).select("_id");
  if (foundSessions.length !== prerequisites.length) {
    return res.status(400).json({ message: "❌ One or more prerequisite sessions not found" });
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
    const newSession = await Session.create({
      title,
      mathBranch,
      videoLink,
      grade,
      division,
      price,
      availabilityType,
      availableAt,
      createdBy,
      isAdminAddIt,
      prerequisites,
      homework,
      section,
      exam,
      videoQuizzes,
      points,
      isActive,
    });

    return res.status(201).json({
      message: "✅ Session created successfully",
      session: newSession,
    });
  } catch (error) {
    console.log("❌ error in add_session_service ===========> ", error);
    return res.status(500).json({ message: "internal server error" });
  }
};

export const update_session_service = async (req, res) => {
  try {
    const { _id } = req.login_user;
    const { sessionId } = req.params;
    const updates = req.body;

    // ✅ Allowed fields from sessionSchema
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

    // ✅ Check admin
    const adminRecord = await Admin.findOne({ user: _id });
    if (!adminRecord) {
      return res.status(403).json({ message: "❌ Only admins can update sessions" });
    }

    // ✅ Get current session
    const currentSession = await Session.findById(sessionId);
    if (!currentSession) {
      return res.status(404).json({ message: "❌ Session not found" });
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

  // 🔎 Check if all sessions exist
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
    console.log("❌ error in update_session_service ===========> ", error);
    return res.status(500).json({ message: "internal server error" });
  }
};

export const delete_session_service = async (req, res) => {
  try {
    const { _id } = req.login_user;
    const { sessionId } = req.params;

    // ✅ Check admin
    const adminRecord = await Admin.findOne({ user: _id });
    if (!adminRecord) {
      return res.status(403).json({ message: "❌ Only admins can delete sessions" });
    }

    const deletedSession = await Session.findByIdAndDelete(sessionId);
    if (!deletedSession) {
      return res.status(404).json({ message: "❌ Session not found" });
    }

    return res.status(200).json({
      message: "✅ Session deleted successfully",
      session: deletedSession,
    });
  } catch (error) {
    console.log("❌ error in delete_session_service ===========> ", error);
    return res.status(500).json({ message: "internal server error" });
  }
};

// admin can make any kind of exams without any role
export const add_exam_service = async (req, res) => {
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
      createdBy ,
      isAdminAddIt,
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

    // ✅ check admin
    const adminRecord = await Admin.findOne({ user: _id });
    if (!adminRecord) {
      return res.status(403).json({ message: "❌ Only admins can add exams" });
    }

    // ✅ check teacher
    const teacher = await Teacher.findById(createdBy);
    if (!teacher) {
      return res.status(404).json({ message: "❌ Teacher not found" });
    }

    // ✅ Validate Questions
    for (const question of questions) {
      if (!question.questionText || !question.questionType || !question.points) {
        return res.status(400).json({ message: "❌ Each question must have questionText, questionType and points" });
      }

      if (question.questionType === EXAM_QUESTION_TYPE.MULTIPLE_CHOICE ) {
        if (!question.options || question.options.length < 2) {
          return res.status(400).json({ message: "❌ MULTIPLE_CHOICE must have at least 2 options" });
        }
        if (!question.correctAnswer) {
          return res.status(400).json({ message: "❌ MULTIPLE_CHOICE must have correctAnswer" });
        }
      }

      if (question.questionType ===  EXAM_QUESTION_TYPE.ESSAY ) {
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
      createdBy,
      isAdminAddIt,
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
    console.error("❌ error in add_exam_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const update_exam_service = async (req, res) => {
  try {
    const { examId } = req.params;
    const { _id } = req.login_user;
    const updates = req.body;

    // ✅ Check admin
    const adminRecord = await Admin.findOne({ user: _id });
    if (!adminRecord) {
      return res.status(403).json({ message: "❌ Only admins can update exams" });
    }

    // ✅ Find Exam
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "❌ Exam not found" });
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
    console.error("❌ error in update_exam_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const delete_exam_service = async (req, res) => {
  try {
    const { examId } = req.params;
    const { _id } = req.login_user;

    // ✅ check admin
    const adminRecord = await Admin.findOne({ user: _id });
    if (!adminRecord) {
      return res.status(403).json({ message: "❌ Only admins can delete exams" });
    }

    const exam = await Exam.findByIdAndDelete(examId);
    if (!exam) {
      return res.status(404).json({ message: "❌ Exam not found" });
    }

    return res.status(200).json({ message: "✅ Exam deleted successfully" , exam });
  } catch (error) {
    console.error("❌ error in delete_exam_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



export const generate_payment_codes_service = async (req, res) => {
  try {
    const { count, sessionsCount } = req.body;
    const { _id: adminId } = req.login_user; // الأدمن اللي عامل الطلب

    const adminRecord = await Admin.findOne({ user: _id });
    if (!adminRecord) {
      return res.status(403).json({ message: "❌ Only admins can delete exams" });
    }
    
    if (!count || count < 1) {
      return res.status(400).json({ message: "❌ count must be greater than 0" });
    }

    const codes = [];

    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString("hex").toUpperCase(); // كود 8 حروف
      const newCode = await PaymentCode.create({
        code,
        generatedBy: adminId,
        sessionsCount: sessionsCount || 1
      });
      codes.push(newCode.code);
    }

    return res.status(201).json({
      message: "✅ Payment codes generated successfully",
      codes
    });

  } catch (error) {
    console.error("❌ Error generating payment codes:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



// any thing below is under testing
//===========================================

export const update_group_members_service = async (req, res) => {
  try {
    const { role: ROLE } = req.login_user;
    const { groupId, newSupervisorId, newAssistantId } = req.body;

    // ✅ لازم يكون أدمن
    if (ROLE !== system_role.ADMIN) {
      return res.status(403).json({ message: "❌ Only Admin can update group members" });
    }

    // ✅ تحقق من وجود الجروب
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "❌ Group not found" });
    }

    let updatedFields = {};

    // ✅ لو هيبدل السوبرفايزر
    if (newSupervisorId) {
      const newSupervisor = await Supervisor.findById(newSupervisorId);
      if (!newSupervisor) {
        return res.status(404).json({ message: "❌ New Supervisor not found" });
      }
      updatedFields.supervisors = [newSupervisorId];
    }

    // ✅ لو هيبدل الأسستنت
    if (newAssistantId) {
      const assistant = await Assistant.findById(newAssistantId);
      if (!assistant) {
        return res.status(404).json({ message: "❌ Assistant not found" });
      }

      // ✅ إزالة الجروب من الأسستنت القديم
      await Assistant.updateMany(
        { _id: { $in: group.assistants } },
        { $pull: { groups: group._id } }
      );

      // ✅ إضافة الجروب للأسستنت الجديد
      await Assistant.findByIdAndUpdate(newAssistantId, {
        $addToSet: { groups: group._id },
        ...(newSupervisorId && { $set: { supervisor: newSupervisorId } })
      });

      updatedFields.assistants = [newAssistantId];
    }

    // ✅ تحديث الجروب
    await Group.findByIdAndUpdate(groupId, { $set: updatedFields }, { new: true });

    return res.status(200).json({
      message: "✅ Group members updated successfully"
    });

  } catch (error) {
    console.error("❌ Error in update_group_members_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


