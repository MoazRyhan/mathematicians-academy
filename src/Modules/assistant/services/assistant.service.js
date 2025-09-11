import Assistant from "../../../DB/Models/assistant.model.js";
import Submission from "../../../DB/Models/submission.model.js";
import User from "../../../DB/Models/user.model.js";
import { decryption } from "../../../Utils/encryption.utils.js";
import CorrectionRequest from './../../../DB/Models/correctionRequest.model.js';
import AssistantRequest from "../../../DB/Models/assistantRequest.model.js";
import { ASSISTANT_REQUEST_STATUS, ASSISTANT_REQUEST_TYPE, SUBMISSION_TYPE, TARGET_MODEL_TYPE } from "../../../Constants/constants.js";
import Student from "../../../DB/Models/student.model.js";
import Session from './../../../DB/Models/session.model.js';




// ==================== assistant data

export const get_assistant_data_service = async (req, res) => {
  try {
    // 1️⃣ Get the email of the logged-in user
    const { email } = req.login_user;

    // 2️⃣ Find the user by email
    const user = await User.findOne({ email }, "-password");
    if (!user) {
      return res.status(404).json({ message: " User not found" });
    }

    // 3️⃣ Find the assistant linked with this user
    const assistant = await Assistant.findOne({ user: user._id })
      .populate({ path: "supervisor", select: "user" })
      .populate({ path: "students", select: "fullName grade" })
      .populate({ path: "groups", select: "name" })
      .populate({ path: "correctionRequests", select: "status createdAt" })
      .populate({ path: "assistantRequest", select: "status createdAt" });

    if (!assistant) {
      return res.status(404).json({ message: " Assistant not found" });
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

    // 5️⃣ Prepare assistant data
    const assistantData = {
      ...assistant.toObject(),
    };

    // 6️⃣ Return response
    return res.status(200).json({
      message: "✅ Assistant data retrieved successfully",
      user: decryptedUser,
      assistant: assistantData,
    });
  } catch (error) {
    console.log(" Error from get_assistant_data =====>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const get_assistant_students_service = async (req, res) => {
  try {
    const { _id: assistantId } = req.login_user;

    const assistant = await Assistant.findOne({ user: assistantId})
      .populate("students", "fullName user")
      .populate("groups", "name students");

    if (!assistant) {
      return res.status(404).json({ message: " Assistant not found" });
    }

    return res.status(200).json({
      message: "✅ Students fetched successfully",
      students: assistant.students,
      groups: assistant.groups
    });
  } catch (error) {
    console.error(" Error in get_assistant_students_service ==============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const get_assistant_submissions_service = async (req, res) => {
  try {
    const { _id: assistantId } = req.login_user;
    const { submissionType } = req.query; // ✅ ييجي من الكويري

    // ✅ نلاقي الأسستنت
    const assistant = await Assistant.findOne({ user: assistantId }).populate("students");
    if (!assistant) {
      return res.status(404).json({ message: " Assistant not found" });
    }

    const studentIds = assistant.students.map(s => s._id);

    // ✅ فلترة على نوع السبميشن لو موجود
    const filter = { student: { $in: studentIds }, isCorrected: false };

    if (submissionType) {
      // ✅ نتأكد إنه قيمة صحيحة من السبمشن تايب
      const validTypes = Object.values(SUBMISSION_TYPE);
      if (!validTypes.includes(submissionType)) {
        return res.status(400).json({
          message: ` Invalid submissionType. Allowed values: ${validTypes.join(", ")}`
        });
      }
      filter.submissionType = submissionType;
    }

    const submissions = await Submission.find(filter)
      .populate("homework exam section session", "pdfSolution");

    return res.status(200).json({
      message: "✅ Submissions fetched successfully",
      count: submissions.length,
      submissions
    });
  } catch (error) {
    console.error(" Error in get_assistant_submissions_service ==============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== approve students

export const get_Pending_Students_service = async (req, res) => {
  try {
    const { _id } = req.login_user;

    // ✅ تحقق أن المستخدم Assistant
    const assistant = await Assistant.findOne({ user: _id });
    if (!assistant) {
      return res.status(403).json({ message: " Only assistants can view pending students" });
    }

    // ✅ جلب الطلاب اللي حالتهم Pending
    const pendingStudents = await Student.find({ status: STUDENT_ENUMS.STATUS.PENDING })
      // .select("fullName grade division governorate parentPhoneNumber status createdAt") // for abdo to customize it
      .sort({ createdAt: -1 }); // الأحدث أولاً

    return res.status(200).json({
      message: "✅ Pending students retrieved successfully",
      count: pendingStudents.length,
      students: pendingStudents
    });

  } catch (error) {
    console.error(" Error in listPendingStudents =====================>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const approve_Student_Request_service = async (req, res) => {
  try {
    const { studentId } = req.body;
    const { _id } = req.login_user;

    // ✅ تحقق من أن المستخدم Assistant
    const assistant = await Assistant.findOne({ user: _id });
    if (!assistant) {
      return res.status(403).json({ message: " Only assistants can approve students" });
    }

    // ✅ تحقق من وجود الطالب
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // ✅ تحقق إذا كان الطالب Pending
    if (student.status !== STUDENT_ENUMS.STATUS.PENDING) {
      return res.status(400).json({ message: "Student is already approved or rejected" });
    }

    // ✅ قبول الطالب
    student.status = STUDENT_ENUMS.STATUS.APPROVED;
    await student.save();

    return res.status(200).json({ message: "✅ Student approved successfully", student });
  } catch (error) {
    console.error(" Error in approveStudentRequest:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};




// ==================== assistant requests

export const get_assistant_Requests_service = async (req, res) => {
  try {
    const { _id: assistantId } = req.login_user;

     const assistant = await Assistant.findOne({ user: assistantId})
      if (!assistant) {
      return res.status(404).json({ message: " assistant not found" });
    }

    const filter = { assistant: assistant._id };

    const requests = await AssistantRequest.find(filter)
      .populate({ path :'student' , select : "fullName studentCode " })
      // .populate('targetId') // for addo to customize it

    return res.status(200).json({ requests });
  } catch (error) {
    console.error(" Error in getAssistantRequests  ==============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const request_video_extension_service = async (req, res) => {
  try {
    const { _id: assistantId } = req.login_user;
    const { studentId, sessionId, reason } = req.body;

    if (!studentId || !sessionId || !reason) {
      return res.status(400).json({ message: " All fields are required" });
    }

    // ✅ Check assistant
    const assistant = await Assistant.findOne({ user: assistantId });
    if (!assistant) {
      return res.status(404).json({ message: " Assistant not found" });
    }

    // ✅ Check student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: " Student not found" });
    }

    // ✅ Check session
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: " Session not found" });
    }

    // ✅ Check if student's grade & division match session's
    if (student.grade !== session.grade || student.division !== session.division) {
      return res.status(400).json({ 
        message: " Student's grade and division do not match the session" 
      });
    }



    // ✅ Check if student has session in sessionProgress
    const sessionProgress = student.sessionProgress.find(
      (progress) => progress.session.toString() === sessionId
    );

    if (!sessionProgress) {
      return res.status(400).json({ message: " Student does not have this session in progress" });
    }

    const now = new Date();
    if (sessionProgress.expirationDate > now) {
      return res.status(400).json({ 
        message: " Video is still active, no need for extension", 
        expirationDate: sessionProgress.expirationDate 
      });
    }

        // ✅ Check if there is already a pending request for this student & session
    const existingRequest = await AssistantRequest.findOne({
      student: studentId,
      targetId: sessionId,
      type: ASSISTANT_REQUEST_TYPE.VIDEO_EXTENSION,
      status: ASSISTANT_REQUEST_STATUS.PENDING // Assuming status field exists
    });

    if (existingRequest) {
      return res.status(400).json({ 
        message: " A pending request for this session already exists for this student" 
      });
    }

    // ✅ Create extension request
    const request = await AssistantRequest.create({
      assistant: assistant._id,
      student: studentId,
      type: ASSISTANT_REQUEST_TYPE.VIDEO_EXTENSION,
      targetId: sessionId,
      targetModel: TARGET_MODEL_TYPE.VIDEO,
      reason
    });

    return res.status(201).json({
      message: "✅ Video extension request submitted successfully",
      request
    });

  } catch (error) {
    console.error(" Error in requestVideoExtension ==============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const request_free_session_service = async (req, res) => {
  try {
    const { _id: assistantId } = req.login_user;
    const { studentId, sessionId, reason } = req.body;

    if (!studentId || !sessionId || !reason) {
      return res.status(400).json({ message: " All fields are required" });
    }

    // ✅ Check assistant
    const assistant = await Assistant.findOne({ user: assistantId });
    if (!assistant) {
      return res.status(404).json({ message: " Assistant not found" });
    }

    // ✅ Check student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: " Student not found" });
    }

    // ✅ Check session
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: " Session not found" });
    }

    // ✅ Check if student's grade & division match session's
    if (student.grade !== session.grade || student.division !== session.division) {
      return res.status(400).json({ 
        message: " Student's grade and division do not match the session" 
      });
    }

    // ✅ Check if student already has the session
    const alreadyHasSession = student.sessionProgress.some(
      (progress) => progress.session.toString() === sessionId
    );
    if (alreadyHasSession) {
      return res.status(400).json({ message: " Student already has this session" });
    }

    // ✅ Check if there is already a pending request for this student & session
    const existingRequest = await AssistantRequest.findOne({
      student: studentId,
      targetId: sessionId,
      type: ASSISTANT_REQUEST_TYPE.FREE_SESSION,
      status:  ASSISTANT_REQUEST_STATUS.PENDING // Assuming status field exists
    });

    if (existingRequest) {
      return res.status(400).json({ 
        message: " A pending request for this session already exists for this student" 
      });
    }

    // ✅ Create the request
    const request = await AssistantRequest.create({
      assistant: assistant._id,
      student: studentId,
      type: ASSISTANT_REQUEST_TYPE.FREE_SESSION,
      targetId: sessionId,
      targetModel: TARGET_MODEL_TYPE.SESSION,
      reason
    });

    return res.status(201).json({
      message: "✅ Free session request submitted successfully",
      request
    });

  } catch (error) {
    console.error(" Error in requestFreeSession  ==============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const request_submission_override_service = async (req, res) => {
  try {
    const { _id: assistantId } = req.login_user;
    const { studentId, sessionId, submissionId, reason } = req.body;

    if (!studentId || !submissionId || !sessionId || !reason) {
      return res.status(400).json({ message: " All fields are required" });
    }

    // ✅ Check assistant
    const assistant = await Assistant.findOne({ user: assistantId });
    if (!assistant) {
      return res.status(404).json({ message: " Assistant not found" });
    }

    // ✅ Check student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: " Student not found" });
    }

    // ✅ Check session
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: " Session not found" });
    }

    // ✅ Check if student has this session in sessionProgress
    const sessionProgress = student.sessionProgress.find(
      (progress) => progress.session.toString() === sessionId
    );

    if (!sessionProgress) {
      return res.status(400).json({ message: " Student does not have this session" });
    }

    // ✅ Identify submission type
    let submissionType = null;
    if (session.homework?.toString() === submissionId) {
      submissionType = "Homework";
    } else if (session.section?.toString() === submissionId) {
      submissionType = "Section";
    } else if (session.exam?.toString() === submissionId) {
      submissionType = "Exam";
    }

    if (!submissionType) {
      return res.status(400).json({ message: " Submission does not belong to this student or session or there is no submission for this session " });
    }

    // ✅ Check if there is already a pending request for this submission
    const existingRequest = await AssistantRequest.findOne({
      student: studentId,
      targetId: sessionId,
      type: ASSISTANT_REQUEST_TYPE.SUBMISSION_OVERRIDE,
      status:  ASSISTANT_REQUEST_STATUS.PENDING
    });

    if (existingRequest) {
      return res.status(400).json({ message: " A pending request for this submission already exists" });
    }

    // ✅ Create the request with submission type in reason
    const request = await AssistantRequest.create({
      assistant: assistant._id,
      student: studentId,
      type: ASSISTANT_REQUEST_TYPE.SUBMISSION_OVERRIDE,
      targetId: sessionId,
      targetModel: `${TARGET_MODEL_TYPE.SUBMISSION}:${submissionType}`,
      reason: `Reason: ${reason} | Submission Type: ${submissionType}`
    });

    return res.status(201).json({
      message: "✅ Submission override request submitted successfully",
      request
    });

  } catch (error) {
    console.error(" Error in requestSubmissionOverride ==============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};




// ==================== assistant correction


export const correct_exam_submission_service = async (req, res) => {
  try {
    const { submissionId } = req.query;
    const { _id: assistantUserId } = req.login_user;
    const { corrections } = req.body;

    // ✅ نلاقي الأسيستنت
    const assistant = await Assistant.findOne({ user: assistantUserId });
    if (!assistant) {
      return res.status(404).json({ message: "❌ Assistant not found" });
    }

    // ✅ نلاقي السبميشن
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: "❌ Submission not found" });
    }

    // ✅ لازم يكون امتحان
    if (![SUBMISSION_TYPE.EXAM, SUBMISSION_TYPE.MONTHLY_EXAM].includes(submission.submissionType)) {
      return res.status(400).json({ message: "❌ This submission is not for an exam" });
    }

    if (submission.isCorrected) {
      return res.status(400).json({ message: "❌ This submission is already corrected" });
    }

    // ================== Variables ==================
    let totalScore = 0;
    let examTotalGrade = 0;
    let examTotalPoints = 0;
    let studentPoints = 0;

    // ================== Helper ==================
    function applyCorrection(q, correction) {
      if (!correction) return;

      // ✅ لازم يحدد IsCorrect
      if (typeof correction.isCorrect !== "boolean") {
        throw new Error("❌ كل الأسئلة لازم يكون فيها isCorrect");
      }
      q.isCorrect = correction.isCorrect;

      // ✅ لو الأسستنت بعت درجة جديدة
      if (typeof correction.grade === "number") {
        q.gradeAfter = Math.min(correction.grade, q.maxGrade || q.grade || 1);
      }

      // ✅ ملاحظات
      if (correction.assistantNotes !== undefined) {
        q.assistantNotes = correction.assistantNotes;
      }
    }

    // ================== Question Bank ==================
    for (const group of submission.studentResult.answers.questionBank || []) {
      for (const q of group.questions) {
        const correction = corrections?.questionBank?.find(c => String(c.questionId) === String(q.questionId));
        applyCorrection(q, correction);

        if (typeof q.isCorrect !== "boolean") {
          return res.status(400).json({ message: "❌ لازم تخلص تصحيح كل الأسئلة (Question Bank)" });
        }

        const finalGrade = q.gradeAfter ?? q.grade ?? 0;
        const maxGrade = q.maxGrade || q.grade || 1;

        examTotalGrade += maxGrade;
        examTotalPoints += (q.point || 1);

        if (finalGrade > 0) {
          totalScore += finalGrade;
          studentPoints += (q.point || 1);
        }
      }
    }

    // ================== Multiple Choice ==================
    for (const q of submission.studentResult.answers.multipleChoices || []) {
      const correction = corrections?.multipleChoices?.find(c => String(c.questionId) === String(q.questionId));
      applyCorrection(q, correction);

      if (typeof q.isCorrect !== "boolean") {
        return res.status(400).json({ message: "❌ لازم تخلص تصحيح كل الأسئلة (Multiple Choice)" });
      }

      const finalGrade = q.gradeAfter ?? q.grade ?? 0;
      const maxGrade = q.maxGrade || q.grade || 1;

      examTotalGrade += maxGrade;
      examTotalPoints += (q.point || 1);

      if (finalGrade > 0) {
        totalScore += finalGrade;
        studentPoints += (q.point || 1);
      }
    }

// ================== Essay ==================
for (const q of submission.studentResult.answers.essay || []) {
  const correction = corrections?.essay?.find(c => String(c.questionId) === String(q.questionId));

  if (!correction || typeof correction.gradeAfter !== "number") {
    return res.status(400).json({
      message: `❌ لازم تبعت gradeAfter لكل سؤال Essay (questionId: ${q.questionId})`
    });
  }

  applyCorrection(q, correction);

  const maxGrade = q.maxGrade || q.grade || 1;
  const finalGrade = q.gradeAfter ?? 0;

  examTotalGrade += maxGrade;
  examTotalPoints += (q.point || 1);

  // ✅ شرط النصف
  if (finalGrade >= maxGrade / 2) {
    totalScore += finalGrade;
    studentPoints += (q.point || 1);
    q.isCorrect = true;
  } else {
    q.isCorrect = false;
  }
}


    // ================== Final Score ==================
    const percentage = examTotalGrade > 0
      ? Math.round((totalScore / examTotalGrade) * 100 * 100) / 100
      : 0;

    const passed = percentage >= (submission.studentResult.passingScore || 50);

    // ✅ Update submission result
    submission.studentResult.studentGrade = totalScore;
    submission.studentResult.studentPoints = studentPoints;
    submission.studentResult.totalGrade = examTotalGrade;
    submission.studentResult.totalPoints = examTotalPoints;
    submission.studentResult.percentage = percentage;
    submission.studentResult.passed = passed;

    submission.isCorrected = true;
    submission.correctedBy = assistant._id;

    await submission.save();

    return res.status(200).json({
      message: "✅ Submission corrected successfully",
      submission
    });

  } catch (error) {
    console.error("❌ Error in correct_exam_submission_service:", error);
    if (error.message.includes("isCorrect")) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};




// ================================ assistant and supervisor flow  =================== > for abduo




export const send_correction_to_supervisor_service = async (req, res) => {
  try {
    const { assistantId } = req.params;
    const { student, session, submission, type, previousScore, requestedScore, notes } = req.body;

    const assistant = await Assistant.findOne({ user: assistantId}).populate("supervisor");
    if (!assistant) return res.status(404).json({ message: "Assistant not found" });

    const correctionRequest = await CorrectionRequest.create({
      student,
      assistant: assistant._id,
      session,
      submission,
      type,
      previousScore,
      requestedScore,
      notes
    });

    assistant.correctionRequests.push(correctionRequest._id);
    await assistant.save();

    const supervisor = await Supervisor.findById(assistant.supervisor._id);
    if (supervisor) {
      supervisor.correctionRequest.push(correctionRequest._id);
      await supervisor.save();
    }

    await Submission.findByIdAndUpdate(submission, {
      grade: requestedScore,
      isCorrected: true,
      correctedBy: assistantId
    });

    res.status(201).json({ message: "Correction request sent to supervisor ==============>", correctionRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};







