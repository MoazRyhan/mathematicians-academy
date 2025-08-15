import sgMail from '@sendgrid/mail'
import EventEmitter from "events"

export const send_email_service = async( { to , subject , html , attachments } )  => {

    
sgMail.setApiKey(process.env.EMAIL_PASS_KEY);
const msg = {
  to  ,
  from : process.env.EMAIL_NAME_VERIFY , // Use the email address or domain you verified above
  subject ,
  html ,
//   attachments   
};
//ES6
sgMail
  .send(msg)
  .then(() => {}, error => {
    console.error(error);

    if (error.response) {
      console.error(error.response.body);
    }
  });
//ES8
(async () => {
  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error(error);

    if (error.response) {
      console.error(error.response.body)
    }
  }
})();



}



export const send_Email_event = new EventEmitter();
send_Email_event.on(  "Send_Email" , ( ...args ) =>{

    // console.log( args);
    
    const  { to , subject , attachments  , html } = args[0]
    send_email_service({
        to ,
        subject , 
        html ,
        // attachments 
    })

}  )