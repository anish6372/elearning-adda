const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  userEmail: String,
  orderStatus: String,
  paymentMethod: String,
  paymentStatus: String,
  orderDate: Date,
  paymentId: String,
  payerId: String,
  instructorId: String,
  instructorName: String,
  courseImage: String,
  courseTitle: String,
  courseId: String,
  coursePricing: String,
});

// Instructor analytics (revenue by month), webhook lookups and a student's order history
OrderSchema.index({ instructorId: 1, paymentStatus: 1, orderDate: -1 });
OrderSchema.index({ paymentId: 1 });
OrderSchema.index({ userId: 1, orderDate: -1 });

module.exports = mongoose.model("Order", OrderSchema);
