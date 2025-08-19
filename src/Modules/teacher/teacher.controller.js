import  express  from "express"
const teacher_controller = express()
import * as teacher_services from "./services/index.js"
import { authentication_middleware } from '../../Middlewares/authentication_middleware.js';
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js"
import { authorization_middleware } from "../../Middlewares/authentication_middleware.js";
import { system_role } from "../../Constants/constants.js";

const { TEACHER } = system_role


teacher_controller.use(authentication_middleware() , authorization_middleware([TEACHER]) )
teacher_controller.get(  "/get_teacher_data"   , error_handler_middleware(teacher_services.get_teacher_data)  ) 

// ====================================== and also for super / assist / account
// teacher_controller.post(  "/updata_teacher_data"   , error_handler_middleware(student_service.update_teacher_service)  )  under decs
// teacher_controller.delete(  "/delete_teacher_account"   , error_handler_middleware(student_service.delete_teacher_service)  ) under decs

teacher_controller.post("/add_session"   , error_handler_middleware(teacher_services.addSession_service)  ) 
teacher_controller.post("/:sessionId/homework", error_handler_middleware(teacher_services.addHomeworkToSession)  ) 
teacher_controller.post("/:sessionId/quiz"  , error_handler_middleware(teacher_services.addQuizToSession)  ) 
teacher_controller.post("/:sessionId/section", error_handler_middleware(teacher_services.addSectionToSession)  ) 
teacher_controller.put("/:sessionId/:componentType", error_handler_middleware(teacher_services.updateOrDeleteComponent)  ) 




export default teacher_controller