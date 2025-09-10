import Parent from "../../../DB/Models/parent.model.js";
import Student from "../../../DB/Models/student.model.js";
import User from "../../../DB/Models/user.model.js";
import Teacher from './../../../DB/Models/teacher.model.js';
import { cloudinary } from "../../../config/cloudinary.config.js";
import { decryption, encryption } from "../../../Utils/encryption.utils.js";
import Session from "../../../DB/Models/session.model.js";
import Payment from "../../../DB/Models/payment.model.js";
import Submission from "../../../DB/Models/submission.model.js";
import { EXAM_TYPE, PDFExtension, STUDENT_ENUMS, SUBMISSION_TYPE } from "../../../Constants/constants.js";
import { PAYMENT_TYPE } from "../../../Constants/constants.js";
import PaymentCode from "../../../DB/Models/paymentCode.model.js";
import Section from "../../../DB/Models/section.model.js";
import Exam from "../../../DB/Models/exam.model.js";
import Homework from './../../../DB/Models/homework.model.js';




// ================crud
export const get_student_service = async (req, res) => {
  try {
    // 1️⃣ Get the email of the logged-in user
    const { email } = req.login_user;

    // 2️⃣ Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: " User not found" });
    }

    // 3️⃣ Find the student linked with this user
    const student = await Student.findOne({ user: user._id });
    if (!student) {
      return res.status(404).json({ message: " Student not found" });
    }

    // make sure that the student is not pending
    if (student.status === STUDENT_ENUMS.STATUS.PENDING ) {
      return res.status(404).json({ message: " wait tell the admin acc your request" });
    }

        // make sure that the student is not pending
    if (student.status === STUDENT_ENUMS.STATUS.REJECTED ) {
      return res.status(404).json({ message: " your application is rejected call the MS or try again later" });
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
      message: " User and Student data retrieved successfully",
      user: decryptedUser,
      student: decryptedStudent,
    });
  } catch (error) {
    console.log(" Error from get_student_data =====>", error);
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
      return res.status(404).json({ message: " User not found" });
    }

    // 3️⃣ Find the student linked with this user
    const student = await Student.findOne({ user: user._id });
    if (!student) {
      return res.status(404).json({ message: " Student not found" });
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
          return res.status(400).json({ message: " Email already in use, please choose another one" });
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
      message: " Student & User data updated successfully",
      student: updatedStudent,
      user: updatedUser,
    });
  } catch (error) {
    console.log(" Error from update_student_service =====>", error);
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
      return res.status(404).json({ message: " No account found with this ID" });
    }

    // 3️⃣ Delete related Student/Parent/Teacher docs
    const deletedStudent = await Student.findOneAndDelete({ user: _id });
    await Parent.findOneAndDelete({ user: _id });
    await Teacher.findOneAndDelete({ user: _id });

    // 4️⃣ Cleanup Cloudinary resources if student has folder
    if (deletedStudent?.nationalIdImage?.folderId) {
      const folderPath = deletedStudent.nationalIdImage.folderId; // already stored full path

      try {
        //  delete all resources inside folder
        await cloudinary().api.delete_resources_by_prefix(folderPath);

        //  delete the folder itself
        await cloudinary().api.delete_folder(folderPath);
      } catch (err) {
        console.error(" Error deleting Cloudinary folder:", err.message);
      }
    }

    // 5️⃣ Return success
    return res.status(200).json({
      message: " User account and related data deleted successfully",
    });
  } catch (error) {
    console.log(" Error from delete_user_account =====>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



// ==================== more
//  Get Student Sessions by grade & division
export const get_Student_Sessions_service = async (req, res) => {
  try {
    const { _id } = req.login_user;

    // 🔹 Get student info
    const student = await Student.findOne({ user: _id });
    if (!student) {
      return res.status(404).json({ message: " Student not found" });
    }

    // 🔹 Get only needed fields
    const sessions = await Session.find(
      {
        grade: student.grade,
        division: student.division,
        isActive: true
      },
      "title mathBranch grade createdAt" //  Projection
    ).populate({
  path: "createdByTeacher",        // 👨‍🏫 Teacher
  populate: {
    path: "user",           // 👤 User inside Teacher
    select: "name"          //  get only the name
  }
})//  teacher name only

    // 🔹 Format createdAt before sending
    const formattedSessions = sessions.map((s) => ({
      _id: s._id,
      title: s.title,
      mathBranch: s.mathBranch,
      grade: s.grade,
      createdByTeacher : s.createdByTeacher?.user?.name || "Unknown" ,
      createdAt: s.createdAt.toLocaleDateString("en-GB") // 🔥 dd/mm/yyyy
    }));

    return res.status(200).json({
      message: " Student sessions fetched successfully",
      sessions: formattedSessions
    });
  } catch (error) {
    console.error(" Error in getStudentSessions ============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const get_Student_Paid_Sessions_service = async (req, res) => {
  try {
    const { _id } = req.login_user;

    //  Get student
    const student = await Student.findOne({ user: _id }).populate({
      path: "sessionProgress.session", // populate session details
      select: "title mathBranch grade createdAt createdByTeacher", // only needed fields
      populate: {
        path: "createdByTeacher", // teacher info
        populate: {
          path: "user", // user inside teacher
          select: "name"
        }
      }
    });

    if (!student) {
      return res.status(404).json({ message: " Student not found" });
    }

    //  لو مفيش سيشن بروجرس
    if (!student.sessionProgress || student.sessionProgress.length === 0) {
      return res.status(200).json({
        message: " No sessions found for this student",
        sessions: []
      });
    }

    return res.status(200).json({
      message: " Student session progress fetched successfully",
      sessions: student
    });
  } catch (error) {
    console.error(" Error in get_Student_Progress_Sessions_service ============>", error);
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
      relatedSession 
    } = req.body;

    const files = req.files || [];

    //  تحقق من البيانات الأساسية
    if (!paymentMethod) {
      return res.status(400).json({ message: " paymentMethod is required" });
    }

    const student = await Student.findOne({ user: userId});
    
    if (!student) {
      return res.status(404).json({ message: " student not found" });
    }

    if (relatedSession) {
    const session = await Session.findById(relatedSession);
    if (!session) {
      return res.status(404).json({ message: " session not found" });
    }
    }

    let vodafoneCashImageData = null;

if (paymentMethod === PAYMENT_TYPE.VODAFONE_CASH) {

  if (!amount) {
    return res.status(400).json({ message: " amount is required" });
  }

  if (!vodafoneCashNumber) {
    return res.status(400).json({ message: " Vodafone Cash number is required" });
  }

  if (files.length === 0) {
    return res.status(400).json({ message: " Vodafone Cash image is required" });
  }

  if (files.length > 1) {
    return res.status(400).json({ message: " Only one image is allowed for Vodafone Cash" });
  }

  //  رفع الصورة على Cloudinary
  const folderPath = `${process.env.FOLDER_NAME_CLOUDINARY}/User/vodafoneCashImage/${student._id}`;
  let uploadResult;
  try {
    uploadResult = await cloudinary().uploader.upload(files[0].path, {
      folder: folderPath,
    });
  } catch (error) {
    console.error(" Cloudinary upload failed:", error);
    return res.status(500).json({ message: " Failed to upload image to Cloudinary" });
  }

  if (!uploadResult || !uploadResult.secure_url) {
    return res.status(500).json({ message: " Image upload unsuccessful" });
  }

  const { public_id, secure_url } = uploadResult;

  vodafoneCashImageData = {
    image: { public_id, secure_url },
    folderId: folderPath
  };

  //  إنشاء دفع في انتظار التأكيد
  const newPayment = await Payment.create({
    student: student._id,
    amount,
    paymentMethod,
    vodafoneCashNumber,
    vodafoneCashImage: vodafoneCashImageData,
    relatedSession,
    isConfirmed: false
  });

  return res.status(201).json({
    message: " Payment request submitted, awaiting confirmation",
    payment: newPayment
  });
}


if (paymentMethod === PAYMENT_TYPE.CODE) {
  //  لازم الكود يكون صحيح
  if (!paymentCode) {
    return res.status(400).json({ message: " Payment code is required" });
  }

  const codeData = await PaymentCode.findOne({ code: paymentCode });

  if (!codeData) {
    return res.status(400).json({ message: " Invalid payment code" });
  }

  if (codeData.isUsed) {
    return res.status(400).json({ message: " Payment code already fully used" });
  }


  codeData.isUsed = true;
  codeData.usedBy = student._id

  student.sessionCredits += 1


  await codeData.save();
  await student.save();

  //  حفظ الدفع كـ Confirmed مباشرة
  const newPayment = await Payment.create({
    student: student._id,
    paymentMethod,
    paymentCode : paymentCode,
    paymentCodeId : codeData._id,
    relatedSession,
    isConfirmed: true
  });

  return res.status(201).json({
    message: " Payment successful, 1 session added",
    payment: newPayment
  });
}


    return res.status(400).json({ message: " Invalid payment method" });

  } catch (error) {
    console.error(" error in make_payment==========>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const open_session_video_service = async (req, res) => {
  try {
    const { _id: userId } = req.login_user;
    const { sessionId } = req.params;

    // ✅ جلب الطالب
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ message: " Student not found" });
    }

    // ✅ جلب السيشن
    const session = await Session.findById(sessionId)
      .populate("prerequisites homework section exam studentResults.student");
    if (!session) {
      return res.status(404).json({ message: " Session not found" });
    }

    // ✅ التحقق من grade و division
    // if (student.division !== session.division || student.grade !== session.grade) {
    //   return res.status(403).json({ message: " You are not allowed to watch this session" });
    // }

// ✅ لو السيشن موجودة بالفعل عند الطالب في sessionProgress
const existingProgress = student.sessionProgress.find(
  sp => sp.session.toString() === sessionId
);

if (existingProgress) {
  const now = new Date();
  const isExpired = existingProgress.expirationDate && existingProgress.expirationDate < now;

  if (isExpired) {
    return res.status(200).json({
      message: "Session exists but the access period has expired",
      expired: true,
      expiredAt: existingProgress.expirationDate.toLocaleDateString("en-GB"),
      progress: {
        watchedVideoProgress: existingProgress.watchedVideoProgress,
        isPaid: existingProgress.isPaid,
        isHomeworkSubmitted: existingProgress.isHomeworkSubmitted,
        isSectionSubmitted: existingProgress.isSectionSubmitted,
        isExamSubmitted: existingProgress.isExamSubmitted,
        isQuizSubmitted: existingProgress.isQuizSubmitted,
        attendanceRegistered: existingProgress.attendanceRegistered
      }
    });
  }

  // ✅ لو لسه شغالة
  return res.status(200).json({
    message: "Session already unlocked and active",
    expiresAt: existingProgress.expirationDate
      ? existingProgress.expirationDate.toLocaleDateString("en-GB")
      : null,
    expired: false,
    progress: {
      watchedVideoProgress: existingProgress.watchedVideoProgress,
      isPaid: existingProgress.isPaid,
      isHomeworkSubmitted: existingProgress.isHomeworkSubmitted,
      isSectionSubmitted: existingProgress.isSectionSubmitted,
      isExamSubmitted: existingProgress.isExamSubmitted,
      isQuizSubmitted: existingProgress.isQuizSubmitted,
      attendanceRegistered: existingProgress.attendanceRegistered
    },
    session
  });
}


    // ✅ التحقق من الـ prerequisites
    if (session.prerequisites && session.prerequisites.length > 0) {
      const missingPrereqSessions = session.prerequisites.filter(prereq => {
        const prereqId = prereq._id ? prereq._id.toString() : prereq.toString();
        return !student.sessionProgress.some(sp => sp.session.toString() === prereqId);
      });

      if (missingPrereqSessions.length > 0) {
        return res.status(403).json({
          message: " You must own the prerequisite sessions before unlocking this one",
          missingPrerequisites: missingPrereqSessions
        });
      }

      const unmetPrerequisites = session.prerequisites.filter(prereq => {
        const prereqId = prereq._id ? prereq._id.toString() : prereq.toString();
        const progress = student.sessionProgress.find(sp => sp.session.toString() === prereqId);

        return !progress ||
          !progress.isSectionSubmitted ||
          !progress.isHomeworkSubmitted ||
          !progress.isExamSubmitted ||
          !progress.isQuizSubmitted;
      });

      if (unmetPrerequisites.length > 0) {
        return res.status(403).json({
          message: " You must complete all required submissions in the prerequisite sessions",
          unmetPrerequisites
        });
      }
    }

    // ✅ لو السيشن مش موجودة عنده خالص
    if (student.sessionCredits <= 0) {
      return res.status(400).json({ message: " You don't have enough session credits" });
    }

    // ✅ خصم كريدت واحد
    student.sessionCredits -= 1;

    // ✅ إضافة السيشن في sessionProgress مع تاريخ انتهاء بعد 7 أيام
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7);

    student.sessionProgress.push({
      session: sessionId,
      isPaid: true,
      expirationDate
    });

    await student.save();

    return res.status(200).json({
      message: " Session unlocked for 7 days",
      remainingCredits: student.sessionCredits,
      expiresAt: expirationDate.toLocaleDateString("en-GB"),
      session
    });

  } catch (error) {
    console.error(" Error in open_session_video_service============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const get_payment_history_service = async (req, res) => {
  try {
    const { _id: userId } = req.login_user;

    //  هات الطالب المرتبط باليوزر
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ message: " Student not found" });
    }

    //  هات المدفوعات الخاصة بالطالب ده
    const payments = await Payment.find({ student: student._id })
      .sort({ createdAt: -1 });

      // console.log(student._id);
      

    return res.status(200).json({
      message: " Payment history fetched successfully",
      payments
    });
  } catch (error) {
    console.error(" error in get_payment_history:===============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



// ======================= submit
export const submit_Homework_Solution_service = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { _id: userId } = req.login_user;

    if (!req.file) {
      return res.status(400).json({ message: " PDF file is required" });
    }

    if (
      !PDFExtension.some(type => req.file.mimetype.startsWith(type)) &&
      req.file.originalname.split(".").pop().toLowerCase() !== "pdf"
    ) {
      return res.status(400).json({ message: " Only PDF files are allowed" });
    }

    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(400).json({ message: " This student does not exist" });
    }

    const sessionExist = await Session.findById(sessionId).populate("homework");
    if (!sessionExist || !sessionExist.homework) {
      return res.status(400).json({ message: " No homework found for this session" });
    }

    // if he send it before
    const existingProgress = student.sessionProgress.find(
      sp => sp.session.toString() === sessionId && sp.isHomeworkSubmitted === true
    );

    if (existingProgress) {
      return res.status(400).json({ message: " You have already submitted this homework" });
    }

    const folderPath = `${process.env.FOLDER_NAME_CLOUDINARY}/User/Submissions/Homework/${sessionExist?.homework?.title}/${student?._id}`;
    const uploadResult = await cloudinary().uploader.upload(req.file.path, {
      folder: folderPath,
      resource_type: "raw",
      format: "pdf"
    });

    if (!uploadResult?.public_id || !uploadResult?.secure_url) {
      return res.status(500).json({ message: " Failed to upload file to Cloudinary" });
    }

    const newSubmission = await Submission.create({
      student: student._id,
      session: sessionExist._id,
      submissionType: SUBMISSION_TYPE.HOMEWORK,
      pdfSolution: {
         files : { public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url },
        folderId: folderPath
      },
      homework: sessionExist.homework._id,
      deadline: sessionExist.homework?.deadline ,
      submissionTime: Date.now()
    });

    //  updata sessionProgress in Student
    const sessionProgressIndex = student.sessionProgress.findIndex(
      sp => sp.session.toString() === sessionId
    );

    if (sessionProgressIndex !== -1) {
      student.sessionProgress[sessionProgressIndex].isHomeworkSubmitted = true;
      student.sessionProgress[sessionProgressIndex].homeworkSubmission = newSubmission._id;
    } else {
      student.sessionProgress.push({
        session: sessionId,
        isHomeworkSubmitted: true,
        homeworkSubmission: newSubmission._id
      });
    }

    await student.save();


    //  updata homework
    const homework = await Homework.findById(sessionExist.homework);
    if (!homework) {
      return res.status(400).json({ message: " This homework not exist" });
    }

   await Homework.updateOne(
    { _id: sessionExist.homework },
    { $push: { submissions: newSubmission._id } }
   );


    return res.status(201).json({
      message: " Homework submitted successfully",
      submission: newSubmission
    });

  } catch (error) {
    console.error(" Error in submitHomeworkSolution:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const upload_Section_Material_service = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { _id: userId } = req.login_user;

    if (!req.file) {
      return res.status(400).json({ message: " PDF file is required" });
    }

    if (
      !PDFExtension.some(type => req.file.mimetype.startsWith(type)) &&
      req.file.originalname.split(".").pop().toLowerCase() !== "pdf"
    ) {
      return res.status(400).json({ message: " Only PDF files are allowed" });
    }

    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(400).json({ message: " This student does not exist" });
    }

    const sessionExist = await Session.findById(sessionId).populate("section");
    if (!sessionExist || !sessionExist.section) {
      return res.status(400).json({ message: " No section found for this session" });
    }

        // if he send it before
    const existingProgress = student.sessionProgress.find(
      sp => sp.session.toString() === sessionId && sp.isSectionSubmitted === true
    );

    if (existingProgress) {
      return res.status(400).json({ message: " You have already submitted this section" });
    }

    const folderPath = `${process.env.FOLDER_NAME_CLOUDINARY}/User/Submissions/Section/${sessionExist?.section?.title}/${student?._id}`;
    const uploadResult = await cloudinary().uploader.upload(req.file.path, {
      folder: folderPath,
      resource_type: "raw",
      format: "pdf"
    });

    if (!uploadResult?.public_id || !uploadResult?.secure_url) {
      return res.status(500).json({ message: " Failed to upload file to Cloudinary" });
    }


    const newSubmission = await Submission.create({
      student: student._id,
      session: sessionExist._id,
      submissionType: SUBMISSION_TYPE.SECTION,
      pdfSolution: {
        files :{ public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url },
        folderId: folderPath
      },
      section: sessionExist.section._id,
      deadline: sessionExist.section?.deadline,
      submissionTime : Date.now()
    });

    //  تحديث sessionProgress في Student
    const sessionProgressIndex = student.sessionProgress.findIndex(
      sp => sp.session.toString() === sessionId
    );

    if (sessionProgressIndex !== -1) {
      student.sessionProgress[sessionProgressIndex].isSectionSubmitted = true;
      student.sessionProgress[sessionProgressIndex].sectionSubmission = newSubmission._id
    } else {
      student.sessionProgress.push({
        session: sessionId,
        isSectionSubmitted: true,
        sectionSubmission: newSubmission._id
      });
    }

    await student.save();

    //  updata section
    const section = await Section.findById(sessionExist.section);
    if (!section) {
      return res.status(400).json({ message: " This section not exist" });
    }

    console.log(newSubmission._id );
    
   await Section.updateOne(
    { _id: sessionExist.section },
    { $push: { submissions: newSubmission._id } }
   );


    return res.status(201).json({
      message: " Section submitted successfully",
      submission: newSubmission
    });
  } catch (error) {
    console.error(" Error in upload_Section_Material:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const submit_VideoQuiz_Answers_service = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { _id: userId } = req.login_user;
    const { responses, segmentId } = req.body; // { segmentId, responses: [{ questionId, answer }] }

    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ message: "Responses must be provided as an array" });
    }

    // ✅ جلب الطالب
    const student = await Student.findOne({ user: userId });
    if (!student) return res.status(404).json({ message: "Student not found" });

    // ✅ جلب السيشن
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (!session.segments || session.segments.length === 0) {
      return res.status(400).json({ message: "This session has no segments" });
    }

    // ✅ جلب السيجمنت المطلوب
    const segment = session.segments.find(s => String(s._id) === String(segmentId));
    if (!segment) {
      return res.status(400).json({ message: `Invalid segmentId: ${segmentId}` });
    }

    // 🔍 منع الإرسال المكرر بعد الكويز كله
    const progressIndex = student.sessionProgress.findIndex(sp => String(sp.session) === String(sessionId));
    if (progressIndex > -1 && student.sessionProgress[progressIndex].isQuizSubmitted) {
      return res.status(400).json({ message: "You have already submitted this quiz" });
    }

    // ✅ حساب نتيجة السيجمنت
    let segScore = 0;
    for (const q of segment.questions || []) {
      const qIdStr = String(q._id);
      const studentAnswerObj = responses.find(r => String(r.questionId) === qIdStr);
      if (studentAnswerObj && String(studentAnswerObj.answer) === String(q.correctAnswer)) {
        segScore += (q.point || 1);
      }
    }

    const segPassingScore = (segment.passingScore != null)
      ? segment.passingScore
      : Math.ceil(((segment.questions || []).reduce((s, q) => s + (q.point || 1), 0)) * 0.5);

    const segPassed = segScore >= segPassingScore;

    // ✅ تحديث session.studentResults (جزئي أو كامل)
    const existingResultIndex = session.studentResults.findIndex(r => String(r.student) === String(student._id));
    if (existingResultIndex > -1) {
      const prevResult = session.studentResults[existingResultIndex];
      const segIndex = prevResult.segmentResults.findIndex(r => String(r.segmentId) === String(segment._id));

      if (segIndex > -1) {
        prevResult.segmentResults[segIndex] = { segmentId: segment._id, score: segScore, passed: segPassed };
      } else {
        prevResult.segmentResults.push({ segmentId: segment._id, score: segScore, passed: segPassed });
      }

      // تحديث الإجمالي الجزئي
      const totalScore = prevResult.segmentResults.reduce((s, r) => s + (r.score || 0), 0);
      const sessionTotalPoints = session.segments.reduce((s, seg) =>
        s + (seg.questions || []).reduce((ss, q) => ss + (q.point || 1), 0), 0);

      prevResult.totalScore = totalScore;
      prevResult.percentage = Math.round((totalScore / sessionTotalPoints) * 100 * 100) / 100;
      prevResult.passed = prevResult.segmentResults.length === session.segments.length &&
                          prevResult.segmentResults.every(r => r.passed);

      prevResult.completedAt = prevResult.passed ? new Date() : null;

    } else {
      session.studentResults.push({
        student: student._id,
        segmentResults: [{ segmentId: segment._id, score: segScore, passed: segPassed }],
        totalScore: segScore,
        percentage: 0,
        passed: segPassed && (session.segments.length === 1),
        completedAt: segPassed && (session.segments.length === 1) ? new Date() : null
      });
    }
    await session.save();

    // ✅ تحديث progress بالـ endTime للسيجمنت الحالي لو نجح
    if (segPassed) {
      if (progressIndex > -1) {
        student.sessionProgress[progressIndex].watchedVideoProgress = segment.endTime;
      } else {
        student.sessionProgress.push({
          session: sessionId,
          watchedVideoProgress: segment.endTime
        });
      }
      await student.save();
    }

    // ✅ الرد لو فشل
    if (!segPassed) {
      return res.status(200).json({
        message: `You did not pass segment "${segment.title}". Please rewatch and retry.`,
        segmentId,
        score: segScore,
        passed: false
      });
    }

    // ✅ لو ده آخر Segment والطالب نجح في الكل → ندي Points
    const isLastSegment = String(session.segments[session.segments.length - 1]._id) === String(segmentId);
    if (isLastSegment) {
      student.redeemablePoints = (student.redeemablePoints) + (session.videoWatchPoints);

      if (progressIndex > -1) {
        student.sessionProgress[progressIndex].isQuizSubmitted = true;
      } else {
        student.sessionProgress.push({
          session: sessionId,
          isQuizSubmitted: true,
          watchedVideoProgress: segment.endTime
        });
      }

      await student.save();

      return res.status(200).json({
        message: "Quiz completed successfully — all segments passed",
        segmentId,
        score: segScore,
        passed: true,
        videoWatchPoints: session.videoWatchPoints || 0
      });
    }

    //=================================================== 
    student.sessionProgress.push({
      watchedVideoProgress: segment.endTime
    });
    // ✅ الرد لو ده مش آخر Segment
    return res.status(200).json({
      message: `Segment "${segment.title}" passed successfully. You can proceed to the next segment.`,
      segmentId,
      score: segScore,
      passed: true
    });

  } catch (error) {
    console.error("Error in submit_VideoQuiz_Answers_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// ==================================== under testing  ===============================
export const submit_Exam_Solution_service = async (req, res) => {
  try {
    const { examId } = req.params;
    const { _id: userId } = req.login_user;
    const { answers } = req.body; // مصفوفة اجابات الطالب

    //  Check if file exists
    if (!req.file) {
      return res.status(400).json({ message: " PDF file is required" });
    }

    //  Validate file type
    if (
      !PDFExtension.some(type => req.file.mimetype.startsWith(type)) &&
      req.file.originalname.split(".").pop().toLowerCase() !== "pdf"
    ) {
      return res.status(400).json({ message: " Only PDF files are allowed" });
    }

    //  Find student
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(400).json({ message: " This student does not exist" });
    }

    //  Find Exam
    const examExist = await Exam.findById(examId);
    if (!examExist || examExist.examType == EXAM_TYPE.MONTHLY || examExist.month) {
      return res.status(400).json({ message: " Exam not found" });
    }

    // ================== حساب اجابات الطالب ==================
    let totalScore = 0;
    let examTotalPoints = 0;
    const questionResults = [];

    for (const group of examExist.questions.questionBank) {
      for (const q of group.questions) {
        examTotalPoints += (q.point || 1);

        const studentAnsObj = answers?.find(a => String(a.questionId) === String(q._id));
        if (studentAnsObj) {
          const isCorrect = String(studentAnsObj.answer) === String(q.correctAnswer);
          if (isCorrect) {
            totalScore += (q.point || 1);
          }
          questionResults.push({
            questionId: q._id,
            studentAnswer: studentAnsObj.answer,
            correctAnswer: q.correctAnswer,
            isCorrect,
            point: q.point
          });
        } else {
          questionResults.push({
            questionId: q._id,
            studentAnswer: null,
            correctAnswer: q.correctAnswer,
            isCorrect: false,
            point: q.point
          });
        }
      }
    }

    const percentage = examTotalPoints > 0
      ? Math.round((totalScore / examTotalPoints) * 100 * 100) / 100
      : 0;
    const passed = percentage >= 50; // ✅ شرط النجاح (مثلاً 50%)

    //  Upload PDF to Cloudinary
    const folderPath = `${process.env.FOLDER_NAME_CLOUDINARY}/User/Submissions/Exams/${examExist.title}`;
    const uploadResult = await cloudinary().uploader.upload(req.file.path, {
      folder: folderPath,
      resource_type: "raw",
      format: "pdf"
    });

    if (!uploadResult?.public_id || !uploadResult?.secure_url) {
      return res.status(500).json({ message: " Failed to upload file to Cloudinary" });
    }

    //  Create new submission
    const newSubmission = await Submission.create({
      student: student._id,
      exam: examExist._id,
      submissionType: SUBMISSION_TYPE.EXAM,
      pdfSolution: {
        files: { public_id: uploadResult.public_id, secure_url: uploadResult.secure_url },
        folderId: folderPath
      },
      deadline: examExist.deadline,
      submissionTime : Date.now() ,
      result: {
        questionResults,
        totalScore,
        percentage,
        passed
      }
    });

    //  Add submission to Exam
    examExist.submissions.push(newSubmission._id);
    await examExist.save();

    //  Update Student sessionProgress
    const sessionProgressIndex = student.sessionProgress.findIndex(
      sp => sp.session?.toString() === examExist.relatedSession?.toString()
    );

    if (sessionProgressIndex !== -1) {
      student.sessionProgress[sessionProgressIndex].isExamSubmitted = true;
      student.sessionProgress[sessionProgressIndex].examSubmission = newSubmission._id;
    } else {
      student.sessionProgress.push({
        session: examExist.relatedSession,
        isExamSubmitted: true,
        examSubmission: newSubmission._id
      });
    }

    await student.save();
    
    return res.status(201).json({
      message: " Exam submitted successfully",
      submission: newSubmission
    });

  } catch (error) {
    console.error(" Error in submit_Exam_Solution_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};




// ======================= monthly exam
export const get_monthly_exams_service = async (req, res) => {
  try {
    const { _id: userId } = req.login_user;

    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ message: " Student not found" });
    }

    //  هجيب الامتحانات الشهرية المرتبطة بجريد الطالب )
    const exams = await Exam.find({
      isActive: true,
      examType : EXAM_TYPE.MONTHLY ,
      month: { $exists: true, $ne: null },
    })

    const filteredExams = exams.filter(exam =>
      exam?.grade == student.grade &&
      exam?.division == student.division
    );

    return res.status(200).json({
      message: " Monthly exams fetched successfully",
      exams: filteredExams
    });

  } catch (error) {
    console.error(" Error in get_monthly_exams_service============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};













// any thing below is under testing
//===========================================


export const redeem_points_for_session_service = async (req, res) => {
  try {
    const { _id: userId } = req.login_user;

    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ message: " Student not found" });
    }

    const POINTS_PER_SESSION = 1000;

    if (student.redeemablePoints < POINTS_PER_SESSION) {
      return res.status(400).json({
        message: ` You need at least ${POINTS_PER_SESSION} points to redeem a free session`
      });
    }

    //  احسب عدد الحصص الممكن استبدالها
    const sessionsToAdd = Math.floor(student.redeemablePoints / POINTS_PER_SESSION);

    //  خصم النقاط
    student.redeemablePoints -= sessionsToAdd * POINTS_PER_SESSION;

    //  إضافة الحصص المجانية
    student.sessionCredits += sessionsToAdd;

    await student.save();

    return res.status(200).json({
      message: ` Successfully redeemed ${sessionsToAdd} free session(s)`,
      remainingPoints: student.redeemablePoints,
      totalSessionCredits: student.sessionCredits
    });
  } catch (error) {
    console.error(" Error in redeem_points_for_session_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};









// ============================== need to work with ( assistant and supervisor flow ) ===================== >for abduo
export const get_Section_Status_service = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { _id: userId } = req.login_user;

    //  هات الطالب المرتبط باليوزر
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ message: " Student not found" });
    }

    const session = await Session.findById(sessionId).populate("section");
    if (!session || !session.section) {
      return res.status(404).json({ message: " Section not found for this session" });
    }

    const section = await Section.findById(session.section).populate("submissions");
    const submitted = section.submissions.some(sub => sub.student.toString() === student._id.toString());

    return res.status(200).json({
      message: " Section status fetched successfully",
      sessionId,
      sectionId: section._id,
      isSectionSubmitted: submitted
    });
  } catch (error) {
    console.error(" error in getSectionStatus:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const get_Homework_Status_service = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { _id: userId } = req.login_user;

    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ message: " Student not found" });
    }

    const session = await Session.findById(sessionId).populate("homework");
    if (!session || !session.homework) {
      return res.status(404).json({ message: " Homework not found for this session" });
    }

    const homework = await Homework.findById(session.homework).populate("submissions");
    const submitted = homework.submissions?.some(sub => sub.student.toString() === student._id.toString());

    return res.status(200).json({
      message: " Homework status fetched successfully",
      sessionId,
      homeworkId: homework._id,
      isHomeworkSubmitted: submitted || false
    });
  } catch (error) {
    console.error(" error in getHomeworkStatus:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const get_exam_Status_service = async (req, res) => {
  try {
    const { examId } = req.params;
    const { _id: userId } = req.login_user;

    //  جلب الطالب
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ message: " Student not found" });
    }

    //  جلب الامتحان
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: " Exam not found" });
    }

    //  جلب السبميشن للطالب لهذا الامتحان
    const submission = await Submission.findOne({
      student: student._id,
      exam: examId
    });

    //  تجهيز الرد
    return res.status(200).json({
      message: " Exam result fetched successfully",
      examId,
      examTitle: exam.title,
      isSubmitted: !!submission,
      grade: submission ? submission.grade : null,
      isCorrected: submission ? submission.isCorrected : false,
      reviewStatus: submission ? submission.reviewStatus : null,
      finalGrade: submission ? submission.finalGrade : null
    });
  } catch (error) {
    console.error(" Error in get_exam_result_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};







