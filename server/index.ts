import { APP_NAME } from "@/lib/constants";

type HealthStatus = "ok" | "degraded";

export interface HealthCheckResult {
  service: string;
  status: HealthStatus;
  timestamp: string;
}

export function getHealthStatus(): HealthCheckResult {
  return {
    service: APP_NAME,
    status: "ok",
    timestamp: new Date().toISOString(),
  };
}
