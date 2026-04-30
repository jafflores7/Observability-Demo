require("./tracing");

const express = require("express");
const client = require("prom-client");
const pino = require("pino");

const app = express();
const logger = pino();

// Métricas
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duración de requests HTTP",
  labelNames: ["method", "route", "status_code"]
});

// Middleware
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    end({ method: req.method, route: req.route?.path, status_code: res.statusCode });
  });
  next();
});

// Endpoints
app.get("/", (req, res) => {
  logger.info("Request normal");
  res.send("OK");
});

app.get("/slow", async (req, res) => {
  await new Promise(r => setTimeout(r, 3000));
  logger.warn("Request lento");
  res.send("Slow response");
});

app.get("/error", (req, res) => {
  logger.error("Error intencional");
  res.status(500).send("Error!");
});

// Métricas endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(3000, () => {
  console.log("App running on port 3000");
});