import * as REPORT_services from "./services/index.js"
import { Router } from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
import { authentication_middleware, authorization_middleware } from './../../Middlewares/authentication_middleware.js';
import { system_role } from "../../Constants/constants.js";

const { PARENT , ADMIN , ACCOUNTANT , ASSISTANT ,SUPERVISOR ,STUDENT , TEACHER } = system_role 
const REPORT_controller = Router()

REPORT_controller.use(authentication_middleware())




// =============================== student

REPORT_controller.get("/reports", authorization_middleware([STUDENT]), error_handler_middleware(REPORT_services.get_student_reports_service));

REPORT_controller.get("/calendar", authorization_middleware([STUDENT]), error_handler_middleware(REPORT_services.get_student_calendar_service));

REPORT_controller.get("/points", authorization_middleware([STUDENT]), error_handler_middleware(REPORT_services.get_student_points_service));





// =============================== parent
REPORT_controller.post("/weekly",   authorization_middleware([PARENT]), error_handler_middleware(REPORT_services.get_weekly_report_service));
REPORT_controller.post("/monthly",  authorization_middleware([PARENT]), error_handler_middleware(REPORT_services.get_monthly_report_service));
REPORT_controller.post("/deadlines",authorization_middleware([PARENT]), error_handler_middleware(REPORT_services.get_student_deadlines_service));



// =============================== teacher
REPORT_controller.get("/performance", authorization_middleware([TEACHER ]) , error_handler_middleware(REPORT_services.get_Supervisors_And_Assistants_Performance_service));
REPORT_controller.get("/students-stats",    authorization_middleware([TEACHER ]) ,error_handler_middleware(REPORT_services.get_Students_Stats_In_Teacher_Subjects_service));





// =============================== admin
REPORT_controller.get("/system-stats",   authorization_middleware([ADMIN]) , error_handler_middleware(REPORT_services.get_System_Statistics_service));
REPORT_controller.get("/roles-performance",   authorization_middleware([ADMIN]), error_handler_middleware(REPORT_services.get_Roles_Performance_Report_service));




// =============================== supervisor
REPORT_controller.get("/groups-stats",    authorization_middleware([SUPERVISOR ]) ,error_handler_middleware(REPORT_services.get_Supervisor_Groups_Stats_service));






// =============================== assistant
// no things there 



// =============================== accountant
REPORT_controller.get("/payments", authorization_middleware([ACCOUNTANT , ADMIN ]) , error_handler_middleware(REPORT_services.get_AllPayments_service));
REPORT_controller.get("/stats",    authorization_middleware([ACCOUNTANT , ADMIN ]) ,error_handler_middleware(REPORT_services.get_FinancialStats_service));




export default REPORT_controller