import * as supervisor_services from "./services/index.js"
import  Router  from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
const supervisor_controller = Router()
import { authentication_middleware, authorization_middleware } from "../../Middlewares/authentication_middleware.js";
import { system_role } from "../../Constants/constants.js";

const { SUPERVISOR } = system_role


supervisor_controller.use(authentication_middleware() , authorization_middleware([SUPERVISOR]) )

// crud
supervisor_controller.get("/get_supervisor_data", error_handler_middleware( supervisor_services.get_supervisor_data_service));



// ✅ عرض المساعدين التابعين له
supervisor_controller.get("/assistants", error_handler_middleware( supervisor_services.getSupervisorAssistants_service));

// ✅ عرض التصحيحات
supervisor_controller.get("/correction-requests", error_handler_middleware( supervisor_services.getCorrectionRequests_service));

// ✅ اعتماد أو رفض التصحيح
supervisor_controller.put("/correction-requests/:requestId/review", error_handler_middleware( supervisor_services.reviewCorrectionRequest_service));

// ✅ الموافقة أو الرفض على طلبات المساعدين
supervisor_controller.put("/assistant-requests/:requestId/review", error_handler_middleware( supervisor_services.reviewAssistantRequest_service));







export default supervisor_controller