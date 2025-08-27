import Assistant from "../../../DB/Models/assistant.model.js";
import Submission from "../../../DB/Models/submission.model.js";
import User from "../../../DB/Models/user.model.js";
import { decryption } from "../../../Utils/encryption.utils.js";

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








// any thing below is under testing
//===========================================

export const get_assistant_students_service = async (req, res) => {
  try {
    const { _id: assistantId } = req.login_user;

    const assistant = await Assistant.findById(assistantId)
      .populate("students", "name email")
      .populate("groups", "name");

    if (!assistant) {
      return res.status(404).json({ message: "❌ Assistant not found" });
    }

    return res.status(200).json({
      message: "✅ Students fetched successfully",
      students: assistant.students,
      groups: assistant.groups
    });
  } catch (error) {
    console.error("❌ Error in get_assistant_students_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const get_assistant_submissions_service = async (req, res) => {
  try {
    const { _id: assistantId } = req.login_user;

    const assistant = await Assistant.findById(assistantId).populate("students");
    if (!assistant) {
      return res.status(404).json({ message: "❌ Assistant not found" });
    }

    const studentIds = assistant.students.map(s => s._id);

    const submissions = await Submission.find({ student: { $in: studentIds } })
      .populate("relatedHomework relatedExam relatedSection", "title");

    return res.status(200).json({
      message: "✅ Submissions fetched successfully",
      submissions
    });
  } catch (error) {
    console.error("❌ Error in get_assistant_submissions_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const correct_submission_service = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, assistantNotes } = req.body;
    const { _id: assistantId } = req.login_user;

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: "❌ Submission not found" });
    }

    submission.grade = grade;
    submission.assistantNotes = assistantNotes;
    submission.isCorrected = true;
    submission.correctedBy = assistantId;

    await submission.save();

    return res.status(200).json({ message: "✅ Submission corrected", submission });
  } catch (error) {
    console.error("❌ Error in correct_submission_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const send_correction_to_supervisor_service = async (req, res) => {
  try {
    const { assistantId } = req.params;
    const { student, session, submission, type, previousScore, requestedScore, notes } = req.body;

    const assistant = await Assistant.findById(assistantId).populate("supervisor");
    if (!assistant) return res.status(404).json({ message: "Assistant not found" });

    const correctionRequest = await CorrectionRequest.create({
      student,
      assistant: assistantId,
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

    res.status(201).json({ message: "Correction request sent to supervisor", correctionRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const request_video_extension_service = async (req, res) => {
  try {
    const { _id: assistantId } = req.login_user;
    const { studentId, videoId, reason } = req.body;

    const request = await VideoExtensionRequest.create({
      assistant: assistantId,
      student: studentId,
      video: videoId,
      reason
    });

    return res.status(201).json({
      message: "✅ Video extension request submitted",
      request
    });
  } catch (error) {
    console.error("❌ Error in request_video_extension_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const request_free_session_service = async (req, res) => {
  try {
    const { _id: assistantId } = req.login_user;
    const { studentId, sessionId, reason } = req.body;

    const request = await FreeSessionRequest.create({
      assistant: assistantId,
      student: studentId,
      session: sessionId,
      reason
    });

    return res.status(201).json({
      message: "✅ Free session request submitted",
      request
    });
  } catch (error) {
    console.error("❌ Error in request_free_session_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const request_submission_override_service = async (req, res) => {
  try {
    const { _id: assistantId } = req.login_user;
    const { studentId, submissionId, reason } = req.body;

    const request = await SubmissionOverrideRequest.create({
      assistant: assistantId,
      student: studentId,
      submission: submissionId,
      reason
    });

    return res.status(201).json({
      message: "✅ Submission override request submitted",
      request
    });
  } catch (error) {
    console.error("❌ Error in request_submission_override_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const get_assistant_performance_service = async (req, res) => {
  try {
    const { _id: assistantId } = req.login_user;

    const assistant = await Assistant.findById(assistantId).select("performanceScore");
    if (!assistant) {
      return res.status(404).json({ message: "❌ Assistant not found" });
    }

    return res.status(200).json({
      message: "✅ Performance fetched successfully",
      performanceScore: assistant.performanceScore
    });
  } catch (error) {
    console.error("❌ Error in get_assistant_performance_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
