import { hashSync } from "bcrypt";
import { system_role } from "../../../Constants/constants.js";
import Admin from "../../../DB/Models/admin.model.js";
import Teacher from "../../../DB/Models/teacher.model.js";
import User from "../../../DB/Models/user.model.js";
import { decryption, encryption } from "../../../Utils/encryption.utils.js";
import Supervisor from "../../../DB/Models/supervisor.model.js";
import Assistant from "../../../DB/Models/assistant.model.js";
import Accountant from "../../../DB/Models/accountant.model.js";
import Student from "../../../DB/Models/student.model.js";

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
      teacher: teacherRecord._id, // ✅ ربطه بالمدرس
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
      supervisor: supervisorRecord._id, // ربط بالسوبر فايزر
    });

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



//  under testing
// =================




// student also
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
    if (filteredUpdates.name !== user.name) {
      isChanged = true;
    }

    // 4️⃣ Check email + make sure not already taken
    if (filteredUpdates.email  !== user.email) {
      const emailExists = await User.findOne({
        email: filteredUpdates.email,
        _id: { $ne: userId }, // exclude current user
      });
      if (emailExists) {
        return res.status(400).json({ message: "❌ Email already exists" });
      }
      isChanged = true;
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








/***
 * 
 * 

DELETE /admin/remove-user/:userId → Remove any user (student, teacher, supervisor, assistant, accountant).




📚 Sessions & Exams

POST /admin/create-session → Create a new session.

PUT /admin/update-session/:sessionId → Update session.

DELETE /admin/delete-session/:sessionId → Delete session.

POST /admin/create-exam → Create exam.

PUT /admin/update-exam/:examId → Update exam.

DELETE /admin/delete-exam/:examId → Delete exam.

POST /admin/open-session/:sessionId → Manually open a session for all students.



🎯 Points & Attendance

POST /admin/add-points → Add points to student.

POST /admin/deduct-points → Deduct points from student.

POST /admin/mark-attendance/qr → Mark attendance via QR.

POST /admin/mark-attendance/manual → Mark attendance manually.



  this for reports
📊 Statistics & Dashboard

GET /admin/statistics → Get overall statistics (students, teachers, payments, etc).

GET /admin/user-stats/:userId → Get detailed stats for a specific user.

GET /admin/finance-stats → Get accountants & payments reports.





🔄 Assignments (Distributions)

POST /admin/assign-student → Assign student to assistant/supervisor.

POST /admin/reassign-student → Move student to another assistant/supervisor.

POST /admin/assign-assistant → Assign assistant to supervisor.

POST /admin/reassign-assistant → Move assistant to another supervisor.*/
