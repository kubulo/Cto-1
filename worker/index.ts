import { getHealthStatus } from "@/server";

async function bootstrap() {
  const health = getHealthStatus();

  // 在真实场景中，此处可以初始化消息队列、定时任务或后台服务。
  console.log("[worker] 初始化完成", health);
}

void bootstrap();
