import * as assistant_services from "./services/index.js"
import  Router  from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
const assistant_controller = Router()
import { authentication_middleware, authorization_middleware } from "../../Middlewares/authentication_middleware.js";
import { system_role } from "../../Constants/constants.js";

const { ASSISTANT } = system_role


assistant_controller.use(authentication_middleware() , authorization_middleware([ASSISTANT]) )


// assistant data
assistant_controller.get("/get_assistant_data",  error_handler_middleware(  assistant_services.get_assistant_data_service));
assistant_controller.get("/get_assistant_students",error_handler_middleware( assistant_services.get_assistant_students_service));
assistant_controller.get("/get_assistant_submissions",error_handler_middleware( assistant_services.get_assistant_submissions_service)); // 3 apis


// approve students
assistant_controller.post("/approve_student", error_handler_middleware(  assistant_services.approve_Student_Request_service));
assistant_controller.get("/get_pending_students", error_handler_middleware( assistant_services.get_Pending_Students_service));


// assistant request
assistant_controller.get("/get_assistant_requests",error_handler_middleware( assistant_services.get_assistant_Requests_service));
assistant_controller.post("/request/video_extension",error_handler_middleware( assistant_services.request_video_extension_service));
assistant_controller.post("/request/free_session",error_handler_middleware( assistant_services.request_free_session_service))
assistant_controller.post("/request/submission_override",error_handler_middleware( assistant_services.request_submission_override_service));


// correct the submissions
assistant_controller.put("/correct_exam_submission" ,error_handler_middleware( assistant_services.correct_exam_submission_service)); // 2apis
assistant_controller.put("/correct_Homework&Section_submission" ,error_handler_middleware( assistant_services.correct_exam_submission_service)); // 2apis




assistant_controller.post("correct_to_supervisor/:assistantId", error_handler_middleware ( assistant_services.send_correction_to_supervisor_service));









export default assistant_controller