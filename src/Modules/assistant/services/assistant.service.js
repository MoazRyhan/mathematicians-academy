import Assistant from "../../../DB/Models/assistant.model.js";











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


export const correctSubmission = async (req, res) => {
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
    console.error("❌ Error in correctSubmission:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
