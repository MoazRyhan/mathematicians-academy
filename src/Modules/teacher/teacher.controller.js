import  express  from "express"
const teacher_controller = express()
import * as teacher_services from "./services/index.js"
import { authentication_middleware } from '../../Middlewares/authentication_middleware.js';
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js"
import { authorization_middleware } from "../../Middlewares/authentication_middleware.js";
import { system_role } from "../../Constants/constants.js";


const { TEACHER } = system_role


teacher_controller.use(authentication_middleware() , authorization_middleware([TEACHER]) )

// crud
teacher_controller.get(  "/get_teacher_data"   , error_handler_middleware(teacher_services.get_teacher_data_service)  ) 
// ====================================== and also for super / assist / account
teacher_controller.post(  "/updata_teacher_data"   , error_handler_middleware(teacher_services.update_teacher_service)  )  
teacher_controller.delete(  "/delete_teacher_account"   , error_handler_middleware(teacher_services.delete_teacher_service)  ) 

// session part
teacher_controller.post("/add_session"   , error_handler_middleware(teacher_services.add_Session_teacher_service_teacher )  ) 
teacher_controller.put("/update_session/:sessionId", error_handler_middleware(teacher_services.update_session_teacher_service_teacher )  ) 
teacher_controller.delete("/delete_session/:sessionId", error_handler_middleware(teacher_services.delete_session_teacher_service_teacher )  ) 

// exam part 
teacher_controller.post(  "/add_exam_T" , error_handler_middleware(teacher_services.add_exam_service_teacher));
teacher_controller.put("/update_exam_T/:examId", error_handler_middleware(teacher_services.update_exam_service_teacher));
teacher_controller.delete("/delete_exam_T/:examId", error_handler_middleware(teacher_services.delete_exam_service_teacher)); 

// homework  part
teacher_controller.post("/homework/:sessionId", error_handler_middleware(teacher_services.add_Homework_ToSession_service)  ) 

// quiz part
teacher_controller.post("/quiz/:sessionId"  , error_handler_middleware(teacher_services.add_Quiz_ToSession_service)  ) 

// section part
teacher_controller.post("/section/:sessionId", error_handler_middleware(teacher_services.add_Section_ToSession_service)  ) 






export default teacher_controller