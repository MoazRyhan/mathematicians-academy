import Parent from "../../../DB/Models/parent.model.js";
import Student from "../../../DB/Models/student.model.js";
import User from "../../../DB/Models/user.model.js";
import Teacher from './../../../DB/Models/teacher.model.js';
import { cloudinary } from "../../../config/cloudinary.config.js";
import { decryption } from "../../../Utils/encryption.utils.js";





export const get_student_data = async (req, res) => {
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


// 📌 API to update student data with change checker
export const update_student_data = async (req, res) => {
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
    const updatedData = req.body;

    // 5️⃣ Compare with existing student data
    let isChanged = false;
    for (let key in updatedData) {
      if (
        updatedData[key] !== undefined &&
        student[key] != updatedData[key] // check difference
      ) {
        isChanged = true;
        break;
      }
    }

    if (!isChanged) {
      return res.status(400).json({
        message: "⚠️ No changes detected. Data is already up to date. please check if one of the data is the same ",
        student,
      });
    }

    // 6️⃣ Update the student data if something changed
    const updatedStudent = await Student.findByIdAndUpdate(
      student._id,
      { $set: updatedData }, // apply new data
      { new: true } // return updated document
    );

    // 7️⃣ Return success response
    return res.status(200).json({
      message: "✅ Student data updated successfully",
      student: updatedStudent,
    });
  } catch (error) {
    console.log("❌ Error from update_student_data =====>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



export const delete_student_account = async (req, res) => {
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


// any thing above is under testing
//===========================================



