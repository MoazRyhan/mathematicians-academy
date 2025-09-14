import rateLimit from "express-rate-limit";
import { STUDENT_ENUMS } from "../Constants/constants.js";
import Student from "../DB/Models/student.model.js";

// Helper function: Generate sequential unique student code
export const generateSequentialStudentCode = async (grade, division) => {
  try {
    let prefix;

    if (grade === STUDENT_ENUMS.GRADE.FIRST_SECONDARY) {
      prefix = "1";
    } else if (grade === STUDENT_ENUMS.GRADE.SECOND_SECONDARY) {
      if (!division) {
        prefix = "1"; // ✅ default لو مفيش division
      } else {
        prefix = division === STUDENT_ENUMS.DIVISION.SCIENTIFIC ? "2" : "4";
      }
    } else if (grade === STUDENT_ENUMS.GRADE.THIRD_SECONDARY) {
      if (!division) {
        prefix = "1"; // ✅ default لو مفيش division
      } else {
        prefix = division === STUDENT_ENUMS.DIVISION.SCIENTIFIC ? "3" : "5";
      }
    } else {
      prefix = "9"; // fallback لو grade مش معروف
    }

    // Find the last student with same prefix
    const lastStudent = await Student.findOne({
      studentCode: new RegExp("^" + prefix),
    })
      .sort({ studentCode: -1 }) // sort descending
      .lean();

    let nextNumber = 1; // default first number
    if (lastStudent) {
      // Extract numeric part (after prefix)
      const lastCode = lastStudent.studentCode;
      const lastNumber = parseInt(lastCode.slice(1)); // remove prefix
      if (isNaN(lastNumber)) {
        throw new Error("Invalid last student code format in DB");
      }
      nextNumber = lastNumber + 1;
    }

    // Ensure 4 digits (zero padded)
    const paddedNumber = String(nextNumber).padStart(5, "0");

    return prefix + paddedNumber; // e.g. 100001, 100002, ...
  } catch (error) {
    // ⛔ stop API flow, forward error to controller
    throw new Error(`Failed to generate student code: ${error.message}`);
  }
};

// for random questions in the exam
export const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};




// // to limit much req
export const auth_rate_limit =  rateLimit({
      windowMs : 5 * 60 * 1000 , // 5 minutes
      limit : 10 ,
      message : " Too many requests from this IP, please try again later." ,
      legacyHeaders : false
  })
  
