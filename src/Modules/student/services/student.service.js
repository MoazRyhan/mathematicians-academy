import Parent from "../../../DB/Models/parent.model.js";
import Student from "../../../DB/Models/student.model.js";
import User from "../../../DB/Models/user.model.js";
import Teacher from './../../../DB/Models/teacher.model.js';
import { cloudinary } from "../../../config/cloudinary.config.js";
import { decryption, encryption } from "../../../Utils/encryption.utils.js";
import Session from "../../../DB/Models/session.model.js";
import Payment from "../../../DB/Models/payment.model.js";
import Submission from "../../../DB/Models/submission.model.js";
import { STUDENT_ENUMS } from "../../../Constants/constants.js";





export const get_student_service = async (req, res) => {
  try {
    // 1️⃣ Get the email of the logged-in user
    const { email } = req.login_user;

    // 2️⃣ Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

    // 3️⃣ Find the student linked with this user
    const student = await Student.findOne({ user: user._id });
    if (!student) {
      return res.status(404).json({ message: "❌ Student not found" });
    }

    // make sure that the student is not pending
    if (student.status === STUDENT_ENUMS.STATUS.PENDING ) {
      return res.status(404).json({ message: "❌ wait tell the admin acc your request" });
    }

        // make sure that the student is not pending
    if (student.status === STUDENT_ENUMS.STATUS.REJECTED ) {
      return res.status(404).json({ message: "❌ your application is rejected call the MS or try again later" });
    }

    // 4️⃣ Decrypt sensitive fields
    const decryptedUser = {
      ...user.toObject(),
      phoneNumber: user.phoneNumber
        ? await decryption({
            cipher : user.phoneNumber,
            secret_key: process.env.PHONE_ENCRYPTION_SECRET,
          })
        : null,
    };

    const decryptedStudent = {
      ...student.toObject(),
      parentPhoneNumber: student.parentPhoneNumber
        ? await decryption({
            cipher : student.parentPhoneNumber,
            secret_key: process.env.PHONE_ENCRYPTION_SECRET,
          })
        : null,
      nationalId: student.nationalId
        ? await decryption({
            cipher : student.nationalId,
            secret_key: process.env.NATIONAL_ID_SECRET_KEY,
          })
        : null,
    };

    // 5️⃣ Return both User and Student data
    return res.status(200).json({
      message: "✅ User and Student data retrieved successfully",
      user: decryptedUser,
      student: decryptedStudent,
    });
  } catch (error) {
    console.log("❌ Error from get_student_data =====>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const update_student_service = async (req, res) => {
  try {
    // 1️⃣ Get the email of the logged-in user
    const { email } = req.login_user;

    // 2️⃣ Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

    // 3️⃣ Find the student linked with this user
    const student = await Student.findOne({ user: user._id });
    if (!student) {
      return res.status(404).json({ message: "❌ Student not found" });
    }

    // 4️⃣ Take the updated data from request body
    const { name, email: newEmail, phoneNumber, ...studentUpdates } = req.body;

    let isChanged = false;
    const userUpdates = {};

    // 5️⃣ Handle user.name
    if (name && user.name !== name) {
      userUpdates.name = name;
      isChanged = true;
    }

    // 6️⃣ Handle user.email (check uniqueness + lowercase)
    if (newEmail) {
      const normalizedEmail = newEmail.trim().toLowerCase();

      if (normalizedEmail !== user.email) {
        const emailExists = await User.findOne({
          email: normalizedEmail,
          _id: { $ne: user._id }, // exclude current user
        });

        if (emailExists) {
          return res.status(400).json({ message: "❌ Email already in use, please choose another one" });
        }

        userUpdates.email = normalizedEmail;
        isChanged = true;
      }
    }

    // 7️⃣ Handle user.phoneNumber (with encryption/decryption)
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

    // 8️⃣ Handle student updates
    for (let key in studentUpdates) {
      if (
        studentUpdates[key] !== undefined &&
        student[key] != studentUpdates[key]
      ) {
        isChanged = true;
        break;
      }
    }

    // 9️⃣ If nothing changed
    if (!isChanged) {
      return res.status(400).json({
        message:
          "⚠️ No changes detected. Data is already up to date. Please check if the new data is different.",
        student,
        user,
      });
    }

    // 🔟 Apply updates
    let updatedUser = user;
    if (Object.keys(userUpdates).length > 0) {
      updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $set: userUpdates },
        { new: true, select: "-password" }
      );
    }

    let updatedStudent = student;
    if (Object.keys(studentUpdates).length > 0) {
      updatedStudent = await Student.findByIdAndUpdate(
        student._id,
        { $set: studentUpdates },
        { new: true }
      );
    }

    // 1️⃣1️⃣ Return success
    return res.status(200).json({
      message: "✅ Student & User data updated successfully",
      student: updatedStudent,
      user: updatedUser,
    });
  } catch (error) {
    console.log("❌ Error from update_student_service =====>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const delete_student_service = async (req, res) => {
  try {
    // 1️⃣ Get logged-in user id
    const { _id } = req.login_user;

    // 2️⃣ Find and delete user
    const deletedUser = await User.findByIdAndDelete(_id);
    if (!deletedUser) {
      return res.status(404).json({ message: "❌ No account found with this ID" });
    }

    // 3️⃣ Delete related Student/Parent/Teacher docs
    const deletedStudent = await Student.findOneAndDelete({ user: _id });
    await Parent.findOneAndDelete({ user: _id });
    await Teacher.findOneAndDelete({ user: _id });

    // 4️⃣ Cleanup Cloudinary resources if student has folder
    if (deletedStudent?.nationalIdImage?.folderId) {
      const folderPath = deletedStudent.nationalIdImage.folderId; // already stored full path

      try {
        // 🗑️ delete all resources inside folder
        await cloudinary().api.delete_resources_by_prefix(folderPath);

        // 🗑️ delete the folder itself
        await cloudinary().api.delete_folder(folderPath);
      } catch (err) {
        console.error("❌ Error deleting Cloudinary folder:", err.message);
      }
    }

    // 5️⃣ Return success
    return res.status(200).json({
      message: "✅ User account and related data deleted successfully",
    });
  } catch (error) {
    console.log("❌ Error from delete_user_account =====>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// any thing below is under testing
//===========================================



// ✅ Get Student Sessions by grade & division

export const getStudentSessions = async (req, res) => {
  try {
    const { _id } = req.login_user;

    // 🔹 Get student info
    const student = await Student.findOne({ user: _id });
    if (!student) {
      return res.status(404).json({ message: "❌ Student not found" });
    }

    // 🔹 Get only needed fields
    const sessions = await Session.find(
      {
        grade: student.grade,
        division: student.division,
        isActive: true
      },
      "title mathBranch grade createdAt" // ✅ Projection
    ).populate({
  path: "createdBy",        // 👨‍🏫 Teacher
  populate: {
    path: "user",           // 👤 User inside Teacher
    select: "name"          // ✅ get only the name
  }
})// ✅ teacher name only

    // 🔹 Format createdAt before sending
    const formattedSessions = sessions.map((s) => ({
      _id: s._id,
      title: s.title,
      mathBranch: s.mathBranch,
      grade: s.grade,
      createdBy : s.createdBy?.user?.name || "Unknown" ,
      createdAt: s.createdAt.toLocaleDateString("en-GB") // 🔥 dd/mm/yyyy
    }));

    return res.status(200).json({
      message: "✅ Student sessions fetched successfully",
      sessions: formattedSessions
    });
  } catch (error) {
    console.error("❌ Error in getStudentSessions ============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



export const getAccessibleSessions = async (req, res) => {
  try {
    const { _id } = req.login_user;

    // 1) كل الحصص اللي الطالب دفعها واتأكدت
    const paidSessions = await Payment.find({ 
      student: _id, 
      isConfirmed: true 
    }).populate("relatedSession");

    const accessibleSessions = [];

    for (const payment of paidSessions) {
      const session = await Session.findById(payment.relatedSession._id)
        .populate("prerequisites");

      let canAccess = true;

      // 2) لو في prerequisite
      if (session.prerequisites.length > 0) {
        for (const prereq of session.prerequisites) {
          // Check homework submission for prerequisite
          const homeworkSubmission = await Submission.findOne({
            student: _id,
            session: prereq._id,
            submissionType: "HOMEWORK",
            isCorrected: true
          });

          if (!homeworkSubmission) {
            canAccess = false;
            break;
          }

          // TODO: add check for student attendance if needed
        }
      }

      if (canAccess) accessibleSessions.push(session);
    }

    return res.status(200).json({
      message: "✅ Accessible sessions fetched",
      sessions: accessibleSessions
    });

  } catch (error) {
    console.error("❌ Error in getAccessibleSessions:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



/*
- عرض جدول الحصص✔✔
-  الفديوهات هتكون من اليوتيوب  مشاهدة فيديو الحصة (مع التحقق من الدفع والشروط)
- إإرسال إجابات الكويز داخل الفيديو
- تسليم واجب
- تسليم سكشن
- عرض نتيجة (واجب/كويز/سكشن)

*/ 