import express  from "express"
const student_controller = express()
import * as student_services from "./services/index.js"
import { authentication_middleware, authorization_middleware } from '../../Middlewares/authentication_middleware.js';
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js"
import { ImageExtensions, PDFExtension, system_role } from "../../Constants/constants.js"
import { Multer_host } from "../../Middlewares/multer_middleware.js";
const { STUDENT } = system_role



student_controller.use(authentication_middleware() , authorization_middleware([STUDENT]) )
student_controller.get(  "/get_student_data"   , error_handler_middleware(student_services.get_student_service)  ) 
student_controller.post(  "/updata_student_data"   , error_handler_middleware(student_services.update_student_service)  ) 
student_controller.delete(  "/delete_student_account"   , error_handler_middleware(student_services.delete_student_service)  )

// session
student_controller.post(  "/make_session_payment"  , Multer_host( ImageExtensions ).array("VodeImage" , 1 )  , error_handler_middleware(student_services.make_payment_service)  ) 
student_controller.get(  "/open_session_video/:sessionId"   , error_handler_middleware(student_services.open_session_video_service)  ) 
student_controller.get(  "/get_payment_history"   , error_handler_middleware(student_services.get_payment_history_service)  ) 
student_controller.get("/get_sessions_list", error_handler_middleware(student_services.get_Student_Sessions_service)  ) 
student_controller.get("/get_Paid_sessions_list", error_handler_middleware(student_services.get_Student_Paid_Sessions_service)  ) 

// submit
student_controller.post(  "/submit_homework/:sessionId"  , Multer_host( PDFExtension ).single("HomeworkPDF")  , error_handler_middleware(student_services.submit_Homework_Solution_service)  ) 
student_controller.post(  "/submit_section/:sessionId"  , Multer_host( PDFExtension ).single("SectionPDF")  , error_handler_middleware(student_services.upload_Section_Material_service)  ) 
student_controller.post(  "/submit_exam/:examId"  , Multer_host( PDFExtension ).single("ExamPDF")  , error_handler_middleware(student_services.submit_Exam_Solution_service)  ) 
student_controller.post(  "/submit_video_quizzes/:sessionId"  , error_handler_middleware(student_services.submit_VideoQuiz_Answers_service)  ) 

// monthly exam
student_controller.get("/get_exams",  error_handler_middleware( student_services.get_exams_service));

// session from the points
student_controller.post("/redeem_points",  error_handler_middleware(student_services.redeem_points_for_session_service));




// ======================================== testing


student_controller.get("/get_section_status/:sessionId",  error_handler_middleware (student_services.get_Section_Status_service))
student_controller.get("/get_homework_status/:sessionId",  error_handler_middleware (student_services.get_Homework_Status_service));
student_controller.get("/get_exam_status/:examId",  error_handler_middleware (student_services.get_exam_Status_service));






export default student_controller