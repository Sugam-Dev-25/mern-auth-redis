const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (email, otp) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Email Verification OTP",

      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Email Verification</h2>

          <p>Your OTP for email verification is:</p>

          <h1 style="letter-spacing: 5px;">
            ${otp}
          </h1>

          <p>This OTP will expire in 5 minutes.</p>

          <p>Please do not share this OTP with anyone.</p>
        </div>
      `,
    });

    console.log(`OTP sent successfully to ${email}`);
  } catch (error) {
    console.error("Email Sending Error:", error.message);
    throw new Error("Failed to send OTP email");
  }
};

module.exports = sendEmail;
