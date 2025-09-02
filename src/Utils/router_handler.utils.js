import accountant_controller from "../Modules/accountant/accountant.controller.js";
import admin_controller from "../Modules/admin/admin.controller.js";
import assistant_controller from "../Modules/assistant/assistant.controller.js";
import auth_controller  from "../Modules/auth/auth.controller.js"
import parent_controller from "../Modules/parent/parent.controller.js";
import payment_controller from "../Modules/payment/payment.controller.js";
import REPORT_controller from "../Modules/REPORT/REPORT.controller.js";
import  student_controller from '../Modules/student/student.controller.js';
import supervisor_controller from "../Modules/supervisor/supervisor.controller.js";
import teacher_controller from "../Modules/teacher/teacher.controller.js";





const router_handler = async (app , express  ) => {


    app.use( express.json() )

    app.use( "/auth" ,  auth_controller )
    app.use( "/admin" ,  admin_controller )
    app.use( "/student" ,  student_controller )
    app.use( "/parent" ,  parent_controller )
    app.use( "/teacher" ,  teacher_controller )
    app.use( "/assistant" ,  assistant_controller )
    app.use( "/supervisor" ,  supervisor_controller )
    app.use( "/accountant" ,  accountant_controller )
    app.use( "/REPORT" ,  REPORT_controller )
    app.use( "/payment" ,  payment_controller )
    
    



    app.use(  '/{*any}', (req , res ) => {  
        res.status(404).json( { message : " this Router is not found " } )
     }  )

}











export default router_handler