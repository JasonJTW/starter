import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./app.js";

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("GET /echo", () => {
  it("echoes msg", async () => {
    const res = await request(app).get("/echo").query({ msg: "hi" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ msg: "hi" });
  });

  it.each(["", "?msg=a&msg=b", "?msg[a]=1"])(
    "rejects %j with 400",
    async (query) => {
      const res = await request(app).get(`/echo${query}`);

      expect(res.status).toBe(400);
    },
  );
});
