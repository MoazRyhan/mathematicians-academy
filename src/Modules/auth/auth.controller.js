import * as auth_services from "./services/auth.service.js"
import { Router } from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
import { Multer_host } from "../../Middlewares/multer_middleware.js";
import { ImageExtensions } from "../../Constants/constants.js";
import { authentication_middleware } from './../../Middlewares/authentication_middleware.js';
const auth_controller = Router()

// admin creation   ====> we will use this for one time
auth_controller.post("/create", error_handler_middleware(auth_services.create_admin_service));



auth_controller.post( "/signup"  , Multer_host( ImageExtensions ).array("nationalIdImages" , 2 )  , error_handler_middleware(auth_services.sign_up_service  ))
auth_controller.post( "/login"  , error_handler_middleware(auth_services.login_service  ))
auth_controller.post( "/login_parent"  , error_handler_middleware(auth_services.parent_login_service  ))
auth_controller.post( "/reToken"  , error_handler_middleware(auth_services.refresh_token_service  ))



auth_controller.post("/signout" , authentication_middleware() , error_handler_middleware(auth_services.sign_out_service) )




auth_controller.post("/change_password", authentication_middleware() , error_handler_middleware(auth_services.user_Update_Own_Password_service));











export default auth_controller