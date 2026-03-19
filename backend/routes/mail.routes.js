// routes/mailRoutes.js
const express = require("express");
const { sendZohoMail } = require("../zohoMail.service");
const { sendResendMail } = require("../resend.service");

const router = express.Router();

router.post("/send", async (req, res) => {
  try {
    const { email, cc, subject, message, html, attachments } = req.body;

    await sendZohoMail({
      to: email,
      cc,
      subject,
      content: message,
      html: html || message, // Use html if provided, fallback to message
      attachments,
    });

    res.json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (err) {
    console.error("Zoho Mail Error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: "Failed to send email",
    });
  }
});

router.post("/resend/send", async (req, res) => {
  try {
    const { email, subject, message } = req.body;
    if (!process.env.RESEND_API_KEY) {
      return res.status(400).json({ success: false, message: "RESEND_API_KEY not configured" });
    }
    await sendResendMail({
      to: email,
      subject,
      content: message
    });
    res.json({ success: true, message: "Resend email sent successfully" });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to send via Resend",
    });
  }
});

module.exports = router;
