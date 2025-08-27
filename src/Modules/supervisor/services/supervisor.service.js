import Supervisor from "../../../DB/Models/supervisor.model.js";
import User from "../../../DB/Models/user.model.js";
import { decryption } from "../../../Utils/encryption.utils.js";



export const get_supervisor_data_service = async (req, res) => {
  try {
    // 1️⃣ Get the email of the logged-in user
    const { email } = req.login_user;

    // 2️⃣ Find the user by email
    const user = await User.findOne({ email }, "-password");
    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

    // 3️⃣ Find the supervisor linked with this user
    const supervisor = await Supervisor.findOne({ user: user._id })
      .populate({ path: "teacher", select: "name email" })
      .populate({ path: "assistants", select: "user performanceScore" })
      .populate({ path: "correctionReviews", select: "status createdAt" })
      .populate({ path: "correctionRequest", select: "status createdAt" })
      .populate({ path: "assistantRequest", select: "status createdAt" });

    if (!supervisor) {
      return res.status(404).json({ message: "❌ Supervisor not found" });
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

    // 5️⃣ Prepare supervisor data
    const supervisorData = {
      ...supervisor.toObject(),
    };

    // 6️⃣ Return response
    return res.status(200).json({
      message: "✅ Supervisor data retrieved successfully",
      user: decryptedUser,
      supervisor: supervisorData,
    });
  } catch (error) {
    console.log("❌ Error from get_supervisor_data =====>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};




// any thing below is under testing
//===========================================
// ✅ جلب المساعدين المرتبطين بالمشرف
export const getSupervisorAssistants_service = async (req, res) => {
  try {
    const { _id: supervisorId } = req.login_user;

    const supervisor = await Supervisor.findById(supervisorId)
      .populate('assistants', 'user performanceScore');

    if (!supervisor) {
      return res.status(404).json({ message: "Supervisor not found" });
    }

    return res.status(200).json({ assistants: supervisor.assistants });
  } catch (error) {
    console.error("❌ Error in getSupervisorAssistants_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ جلب طلبات التصحيح
export const getCorrectionRequests_service = async (req, res) => {
  try {
    const { _id: supervisorId } = req.login_user;

    const supervisor = await Supervisor.findById(supervisorId)
      .populate({
        path: 'correctionReviews',
        populate: [
          { path: 'assistant', select: 'user' },
          { path: 'student', select: 'user' },
          { path: 'session', select: 'title' }
        ]
      });

    if (!supervisor) {
      return res.status(404).json({ message: "Supervisor not found" });
    }

    return res.status(200).json({ correctionRequests: supervisor.correctionReviews });
  } catch (error) {
    console.error("❌ Error in getCorrectionRequests_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ مراجعة طلب التصحيح
export const reviewCorrectionRequest_service = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body; // ACCEPTED or REJECTED

    const correctionReview = await CorrectionReview.findById(requestId);
    if (!correctionReview) {
      return res.status(404).json({ message: "Correction request not found" });
    }

    correctionReview.status = status;
    await correctionReview.save();

    return res.status(200).json({ message: `Correction request ${status}`, correctionReview });
  } catch (error) {
    console.error("❌ Error in reviewCorrectionRequest_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ مراجعة طلب المساعد
export const reviewAssistantRequest_service = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body; // ACCEPTED or REJECTED

    const assistantRequest = await AssistantRequest.findById(requestId);
    if (!assistantRequest) {
      return res.status(404).json({ message: "Assistant request not found" });
    }

    assistantRequest.status = status;
    await assistantRequest.save();

    return res.status(200).json({ message: `Assistant request ${status}`, assistantRequest });
  } catch (error) {
    console.error("❌ Error in reviewAssistantRequest_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



