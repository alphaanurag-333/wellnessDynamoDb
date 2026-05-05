require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");

const config = require("./config");
const connectDatabase = require("./config/db");
const routes = require("./routes");
const { notFound } = require("./middleware/notFound");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    await connectDatabase();

    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
    });
  } catch (err) {
    console.error("Error starting server:", err.message);
    process.exit(1);
  }
}

start();

module.exports = app;
