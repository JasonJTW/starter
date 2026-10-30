import express from "express";
import cors from "cors";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`server listening on http://localhost:${port}`);
});
