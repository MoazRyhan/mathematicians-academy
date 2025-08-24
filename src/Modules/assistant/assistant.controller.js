import * as assistant_services from "./services/index.js"
import  Router  from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
const assistant_controller = Router()
import { authentication_middleware, authorization_middleware } from "../../Middlewares/authentication_middleware.js";
import { system_role } from "../../Constants/constants.js";

const { ASSISTANT } = system_role


assistant_controller.use(authentication_middleware() , authorization_middleware([ASSISTANT]) )
assistant_controller.post( "/login"  , error_handler_middleware(assistant_services.correctSubmission  )) // under test





export default assistant_controller