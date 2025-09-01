import * as supervisor_services from "./services/index.js"
import  Router  from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
const supervisor_controller = Router()
import { authentication_middleware, authorization_middleware } from "../../Middlewares/authentication_middleware.js";
import { system_role } from "../../Constants/constants.js";

const { SUPERVISOR , ADMIN } = system_role


// ====================================== this is all for the admin and the teacher

// basic work for supervisor
supervisor_controller.post("/create_group", authentication_middleware() , authorization_middleware([SUPERVISOR , ADMIN ]) , error_handler_middleware(  supervisor_services.create_group_service));


//====================================================================================================================

supervisor_controller.use(authentication_middleware() , authorization_middleware([SUPERVISOR]) )

// supervisor data
supervisor_controller.get("/get_supervisor_data", error_handler_middleware( supervisor_services.get_supervisor_data_service));
supervisor_controller.get("/get_Supervisor_Assistants", error_handler_middleware( supervisor_services.get_Supervisor_Assistants_service));
supervisor_controller.get("/get_Correction_Requests", error_handler_middleware( supervisor_services.get_Correction_Requests_service));


// basic work for supervisor
supervisor_controller.post("/add_student_toAssistant", error_handler_middleware(  supervisor_services.add_Student_To_Assistant_service));
supervisor_controller.post("/remove_student_fromAssistant",  error_handler_middleware(  supervisor_services.remove_Student_From_Assistant_service));


// review corrections 
supervisor_controller.put("/correction-requests/:requestId", error_handler_middleware( supervisor_services.review_Correction_Request_service));
supervisor_controller.put("/assistant-requests/:requestId", error_handler_middleware( supervisor_services.review_Assistant_Request_service));







export default supervisor_controller