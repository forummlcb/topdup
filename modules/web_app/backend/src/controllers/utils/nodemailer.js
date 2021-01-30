import nodemailer from "nodemailer"
let secrets;
if (process.env.NODE_ENV == "production") {
    secrets = process.env;
} else {
    secrets = require("../../configs/secrets");
}
const emailService = nodemailer.createTransport({
    host: secrets.EMAIL_HOST,
    port: secrets.EMAIL_PORT,
    secure: true,
    auth: {
        user: secrets.EMAIL_USERNAME,
        pass: secrets.EMAIL_PW,
    },
});
export default emailService