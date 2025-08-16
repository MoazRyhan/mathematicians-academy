
import nodemailer from "nodemailer"
import EventEmitter from "events"






export const send_email_service = async ( {to , subject , html , attachments} )=>{

    try {

        const transport = nodemailer.createTransport({
            host :"smtp.gmail.com",
            port:465,
            secure:true,
            auth:{
                user:process.env.SEND_EMAIL_USER,
                pass : process.env.SEND_EMAIL_PASS
            },
            tls:{
                rejectUnauthorized:false
            }

        })


        const info = await transport.sendMail({
            from:`DO_NOT REPLY  ${ process.env.SEND_EMAIL_USER}`,
            to,
            cc: "moaz666666@outlook.com" ,
            subject,
            html,
            // attachments
        })

        return info
        
    } catch (error) {
        console.log(" error coming from send email service" , error );
        return error
    }
}


export const send_Email_event = new EventEmitter();

send_Email_event.on( "Send_Email" , ( ...args )=>{
    // console.log(args , "here the data" );
    
    const { to , subject , html , attachments } = args[0]

    send_email_service({
        to,
        subject,
        html,
        // attachments
    })
    

} )  




