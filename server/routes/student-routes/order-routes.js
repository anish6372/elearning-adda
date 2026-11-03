const express = require("express");
const {
  createOrder,
  capturePaymentAndFinalizeOrder,
} = require("../../controllers/student-controller/order-controller");

const { bindBodyUser } = require("../../middleware/authorize");
const authenticate = require("../../middleware/auth-middleware");

const router = express.Router();

router.use(authenticate);

router.post("/create", bindBodyUser("userId"), createOrder);
router.post("/capture", capturePaymentAndFinalizeOrder);

module.exports = router;
