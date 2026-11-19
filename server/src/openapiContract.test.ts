/**
 * `server/openapi.yaml` is the API contract (AGENTS.md "Conventions").
 *
 * 1. The spec is a valid OpenAPI 3.1 document.
 * 2. Every (method, path) the Express app registers is in the spec, and every spec operation is a
 *    registered route. Routes are read from the app's router stack; no handler runs and nothing
 *    listens.
 *
 * Express 5 compiles mount paths into matcher functions and keeps no string, so the test wraps
 * `Router.prototype.use` before importing `app` and records each mounted layer's path.
 */
import { fileURLToPath } from "node:url";
import SwaggerParser from "@apidevtools/swagger-parser";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SPEC_PATH = fileURLToPath(new URL("../openapi.yaml", import.meta.url));
const HTTP_METHODS = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
];

// Express 5 (router 2.x) internals: only route layers and mounted routers are read
interface Layer {
  name: string;
  route?: { path: unknown; methods: Record<string, boolean> };
  handle: { stack?: Layer[] };
}
type Use = (this: { stack: Layer[] }, ...args: unknown[]) => unknown;

const mountPaths = new WeakMap<Layer, unknown>();
const routerProto = (express.Router as unknown as { prototype: { use: Use } })
  .prototype;
const originalUse = routerProto.use;

function recordMountPaths(): void {
  routerProto.use = function use(this: { stack: Layer[] }, ...args: unknown[]) {
    const before = this.stack.length;
    const result = originalUse.apply(this, args);
    const path =
      typeof args[0] === "function" || Array.isArray(args[0]) ? "/" : args[0];
    for (const layer of this.stack.slice(before)) mountPaths.set(layer, path);
    return result;
  };
}

// Express 5 path syntax: `:id` maps to `{id}`; wildcards, optional groups and regexps have no
// OpenAPI equivalent, so they fail loudly instead of slipping past the comparison.
function toOpenApiPath(expressPath: unknown, where: string): string {
  if (typeof expressPath !== "string" || /[*{}()?]/.test(expressPath)) {
    throw new Error(
      `${where}: unsupported path ${String(expressPath)}; use plain segments and :params`,
    );
  }
  return expressPath.replace(/:(\w+)/g, "{$1}");
}

function collectRoutes(stack: Layer[], prefix: string, out: Set<string>): void {
  for (const layer of stack) {
    if (layer.route) {
      const full = (
        prefix + toOpenApiPath(layer.route.path, prefix || "app")
      ).replace(/(.)\/$/, "$1");
      for (const method of Object.keys(layer.route.methods)) {
        if (method === "_all")
          throw new Error(`all() at ${full}: list its methods instead`);
        out.add(`${method.toUpperCase()} ${full}`);
      }
    } else if (layer.name === "mounted_app") {
      throw new Error(
        `Sub-app mounted under ${prefix || "/"}: mount an express.Router() instead`,
      );
    } else if (layer.name === "router" && layer.handle.stack) {
      const mount = toOpenApiPath(
        mountPaths.get(layer),
        "router.use()",
      ).replace(/\/$/, "");
      collectRoutes(layer.handle.stack, prefix + mount, out);
    }
  }
}

function specOperations(spec: {
  paths?: Record<string, Record<string, unknown>>;
}): Set<string> {
  const out = new Set<string>();
  for (const [specPath, item] of Object.entries(spec.paths ?? {})) {
    for (const method of Object.keys(item)) {
      if (HTTP_METHODS.includes(method))
        out.add(`${method.toUpperCase()} ${specPath}`);
    }
  }
  return out;
}

describe("openapi.yaml", () => {
  let stack: Layer[];

  beforeAll(async () => {
    recordMountPaths();
    const { app } = await import("./app.js");
    stack = (app as unknown as { router: { stack: Layer[] } }).router.stack;
  });

  afterAll(() => {
    routerProto.use = originalUse;
  });

  it("is a valid OpenAPI 3.1 document", async () => {
    const spec = await SwaggerParser.validate(SPEC_PATH);
    expect((spec as { openapi?: string }).openapi).toMatch(/^3\.1\./);
  });

  it("lists exactly the routes the server registers", async () => {
    const registered = new Set<string>();
    collectRoutes(stack, "", registered);

    const spec = await SwaggerParser.parse(SPEC_PATH);
    const documented = specOperations(
      spec as { paths?: Record<string, Record<string, unknown>> },
    );

    const missingFromSpec = [...registered]
      .filter((op) => !documented.has(op))
      .sort();
    const notRegistered = [...documented]
      .filter((op) => !registered.has(op))
      .sort();
    const list = (ops: string[]) =>
      ops.length ? ops.map((op) => `  ${op}`).join("\n") : "  (none)";
    const report =
      missingFromSpec.length || notRegistered.length
        ? `server/openapi.yaml does not match the registered routes.\n` +
          `Registered but missing from the spec (${missingFromSpec.length}):\n${list(missingFromSpec)}\n` +
          `In the spec but not registered (${notRegistered.length}):\n${list(notRegistered)}`
        : "";
    expect(report).toBe("");
    expect(registered.size).toBeGreaterThan(0);
  });
});
