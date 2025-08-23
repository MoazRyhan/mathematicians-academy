import * as payment_services from "./services/index.js"
import { Router } from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
import { system_role } from "../../Constants/constants.js";
import { authentication_middleware, authorization_middleware } from "../../Middlewares/authentication_middleware.js";
const payment_controller = Router()
const { ACCOUNTANT , ADMIN } = system_role



payment_controller.use(authentication_middleware() , authorization_middleware([ACCOUNTANT , ADMIN]) )


payment_controller.get( "/get_all_payments"  , error_handler_middleware(payment_services.get_AllPayments_service  ))
payment_controller.patch( "/confirm_Payments/:paymentId"  , error_handler_middleware(payment_services.confirm_Payment_service  ))
payment_controller.post( "/add_student_manual"  , error_handler_middleware(payment_services.add_Student_ToSession_service  ))

















export default payment_controller