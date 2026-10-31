import express from "express";
import cors from "cors";

export const app = express();

app.use(cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/echo", (req, res) => {
  const { msg } = req.query;
  if (typeof msg !== "string") {
    res.status(400).json({ error: "msg must be a single string" });
    return;
  }
  res.json({ msg });
});
