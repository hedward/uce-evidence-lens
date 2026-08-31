import { describe, expect, it } from "vitest";
import nodeVersion from "../../.node-version?raw";
import headers from "../../public/_headers?raw";

const cloudflareRuntimeFiles = import.meta.glob([
  "../../functions/**/*",
  "../../_worker.js",
  "../../public/_worker.js",
]);

describe("Cloudflare Pages configuration", () => {
  it("ships a restrictive static security policy", () => {
    expect(headers).toContain("Content-Security-Policy:");
    expect(headers).toContain("default-src 'self'");
    expect(headers).toContain(
      "connect-src 'self' https://cbyuce.com https://arweave.net https://*.arweave.net",
    );
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).toContain("object-src 'none'");
    expect(headers).toContain("Referrer-Policy: no-referrer");
    expect(headers).toContain("X-Content-Type-Options: nosniff");
    expect(headers).toContain("X-Frame-Options: DENY");
    expect(headers).not.toContain("'unsafe-inline'");
    expect(headers).not.toContain("'unsafe-eval'");
    expect(headers).not.toContain("Access-Control-Allow-Credentials");
  });

  it("removes wildcard asset CORS and keeps the deployment static", () => {
    expect(headers).toContain("! Access-Control-Allow-Origin");
    expect(
      Object.keys(cloudflareRuntimeFiles),
      "Cloudflare Pages Functions and Workers must remain absent",
    ).toHaveLength(0);
  });

  it("pins the Cloudflare build runtime to Node.js 24", () => {
    expect(nodeVersion.trim()).toBe("24");
  });
});
