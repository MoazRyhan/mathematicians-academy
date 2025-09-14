import Supervisor from "../../../DB/Models/supervisor.model.js";
import User from "../../../DB/Models/user.model.js";
import { decryption } from "../../../Utils/encryption.utils.js";
import AssistantRequest from './../../../DB/Models/assistantRequest.model.js';
import Assistant from "../../../DB/Models/assistant.model.js";
import Student from "../../../DB/Models/student.model.js";
import Group from "../../../DB/Models/group.model.js";
import { ASSISTANT_REQUEST_STATUS, ASSISTANT_REQUEST_TYPE, STUDENT_ENUMS, SUBMISSION_REVIEW_STATUS, SUBMISSION_TYPE, system_role, TARGET_MODEL_TYPE } from "../../../Constants/constants.js";
import Admin from "../../../DB/Models/admin.model.js";
import Submission from "../../../DB/Models/submission.model.js";


// ==================== supervisor data
export const get_supervisor_data_service = async (req, res) => {
  try {
    // 1️⃣ Get the email of the logged-in user
    const { email } = req.login_user;

    // 2️⃣ Find the user by email
    const user = await User.findOne({ email }, "-password");
    if (!user) {
      return res.status(404).json({ message: " User not found" });
    }

    // 3️⃣ Find the supervisor linked with this user
    const supervisor = await Supervisor.findOne({ user: user._id })
      .populate({ path: "teacher", select: "name email" })
      .populate({ path: "assistants", select: "user performanceScore" })
      .populate({ path: "correctionReviews", select: "status createdAt" })
      .populate({ path: "correctionRequest", select: "status createdAt" })
      .populate({ path: "assistantRequest", select: "status createdAt" });

    if (!supervisor) {
      return res.status(404).json({ message: " Supervisor not found" });
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
      message: " Supervisor data retrieved successfully",
      user: decryptedUser,
      supervisor: supervisorData,
    });
  } catch (error) {
    console.log(" Error from get_supervisor_data =====>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const get_Supervisor_Assistants_service = async (req, res) => {
  try {
    const { _id: supervisorId } = req.login_user;

    const supervisor = await Supervisor.findOne( { user :supervisorId} )
      .populate('assistants', 'user performanceScore');  // custom it for abdu

    if (!supervisor) {
      return res.status(404).json({ message: "Supervisor not found" });
    }

    return res.status(200).json({ assistants: supervisor.assistants });
  } catch (error) {
    console.error(" Error in getSupervisorAssistants_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const get_Correction_Requests_service = async (req, res) => {
  try {
    const { _id: supervisorId } = req.login_user;
    const { submissionType } = req.query; //  ييجي من الكويري زي assistant service

    //  تأكد أن الـ Supervisor موجود
    const supervisor = await Supervisor.findOne({ user: supervisorId });
    if (!supervisor) {
      return res.status(404).json({ message: "Supervisor not found" });
    }

    //  فلترة على السبمشن
    const filter = { isCorrected: true, isReviewed: false };

    if (submissionType) {
      const validTypes = Object.values(SUBMISSION_TYPE);
      if (!validTypes.includes(submissionType)) {
        return res.status(400).json({
          message: ` Invalid submissionType. Allowed values: ${validTypes.join(", ")}`
        });
      }
      filter.submissionType = submissionType;
    }

    //  هات كل الـ Submissions اللي اتصححت ولسه متراجعتش
    const submissions = await Submission.find(filter)
      .populate({ path: "student", select: "user" })
      .populate({ path: "exam", select: "title pdfSolution" })
      .populate({ path: "homework", select: "title pdfSolution" })
      .populate({ path: "session", select: "title pdfSolution" })
      .populate({ path: "correctedBy", select: "user" });

    //  نحدد النوع (exam / homework / session)
    const correctionRequests = submissions.map(sub => {
      let type = sub.submissionType || null;

      return ( {sub , type } )
    });

    return res.status(200).json({
      message: " Correction requests fetched successfully",
      count: correctionRequests.length,
      correctionRequests
    });
  } catch (error) {
    console.error(" Error in get_Correction_Requests_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};






// ======================= basic work for supervisor
export const create_group_service = async (req, res) => {
  try {
    const { _id: userId, role: ROLE } = req.login_user;
    const { name, supervisorId, assistantId } = req.body;

    if (!name) {
      return res.status(400).json({ message: " Group name is required" });
    }

    if (!assistantId) {
      return res.status(400).json({ message: " Assistant ID is required" });
    }

    let assignedSupervisorId;

    //  لو أدمن لازم يبعـت ID السوبرفايزر
    if (ROLE === system_role.ADMIN) {
      if (!supervisorId) {
        return res.status(400).json({ message: " Supervisor ID is required for Admin" });
      }
      const supervisor = await Supervisor.findById(supervisorId);
      if (!supervisor) {
        return res.status(404).json({ message: " Supervisor not found" });
      }
      assignedSupervisorId = supervisor._id;
    }

    //  لو سوبرفايزر ياخد ID بتاعه من الداتا
    else if (ROLE === system_role.SUPERVISOR) {
      const supervisorRecord = await Supervisor.findOne({ user: userId });
      if (!supervisorRecord) {
        return res.status(403).json({ message: " Supervisor record not found" });
      }
      assignedSupervisorId = supervisorRecord._id;
    } else {
      return res.status(403).json({ message: " Only Admin or Supervisor can create a group" });
    }

    //  تحقق من وجود الأسستنت
    const assistant = await Assistant.findById(assistantId);
    if (!assistant) {
      return res.status(404).json({ message: " Assistant not found" });
    }

    //  إنشاء الجروب
    const group = await Group.create({
      name,
      supervisors: assignedSupervisorId,
      assistants: assistantId
    });

    //  ربط الأسستنت بالجروب
    await Assistant.findByIdAndUpdate(assistantId, {
      $addToSet: { groups: group._id },
      $set: { supervisor: assignedSupervisorId }
    });

    return res.status(201).json({
      message: " Group created successfully",
      group
    });

  } catch (error) {
    console.error(" Error in create_group_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const add_Student_To_Assistant_service = async (req, res) => {
  try {
    const { assistantId, studentId, groupId } = req.body;
    const { _id } = req.login_user;

    //  تحقق من أن المستخدم Supervisor
    const supervisor = await Supervisor.findOne({ user: _id });
    if (!supervisor) {
      return res.status(403).json({ message: " Only supervisors can assign students" });
    }

    //  تحقق من وجود الجروب وتحت إشرافه
    const group = await Group.findOne({ _id: groupId, supervisors: supervisor._id });
    if (!group) {
      return res.status(404).json({ message: " Group not found or not under your supervision" });
    }

    //  تحقق أن الجروب له سوبرفايزر واحد فقط
    if (group.supervisors.length > 1) {
      return res.status(400).json({ message: " Each group can only have one supervisor" });
    }

    //  تحقق من وجود Assistant تحت إشرافه
    const assistant = await Assistant.findOne({ _id: assistantId, supervisor: supervisor._id });
    if (!assistant) {
      return res.status(404).json({ message: "Assistant not found or not under your supervision" });
    }

    //  تحقق أن الجروب له Assistant واحد فقط
    if (group.assistants.length > 1) {
      return res.status(400).json({ message: " Each group can only have one assistant" });
    }

    //  تحقق من وجود الطالب
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    //  تحقق إذا كان الطالب في جروب آخر
    if (student.group && student.group.toString() !== groupId) {
      return res.status(400).json({ message: " Student already belongs to another group" });
    }

    //  تحقق من حالة الطالب
    if (student.status !== STUDENT_ENUMS.STATUS.APPROVED) {
      return res.status(400).json({ message: "Student must be approved first" });
    }

    //  تحقق من عدد الطلاب في الجروب (لا يزيد عن 50)
    if (group.students.length >= 50) {
      return res.status(400).json({ message: " Group already has 50 students" });
    }

    //  تحقق لو الطالب موجود بالفعل في الـ Assistant
    if (assistant.students.includes(studentId)) {
      return res.status(400).json({ message: "Student already assigned to this assistant" });
    }

    //  أضف الطالب إلى Assistant
    assistant.students.push(studentId);
    await assistant.save();

    //  أضف الطالب إلى Group
    if (!group.students.includes(studentId)) {
      group.students.push(studentId);
      await group.save();
    }

    //  حدث الطالب
    student.assistant = assistant._id;
    student.group = group._id;
    await student.save();

    return res.status(200).json({
      message: " Student added to Assistant and Group successfully",
      assistant,
      group
    });
  } catch (error) {
    console.error(" Error in addStudentToAssistant:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const remove_Student_From_Assistant_service = async (req, res) => {
  try {
    const { assistantId, studentId, groupId } = req.body;
    const { _id } = req.login_user;

    //  تحقق من أن المستخدم Supervisor
    const supervisor = await Supervisor.findOne({ user: _id });
    if (!supervisor) {
      return res.status(403).json({ message: " Only supervisors can remove students" });
    }

    const assistant = await Assistant.findOne({ _id: assistantId, supervisor: supervisor._id });
    if (!assistant) {
      return res.status(404).json({ message: "Assistant not found or not under your supervision" });
    }

    const group = await Group.findOne({ _id: groupId, supervisors: supervisor._id });
    if (!group) {
      return res.status(404).json({ message: "Group not found or not under your supervision" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    //  احذف الطالب من Assistant
    assistant.students = assistant.students.filter(id => id.toString() !== studentId);
    await assistant.save();

    //  احذف الطالب من Group
    group.students = group.students.filter(id => id.toString() !== studentId);
    await group.save();

    //  امسح المرجعية من الطالب
    student.assistant = null;
    student.group = null;
    await student.save();

    return res.status(200).json({
      message: " Student removed from Assistant and Group successfully",
      assistant,
      group
    });
  } catch (error) {
    console.error(" Error in removeStudentFromAssistant:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};




// ======================= assistant requests  
export const get_supervisor_requests_service = async (req, res) => {
  try {
    const { status, type } = req.query; // فلترة اختيارية: status = pending/accepted/rejected, type = FREE_SESSION أو VIDEO_EXTENSION

    //  بناء الفلتر
    let filter = {};
    if (status) {
      filter.status = status;
    }
    if (type) {
      filter.type = type;
    }

    //  جلب الريكوستات مع Populate لكل البيانات المهمة
    const requests = await AssistantRequest.find(filter)
      .populate({ path: 'student', select: 'fullName studentCode grade division' })
      .populate({ path: 'assistant', select: 'fullName email' }) // لو عندك الحقل ده
      .populate('targetId') // السيشن أو الفيديو
      .sort({ createdAt: -1 }); // الأحدث أولًا

    return res.status(200).json({ 
      count: requests.length,
      requests
    });

  } catch (error) {
    console.error(" Error in getSupervisorRequests ==============>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const handle_video_extension_request_service = async (req, res) => {
  try {
    const { requestId, action } = req.body; // action = accept | reject

    if (!requestId || ![ ASSISTANT_REQUEST_STATUS.REJECTED,  ASSISTANT_REQUEST_STATUS.APPROVED].includes(action)) {
      return res.status(400).json({ message: " Invalid data" });
    }

    const request = await AssistantRequest.findById(requestId)
      .populate("student")
      .populate("targetId"); // targetId هنا هو session

    if (!request) {
      return res.status(404).json({ message: " Request not found" });
    }

    if (request.type !== ASSISTANT_REQUEST_TYPE.VIDEO_EXTENSION) {
      return res.status(400).json({ message: " Not a video extension request" });
    }

    if (request.status !==  ASSISTANT_REQUEST_STATUS.PENDING ) {
      return res.status(400).json({ message: " Request already handled" });
    }

    if (action === ASSISTANT_REQUEST_STATUS.REJECTED ) {
      request.status =  ASSISTANT_REQUEST_STATUS.REJECTED ;
      await request.save();
      return res.status(200).json({ message: " Request rejected" });
    }

    //  Accept logic
    const student = request.student;
    const sessionId = request.targetId._id;

    const sessionProgress = student.sessionProgress.find(
      (progress) => progress.session.toString() === sessionId.toString()
    );

    if (!sessionProgress) {
      return res.status(400).json({ message: " Student does not have this session" });
    }

    sessionProgress.expirationDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // تمديد يومين من الآن

    await student.save();

    request.status = ASSISTANT_REQUEST_STATUS.APPROVED;
    await request.save();

    return res.status(200).json({ message: " Video extended for 2 days", student });
  } catch (error) {
    console.error(" Error in handleVideoExtensionRequest:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const handle_free_session_request_service = async (req, res) => {
  try {
    const { requestId, action } = req.body; // action = accept | reject

    if (!requestId || ![ ASSISTANT_REQUEST_STATUS.REJECTED,  ASSISTANT_REQUEST_STATUS.APPROVED].includes(action)) {
      return res.status(400).json({ message: " Invalid data" });
    }

    const request = await AssistantRequest.findById(requestId)
      .populate("student")
      .populate("targetId"); // targetId هنا هو session

    if (!request) {
      return res.status(404).json({ message: " Request not found" });
    }

    if (request.type !== ASSISTANT_REQUEST_TYPE.FREE_SESSION) {
      return res.status(400).json({ message: " Not a free session request" });
    }

    if (request.status !==  ASSISTANT_REQUEST_STATUS.PENDING ) {
      return res.status(400).json({ message: " Request already handled" });
    }

    if (action ===  ASSISTANT_REQUEST_STATUS.REJECTED ) {
      request.status =  ASSISTANT_REQUEST_STATUS.REJECTED;
      await request.save();
      return res.status(200).json({ message: " Request rejected" });
    }

    //  Accept logic
    const student = request.student;
    const session = request.targetId;

    student.sessionProgress.push({
      session: session._id,
      isPaid : true ,
      expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 أيام
    });

    await student.save();

    request.status =  ASSISTANT_REQUEST_STATUS.APPROVED ;
    await request.save();

    return res.status(200).json({ message: " Free session granted", student });
  } catch (error) {
    console.error(" Error in handleFreeSessionRequest:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const handle_submission_override_request_service = async (req, res) => {
  try {
    const { requestId, action } = req.body; // action = APPROVED | REJECTED

    if (!requestId || ![ASSISTANT_REQUEST_STATUS.APPROVED, ASSISTANT_REQUEST_STATUS.REJECTED].includes(action)) {
      return res.status(400).json({ message: " Invalid data" });
    }

    const request = await AssistantRequest.findById(requestId)
      .populate("student")
      .populate("targetId"); // targetId = submissionId (Homework, Section, Exam)

    if (!request) {
      return res.status(404).json({ message: " Request not found" });
    }

    if (request.type !== ASSISTANT_REQUEST_TYPE.SUBMISSION_OVERRIDE) {
      return res.status(400).json({ message: " Not a submission override request" });
    }

    if (request.status !== ASSISTANT_REQUEST_STATUS.PENDING) {
      return res.status(400).json({ message: " Request already handled" });
    }

    //  Reject logic
    if (action === ASSISTANT_REQUEST_STATUS.REJECTED) {
      request.status = ASSISTANT_REQUEST_STATUS.REJECTED;
      await request.save();
      return res.status(200).json({ message: " Request rejected" });
    }

    //  Accept logic
    const student = request.student;
    const targetModel = request.targetModel; // Submission:Homework OR Section OR Exam
    const sessionId = request.targetId; // The actual submission ID

    //  Find the session progress for this submission
    const sessionProgress = student.sessionProgress.find((progress) =>
      progress.session.toString() === sessionId.toString()
    );

    if (!sessionProgress) {
      return res.status(400).json({ message: " Student does not have this session in progress" });
    }

    //  Update the correct field based on targetModel
    if (targetModel === TARGET_MODEL_TYPE.SUBMISSION_HOMEWORK) {
      sessionProgress.isHomeworkSubmitted = true;
    } else if (targetModel === TARGET_MODEL_TYPE.SUBMISSION_SECTION) {
      sessionProgress.isSectionSubmitted = true;
    } else if (targetModel === TARGET_MODEL_TYPE.SUBMISSION_EXAM) {
      sessionProgress.isExamSubmitted = true;
    }else if (targetModel === TARGET_MODEL_TYPE.SUBMISSION_VIDEO_QUIZ) {
      sessionProgress.isQuizSubmitted = true; 
    }else {
      return res.status(400).json({ message: " Invalid target model type" });
    }

    await student.save();

    request.status = ASSISTANT_REQUEST_STATUS.APPROVED;
    await request.save();

    return res.status(200).json({ message: " Submission override approved", student });

  } catch (error) {
    console.error(" Error in handleSubmissionOverrideRequest:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};







// ==================== supervisor review for exam 
export const review_exam_Correction_Request_service = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, corrections ,  supervisorComment } = req.body; // status: APPROVED or REJECTED

    // ✅ Find submission
    const submission = await Submission.findById(requestId);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // ✅ Must be exam type
    if (![SUBMISSION_TYPE.EXAM, SUBMISSION_TYPE.MONTHLY_EXAM].includes(submission.submissionType)) {
      return res.status(400).json({ message: "This submission is not an exam type" });
    }

    if (submission.isCorrected === false && submission.isReviewed === true) {
      return res.status(400).json({ message: "This submission assistant not finish it yet" });
    }

    if (submission.isCorrected === false && submission.isReviewed === false) {
      return res.status(400).json({ message: "This submission is not corrected yet from the assistant" });
    }

    // ====== CASE 1: APPROVED ======
    if (status === SUBMISSION_REVIEW_STATUS.APPROVED) {
      submission.isReviewed = true;
      submission.reviewStatus = SUBMISSION_REVIEW_STATUS.APPROVED;

      // ✅ calculate finalPercentage & finalGrade from existing values
      submission.finalPercentage = submission.studentResult?.percentage ;
      submission.finalGrade = submission.studentResult?.studentGrade ;
      submission.finalPoints = submission.studentResult?.studentPoints ;

      // ✅ Add finalPoints to student's redeemablePoints
    if (submission.finalPoints > 0) {
      await Student.findByIdAndUpdate(
        submission.student,
        { $inc: { redeemablePoints: submission.finalPoints } },
        { new: true }
      );
    }


    if ( supervisorComment) {
      submission.supervisorComment =  supervisorComment 
    }

      await submission.save();

      return res.status(200).json({
        message: "✅ Submission approved. Final results saved.",
        submission,
      });
    }

    // ====== CASE 2: REJECTED ======
    if (status === SUBMISSION_REVIEW_STATUS.REJECTED) {
      if (corrections && Array.isArray(corrections)) {
        for (const correction of corrections) {
          const { questionId, comment } = correction;

          // loop over all sections
          const allSections = [
            ...(submission.studentResult.answers.questionBank?.flatMap(g => g.questions) || []),
            ...(submission.studentResult.answers.multipleChoices || []),
            ...(submission.studentResult.answers.essay || []),
          ];

          const question = allSections.find(
            q => String(q.questionId) === String(questionId)
          );

          if (question) {
            question.didSomeThingWrong = true; // mark supervisor flag
            if (comment) {
              question.supervisorComment = comment; // add supervisor note
            }
          }
        }
      }

      submission.isReviewed = true;
      submission.isCorrected = false; // send back to assistant
      submission.reviewStatus = SUBMISSION_REVIEW_STATUS.REJECTED;

    if ( supervisorComment) {
      submission.supervisorComment =  supervisorComment 
    }
      await submission.save();

      return res.status(200).json({
        message: " Submission rejected. Returned to assistant for re-correction.",
        submission,
      });
    }

    return res.status(400).json({ message: "Invalid status. Must be APPROVED or REJECTED." });
  } catch (error) {
    console.error("Error in review_exam_Correction_Request_service:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};



// ==================== supervisor review for section / homework 
export const review_homework_section_Correction_Request_service = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, corrections, supervisorComment } = req.body; // status: APPROVED or REJECTED

    // ✅ Find submission
    const submission = await Submission.findById(requestId);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // ✅ Must be homework or section type
    if (![SUBMISSION_TYPE.HOMEWORK, SUBMISSION_TYPE.SECTION].includes(submission.submissionType)) {
      return res.status(400).json({ message: "This submission is not Homework/Section type" });
    }
    
    if (submission.isCorrected === false && submission.isReviewed === true) {
      return res.status(400).json({ message: "This submission assistant not finish it yet" });
    }

    if (submission.isCorrected === false && submission.isReviewed === false) {
      return res.status(400).json({ message: "This submission is not corrected yet from the assistant" });
    }

    // ====== CASE 1: APPROVED ======
    if (status === SUBMISSION_REVIEW_STATUS.APPROVED) {
      submission.isReviewed = true;
      submission.reviewStatus = SUBMISSION_REVIEW_STATUS.APPROVED;

      // ✅ copy results from studentResultHS
      submission.finalPercentage = submission.studentResultHS?.percentage;
      submission.finalGrade = submission.studentResultHS?.studentGrade;
      submission.finalPoints = submission.studentResultHS?.studentPoints;


      // ✅ Add finalPoints to student's redeemablePoints
    if (submission.finalPoints > 0) {
      await Student.findByIdAndUpdate(
        submission.student,
        { $inc: { redeemablePoints: submission.finalPoints } },
        { new: true }
      );
    }


      if (supervisorComment) {
        submission.supervisorComment = supervisorComment;
      }

      await submission.save();

      return res.status(200).json({
        message: "✅ Homework/Section submission approved. Final results saved.",
        submission,
      });
    }

    // ====== CASE 2: REJECTED ======
    if (status === SUBMISSION_REVIEW_STATUS.REJECTED) {
      if (corrections && Array.isArray(corrections)) {
        for (const correction of corrections) {
          const { questionId, comment } = correction;

          const allQuestions = submission.studentResultHS?.answers?.questions || [];

          const question = allQuestions.find(
            q => String(q.questionId) === String(questionId)
          );

          if (question) {
            question.didSomeThingWrong = true; // mark supervisor flag
            if (comment) {
              question.supervisorComment = comment; // add supervisor note
            }
          }
        }
      }

      submission.isReviewed = true;
      submission.isCorrected = false; // send back to assistant
      submission.reviewStatus = SUBMISSION_REVIEW_STATUS.REJECTED;

      if (supervisorComment) {
        submission.supervisorComment = supervisorComment;
      }

      await submission.save();

      return res.status(200).json({
        message: " Homework/Section submission rejected. Returned to assistant for re-correction.",
        submission,
      });
    }

    return res.status(400).json({ message: "Invalid status. Must be APPROVED or REJECTED." });
  } catch (error) {
    console.error("Error in review_homework_section_Correction_Request_service:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
  
};




