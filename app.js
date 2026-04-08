const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./src/config/swagger");

const errorHandler = require("./src/middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

// Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/api/auth", require("./src/modules/auth/auth.routes"));
app.use("/api/users", require("./src/modules/users/users.routes"));
app.use(
  "/api/activities",
  require("./src/modules/activities/activities.routes"),
);
app.use("/api/plans", require("./src/modules/plans/plans.routes"));
app.use("/api/search", require("./src/modules/search/search.routes"));
app.use("/api/admin", require("./src/modules/admin/admin.routes"));
app.use(
  "/api/admin/pages",
  require("./src/modules/static-pages/staticPages.routes"),
);
app.use("/api/pages", require("./src/modules/static-pages/staticPages.routes"));
app.use("/api/contact", require("./src/modules/contact/contact.routes"));
app.use("/api/admin/contact", require("./src/modules/contact/contact.routes"));
app.use("/api/banners", require("./src/modules/banners/banners.routes"));
app.use("/api/admin/banners", require("./src/modules/banners/banners.routes"));
// 404
app.use("/{*path}", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

app.use(errorHandler);

module.exports = app;
