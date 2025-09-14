import * as parent_services from "./services/index.js"
import { Router } from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
const parent_controller = Router()
import { authentication_middleware, authorization_middleware } from "../../Middlewares/authentication_middleware.js";
import { system_role } from "../../Constants/constants.js";

const { PARENT } = system_role


parent_controller.use(authentication_middleware() , authorization_middleware([PARENT]) )



parent_controller.get( "/get_parent_data"  , error_handler_middleware(parent_services.get_parent_data_service  ))





export default parent_controller