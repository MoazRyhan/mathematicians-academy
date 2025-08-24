import Assistant from "../../../DB/Models/assistant.model.js";
import Submission from "../../../DB/Models/submission.model.js";













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
