import * as supervisor_services from "./services/index.js"
import  Router  from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
const supervisor_controller = Router()
import { authentication_middleware, authorization_middleware } from "../../Middlewares/authentication_middleware.js";
import { system_role } from "../../Constants/constants.js";

const { SUPERVISOR } = system_role


supervisor_controller.use(authentication_middleware() , authorization_middleware([SUPERVISOR]) )
supervisor_controller.post( "/login"  , error_handler_middleware(supervisor_services.login_service  )) // under test









export default supervisor_controller