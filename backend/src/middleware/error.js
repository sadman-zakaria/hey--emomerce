import { HttpError } from "../utils/http-error.js";

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error?.name === "ZodError") {
    return res.status(422).json({
      error: "Validation failed",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern ?? {})[0] ?? "field";
    return res.status(409).json({ error: `That ${field} is already in use.` });
  }

  if (error?.name === "CastError") {
    return res.status(400).json({ error: `Invalid value for ${error.path}.` });
  }

  console.error("[api] unhandled error:", error);
  return res.status(500).json({
    error: req.app.get("env") === "production" ? "Internal server error" : error.message,
  });
}
