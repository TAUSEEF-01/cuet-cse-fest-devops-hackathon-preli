const express = require("express");
const axios = require("axios");

const app = express();
const gatewayPort = process.env.GATEWAY_PORT || 8080;
const backendUrl = process.env.BACKEND_URL || "http://backend:3000";

// JSON parsing middleware
app.use(express.json());

/**
 * Proxy request handler
 * Forwards requests to the backend service
 */
async function proxyRequest(req, res, next) {
  const startTime = Date.now();
  // Use req.path (without query string) and let axios handle query params
  const targetPath = req.path;
  const targetUrl = `${backendUrl}${targetPath}`;

  try {
    console.log(`[${req.method}] ${req.originalUrl} -> ${targetUrl}`);

    // Prepare headers
    const headers = {};

    // Set Content-Type if there's a body
    if (req.body && Object.keys(req.body).length > 0) {
      headers["Content-Type"] =
        req.headers["content-type"] || "application/json";
    }

    // Forward x-forwarded headers
    headers["X-Forwarded-For"] =
      req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    headers["X-Forwarded-Proto"] = req.protocol;

    // Forward request to backend service
    const response = await axios({
      method: req.method,
      url: targetUrl,
      // Pass query params separately for proper serialization
      params: req.query,
      data: req.body,
      headers,
      timeout: 30000,
      validateStatus: () => true,
      maxContentLength: 50 * 1024 * 1024,
      maxBodyLength: 50 * 1024 * 1024,
    });

    // Log metrics
    const duration = Date.now() - startTime;
    console.log(
      `[${req.method}] ${req.originalUrl} <- ${response.status} (${duration}ms)`
    );

    // Forward response with same status
    res.status(response.status);

    // Forward response headers
    const headersToForward = ["content-type", "content-length"];
    headersToForward.forEach((header) => {
      if (response.headers[header]) {
        res.setHeader(header, response.headers[header]);
      }
    });

    // Send response data
    res.json(response.data);
  } catch (error) {
    console.error("Proxy error:", {
      message: error.message,
      code: error.code,
      url: targetUrl,
    });

    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED") {
        console.error(`Connection refused to ${targetUrl}`);
        res.status(503).json({
          error: "Backend service unavailable",
          message:
            "The backend service is currently unavailable. Please try again later.",
        });
        return;
      } else if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
        console.error(`Timeout connecting to ${targetUrl}`);
        res.status(504).json({
          error: "Backend service timeout",
          message:
            "The backend service did not respond in time. Please try again later.",
        });
        return;
      } else if (error.response) {
        res.status(error.response.status).json(error.response.data);
        return;
      }
    }

    if (!res.headersSent) {
      res.status(502).json({ error: "bad gateway" });
    } else {
      next(error);
    }
  }
}

// Proxy all /api requests to backend
app.all("/api/*", proxyRequest);

// Health check endpoint
app.get("/health", (req, res) => res.json({ ok: true }));

// Start server
app.listen(gatewayPort, () => {
  console.log(
    `Gateway listening on port ${gatewayPort}, forwarding to ${backendUrl}`
  );
});
