const express = require("express");
const {
  generateCertificate,
  getUserCertificates,
  verifyCertificate,
  getCourseCertificate,
} = require("../../controllers/certificate-controller/index");

const authenticate = require("../../middleware/auth-middleware");
const { requireSelf, bindBodyUser } = require("../../middleware/authorize");

const router = express.Router();

router.post("/generate", authenticate, bindBodyUser("userId"), generateCertificate);
router.get("/user/:userId", authenticate, requireSelf("userId"), getUserCertificates);
router.get("/verify/:certificateId", verifyCertificate);
router.get("/course/:userId/:courseId", authenticate, requireSelf("userId"), getCourseCertificate);

module.exports = router;
