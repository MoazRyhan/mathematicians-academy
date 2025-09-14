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



// add_workers part 
admin_controller.post("/add-accountant", error_handler_middleware(admin_services.add_accountant_service));
admin_controller.post("/add-teacher", error_handler_middleware(admin_services.add_teacher_service));
admin_controller.post("/add-supervisor", error_handler_middleware(admin_services.add_supervisor_service));
admin_controller.post("/add-assistant", error_handler_middleware(admin_services.add_assistant_service));
admin_controller.put("/update-user/:userId", error_handler_middleware(admin_services.update_user_service));
admin_controller.delete("/remove-user/:userId", error_handler_middleware(admin_services.remove_user_service));



// generate_code part
admin_controller.post(  "/generate-codes" , error_handler_middleware(admin_services.generate_payment_codes_service));

//open_session_for_all_students
admin_controller.post("/open_session_for_all/:sessionId", error_handler_middleware(admin_services.open_session_for_all_students_service));


// register attendance
admin_controller.post("/register-attendance",   error_handler_middleware(admin_services.register_Student_Attendance_service));


// reset_password
admin_controller.post("/reset_password",  error_handler_middleware(admin_services.admin_Reset_Password_service));


// add assistant to super
admin_controller.post("/assign_assistant", error_handler_middleware(admin_services.assign_Assistant_To_Supervisor_service));

// updata group data
admin_controller.put(  "/update_group_members" , error_handler_middleware(admin_services.update_group_members_service ));

//===========================================list the  / assistant / supervisor / accountant /  students 

admin_controller.get("/assistants", error_handler_middleware(admin_services.list_Assistants_service));
admin_controller.get("/supervisors", error_handler_middleware(admin_services.list_Supervisors_service));
admin_controller.get("/accountants", error_handler_middleware(admin_services.list_Accountants_service));
admin_controller.get("/students", error_handler_middleware(admin_services.list_Students_service));







export default admin_controller