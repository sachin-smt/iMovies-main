
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail({ to, subject, text, html }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email credentials are missing from server/.env");
  }

  return transporter.sendMail({
    from: `"iMovies" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
}
async function verifyEmailConnection() {
  return transporter.verify();
}
module.exports = {
  sendEmail,
  verifyEmailConnection,
};
