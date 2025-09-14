import * as supervisor_services from "./services/index.js"
import  Router  from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
const supervisor_controller = Router()
import { authentication_middleware, authorization_middleware } from "../../Middlewares/authentication_middleware.js";
import { system_role } from "../../Constants/constants.js";

const { SUPERVISOR , ADMIN } = system_role


// ====================================== this is all for the admin and the teacher

// basic work for supervisor and admin
supervisor_controller.post("/create_group", authentication_middleware() , authorization_middleware([SUPERVISOR , ADMIN ]) , error_handler_middleware(  supervisor_services.create_group_service));

//====================================================================================================================

supervisor_controller.use(authentication_middleware() , authorization_middleware([SUPERVISOR]) )

// supervisor data
supervisor_controller.get("/get_supervisor_data", error_handler_middleware( supervisor_services.get_supervisor_data_service));
supervisor_controller.get("/get_supervisor_assistants", error_handler_middleware( supervisor_services.get_Supervisor_Assistants_service));


// basic work for supervisor
supervisor_controller.post("/add_student_toAssistant", error_handler_middleware(  supervisor_services.add_Student_To_Assistant_service));
supervisor_controller.post("/remove_student_fromAssistant",  error_handler_middleware(  supervisor_services.remove_Student_From_Assistant_service));


// assistant request 
supervisor_controller.get("/get_supervisor_requests", error_handler_middleware( supervisor_services.get_supervisor_requests_service));
supervisor_controller.post("/handle_video_extension", error_handler_middleware(  supervisor_services.handle_video_extension_request_service ) );
supervisor_controller.post("/handle_free_session",    error_handler_middleware( supervisor_services.handle_free_session_request_service));
supervisor_controller.post("/handle_submission_override",    error_handler_middleware( supervisor_services.handle_submission_override_request_service));


// review corrections 
supervisor_controller.get("/get_correction_requests", error_handler_middleware( supervisor_services.get_Correction_Requests_service));
supervisor_controller.put("/correction_exam_requests/:requestId", error_handler_middleware( supervisor_services.review_exam_Correction_Request_service));


// review the section / homework  corrections 
supervisor_controller.put("/correction_HomeworkOrSection_requests/:requestId", error_handler_middleware( supervisor_services.review_homework_section_Correction_Request_service));





export default supervisor_controller