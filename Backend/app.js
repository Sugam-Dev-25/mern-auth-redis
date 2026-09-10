require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./app/config/db");

const { connectRedis } = require("./app/config/redis");

const authRoutes = require("./app/routes/authRoutes");

const app = express();

// =======================
// Middleware
// =======================

app.use(cors());

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

// =======================
// Database Connections
// =======================

const startServer = async () => {
  try {
    // MongoDB
    await connectDB();

    // Redis
    await connectRedis();

    // =======================
    // Routes
    // =======================

    app.get("/", (req, res) => {
      res.status(200).json({
        success: true,
        message: "MERN Auth Redis API is running successfully 🚀",
      });
    });

    app.use("/api/auth", authRoutes);

    // =======================
    // Server
    // =======================

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server Start Error:", error.message);

    process.exit(1);
  }
};

startServer();
