const { Queue, Worker } = require("bullmq");
const { redis, connectRedis, isRedisReady } = require("./redis");
const { sendMail } = require("./mailer");
const { buildCertificatePdf } = require("./certificate-pdf");

const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 500, // failed jobs are kept for inspection (acts as a dead-letter set)
};

let emailQueue = null;
let certQueue = null;

const handlers = {
  receipt: async ({ email, orderId, courseTitle, amount }) =>
    sendMail({
      to: email,
      subject: `Your receipt for ${courseTitle}`,
      html: `<h2>Thanks for your purchase!</h2><p>Order <b>${orderId}</b> for <b>${courseTitle}</b> ($${amount}) is confirmed.</p>`,
    }),
  certificate: async (cert) => {
    const pdf = await buildCertificatePdf(cert);
    return sendMail({
      to: cert.email,
      subject: `Your certificate for ${cert.courseTitle}`,
      html: `<p>Congratulations ${cert.userName}! Your certificate is attached.</p>`,
      attachments: [{ filename: `certificate-${cert.certificateId}.pdf`, content: pdf }],
    });
  },
};

const initQueues = async () => {
  if (!(await connectRedis())) {
    console.log("Redis offline -> background jobs run inline (no queue)");
    return;
  }
  const connection = redis.duplicate({ maxRetriesPerRequest: null });
  emailQueue = new Queue("email-notifications", { connection, defaultJobOptions: JOB_OPTIONS });
  certQueue = new Queue("certificate-generation", { connection, defaultJobOptions: JOB_OPTIONS });

  const workerFor = (name, handler) => {
    const worker = new Worker(name, async (job) => handler(job.data), {
      connection: connection.duplicate(),
    });
    worker.on("failed", (job, err) =>
      console.error(`[queue:${name}] job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message)
    );
    return worker;
  };
  workerFor("email-notifications", handlers.receipt);
  workerFor("certificate-generation", handlers.certificate);
  console.log("BullMQ queues and workers started");
};

// Enqueue when Redis is up; otherwise run in the background without blocking the response.
const dispatch = (queue, name, handler, data) => {
  if (queue && isRedisReady()) {
    return queue.add(name, data).catch((e) => console.error(`enqueue ${name} failed:`, e.message));
  }
  handler(data).catch((e) => console.error(`${name} job failed:`, e.message));
};

const sendReceiptEmail = (data) => dispatch(emailQueue, "receipt", handlers.receipt, data);
const sendCertificateEmail = (data) => dispatch(certQueue, "certificate", handlers.certificate, data);

module.exports = { initQueues, sendReceiptEmail, sendCertificateEmail };
