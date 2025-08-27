import * as assistant_services from "./services/index.js"
import  Router  from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
const assistant_controller = Router()
import { authentication_middleware, authorization_middleware } from "../../Middlewares/authentication_middleware.js";
import { system_role } from "../../Constants/constants.js";

const { ASSISTANT } = system_role


assistant_controller.use(authentication_middleware() , authorization_middleware([ASSISTANT]) )

// crud
assistant_controller.get("/get_assistant_data",  error_handler_middleware(  assistant_services.get_assistant_data_service));



// ✅ عرض الطلاب في مجموعة المساعد
assistant_controller.get("/students",error_handler_middleware( assistant_services.get_assistant_students_service));

// ✅ عرض الواجبات والكويزات والسكاشن المرسلة
assistant_controller.get("/submissions",error_handler_middleware( assistant_services.get_assistant_submissions_service)); // 3 apis

// ✅    تصحيح الواجب / السكاشن / ( لو فيها جزاء مقالي غير كده بيتبعت النتيجة علطوول )الكويز
assistant_controller.put("/request/free-session" ,error_handler_middleware( assistant_services.correct_submission_service)); // 3apis

// send the correction to the supervisor
assistant_controller.post("/:assistantId/corrections/send", error_handler_middleware ( assistant_services.send_correction_to_supervisor_service));

// ✅ طلب مد مدة الفيديو
assistant_controller.post("/request/video-extension",error_handler_middleware( assistant_services.request_video_extension_service));

// ✅ طلب فتح حصة مجانًا
assistant_controller.post("/request/free-session",error_handler_middleware( assistant_services.request_free_session_service));

// ✅ طلب تجاوز تسليم
assistant_controller.post("/request/submission-override",error_handler_middleware( assistant_services.request_submission_override_service));

// ✅ عرض تقييم المساعد
assistant_controller.get("/performance",error_handler_middleware( assistant_services.get_assistant_performance_service));




export default assistant_controller