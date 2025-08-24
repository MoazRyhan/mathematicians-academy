import { PAYMENT_TYPE, system_role } from "../../../Constants/constants.js";
import Admin from "../../../DB/Models/admin.model.js";
import Payment from "../../../DB/Models/payment.model.js";
import Session from "../../../DB/Models/session.model.js";
import Student from "../../../DB/Models/student.model.js";
import Accountant from './../../../DB/Models/accountant.model.js';








export const get_AllPayments_service = async (req, res) => {
  try {
    // ✅ تحقق من الصلاحيات
    const allowedRoles = [system_role.ADMIN, system_role.ACCOUNTANT];

    if (!allowedRoles.includes(req.login_user.role)) {
      return res.status(403).json({
        message: "❌ Access denied. Only Admin or Accountant can view payments."
      });
    }

    const { studentId, sessionId, isConfirmed } = req.query;

    let filter = {};

    if (studentId) filter.student = studentId;
    if (sessionId) filter.relatedSession = sessionId;
    if (isConfirmed !== undefined) filter.isConfirmed = isConfirmed === "true";

    // ✅ استرجاع المدفوعات مع العلاقات
    const payments = await Payment.find(filter)
      .populate({
        path: "student",
        select: "fullName grade division governorate user",
        populate: {
          path: "user",
          select: "name email phoneNumber"
        }
      })
      .populate({
        path: "confirmedByAccountant",
        select: "user",
        populate: {
          path: "user",
          select: "name email"
        }
      })
      .populate({
        path: "confirmedByAdmin",
        select: "user",
        populate: {
          path: "user",
          select: "name email"
        }
      })
      .populate("relatedSession", "title date grade division");

    return res.status(200).json({
      message: "✅ Payments fetched successfully",
      totalPayments: payments.length,
      payments
    });

  } catch (error) {
    console.error("❌ Error in get_AllPayments_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const confirm_Payment_service = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { _id: userId, role } = req.login_user;

    // ✅ السماح فقط لـ Admin و Accountant
    const allowedRoles = [system_role.ADMIN, system_role.ACCOUNTANT];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        message: "❌ Access denied. Only Admin or Accountant can confirm payments."
      });
    }

    // ✅ البحث عن الدفعه
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: "❌ Payment not found" });
    }

    if (payment.paymentMethod === PAYMENT_TYPE.CODE) {
      return res.status(400).json({ message: "❌ Code payments are always confirmed" });
    }

    if (payment.isConfirmed) {
      return res.status(400).json({ message: "❌ Payment already confirmed" });
    }

    // ✅ تأكيد الدفع


    // ✅ لو Accountant
    if (role === system_role.ACCOUNTANT) {
      const accountant = await Accountant.findOne({ user: userId });
      if (!accountant) {
        return res.status(404).json({ message: "❌ Accountant profile not found" });
      }
      payment.confirmedByAccountant = accountant._id;
      payment.isConfirmed = true;
    }

    // ✅ لو Admin
    if (role === system_role.ADMIN) {
      const admin = await Admin.findOne({ user: userId });
      if (!admin) {
        return res.status(404).json({ message: "❌ Admin profile not found" });
      }
      payment.confirmedByAdmin = admin._id;
      payment.isConfirmed = true;
    }

    await payment.save();

    // ✅ تحديث رصيد الطالب
    await Student.findByIdAndUpdate(payment.student, {
      $inc: { sessionCredits: 1 }
    });

    return res.status(200).json({
      message: "✅ Payment confirmed successfully and session credit added",
      confirmedByRole: role,
      payment
    });

  } catch (error) {
    console.error("❌ Error in confirm_Payment_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const add_Student_ToSession_manual_service = async (req, res) => {
  try {
    const { sessionId, studentId , DateM } = req.body;
    const { role } = req.login_user;

    // ✅ السماح فقط لـ Admin و Accountant
    const allowedRoles = [system_role.ADMIN, system_role.ACCOUNTANT];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        message: "❌ Access denied. Only Admin or Accountant can add students to sessions."
      });
    }

    if (!DateM) {
      return res.status(404).json({ message: "❌ the date must be" });
    }

    // ✅ التحقق من الجلسة
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "❌ Session not found" });
    }

    // ✅ التحقق من الطالب
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "❌ Student not found" });
    }

    // ✅ التحقق لو الطالب مسجل بالفعل في الجلسة
    const alreadyAdded = student.sessionProgress.some(
      (progress) => progress.session.toString() === sessionId
    );
    if (alreadyAdded) {
      return res.status(400).json({ message: "❌ Student already enrolled in this session" });
    }

    // ✅ التحقق من الـ grade والـ division
    if (student.grade !== session.grade || student.division !== session.division) {
      return res.status(400).json({
        message: `❌ Student's grade (${student.grade}) or division (${student.division}) do not match session grade (${session.grade}) or division (${session.division})`
      });
    }

    const expirationDate = new Date();
    // ✅ إضافة الجلسة في sessionProgress للطالب
    student.sessionProgress.push({
      session: sessionId,
      isPaid: true, // لأنه إدخال يدوي بعد الدفع
      paymentDetails: null, // مفيش دفع مباشر
      expirationDate:     expirationDate.setDate(expirationDate.getDate() + DateM), // ممكن تضيف وقت لو ليها صلاحية
      watchedVideoProgress: 0,
      submissions: [],
      isSectionSubmitted: false,
      isHomeworkSubmitted: false,
      isQuizSubmitted: false,
      attendanceRegistered: false
    });

    await student.save();

    return res.status(200).json({
      message: "✅ Student added to session successfully",
      studentId,
      sessionId,
      student
    });

  } catch (error) {
    console.error("❌ Error in add_Student_ToSession_manual_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



