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




// any thing below is under testing
//===============================




export const generate_payment_codes_service = async (req, res) => {
  try {
    const { count } = req.body;
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
        generatedBy: adminId
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




// important / new things 
export const assign_Assistant_To_Supervisor_service = async (req, res) => {
  try {
    const { supervisorId, assistantId } = req.body;

    if (!supervisorId || !assistantId) {
      return res.status(400).json({ message: "❌ supervisorId and assistantId are required" });
    }

    const supervisor = await Supervisor.findById(supervisorId);
    if (!supervisor) {
      return res.status(404).json({ message: "❌ Supervisor not found" });
    }

    const assistant = await Assistant.findById(assistantId);
    if (!assistant) {
      return res.status(404).json({ message: "❌ Assistant not found" });
    }

    // ✅ Update supervisor
    if (!supervisor.assistants.includes(assistantId)) {
      supervisor.assistants.push(assistantId);
    }

    // ✅ Update assistant
    assistant.supervisor = supervisorId;

    await supervisor.save();
    await assistant.save();

    return res.status(200).json({ message: "✅ Assistant assigned successfully", supervisor, assistant });
  } catch (error) {
    console.error("❌ Error in assignAssistantToSupervisor:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// important  / new things
export const register_Student_Attendance_service = async (req, res) => {
  try {
    const { studentId, sessionId, method } = req.body; // method = qr | manual
    const { _id: adminUserId } = req.login_user;

    if (!studentId || !sessionId) {
      return res.status(400).json({ message: "❌ studentId and sessionId are required" });
    }

    // ✅ جلب بيانات الطالب
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "❌ Student not found" });
    }

    // ✅ جلب بيانات الحصة
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "❌ Session not found" });
    }

    // ✅ التحقق من أن الطالب والحصة لهم نفس الجريد والدفشن
    if (student.grade !== session.grade || student.division !== session.division) {
      return res.status(400).json({ message: "❌ Student grade/division does not match the session" });
    }

    // ✅ جلب الأدمن
    const admin = await Admin.findOne({ user: adminUserId });
    if (!admin) {
      return res.status(404).json({ message: "❌ Admin not found" });
    }

    // ✅ تسجيل الحضور في جدول الأدمن
    admin.manualAttendance.push({
      student: studentId,
      session: sessionId,
      method: method || ATTENDANCE_TYPE.MANUAL,
    });

    // ✅ التأكد إذا كان الطالب عنده sessionProgress للحصة
    let sessionProgress = student.sessionProgress.find(sp => sp.session.toString() === sessionId);

    if (!sessionProgress) {
      // ✅ إضافة الحصة للطالب مع صلاحية 7 أيام
      student.sessionProgress.push({
        session: sessionId,
        isPaid: true, // نعتبره مدفوع عشان يشتغل
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 أيام
        attendanceRegistered: true
      });
    } else {
      // ✅ لو موجودة، فقط حدّث الحضور
      sessionProgress.attendanceRegistered = true;
    }

    await admin.save();
    await student.save();

    return res.status(200).json({ message: "✅ Attendance registered successfully and session added for 7 days" });
  } catch (error) {
    console.error("❌ Error in registerStudentAttendance:", error);
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


