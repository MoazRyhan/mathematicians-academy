
import User from "../../../DB/Models/user.model.js";
import { decryption } from "../../../Utils/encryption.utils.js";
import Session from "../../../DB/Models/session.model.js";
import Teacher from "./../../../DB/Models/teacher.model.js";
import Homework from "../../../DB/Models/homework.model.js";
import Section from "../../../DB/Models/section.model.js";
import { SESSION_TIME, STUDENT_ENUMS } from "../../../Constants/constants.js";





export const get_teacher_data = async (req, res) => {
  try {
    // 1️⃣ Get the email of the logged-in user
    const { email } = req.login_user;

    // 2️⃣ Find the user by email
    const user = await User.findOne({ email }, "-password");
    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

    // 3️⃣ Find the teacher linked with this user
    const teacher = await Teacher.findOne({ user: user._id } , "-admin" )
      .populate("Sessions") // 
      .populate("exams")   // 
      .populate({ path: "supervisors", select: "-password -admin" })
      .populate({ path: "assistants", select: "-password -admin " })

    if (!teacher) {
      return res.status(404).json({ message: "❌ Teacher not found" });
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

    // 5️⃣ Prepare teacher data
    const teacherData = {
      ...teacher.toObject(),
      // teacher schema ما فيهوش nationalId أو parentPhoneNumber
      // بس لو ضفت أي فيلدات حساسة بعدين ممكن نفكها هنا زي ما عملنا مع الطالب
    };

    // 6️⃣ Return response
    return res.status(200).json({
      message: "✅ User and Teacher data retrieved successfully",
      user: decryptedUser,
      teacher: teacherData,
    });
  } catch (error) {
    console.log("❌ Error from get_teacher_data =====>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



// any thing below is under testing
//===========================================



// ✅ 0. Add a Session  ✔
export const addSession_service = async (req, res) => {
  try {
    const { 
      title, 
      mathBranch, 
      videoLink, 
      grade, 
      division, 
      price, 
      availabilityType, 
      availableAt 
    } = req.body;
    
    const { _id } = req.login_user; // userId from token

    // 🔹 Check if user is a Teacher
    const teacher = await Teacher.findOne({ user: _id });
    if (!teacher) {
      return res.status(403).json({ message: "❌ Only teachers can add sessions" });
    }

    // 🔹 Validate grade
    if (!Object.values(STUDENT_ENUMS.GRADE).includes(grade)) {
      return res.status(400).json({ message: "❌ Invalid grade" });
    }

    // 🔹 Validate division
    if (!Object.values(STUDENT_ENUMS.DIVISION).includes(division)) {
      return res.status(400).json({ message: "❌ Invalid division" });
    }

    // 🔹 Validate availability
    if (!Object.values(SESSION_TIME).includes(availabilityType)) {
      return res.status(400).json({ message: "❌ Invalid availabilityType" });
    }

    if (availabilityType === SESSION_TIME.SCHEDULED && !availableAt) {
      return res.status(400).json({ message: "❌ availableAt is required when availabilityType is SCHEDULED" });
    }

    // 🔹 Create session
    const newSession = new Session({
      title,
      mathBranch,
      videoLink,
      grade,
      division,
      price,
      availabilityType,
      availableAt: availabilityType === SESSION_TIME.SCHEDULED ? availableAt : null,
      createdBy: teacher._id
    });

    await newSession.save();

    // 🔹 Link session to teacher
    teacher.Sessions.push(newSession._id);
    await teacher.save();

    return res.status(201).json({
      message: "✅ Session created successfully",
      session: newSession
    });

  } catch (error) {
    console.log("❌ Error in addSession_service =====>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// ✅ 1. Add Homework to a Session
export const addHomeworkToSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title, description, resources, questions, totalPoints, availableFrom, deadline } = req.body;


    const sessionExist = await Session.findById(sessionId);
    if (!sessionExist) {
      return res.status(403).json({ message: "❌ this session is not available" });
    }


    // Create new homework
    const newHomework = new Homework({
      title,
      description,
      session: sessionId,
      resources,
      questions,
      totalPoints,
      availableFrom,
      deadline
    });
    await newHomework.save();

    // Link homework to session
    await Session.findByIdAndUpdate(sessionId, { homework: newHomework._id });

    return res.status(201).json({ message: "✅ Homework added to session", homework: newHomework });
  } catch (error) {
    console.error("❌ Error in addHomeworkToSession:=========>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ 2. Add Quiz to a Session
export const addQuizToSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionText, options, correctAnswer, showAtTime, passingGrade } = req.body;

    const updatedSession = await Session.findByIdAndUpdate(
      sessionId,
      {
        $push: {
          videoQuizzes: {
            questionText,
            options,
            correctAnswer,
            showAtTime,
            passingGrade
          }
        }
      },
      { new: true }
    );

    return res.status(201).json({ message: "✅ Quiz added to session", session: updatedSession });
  } catch (error) {
    console.error("❌ Error in addQuizToSession:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ 3. Add Section to a Session
export const addSectionToSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title, description, materials } = req.body;

    // Create new section
    const newSection = new Section({
      title,
      description,
      materials,
      session: sessionId,
    });
    await newSection.save();

    // Link section to session
    await Session.findByIdAndUpdate(sessionId, { section: newSection._id });

    return res.status(201).json({ message: "✅ Section added to session", section: newSection });
  } catch (error) {
    console.error("❌ Error in addSectionToSession:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ 4. Update or Delete a Session Component
export const updateOrDeleteComponent = async (req, res) => {
  try {
    const { sessionId, componentType } = req.params; // componentType: homework | section | quiz
    const { action, data } = req.body; // action: update | delete

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    if (componentType === "quiz") {
      if (action === "delete") {
        session.videoQuizzes = [];
      } else if (action === "update") {
        session.videoQuizzes = data; // overwrite quizzes
      }
    } else {
      session[componentType] = action === "delete" ? null : data;
    }

    await session.save();
    return res.status(200).json({ message: `✅ ${componentType} ${action}d successfully`, session });
  } catch (error) {
    console.error("❌ Error in updateOrDeleteComponent:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
