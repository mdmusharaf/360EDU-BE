// server.js (root level — entry point)
//
// This is the ONLY file that starts the server.
// It does 3 things:
//   1. Load environment variables
//   2. Connect to MongoDB
//   3. Start Express listening on a port
//
// Everything else lives in src/

const dotenv = require("dotenv");

// Load .env file FIRST before importing anything else
// (other files might read process.env at import time)
dotenv.config();

const app = require("./app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5000;

// Connect to DB first, then start the server
// WHY THIS ORDER? No point accepting requests if DB isn't ready.
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
  });
});

// ─── UNHANDLED ERRORS ──────────────────────────────────────────────────────
//
// These catch errors that slip through everything else.
// In production, you'd also alert your error tracking service (Sentry etc.)

process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 Unhandled Promise Rejection:", reason);
  // Gracefully shut down
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("🔥 Uncaught Exception:", error);
  process.exit(1);
});
