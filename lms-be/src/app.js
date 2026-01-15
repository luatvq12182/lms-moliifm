const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const errorHandler = require("./middleware/errorHandler");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const courseRoutes = require("./routes/course.routes");
const classRoutes = require("./routes/class.routes");
const materialRoutes = require("./routes/material.routes");

const app = express();

app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/api/folders", require("./routes/folder.routes"));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api", require("./routes/activityLog.routes"));

app.use(errorHandler);

module.exports = app;