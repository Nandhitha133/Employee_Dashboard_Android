const express = require("express");
const { sendZohoMail } = require("../zohoMail.service");


const router = express.Router();

router.post("/send", async (req, res) => {
  try {
    const { email, subject, message } = req.body;

    await sendZohoMail({
      to: email,
      subject,
      content: message,
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

module.exports = router;
