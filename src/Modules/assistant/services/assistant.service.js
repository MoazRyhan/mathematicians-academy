import Assistant from "../../../DB/Models/assistant.model.js";
import Submission from "../../../DB/Models/submission.model.js";
import User from "../../../DB/Models/user.model.js";
import { decryption } from "../../../Utils/encryption.utils.js";
import Group from './../../../DB/Models/group.model.js';
import CorrectionRequest from './../../../DB/Models/correctionRequest.model.js';
import AssistantRequest from "../../../DB/Models/assistantRequest.model.js";




// ==================== assistant data

export const get_assistant_data_service = async (req, res) => {
  try {
    // 1️⃣ Get the email of the logged-in user
    const { email } = req.login_user;

    // 2️⃣ Find the user by email
    const user = await User.findOne({ email }, "-password");
    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

    // 3️⃣ Find the assistant linked with this user
    const assistant = await Assistant.findOne({ user: user._id })
      .populate({ path: "supervisor", select: "user" })
      .populate({ path: "students", select: "fullName grade" })
      .populate({ path: "groups", select: "name" })
      .populate({ path: "correctionRequests", select: "status createdAt" })
      .populate({ path: "assistantRequest", select: "status createdAt" });

    if (!assistant) {
      return res.status(404).json({ message: "❌ Assistant not found" });
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
    console.log("❌ Error from get_assistant_data =====>", error);
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
      return res.status(404).json({ message: "❌ Assistant not found" });
    }

    return res.status(200).json({
      message: "✅ Students fetched successfully",
      students: assistant.students,
      groups: assistant.groups
    });
  } catch (error) {
    console.error("❌ Error in get_assistant_students_service ==============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const get_assistant_submissions_service = async (req, res) => {
  try {
    const { _id: assistantId } = req.login_user;

    const assistant = await Assistant.findOne({ user: assistantId}).populate("students");
    if (!assistant) {
      return res.status(404).json({ message: "❌ Assistant not found" });
    }

    const studentIds = assistant.students.map(s => s._id);

    const submissions = await Submission.find({ student: { $in: studentIds } })
      // .populate("homework exam section", "pdfSolution"); // for abdu to customize it

    return res.status(200).json({
      message: "✅ Submissions fetched successfully",
      submissions
    });
  } catch (error) {
    console.error("❌ Error in get_assistant_submissions_service ==============>", error);
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
      return res.status(403).json({ message: "❌ Only assistants can view pending students" });
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
    console.error("❌ Error in listPendingStudents =====================>", error);
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
      return res.status(403).json({ message: "❌ Only assistants can approve students" });
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
    console.error("❌ Error in approveStudentRequest:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};






// any thing below is under testing
//===========================================

export const get_assistant_Requests_service = async (req, res) => {
  try {
    const { _id: assistantId } = req.login_user;
    const { status, type } = req.query;

     const assistant = await Assistant.findOne({ user: assistantId})
      if (!assistant) {
      return res.status(404).json({ message: "❌ assistant not found" });
    }

    const filter = { assistant: assistant._id };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const requests = await AssistantRequest.find(filter)
      .populate('student', 'user')
      .populate('targetId');

    return res.status(200).json({ requests });
  } catch (error) {
    console.error("❌ Error in getAssistantRequests  ==============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const request_video_extension_service = async (req, res) => {
  try {
    const { _id: assistantId } = req.login_user;
    const { studentId, videoId, reason } = req.body;

     const assistant = await Assistant.findOne({ user: assistantId})
      if (!assistant) {
      return res.status(404).json({ message: "❌ assistant not found" });
    }

    const request = await AssistantRequest.create({
      assistant: assistant._id,
      student: studentId,
      type: 'video_extension',
      targetId: videoId,
      targetModel: 'Video',
      reason
    });

    return res.status(201).json({
      message: "✅ Video extension request submitted",
      request
    });
  } catch (error) {
    console.error("❌ Error in requestVideoExtension ==============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const request_free_session_service = async (req, res) => {
  try {
    const { _id: assistantId } = req.login_user;
    const { studentId, sessionId, reason } = req.body;

     const assistant = await Assistant.findOne({ user: assistantId})
    if (!assistant) {
      return res.status(404).json({ message: "❌ assistant not found" });
    }

    const request = await AssistantRequest.create({
      assistant: assistant._id,
      student: studentId,
      type: 'free_session',
      targetId: sessionId,
      targetModel: 'Session',
      reason
    });

    return res.status(201).json({
      message: "✅ Free session request submitted",
      request
    });
  } catch (error) {
    console.error("❌ Error in requestFreeSession  ==============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const request_submission_override_service = async (req, res) => {
  try {
    const { _id: assistantId } = req.login_user;
    const { studentId, submissionId, reason } = req.body;

     const assistant = await Assistant.findOne({ user: assistantId})
      if (!assistant) {
      return res.status(404).json({ message: "❌ assistant not found" });
    }

    const request = await AssistantRequest.create({
      assistant: assistant._id,
      student: studentId,
      type: 'submission_override',
      targetId: submissionId,
      targetModel: 'Submission',
      reason
    });

    return res.status(201).json({
      message: "✅ Submission override request submitted",
      request
    });
  } catch (error) {
    console.error("❌ Error in requestSubmissionOverride ==============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};






// ================================ assistant and supervisor flow

export const correct_submission_service = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, assistantNotes } = req.body;
    const { _id: assistantId } = req.login_user;

     const assistant = await Assistant.findOne({ user: assistantId})
      if (!assistant) {
      return res.status(404).json({ message: "❌ assistant not found" });
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: "❌ Submission not found" });
    }

    submission.grade = grade;
    submission.assistantNotes = assistantNotes;
    submission.isCorrected = true;
    submission.correctedBy = assistant._id;

    await submission.save();

    return res.status(200).json({ message: "✅ Submission corrected", submission });
  } catch (error) {
    console.error("❌ Error in correct_submission_service ==============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
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







