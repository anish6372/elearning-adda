const Certificate = require("../../models/Certificate");
const CourseProgress = require("../../models/CourseProgress");
const Course = require("../../models/Course");
const User = require("../../models/User");
const QRCode = require("qrcode");
const crypto = require("crypto");
const { sendCertificateEmail } = require("../../helpers/queue");

// POST /certificates/generate — auto-generate a certificate for a completed course
const generateCertificate = async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({ success: false, message: "userId and courseId are required" });
    }

    // Check if already exists
    const existing = await Certificate.findOne({ userId, courseId });
    if (existing) {
      return res.json({ success: true, data: existing });
    }

    // Verify course is actually completed
    const progress = await CourseProgress.findOne({ userId, courseId });
    if (!progress || !progress.completed) {
      return res.status(400).json({ success: false, message: "Course is not yet completed" });
    }

    const course = await Course.findById(courseId).lean();
    const user = await User.findById(userId).lean();

    if (!course || !user) {
      return res.status(404).json({ success: false, message: "Course or user not found" });
    }

    // Generate unique certificate ID
    const certificateId = `CERT-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

    // Generate QR code (links to a verification URL)
    const verificationUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/certificate/verify/${certificateId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 200,
      margin: 1,
      color: { dark: "#1e293b", light: "#ffffff" },
    });

    const certificate = await Certificate.create({
      userId,
      courseId,
      userName: user.userName,
      courseTitle: course.title,
      instructorName: course.instructorName,
      completionDate: progress.completionDate || new Date(),
      certificateId,
      qrCodeDataUrl,
    });

    // PDF rendering + email happen in the background queue
    sendCertificateEmail({
      email: user.userEmail,
      userName: user.userName,
      courseTitle: course.title,
      instructorName: course.instructorName,
      completionDate: certificate.completionDate,
      certificateId,
    });

    return res.json({ success: true, data: certificate });
  } catch (err) {
    console.error("Generate certificate error:", err);
    return res.status(500).json({ success: false, message: "Failed to generate certificate" });
  }
};

// GET /certificates/user/:userId — get all certificates for a user
const getUserCertificates = async (req, res) => {
  try {
    const { userId } = req.params;
    const certificates = await Certificate.find({ userId }).sort({ completionDate: -1 }).lean();
    return res.json({ success: true, data: certificates });
  } catch (err) {
    console.error("Get certificates error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch certificates" });
  }
};

// GET /certificates/verify/:certificateId — verify a certificate
const verifyCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const cert = await Certificate.findOne({ certificateId }).lean();
    if (!cert) {
      return res.status(404).json({ success: false, message: "Certificate not found" });
    }
    return res.json({ success: true, data: cert });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Verification failed" });
  }
};

// GET /certificates/course/:userId/:courseId — get certificate for a specific course
const getCourseCertificate = async (req, res) => {
  try {
    const { userId, courseId } = req.params;
    const cert = await Certificate.findOne({ userId, courseId }).lean();
    if (!cert) {
      return res.status(404).json({ success: false, message: "No certificate found" });
    }
    return res.json({ success: true, data: cert });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch certificate" });
  }
};

module.exports = { generateCertificate, getUserCertificates, verifyCertificate, getCourseCertificate };
