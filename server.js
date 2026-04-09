const dotenv = require("dotenv");

dotenv.config();

const app = require("./app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
  });
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 Unhandled Promise Rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("🔥 Uncaught Exception:", error);
  process.exit(1);
});
