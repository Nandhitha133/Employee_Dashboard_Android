const crypto = require("crypto");

function generateHikToken() {
  try {
    const key = process.env.HIK_KEY;      // Your X-Ca-Key
    const secret = process.env.HIK_SECRET; // Your X-Ca-Secret
    
    if (!key || !secret) {
      console.error("Hikvision credentials missing in environment variables");
      return null;
    }

    // Generate timestamp in milliseconds
    const timestamp = Date.now().toString();
    
    // Create signature string (key + timestamp + secret)
    const signatureString = key + timestamp + secret;
    
    // Generate SHA256 hash
    const signature = crypto
      .createHash("sha256")
      .update(signatureString)
      .digest("hex");
    
    console.log("Generated Hikvision token:", signature);
    return signature;
    
  } catch (error) {
    console.error("Error generating Hikvision token:", error);
    return null;
  }
}

module.exports = generateHikToken;