
import nodemailer from 'nodemailer';

// These details will be pulled from your environment variables
const email = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;

if (!email || !pass) {
  console.warn(
    'Email credentials (EMAIL_USER, EMAIL_PASS) are not set in environment variables. Password reset emails will fail.'
  );
}

// Create the transporter object which will send the emails
export const transporter = nodemailer.createTransport({
  service: 'gmail', // Using Gmail as the service
  auth: {
    user: email,
    pass: pass,
  },
});

// Define the standard email options
export const mailOptions = {
  from: email,
  // The 'to' field will be set dynamically
};
