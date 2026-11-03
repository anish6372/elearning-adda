const PDFDocument = require("pdfkit");

// Renders the certificate to an in-memory PDF buffer
const buildCertificatePdf = ({ userName, courseTitle, instructorName, completionDate, certificateId }) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(25, 25, doc.page.width - 50, doc.page.height - 50).lineWidth(3).stroke("#1e293b");
    doc.fontSize(34).fillColor("#1e293b").text("Certificate of Completion", { align: "center" });
    doc.moveDown(1.5).fontSize(16).fillColor("#475569").text("This certifies that", { align: "center" });
    doc.moveDown(0.5).fontSize(30).fillColor("#0f172a").text(userName, { align: "center" });
    doc.moveDown(0.5).fontSize(16).fillColor("#475569").text("has successfully completed", { align: "center" });
    doc.moveDown(0.5).fontSize(24).fillColor("#0f172a").text(courseTitle, { align: "center" });
    doc.moveDown(1).fontSize(14).fillColor("#475569").text(`Instructor: ${instructorName || "-"}`, { align: "center" });
    doc.text(`Completed on ${new Date(completionDate).toDateString()}`, { align: "center" });
    doc.moveDown(2).fontSize(10).text(`Certificate ID: ${certificateId}`, { align: "center" });
    doc.end();
  });

module.exports = { buildCertificatePdf };
