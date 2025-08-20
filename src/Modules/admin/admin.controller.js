import * as admin_services from "./services/index.js"
import { Router } from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
import { authentication_middleware, authorization_middleware } from "../../Middlewares/authentication_middleware.js";
import { system_role } from "../../Constants/constants.js";
const { ADMIN  } = system_role
const admin_controller = Router()


admin_controller.use(authentication_middleware() , authorization_middleware([ADMIN]) )

// CRUD routes
admin_controller.get("/get_admin_data", error_handler_middleware(admin_services.get_admin_service));
admin_controller.put("/updata_admin_data", error_handler_middleware(admin_services.update_admin_service));
admin_controller.delete("/delete_admin_account", error_handler_middleware(admin_services.delete_admin_service));

// add part
admin_controller.post("/add-accountant", error_handler_middleware(admin_services.add_accountant_service));
admin_controller.post("/add-teacher", error_handler_middleware(admin_services.add_teacher_service));
admin_controller.post("/add-supervisor", error_handler_middleware(admin_services.add_supervisor_service));
admin_controller.post("/add-assistant", error_handler_middleware(admin_services.add_assistant_service));
admin_controller.put("/update-user/:userId", error_handler_middleware(admin_services.update_user_service));
admin_controller.delete("/remove-user/:userId", error_handler_middleware(admin_services.remove_user_service));

// session part
admin_controller.post(  "/add_session" , error_handler_middleware(admin_services.add_session_service));
admin_controller.put("/update_session/:sessionId", error_handler_middleware(admin_services.update_session_service));
admin_controller.delete("/delete_session/:sessionId", error_handler_middleware(admin_services.delete_session_service));

// test part
admin_controller.post(  "/add_exam" , error_handler_middleware(admin_services.add_exam_service));
admin_controller.put("/update_exam/:examId", error_handler_middleware(admin_services.update_exam_service));
admin_controller.delete("/delete_exam/:examId", error_handler_middleware(admin_services.delete_exam_service));

export default admin_controller