import { createTransport } from "nodemailer";
import logger from "./logger.js";

export const credentialsExpirationEmail = async (id, email) => {
    let transporter = createTransport({
        service: "gmail",
        auth: {
            user: "bleron213@gmail.com", 
            pass: "gmail-integration-password"  
        }
    });

    let mailOptions = {
        from: "bleron213@gmail.com",
        to: email,
        subject: "Your credentials have expired",
        text: `Your credentials with id = ${id} have expired`,
        html: `<b>Your credentials with id = ${id} have expired</b>`
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        logger.log("Email sent:", info.response);
    } catch (error) {
        logger.error("Error sending email:", error);
    }
}
