import * as accountant_services from "./services/index.js"
import { Router } from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
const accountant_controller = Router()
import { authentication_middleware, authorization_middleware } from "../../Middlewares/authentication_middleware.js";
import { system_role } from "../../Constants/constants.js";

const { ACCOUNTANT } = system_role


accountant_controller.use(authentication_middleware() , authorization_middleware([ACCOUNTANT]) )


accountant_controller.post( "/login"  , error_handler_middleware(accountant_services.login_service  ))







export default accountant_controller