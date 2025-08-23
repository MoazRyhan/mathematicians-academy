import Parent from "../../../DB/Models/parent.model.js";
import Student from "../../../DB/Models/student.model.js";
import User from "../../../DB/Models/user.model.js";
import Teacher from './../../../DB/Models/teacher.model.js';
import { cloudinary } from "../../../config/cloudinary.config.js";
import { decryption, encryption } from "../../../Utils/encryption.utils.js";
import Session from "../../../DB/Models/session.model.js";
import Payment from "../../../DB/Models/payment.model.js";
import Submission from "../../../DB/Models/submission.model.js";
import { PDFExtension, STUDENT_ENUMS, SUBMISSION_TYPE } from "../../../Constants/constants.js";
import { PAYMENT_TYPE } from "../../../Constants/constants.js";
import PaymentCode from "../../../DB/Models/paymentCode.model.js";
import Section from "../../../DB/Models/section.model.js";




// ================crud
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



// ==================== more
// ✅ Get Student Sessions by grade & division
export const get_Student_Sessions_service = async (req, res) => {
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

export const make_payment_service = async (req, res) => {
  try {
    const { _id: userId } = req.login_user;
    const {
      amount,
      paymentMethod,
      paymentCode,
      vodafoneCashNumber,
      relatedSession,
      sessionsCount
    } = req.body;

    const files = req.files || [];

    // ✅ تحقق من البيانات الأساسية
    if (!paymentMethod) {
      return res.status(400).json({ message: "❌ paymentMethod is required" });
    }

    console.log(userId);
    const student = await Student.findOne({ user: userId});
    
    if (!student) {
      return res.status(404).json({ message: "❌ student not found" });
    }

    if (relatedSession) {
    const session = await Session.findById(relatedSession);
    if (!session) {
      return res.status(404).json({ message: "❌ session not found" });
    }
    }

    if (!sessionsCount || !sessionsCount == 1) {
      return res.status(400).json({ message: "❌ numberOfSessions must be at least 1" });
    }

    let vodafoneCashImageData = null;

if (paymentMethod === PAYMENT_TYPE.VODAFONE_CASH) {

  if (!amount) {
    return res.status(400).json({ message: "❌ amount is required" });
  }

  if (!vodafoneCashNumber) {
    return res.status(400).json({ message: "❌ Vodafone Cash number is required" });
  }

  if (files.length === 0) {
    return res.status(400).json({ message: "❌ Vodafone Cash image is required" });
  }

  if (files.length > 1) {
    return res.status(400).json({ message: "❌ Only one image is allowed for Vodafone Cash" });
  }

  // ✅ رفع الصورة على Cloudinary
  const folderPath = `${process.env.FOLDER_NAME_CLOUDINARY}/User/vodafoneCashImage/${student._id}`;
  let uploadResult;
  try {
    uploadResult = await cloudinary().uploader.upload(files[0].path, {
      folder: folderPath,
    });
  } catch (error) {
    console.error("❌ Cloudinary upload failed:", error);
    return res.status(500).json({ message: "❌ Failed to upload image to Cloudinary" });
  }

  if (!uploadResult || !uploadResult.secure_url) {
    return res.status(500).json({ message: "❌ Image upload unsuccessful" });
  }

  const { public_id, secure_url } = uploadResult;

  vodafoneCashImageData = {
    image: { public_id, secure_url },
    folderId: folderPath
  };

  // ✅ إنشاء دفع في انتظار التأكيد
  const newPayment = await Payment.create({
    student: student._id,
    amount,
    paymentMethod,
    vodafoneCashNumber,
    vodafoneCashImage: vodafoneCashImageData,
    relatedSession,
    sessionsCount,
    isConfirmed: false
  });

  return res.status(201).json({
    message: "✅ Payment request submitted, awaiting confirmation",
    payment: newPayment
  });
}


if (paymentMethod === PAYMENT_TYPE.CODE) {
  // ✅ لازم الكود يكون صحيح
  if (!paymentCode) {
    return res.status(400).json({ message: "❌ Payment code is required" });
  }

  const codeData = await PaymentCode.findOne({ code: paymentCode });

  if (!codeData) {
    return res.status(400).json({ message: "❌ Invalid payment code" });
  }

  if (codeData.isUsed) {
    return res.status(400).json({ message: "❌ Payment code already fully used" });
  }

  if (codeData.sessionsCount < 1) {
    return res.status(400).json({ message: "❌ No remaining sessions in this code" });
  }

  // ✅ قلل الجلسات بمقدار واحد
  codeData.sessionsCount -= 1;
  codeData.usedBy = student._id

  student.sessionCredits += 1

  // ✅ لو بقيت صفر، يبقى نعلمه مستخدم بالكامل
  if (codeData.sessionsCount === 0) {
    codeData.isUsed = true;
  }

  await codeData.save();
  await student.save();

  // ✅ حفظ الدفع كـ Confirmed مباشرة
  const newPayment = await Payment.create({
    student: student._id,
    paymentMethod,
    paymentCode : codeData._id,
    relatedSession,
    sessionsCount: 1, // ✅ لأننا خصمنا جلسة واحدة فقط
    isConfirmed: true
  });

  return res.status(201).json({
    message: "✅ Payment successful, 1 session added",
    payment: newPayment
  });
}


    return res.status(400).json({ message: "❌ Invalid payment method" });

  } catch (error) {
    console.error("❌ error in make_payment==========>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//  watch video


export const get_payment_history_service = async (req, res) => {
  try {
    const { _id: userId } = req.login_user;

    // ✅ هات الطالب المرتبط باليوزر
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ message: "❌ Student not found" });
    }

    // ✅ هات المدفوعات الخاصة بالطالب ده
    const payments = await Payment.find({ student: student._id })
      .sort({ createdAt: -1 });

      console.log(student._id);
      

    return res.status(200).json({
      message: "✅ Payment history fetched successfully",
      payments
    });
  } catch (error) {
    console.error("❌ error in get_payment_history:===============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// ======================= submit
export const submit_Homework_Solution_service = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { _id: userId } = req.login_user;

    // ✅ التحقق من وجود الملف
    if (!req.file) {
      return res.status(400).json({ message: "❌ PDF file is required" });
    }

    // ✅ تحقق من نوع الملف (mimetype أو الامتداد)
    if (
      !PDFExtension.some(type => req.file.mimetype.startsWith(type)) &&
      req.file.originalname.split(".").pop().toLowerCase() !== "pdf"
    ) {
      return res.status(400).json({ message: "❌ Only PDF files are allowed" });
    }

    // ✅ جلب الطالب
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(400).json({ message: "❌ This student does not exist" });
    }

    // ✅ التحقق من وجود السيشن والواجب
    const sessionExist = await Session.findById(sessionId).populate("homework");
    if (!sessionExist || !sessionExist.homework) {
      return res.status(400).json({ message: "❌ No homework found for this session" });
    }

    // ✅ رفع الملف على Cloudinary
    const folderPath = `${process.env.FOLDER_NAME_CLOUDINARY}/User/Submissions/Homework/${student._id}`;
    const uploadResult = await cloudinary().uploader.upload(req.file.path, {
      folder: folderPath,
      resource_type: "raw", // PDF
      format: "pdf"
    });

    if (!uploadResult?.public_id || !uploadResult?.secure_url) {
      return res.status(500).json({ message: "❌ Failed to upload file to Cloudinary" });
    }

    // ✅ إنشاء Submission بعد نجاح الرفع
    const newSubmission = await Submission.create({
      student: student._id,
      session: sessionExist._id,
      submissionType: SUBMISSION_TYPE.HOMEWORK,
      pdfSolution: {
        public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url,
        folderId: folderPath
      },
      homework : sessionExist.homework._id ,
      deadline: sessionExist.homework?.deadline
    });

    return res.status(201).json({
      message: "✅ Homework submitted successfully",
      submission: newSubmission
    });

  } catch (error) {
    console.error("❌ Error in submitHomeworkSolution:================>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

 export const upload_Section_Material_service = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { _id: userId } = req.login_user;

    // ✅ التحقق من وجود الملف
    if (!req.file) {
      return res.status(400).json({ message: "❌ PDF file is required" });
    }

    // ✅ تحقق من نوع الملف (mimetype أو الامتداد)
    if (
      !PDFExtension.some(type => req.file.mimetype.startsWith(type)) &&
      req.file.originalname.split(".").pop().toLowerCase() !== "pdf"
    ) {
      return res.status(400).json({ message: "❌ Only PDF files are allowed" });
    }

    // ✅ جلب الطالب
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(400).json({ message: "❌ This student does not exist" });
    }

    // ✅ التحقق من وجود السيشن والواجب
    const sessionExist = await Session.findById(sessionId).populate("section");
    if (!sessionExist || !sessionExist.section) {
      return res.status(400).json({ message: "❌ No section found for this session" });
    }
    console.log(sessionExist);
    

    // ✅ رفع الملف على Cloudinary
    const folderPath = `${process.env.FOLDER_NAME_CLOUDINARY}/User/Submissions/Section/${student._id}`;
    const uploadResult = await cloudinary().uploader.upload(req.file.path, {
      folder: folderPath,
      resource_type: "raw", // PDF
      format: "pdf"
    });

    if (!uploadResult?.public_id || !uploadResult?.secure_url) {
      return res.status(500).json({ message: "❌ Failed to upload file to Cloudinary" });
    }

    // ✅ إنشاء Submission بعد نجاح الرفع
    const newSubmission = await Submission.create({
      student: student._id,
      session: sessionExist._id,
      submissionType: SUBMISSION_TYPE.SECTION,
      pdfSolution: {
        public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url,
        folderId: folderPath
      },
      section : sessionExist.section._id ,
      deadline: sessionExist.section?.deadline
    });

    return res.status(201).json({
      message: "✅ Section submitted successfully",
      submission: newSubmission
    });
  } catch (error) {
    console.error("❌ Error in upload_Section_Material=================>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const submit_VideoQuiz_Answers_service = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { _id: userId } = req.login_user;
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "❌ Answers must be provided as an array" });
    }

    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ message: "❌ Student not found" });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "❌ Session not found" });
    }

    if (!session.videoQuizzes || session.videoQuizzes.length === 0) {
      return res.status(400).json({ message: "❌ No video quizzes found for this session" });
    }

    let totalQuestions = session.videoQuizzes.length;
    let correctCount = 0;

    for (let quiz of session.videoQuizzes) {
      const studentAnswer = answers.find(a => String(a.questionId) === String(quiz._id));
      if (studentAnswer) {
        const isCorrect = studentAnswer.answer === quiz.correctAnswer;
        if (isCorrect) correctCount++;
      }
    }

    const score = (correctCount / totalQuestions) * 100;
    const passed = score >= 70;

    // ✅ لو عايز تحدث passingGrade في كل سؤال
    session.videoQuizzes.forEach(q => {
      q.passingGrade = score;
    });

    // ✅ تحديث أو إضافة نتيجة الطالب في studentResults
    const existingResultIndex = session.studentResults.findIndex(r => String(r.student) === String(student._id));
    if (existingResultIndex > -1) {
      session.studentResults[existingResultIndex].score = score;
      session.studentResults[existingResultIndex].passed = passed;
    } else {
      session.studentResults.push({ student: student._id, score, passed });
    }

    await session.save();

    if (!passed) {
      return res.status(200).json({
        message: "❌ You scored below 70%. Please rewatch the video and try again.",
        score,
        passed
      });
    }

    return res.status(200).json({
      message: "✅ Quiz submitted successfully",
      score,
      passed
    });

  } catch (error) {
    console.error("❌ Error in submit_VideoQuiz_Answers_service:================>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



// any thing below is under testing
//===========================================



// need to check the homework and section and exam // and if the session depend on other one //
//  and add points id the student finish the questions quezz and the video 
export const watch_session_video_service = async (req, res) => {
  try {
    const { _id: userId } = req.login_user;
    const { sessionId } = req.params;

    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ message: "❌ Student not found" });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "❌ Session not found" });
    }

    // ✅ التحقق من division و grade
    if (student.division !== session.division || student.grade !== session.grade) {
      return res.status(403).json({ message: "❌ You are not allowed to watch this session" });
    }

    // ✅ تحقق لو الطالب عنده السيشن بالفعل
    const existingProgress = student.sessionProgress.find(
      (p) => p.session.toString() === sessionId && p.isPaid === true
    );

    if (existingProgress) {
      if (existingProgress.expirationDate > new Date()) {
        // ✅ السيشن لسه صالحة
        return res.status(200).json({
          message: "✅ Session already unlocked",
          remainingCredits: student.sessionCredits,
          expiresAt: existingProgress.expirationDate,
          session
        });
      } else {
        // ❌ السيشن انتهت صلاحيتها
        return res.status(403).json({
          message: "❌ Session access expired after 7 days, sorry you can call the teacher",
          expiredAt: existingProgress.expirationDate
        });
      }
    }

    // ✅ لو السيشن مش موجودة عنده خالص
    if (student.sessionCredits <= 0) {
      return res.status(400).json({ message: "❌ You don't have enough session credits" });
    }

    // ✅ خصم كريدت واحد
    student.sessionCredits -= 1;

    // ✅ أضف السيشن في sessionProgress مع تاريخ انتهاء بعد 7 أيام
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7);

    student.sessionProgress.push({
      session: sessionId,
      isPaid: true,
      expirationDate
    });

    await student.save();

    return res.status(200).json({
      message: "✅ Session unlocked for 7 days",
      remainingCredits: student.sessionCredits,
      expiresAt: expirationDate,
      session
    });

  } catch (error) {
    console.error("❌ Error in watch_session_video_service============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};













