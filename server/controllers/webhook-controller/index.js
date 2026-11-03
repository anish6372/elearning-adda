const paypal = require("../../helpers/paypal");
const Order = require("../../models/Order");
const WebhookEvent = require("../../models/WebhookEvent");
const { finalizeOrder } = require("../student-controller/order-controller");

const verifyPaypalSignature = (req) =>
  new Promise((resolve) => {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      // Unsigned events are only accepted when explicitly enabled for local testing
      return resolve(
        process.env.NODE_ENV !== "production" && process.env.PAYPAL_WEBHOOK_ALLOW_UNVERIFIED === "true"
      );
    }
    paypal.notification.webhookEvent.verify(req.headers, req.body, webhookId, (error, response) =>
      resolve(!error && response?.verification_status === "SUCCESS")
    );
  });

// POST /webhooks/paypal — PayPal retries on non-2xx, so every path that is "done" answers 200
const handlePaypalWebhook = async (req, res) => {
  if (!(await verifyPaypalSignature(req))) {
    return res.status(401).json({ success: false, message: "Invalid webhook signature" });
  }

  const event = req.body || {};
  if (!event.id) {
    return res.status(400).json({ success: false, message: "Missing event id" });
  }

  // The unique (provider, eventId) index makes redelivered events a no-op
  try {
    await WebhookEvent.create({ provider: "paypal", eventId: event.id, eventType: event.event_type });
  } catch (e) {
    if (e.code === 11000) return res.status(200).json({ success: true, duplicate: true });
    throw e;
  }

  try {
    if (event.event_type === "PAYMENT.SALE.COMPLETED") {
      const paymentId = event.resource?.parent_payment;
      const order = paymentId ? await Order.findOne({ paymentId }) : null;
      if (order) await finalizeOrder(order._id, { paymentId });
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    // Forget the event so PayPal's retry gets processed instead of being dropped as a duplicate
    await WebhookEvent.deleteOne({ provider: "paypal", eventId: event.id });
    console.log("PayPal webhook processing error:", e);
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
};

module.exports = { handlePaypalWebhook };
