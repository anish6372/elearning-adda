const mongoose = require("mongoose");

// One row per processed provider event; the unique index makes webhook handling idempotent
const WebhookEventSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  eventId: { type: String, required: true },
  eventType: String,
  receivedAt: { type: Date, default: Date.now },
});

WebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model("WebhookEvent", WebhookEventSchema);
