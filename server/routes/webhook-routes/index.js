const express = require("express");
const { handlePaypalWebhook } = require("../../controllers/webhook-controller/index");

const router = express.Router();

// No JWT here: PayPal authenticates with a signature that the controller verifies
router.post("/paypal", handlePaypalWebhook);

module.exports = router;
