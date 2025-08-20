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

teacher_controller.post("/add_session"   , error_handler_middleware(teacher_services.add_Session_teacher_service)  ) 
teacher_controller.put("/update_session/:sessionId", error_handler_middleware(teacher_services.update_session_teacher_service)  ) 
teacher_controller.delete("/delete_session/:sessionId", error_handler_middleware(teacher_services.delete_session_teacher_service)  ) 

teacher_controller.post("/homework/:sessionId", error_handler_middleware(teacher_services.addHomeworkToSession)  ) 
teacher_controller.post("/quiz/:sessionId"  , error_handler_middleware(teacher_services.addQuizToSession)  ) 
teacher_controller.post("/section/:sessionId", error_handler_middleware(teacher_services.addSectionToSession)  ) 
teacher_controller.post("/monthlyExam", error_handler_middleware(teacher_services.add_monthly_exam_teacher_service)  ) 




export default teacher_controller