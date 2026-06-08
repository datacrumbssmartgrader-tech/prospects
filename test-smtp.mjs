import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "datacrumbs.smartgrader@gmail.com",
    pass: "aecyxzvxuajjobsl",
  },
});

await transporter.verify();
console.log("SMTP connection verified successfully.");

await transporter.sendMail({
  from: "Cognos CRM <datacrumbs.smartgrader@gmail.com>",
  to: "datacrumbs.smartgrader@gmail.com",
  subject: "Cognos CRM — SMTP test",
  html: "<p>SMTP is working. Password reset emails will be sent from this account.</p>",
});

console.log("Test email sent to datacrumbs.smartgrader@gmail.com — check your inbox.");
