import { compareSync, hashSync } from "bcrypt";
import User from "../../../DB/Models/user.model.js";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { STUDENT_ENUMS } from "../../../Constants/constants.js"; // Separated enums
import { cloudinary } from "./../../../config/cloudinary.config.js";
import { system_role } from "../../../Constants/constants.js";
import Student from "../../../DB/Models/student.model.js";
import blackList from "./../../../DB/Models/blackList.model.js";
import { decryption, encryption } from "../../../Utils/encryption.utils.js";
import { generateSequentialStudentCode } from "../../../Common/commons.js";
import Admin from "../../../DB/Models/admin.model.js";

//================================== admin

/**
 * Create new admin account ( and this is just for one time )
 */

export const create_admin_service = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      rePassword,
      phoneNumber,
    } = req.body;

        // ✅ 1) تحقق هل يوجد Admin بالفعل؟
    const existingAdminsCount = await Admin.countDocuments();
    if (existingAdminsCount > 0) {
      return res.status(400).json({
        message: "❌ There is already an Admin account. You cannot create another one.",
      });
    }
    // ✅ 1) تحقق من كلمة السر
    if (password !== rePassword) {
      return res.status(409).json({ message: "Password must match RePassword" });
    }

    // ✅ 2) تحقق إن الايميل مش مستخدم قبل كده
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // ✅ 3) إنشاء الـ User
    const hashedPassword = hashSync(password, +process.env.PASSWORD_SALT);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: system_role.ADMIN, // تعيين الـ role مباشر كـ Admin
      phoneNumber: await encryption({
        value: phoneNumber,
        secret_key: process.env.PHONE_ENCRYPTION_SECRET,
      }),
    });

    // ✅ 4) إنشاء الـ Admin المرتبط بالـ User
    const newAdmin = await Admin.create({ user: newUser._id });

    return res.status(201).json({
      message: "✅ Admin created successfully",
      user: newUser,
      admin: newAdmin,
    });
  } catch (error) {
    console.error("Error in create_admin_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//================================== normal users

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

    // 7️⃣ Create User first
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

    // 8️⃣ Prepare nationalIdImage (upload only for third secondary)
    let nationalIdImage = { images: [], folderId: null };

    if (grade === STUDENT_ENUMS.GRADE.THIRD_SECONDARY) {
      if (!nationalId || !files || files.length !== 2) {
        return res.status(400).json({
          message:
            "National ID number and two photos (front & back) are required for third secondary",
        });
      }

      const folderPath = `${process.env.FOLDER_NAME_CLOUDINARY}/User/IdPhotos/${createdUser?.name}===${createdUser?.email}`;
      const uploadedImages = [];

      for (const file of files) {
        let uploadResult;
        try {
          uploadResult = await cloudinary().uploader.upload(file.path, {
            folder: folderPath,
          });
        } catch (error) {
          console.error(" Cloudinary upload failed:", error);
          return res
            .status(500)
            .json({ message: " Failed to upload one or more ID images" });
        }

        if (!uploadResult || !uploadResult.secure_url) {
          return res
            .status(500)
            .json({ message: " Image upload unsuccessful" });
        }

        uploadedImages.push({
          public_id: uploadResult.public_id,
          secure_url: uploadResult.secure_url,
        });
      }

      nationalIdImage = {
        images: uploadedImages,
        folderId: folderPath,
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

    // 1️⃣2️⃣ Create Student
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
      studentCode,
    });

    // ✅ Success response
    return res.status(201).json({
      message: "Student registered successfully ",
      userId: createdUser._id,
      studentCode,
    });
  } catch (error) {
    console.error("Error in signup service==========>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const login_service = async (req, res) => {
   try {
    const { email, password } = req.body;

    // 1. جيب اليوزر
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "this email is not exists" });
    }

    // 2. لو الطالب لسه متقبلش او اترفض
    if (user.role === system_role.STUDENT) {
      const student = await Student.findOne({ user: user._id });
      if (!student) {
        return res.status(404).json({ message: "student not found" });
      }

      if (student.status === STUDENT_ENUMS.STATUS.PENDING) {
        return res.status(409).json({
          message: "this application is pending, wait till the admin approve",
        });
      } else if (student.status === STUDENT_ENUMS.STATUS.REJECTED) {
        return res.status(403).json({
          message: " your application is rejected, call the MS or try again later",
        });
      }
    }

    // 3. تحقق من الباسورد
    const pass_right = compareSync(password, user.password);
    if (!pass_right) {
      return res.status(409).json({ message: "the email or the password is wrong" });
    }

    // 4. اعمل التوكن
    const access_token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_ACCESS_TOKEN_SECRET_KEY,
      {
        expiresIn: process.env.EXPIRATION_DATA_ACCESS_TOKEN,
        jwtid: uuidv4(),
      }
    );

    const refresh_token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_REFRESH_TOKEN_SECRET_KEY,
      {
        expiresIn: process.env.EXPIRATION_DATA_REFRESH_TOKEN,
        jwtid: uuidv4(),
      }
    );

    return res.status(200).json({
      message: "login success",
      role: user.role,
      access_token,
      refresh_token,
    });
  } catch (error) {
    console.log("error in user login ===========> ", error);
    return res.status(500).json({ message: "internal server error " });
  }
};

export const parent_login_service = async (req, res) => {
  try {
    const { email, studentCode } = req.body;

    // 1. جيب اليوزر
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "student with this email not found" });
    }

    // 2. جيب بيانات الطالب
    const student = await Student.findOne({ user: user._id });
    if (!student) {
      return res.status(404).json({ message: "student not found" });
    }

    // 3. لازم Approved
    if (student.status !== STUDENT_ENUMS.STATUS.APPROVED) {
      return res.status(403).json({ message: "student not approved yet" });
    }

    // 4. تحقق من الكود
    if (student.studentCode !== studentCode) {
      return res.status(401).json({ message: "invalid student code" });
    }

    // 5. اعمل التوكن
    const access_token = jwt.sign(
      { role: system_role.PARENT, studentId: student._id },
      process.env.JWT_ACCESS_TOKEN_SECRET_KEY,
      {
        expiresIn: process.env.EXPIRATION_DATA_ACCESS_TOKEN,
        jwtid: uuidv4(),
      }
    );

    const refresh_token = jwt.sign(
      { role: system_role.PARENT, studentId: student._id },
      process.env.JWT_REFRESH_TOKEN_SECRET_KEY,
      {
        expiresIn: process.env.EXPIRATION_DATA_REFRESH_TOKEN,
        jwtid: uuidv4(),
      }
    );

    return res.status(200).json({
      message: "parent login success",
      role: system_role.PARENT ,
      studentId: student._id,
      access_token,
      refresh_token,
    });
  } catch (error) {
    console.log("error in parent login ===========> ", error);
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


export const user_Update_Own_Password_service = async (req, res) => {
  try {
    const { password, newPassword } = req.body;
    const { _id: loginUserId, role } = req.login_user; // جاي من الميدل وير بتاع الـ auth

    // 1️⃣ تأكد إن اليوزر ليه role معروف في السيستم
    if (!Object.values(system_role).includes(role)) {
      return res.status(403).json({ message: "❌ Invalid role" });
    }

    // 2️⃣ جيب اليوزر من الـ DB
    const user = await User.findById(loginUserId);
    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

    // 3️⃣ تحقق من الباسورد الحالي
    const pass_right = compareSync(password, user.password);
    if (!pass_right) {
      return res.status(409).json({ message: "❌ Current password is wrong" });
    }

    // 4️⃣ تحقق من وجود newPassword
    if (!newPassword) {
      return res.status(400).json({
        message: "⚠️ Please send `newPassword`",
      });
    }

    // 5️⃣ Hash new password
    const hashedPassword = hashSync(newPassword, +process.env.PASSWORD_SALT);
    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({
      message: "✅ Password updated successfully. Please login again with your new password.",
    });
  } catch (error) {
    console.error("❌ error in user_Update_Own_Password_service:", error);
    return res.status(500).json({ message: "internal server error" });
  }
};



// any thing below is under testing
//===========================================













