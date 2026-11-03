const express = require("express");
const authenticate = require("../../middleware/auth-middleware");
const router = express.Router();
const { sendWhatsAppNotification } = require("../../helpers/whatsapp");

router.post("/send", authenticate, async (req, res) => {
  try {
    const { phone, type, data } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    const result = await sendWhatsAppNotification({ phone, type, data });
    return res.json(result);
  } catch (error) {
    console.error("Error in WhatsApp notification route:", error);
    return res.status(500).json({ success: false, message: "Failed to process WhatsApp notification" });
  }
});

module.exports = router;
