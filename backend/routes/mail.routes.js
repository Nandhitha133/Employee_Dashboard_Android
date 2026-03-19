// routes/mailRoutes.js
const express = require("express");
const { sendZohoMail } = require("../zohoMail.service");
const { sendResendMail } = require("../resend.service");

const router = express.Router();

router.post("/send", async (req, res) => {
  try {
    const { email, cc, subject, message, html, attachments } = req.body;

    console.log("📨 Email Request Received:");
    console.log(`- To: ${email}`);
    console.log(`- Subject: ${subject}`);
    console.log(`- Attachments: ${attachments ? attachments.length : 0}`);
    if (attachments && attachments.length > 0) {
      attachments.forEach((att, idx) => {
        console.log(`  [${idx}] Filename: ${att.filename}, Encoding: ${att.encoding}, Content Length: ${att.content ? att.content.length : 0}`);
      });
    }

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
    console.error("Mail Send Error:", err); // Improved logging
    res.status(500).json({
      success: false,
      message: "Failed to send email: " + (err.message || "Unknown error"),
      error: err.toString()
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
