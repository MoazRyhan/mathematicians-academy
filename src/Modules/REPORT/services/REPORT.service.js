import Student from "../../../DB/Models/student.model.js";
import Session from "../../../DB/Models/session.model.js";
import Payment from "../../../DB/Models/payment.model.js";
import Teacher from "../../../DB/Models/teacher.model.js";
import Assistant from "../../../DB/Models/assistant.model.js";
import Supervisor from "../../../DB/Models/supervisor.model.js";
import Group from "../../../DB/Models/group.model.js";
import Admin from "../../../DB/Models/admin.model.js";
import Accountant from "../../../DB/Models/accountant.model.js";
import Exam from "../../../DB/Models/exam.model.js";
import moment from "moment";
import { ATTENDANCE_TYPE } from "../../../Constants/constants.js";






// ==================================== student

export const get_student_reports_service = async (req, res) => {
  try {
    const { _id: userId } = req.login_user;

    const student = await Student.findOne({ user: userId })
      .populate({
        path: "sessionProgress.session",
        select: "title date"
      });

    if (!student) {
      return res.status(404).json({ message: "❌ Student not found" });
    }

    const reports = student.sessionProgress.map(sp => ({
      sessionTitle: sp.session?.title,
      sessionDate: sp.session?.date,
      watchedVideoProgress: sp.watchedVideoProgress,
      isHomeworkSubmitted: sp.isHomeworkSubmitted,
      isSectionSubmitted: sp.isSectionSubmitted,
      isExamSubmitted: sp.isExamSubmitted,
      isQuizSubmitted: sp.isQuizSubmitted,
      attendanceRegistered: sp.attendanceRegistered
    }));

    return res.status(200).json({
      student: student.fullName,
      totalSessions: student.sessionProgress.length,
      reports
    });
  } catch (error) {
    console.error("❌ Error in get_student_reports_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const get_student_calendar_service = async (req, res) => {
  try {
    const { _id: userId } = req.login_user;

    const student = await Student.findOne({ user: userId })
      .populate({
        path: "sessionProgress.session",
        select: "title date homeworkDeadline examDeadline"
      });

    if (!student) {
      return res.status(404).json({ message: "❌ Student not found" });
    }

    const calendar = student.sessionProgress.map(sp => ({
      sessionTitle: sp.session?.title,
      sessionDate: sp.session?.date,
      homeworkDeadline: sp.session?.homeworkDeadline || null,
      examDeadline: sp.session?.examDeadline || null
    }));

    return res.status(200).json({ student: student.fullName, calendar });
  } catch (error) {
    console.error("❌ Error in get_student_calendar_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const get_student_points_service = async (req, res) => {
  try {
    const { _id: userId } = req.login_user;

    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ message: "❌ Student not found" });
    }

    return res.status(200).json({
      totalPoints: student.totalPoints,
      redeemablePoints: student.redeemablePoints
    });
  } catch (error) {
    console.error("❌ Error in get_student_points_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};





// ==================================== parent

// ✅ Weekly Report
export const get_weekly_report_service = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ message: "❌ studentId is required" });
    }

    const student = await Student.findById(studentId).populate("sessionProgress.session");
    if (!student) {
      return res.status(404).json({ message: "❌ Student not found" });
    }

    const startOfWeek = moment().startOf("week");
    const endOfWeek = moment().endOf("week");

    const weeklySessions = student.sessionProgress.filter(
      (progress) =>
        progress.session &&
        moment(progress.session.createdAt).isBetween(startOfWeek, endOfWeek)
    );

    return res.status(200).json({
      message: "✅ Weekly report generated",
      data: {
        studentName: student.fullName,
        sessions: weeklySessions.map((p) => ({
          sessionName: p.session.title,
          isHomeworkSubmitted: p.isHomeworkSubmitted,
          isSectionSubmitted: p.isSectionSubmitted,
          isExamSubmitted: p.isExamSubmitted,
          watchedVideoProgress: p.watchedVideoProgress
        }))
      }
    });
  } catch (error) {
    console.error("❌ Error in get_weekly_report_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
// ✅ Monthly Report
export const get_monthly_report_service = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ message: "❌ studentId is required" });
    }

    const student = await Student.findById(studentId).populate("sessionProgress.session");
    if (!student) {
      return res.status(404).json({ message: "❌ Student not found" });
    }

    const startOfMonth = moment().startOf("month");
    const endOfMonth = moment().endOf("month");

    const monthlySessions = student.sessionProgress.filter(
      (progress) =>
        progress.session &&
        moment(progress.session.createdAt).isBetween(startOfMonth, endOfMonth)
    );

    return res.status(200).json({
      message: "✅ Monthly report generated",
      data: {
        studentName: student.fullName,
        sessions: monthlySessions.map((p) => ({
          sessionName: p.session.title,
          isHomeworkSubmitted: p.isHomeworkSubmitted,
          isSectionSubmitted: p.isSectionSubmitted,
          isExamSubmitted: p.isExamSubmitted,
          watchedVideoProgress: p.watchedVideoProgress
        }))
      }
    });
  } catch (error) {
    console.error("❌ Error in get_monthly_report_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
// ✅ Deadlines Report
export const get_student_deadlines_service = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ message: "❌ studentId is required" });
    }

    const student = await Student.findById(studentId).populate("sessionProgress.session");
    if (!student) {
      return res.status(404).json({ message: "❌ Student not found" });
    }

    const deadlines = student.sessionProgress
      .filter((progress) => progress.session)
      .map((progress) => ({
        sessionName: progress.session.title,
        deadline: progress.expirationDate,
        isHomeworkSubmitted: progress.isHomeworkSubmitted,
        isSectionSubmitted: progress.isSectionSubmitted,
        isExamSubmitted: progress.isExamSubmitted
      }));

    return res.status(200).json({
      message: "✅ Deadlines fetched successfully",
      data: deadlines
    });
  } catch (error) {
    console.error("❌ Error in get_student_deadlines_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// =============================== admin


export const get_System_Statistics_service = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalAssistants = await Assistant.countDocuments();
    const totalSupervisors = await Supervisor.countDocuments();
    const totalTeachers = await Teacher.countDocuments();
    const totalAccountants = await Accountant.countDocuments();
    const totalSessions = await Session.countDocuments();
    const totalExams = await Exam.countDocuments();
    const totalPayments = await Payment.countDocuments();
    const totalRevenue = await Payment.aggregate([{ $match: { isConfirmed: true } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);

    return res.status(200).json({
      message: "✅ System Statistics",
      stats: {
        totalStudents,
        totalAssistants,
        totalSupervisors,
        totalTeachers,
        totalAccountants,
        totalSessions,
        totalExams,
        totalPayments,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error("❌ Error in getSystemStatistics:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const get_Roles_Performance_Report_service = async (req, res) => {
  try {
    const assistants = await Assistant.find().select("performanceScore students").populate("students");
    const supervisors = await Supervisor.find().populate("assistants");
    const teachers = await Teacher.find().populate("sessions");

    return res.status(200).json({
      message: "✅ Roles Performance Report",
      data: {
        assistants: assistants.map(a => ({
          id: a._id,
          studentsCount: a.students.length,
          performanceScore: a.performanceScore
        })),
        supervisors: supervisors.map(s => ({
          id: s._id,
          assistantsCount: s.assistants.length
        })),
        teachers: teachers.map(t => ({
          id: t._id,
          sessionsCount: t.Sessions.length
        }))
      }
    });
  } catch (error) {
    console.error("❌ Error in getRolesPerformanceReport:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};




// =============================== teacher

export const get_Supervisors_And_Assistants_Performance_service = async (req, res) => {
  try {
    const { _id: teacherUserId } = req.login_user;

    // جلب المدرس المرتبط بالمستخدم الحالي
    const teacher = await Teacher.findOne({ user: teacherUserId })
      .populate("supervisors", "user assistants")
      .populate("assistants", "user performanceScore");

    if (!teacher) {
      return res.status(404).json({ message: "❌ Teacher not found" });
    }

    const supervisors = await Supervisor.find({ _id: { $in: teacher.supervisors } })
      .populate("user", "name email")
      .populate("assistants", "user performanceScore");

    const assistants = await Assistant.find({ _id: { $in: teacher.assistants } })
      .populate("user", "name email");

    return res.status(200).json({
      message: "✅ Performance Data Fetched",
      data: {
        supervisors: supervisors.map(sup => ({
          supervisor: sup.user,
          assistants: sup.assistants.map(asst => ({
            assistant: asst.user,
            performanceScore: asst.performanceScore
          }))
        })),
        assistants: assistants.map(asst => ({
          assistant: asst.user,
          performanceScore: asst.performanceScore
        }))
      }
    });
  } catch (error) {
    console.error("❌ Error in getSupervisorsAndAssistantsPerformance:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const get_Students_Stats_In_Teacher_Subjects_service = async (req, res) => {
  try {
    const { _id: teacherUserId } = req.login_user;

    const teacher = await Teacher.findOne({ user: teacherUserId }).populate("Sessions");

    if (!teacher) {
      return res.status(404).json({ message: "❌ Teacher not found" });
    }

    const sessionIds = teacher.Sessions.map(s => s._id);

    // جلب عدد الطلاب في هذه الجلسات
    const students = await Student.find({ "sessionProgress.session": { $in: sessionIds } });

    const totalStudents = students.length;
    const completedHomework = students.filter(s =>
      s.sessionProgress.some(p => p.isHomeworkSubmitted)
    ).length;
    const completedSections = students.filter(s =>
      s.sessionProgress.some(p => p.isSectionSubmitted)
    ).length;
    const completedQuizzes = students.filter(s =>
      s.sessionProgress.some(p => p.isQuizSubmitted)
    ).length;

    return res.status(200).json({
      message: "✅ Students Stats Fetched",
      stats: {
        totalStudents,
        completedHomework,
        completedSections,
        completedQuizzes
      }
    });
  } catch (error) {
    console.error("❌ Error in getStudentsStatsInTeacherSubjects:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};




// =============================== supervisor

export const get_Supervisor_Groups_Stats_service = async (req, res) => {
  try {
    const { _id: supervisorUserId } = req.login_user;

    // جلب المشرف من اليوزر
    const supervisor = await Supervisor.findOne({ user: supervisorUserId }).populate("assistants");

    if (!supervisor) {
      return res.status(404).json({ message: "❌ Supervisor not found" });
    }

    // جمع كل المجموعات من كل المساعدين
    const assistantsIds = supervisor.assistants.map(a => a._id);

    const assistants = await Assistant.find({ _id: { $in: assistantsIds } }).populate("groups");

    let totalGroups = 0;
    let totalStudents = 0;
    const groupDetails = [];

    for (const assistant of assistants) {
      for (const group of assistant.groups) {
        totalGroups++;
        const studentsCount = await Student.countDocuments({ group: group._id });
        totalStudents += studentsCount;
        groupDetails.push({
          groupId: group._id,
          groupName: group.name,
          studentsCount
        });
      }
    }

    return res.status(200).json({
      message: "✅ Groups Stats Fetched",
      stats: {
        totalAssistants: assistants.length,
        totalGroups,
        totalStudents,
        groupDetails
      }
    });
  } catch (error) {
    console.error("❌ Error in getSupervisorGroupsStats:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};






// =============================== assistant
// no things there 



// =============================== accountant
export const get_AllPayments_service = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("student", "fullName studentCode")
      .populate("confirmedByAccountant", "name")
      .populate("confirmedByAdmin", "name")
      .populate("relatedSession", "title")
      .sort({ createdAt: -1 });

    return res.status(200).json({ message: "✅ All Payments Fetched", payments });
  } catch (error) {
    console.error("❌ Error in getAllPayments:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const get_FinancialStats_service = async (req, res) => {
  try {
    const totalPayments = await Payment.countDocuments();
    const confirmedPayments = await Payment.countDocuments({ isConfirmed: true });
    const totalAmount = await Payment.aggregate([
      { $match: { isConfirmed: true } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    return res.status(200).json({
      message: "✅ Financial Stats Fetched",
      stats: {
        totalPayments,
        confirmedPayments,
        totalAmount: totalAmount[0]?.total || 0
      }
    });
  } catch (error) {
    console.error("❌ Error in getFinancialStats:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
