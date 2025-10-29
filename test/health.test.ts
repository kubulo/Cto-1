import { describe, expect, test } from "vitest";
import { getHealthStatus } from "@/server";

describe("getHealthStatus", () => {
  test("返回服务健康状态", () => {
    const status = getHealthStatus();

    expect(status.status).toBe("ok");
    expect(status.service).toBeDefined();
  });
});
