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

// submit
student_controller.post(  "/submit_homework/:sessionId"  , Multer_host( PDFExtension ).single("HomeworkPDF")  , error_handler_middleware(student_services.submit_Homework_Solution_service)  ) 
student_controller.post(  "/submit_section/:sessionId"  , Multer_host( PDFExtension ).single("SectionPDF")  , error_handler_middleware(student_services.upload_Section_Material_service)  ) 
student_controller.post(  "/submit_video_quizzes/:sessionId"  , error_handler_middleware(student_services.submit_VideoQuiz_Answers_service)  ) 

// ======================================== testing
student_controller.get("/get_monthly_exam",  error_handler_middleware( student_services.get_monthly_exams_service));
student_controller.post("/submit_monthly_exams/:examId/submit", error_handler_middleware (student_services.submit_monthly_exam_service ) );


student_controller.get("/section_status/:sessionId",  error_handler_middleware (student_services.getSectionStatus))
student_controller.get("/homework_status/:sessionId",  error_handler_middleware (student_services.getHomeworkStatus));
student_controller.get("/quiz_status/:sessionId",  error_handler_middleware (student_services.getQuizStatus));






export default student_controller