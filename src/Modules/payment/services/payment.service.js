

import PaymentCode from "../../../DB/Models/paymentCode.model.js";
import Student from "../../../DB/Models/student.model.js";






export const get_AllPayments_service = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("student", "name email")
      .populate("confirmedBy", "name email")
      .populate("relatedSession", "title date");

    return res.status(200).json({
      message: "✅ All payments fetched successfully",
      payments
    });
  } catch (error) {
    console.error("❌ Error in getAllPayments:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



export const confirm_Payment_service = async (req, res) => {

  try {
    const { paymentId } = req.params;
    const { _id: accountantId } = req.login_user;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: "❌ Payment not found" });
    }

    if (payment.isConfirmed) {
      return res.status(400).json({ message: "❌ Payment already confirmed" });
    }

    // ✅ تأكيد الدفع
    payment.isConfirmed = true;
    payment.confirmedBy = accountantId;
    await payment.save();

    // ✅ تحديث رصيد الطالب
    await Student.findByIdAndUpdate(payment.student, {
      $inc: { sessionCredits: 1 } // تزود جلسة واحدة لكل دفعه لجلسة
    });

    return res.status(200).json({ message: "✅ Payment confirmed and session credit added", payment });
  } catch (error) {
    console.error("❌ Error in confirmPayment:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const add_Student_ToSession_service = async (req, res) => {
  try {
    const { sessionId, studentId } = req.body;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "❌ Session not found" });
    }

    if (session.students.includes(studentId)) {
      return res.status(400).json({ message: "❌ Student already in session" });
    }

    session.students.push(studentId);
    await session.save();

    return res.status(200).json({ message: "✅ Student added to session", session });
  } catch (error) {
    console.error("❌ Error in addStudentToSession:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



