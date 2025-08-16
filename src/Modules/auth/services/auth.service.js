import { compareSync, hashSync } from "bcrypt";
import User from "../../../DB/Models/user.model.js";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { STUDENT_ENUMS } from "../../../Constants/constants.js"; // Separated enums
import { cloudinary } from "./../../../config/cloudinary.config.js";
import { system_role } from "../../../Constants/constants.js";
import Student from "../../../DB/Models/student.model.js";
import blackList from "./../../../DB/Models/blackList.model.js";
import Parent from "../../../DB/Models/parent.model.js";
import { send_Email_event } from "../../../config/send_email_verify.config.js";
import { encryption } from "../../../Utils/encryption.utils.js";
import { generateSequentialStudentCode } from "../../../Common/commons.js";

export const sign_up_service = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      rePassword,
      role,
      phoneNumber,
      fullName,
      birthDate,
      school,
      grade,
      division,
      governorate,
      area,
      address,
      parentPhoneNumber,
      fatherJob,
      motherJob,
      nationalId,
      attendanceLocation,
      center,
      parent,
      assistant,
    } = req.body;

    const files = req.files;

    // 1️⃣ Check role
    if (role !== system_role.STUDENT) {
      return res.status(409).json({ message: "there is some thing wrong" });
    }

    // 2️⃣ Check division requirement
    if (
      (grade == STUDENT_ENUMS.GRADE.THIRD_SECONDARY ||
        grade == STUDENT_ENUMS.GRADE.SECOND_SECONDARY) &&
      division == null
    ) {
      return res.status(409).json({ message: "must fill the division" });
    }

    // 3️⃣ Check password match
    if (password !== rePassword) {
      return res
        .status(409)
        .json({ message: "Password must match RePassword" });
    }

    // 4️⃣ Validate required fields
    if (
      !name ||
      !email ||
      !password ||
      !role ||
      !phoneNumber ||
      !fullName ||
      !birthDate ||
      !school ||
      !grade ||
      !governorate ||
      !area ||
      !address ||
      !parentPhoneNumber ||
      !attendanceLocation
    ) {
      return res
        .status(400)
        .json({ message: "Please fill in all required fields" });
    }

    // 5️⃣ Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // 6️⃣ Hash password
    const hashedPassword = hashSync(password, +process.env.PASSWORD_SALT);

    // 8️⃣ Prepare nationalIdImage (upload only for third secondary)
    let nationalIdImage = { images: [], folderId: null };

    if (grade === STUDENT_ENUMS.GRADE.THIRD_SECONDARY) {
      if (!nationalId || !files || files.length !== 2) {
        return res.status(400).json({
          message:
            "National ID number and two photos (front & back) are required for third secondary",
        });
      }

      const folderPath = `${process.env.FOLDER_NAME_CLOUDINARY}/User/IdPhotos/${createdUser._id}`;
      const uploadedImages = [];

      for (const file of files) {
        const { public_id, secure_url } = await cloudinary().uploader.upload(
          file.path,
          {
            folder: folderPath,
          }
        );
        uploadedImages.push({ public_id, secure_url });
      }

      nationalIdImage = {
        images: uploadedImages,
        folderId: folderPath, // 🆕 linked with userId
      };
    }

    // 9️⃣ Encrypt parent phone number
    const encryptedParentPhoneNumber = await encryption({
      value: parentPhoneNumber,
      secret_key: process.env.PHONE_ENCRYPTION_SECRET,
    });

    // 🔟 Hash national ID (store encrypted version)
    const encryptionNationalId = nationalId
      ? await encryption({
          value: nationalId,
          secret_key: process.env.NATIONAL_ID_SECRET_KEY,
        })
      : null;

    // 1️⃣1️⃣ Generate unique student code
    const studentCode = await generateSequentialStudentCode(grade, division);

    // 1️⃣2️⃣ (Optional) check assistant
    let assistantDoc = null;
    // if (assistant) {
    //   assistantDoc = await User.findById(assistant);
    //   if (!assistantDoc) {
    //     return res.status(404).json({ message: "Assistant not found" });
    //   }
    // }
    // 7️⃣ Create User first (to use _id in folder name)
    const createdUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      phoneNumber: await encryption({
        value: phoneNumber,
        secret_key: process.env.PHONE_ENCRYPTION_SECRET,
      }),
    });

    // 1️⃣3️⃣ Create Student
    await Student.create({
      user: createdUser._id,
      fullName,
      birthDate,
      school,
      grade,
      division,
      governorate,
      area,
      address,
      parentPhoneNumber: encryptedParentPhoneNumber,
      fatherJob,
      motherJob,
      nationalId: encryptionNationalId,
      nationalIdImage,
      attendanceLocation,
      center,
      // parent,
      // assistant: assistantDoc ? assistantDoc._id : null,
      studentCode,
    });

    // ✅ Success response
    return res.status(201).json({
      message: assistantDoc
        ? "Student registered successfully with assistant"
        : "Student registered successfully (assistant not found or not provided)",
      userId: createdUser._id,
      studentCode,
    });
  } catch (error) {
    console.error("Error in signup service==========>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const sign_up_parent_service = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      rePassword,
      phoneNumber,
      role,
      studentName,
      studentNationalId,
    } = req.body;

    // console.log( req.body);

    // 1. Ensure that the role is Parent
    if (role !== system_role.PARENT) {
      return res
        .status(403)
        .json({ message: "Only parents can register in this endpoint" });
    }

    // 2. Validate required fields
    if (
      !name ||
      !email ||
      !password ||
      !rePassword ||
      !phoneNumber ||
      !studentName ||
      !studentNationalId
    ) {
      return res
        .status(400)
        .json({ message: "Please fill in all required fields" });
    }

    // 3. Check if passwords match
    if (password !== rePassword) {
      return res
        .status(400)
        .json({ message: "Password must match RePassword" });
    }

    // 4. Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // 6. Hash the password
    const hashedPassword = hashSync(password, +process.env.PASSWORD_SALT);

    // Encrypt phone number
    const encryptedPhoneNumber = await encryption({
      value: phoneNumber,
      secret_key: process.env.PHONE_ENCRYPTION_SECRET,
    });

    // 5. Find student by name and national ID (compare hash)
    const hashedStudentNationalId = hashSync(
      studentNationalId,
      +process.env.NATIONAL_ID_SALT
    );

    const existingStudent = await Student.findOne({
      fullName: studentName,
      nationalId: hashedStudentNationalId,
    });

    if (!existingStudent) {
      return res
        .status(404)
        .json({ message: "Student with this name and national ID not found" });
    }

    // 7. Create the user
    const createdUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: system_role.PARENT,
      phoneNumber: encryptedPhoneNumber,
    });

    // 8. Create the Parent document and link it to the student
    await Parent.create({
      user: createdUser._id,
      students: [existingStudent._id],
    });

    // 9. Send success response
    return res.status(201).json({
      message: "Parent registered successfully and linked to student",
      userId: createdUser._id,
      studentId: existingStudent._id,
    });
  } catch (error) {
    console.error("Error in parent signup ==========>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const login_service = async (req, res) => {
  try {
    const { email, password } = req.body;

    // find the email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "this email is not exists" });
    }

    // find the student
    const Student = await User.findById(user._id);
    if (!user) {
      return res.status(404).json({ message: "this email is not exists" });
    }

    // 1 check the status
    if (Student.status == STUDENT_ENUMS.STATUS.PENDING) {
      return res.status(409).json({
        message:
          "this application is pending wait till the admin give the approvement",
      });
    }

    // check the password
    const pass_right = compareSync(password, user.password);

    if (pass_right == false) {
      return res
        .status(409)
        .json({ message: "the email or the pass is wrong" });
    }

    // make the token
    const access_token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_ACCESS_TOKEN_SECRET_KEY,
      {
        expiresIn: process.env.EXPIRATION_DATA_ACCESS_TOKEN,
        jwtid: uuidv4(),
      }
    );
    const refresh_token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_REFRESH_TOKEN_SECRET_KEY,
      {
        expiresIn: process.env.EXPIRATION_DATA_REFRESH_TOKEN,
        jwtid: uuidv4(),
      }
    );

    // send the data
    if (user) {
      return res.status(201).json({
        message: " login is success",
        access_token: access_token,
        refresh_token: refresh_token,
      });
    } else {
      return res
        .status(409)
        .json({ message: "failed to login try again later " });
    }
  } catch (error) {
    console.log("error in login ===========> ", error);
    return res.status(500).json({ message: "internal server error " });
  }
};

export const sign_out_service = async (req, res) => {
  try {
    const { token } = req.login_user;
    // console.log(token , token_id);

    const if_log_out = await blackList.findOne({
      token_id: token.token_id,
      expiration_data: token.expiration_data,
    });
    if (if_log_out) {
      return res
        .status(404)
        .json({ massage: "this email is already signed_out" });
    }

    await blackList.create({
      token_id: token.token_id,
      expiration_data: token.expiration_data,
    });

    return res
      .status(200)
      .json({ massage: "user has been sign-out successfully" });
  } catch (error) {
    console.log("error from signout =======>", error);
    return res.status(500).json({ message: "internal server error " });
  }
};

export const refresh_token_service = async (req, res) => {
  try {
    const { refresh_token } = req.headers;

    // decoding data
    const decoding_refresh_token = jwt.verify(
      refresh_token,
      process.env.JWT_REFRESH_TOKEN_SECRET_KEY
    );

    // rasta of decoding data
    const access_token = jwt.sign(
      { _id: decoding_refresh_token._id, email: decoding_refresh_token.email },
      process.env.JWT_ACCESS_TOKEN_SECRET_KEY,
      { expiresIn: process.env.EXPIRATION_DATA_ACCESS_TOKEN, jwtid: uuidv4() }
    );
    return res
      .status(201)
      .json({ massage: " access token has been refreshed ", access_token });
  } catch (error) {
    console.log("error from refresh token =======>", error);
    return res.status(500).json({ message: "internal server error " });
  }
};

//                  any thing above is under testing
// ==================================================

export const forget_password_service = async (req, res) => {
  try {
    const { email } = req.body;

    // ✅ Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email is not found" });
    }

    // ✅ Generate OTP (4 digits)
    const OTP = Math.floor(1000 + Math.random() * 9000);
    const hash_otp = hashSync(OTP.toString(), +process.env.OTP_SALT);

    // ✅ Update OTP in user document
    user.OTP = hash_otp;
    await user.save();

    // ✅ Send OTP email
    const send_otp = send_Email_event.emit("Send_Email", {
      to: user.email,
      subject: "Your OTP for password reset",
      html: `
        <h3>From your account ${user.email} - mathematicians-academy</h3>
        <p>The OTP is <strong>${OTP}</strong></p>
        <p>If this wasn't you, please ignore this message.</p>
      `,
    });

    // ✅ Check if email was sent
    if (!send_otp) {
      return res.status(409).json({ message: "Failed to send OTP" });
    }

    return res.status(200).json({ message: "The OTP has been sent" });
  } catch (error) {
    console.error("Error in forget password service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Service to verify OTP and change password
export const verify_forget_password_service = async (req, res) => {
  try {
    const { OTP, email, new_password, confirm_password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email is not found" });
    }

    // Check if OTP matches
    const if_otp_match = compareSync(OTP?.toString(), user.OTP);
    if (!if_otp_match) {
      return res.status(404).json({ message: "This OTP is not correct" });
    }

    // Check if passwords match
    if (new_password !== confirm_password) {
      return res.status(403).json({ message: "Passwords do not match" });
    }

    // Hash new password
    const hash_new_pass = hashSync(new_password, +process.env.PASSWORD_SALT);

    // Update password and clear OTP
    user.Password = hash_new_pass;
    user.OTP = "";
    const updated_user = await user.save();

    if (!updated_user) {
      return res
        .status(409)
        .json({ message: "Something went wrong while updating password" });
    }

    // Send confirmation email
    send_Email_event.emit("Send_Email", {
      to: user.email,
      subject: "Secure your account (mathematicians-academy)",
      html: `<h1>From your account ${user.email} at mathematicians-academy</h1>
             <p>Your password has been changed. If this was not you, please contact us immediately.</p>`,
    });

    return res
      .status(200)
      .json({ message: "Password has been changed successfully" });
  } catch (error) {
    console.error("Error in verify forget password service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Service to reset password directly (no OTP)
export const reset_password_service = async (req, res) => {
  try {
    const { email, new_password, confirm_password } = req.body;

    // Check if passwords match
    if (new_password !== confirm_password) {
      return res
        .status(400)
        .json({ message: "Password does not match confirmation password" });
    }

    // Find user by email
    const user = await User.findById({ email });
    if (!user) {
      return res.status(404).json({ message: "Email is not found" });
    }

    // Hash new password
    const hash_new_pass = hashSync(new_password, +process.env.PASSWORD_SALT);

    // Update password
    user.Password = hash_new_pass;
    const updated_user = await user.save();

    if (!updated_user) {
      return res.status(409).json({ message: "Failed to reset password" });
    }

    // Send confirmation email
    send_Email_event.emit("Send_Email", {
      to: user.email,
      subject: "Secure your account (mathematicians-academy)",
      html: `<h1>From your account ${user.email} at mathematicians-academy</h1>
             <p>Your password has been changed. If this was not you, please contact us immediately.</p>`,
    });

    // Example: Add token to blacklist (optional, based on your auth logic)
    // await BlacklistToken_Model.create({
    //   TokenId: /* token from middleware */,
    //   expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours
    // });

    return res
      .status(200)
      .json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Error in reset password service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
