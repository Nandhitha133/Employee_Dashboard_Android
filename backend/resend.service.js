const { Resend } = require("resend");

const apiKey = process.env.RESEND_API_KEY;
const client = apiKey ? new Resend(apiKey) : null;

async function sendResendMail({ to, subject, content, html }) {
  if (!client) {
    throw new Error("RESEND_API_KEY not configured");
  }
  const from = process.env.RESEND_FROM || "Caldim HR <onboarding@resend.dev>";
  const payload = {
    from,
    to,
    subject,
    html: html || content,
  };
  const result = await client.emails.send(payload);
  if (result.error) {
    console.error("Resend API Error:", result.error);
    throw new Error(result.error.message);
  }
  return result;
}

module.exports = { sendResendMail };
