
import User from "../../../DB/Models/user.model.js";
import { decryption } from "../../../Utils/encryption.utils.js";
import Teacher from './../../../DB/Models/teacher.model.js';










export const login_service = async (req, res) => {
  try {








    
    // send the data
    if (user) {
      return res
        .status(201)
        .json({
          message: " sign in is success",
          user,
          access_token: access_token,
          refresh_token: refresh_token,
        });
    } else {
      return res.status(409).json({ message: "failed to SignUp" });
    }
  } catch (error) {
    console.log("error in login ===========> ", error);
    return res.status(500).json({ message: "internal server error " });
  }
};



export const get_teacher_data = async (req, res) => {
  try {
    // 1️⃣ Get the email of the logged-in user
    const { email } = req.login_user;

    // 2️⃣ Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

    // 3️⃣ Find the teacher linked with this user
    const teacher = await Teacher.findOne({ user: user._id })
      .populate("courses") // لو عايز تعرض بيانات الكورسات
      .populate("exams")   // لو عايز تعرض بيانات الامتحانات
      .populate("supervisors")
      .populate("assistants");

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
