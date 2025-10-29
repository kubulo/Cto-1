# 智能工作台脚手架

一个基于 Next.js App Router 的全栈脚手架，采用 TypeScript、Tailwind CSS、pnpm 与 Docker，帮助团队快速搭建面向华语用户的智能产品原型。

## 技术栈亮点

- **Next.js 14 + App Router**：支持服务端渲染、增量静态与边缘渲染。
- **TypeScript + ESLint + Prettier**：内置代码质量与格式化约束，结合 Husky 与 lint-staged 实现提交前检查。
- **Tailwind CSS**：预置中文友好的字体栈与基础样式。
- **Docker Compose**：一键启动应用、PostgreSQL（带 pgvector 扩展）与 Redis。
- **Vitest**：用于单元测试与组件测试的轻量级方案。

## 目录结构

```
├── app/                # App Router 路由页面（含 chat、dashboard、reports、settings）
├── components/         # 可复用的前端组件
├── lib/                # 公用工具与常量
├── server/             # 服务端方法与 API 辅助函数
├── worker/             # 后台任务与脚本入口
├── docker/             # Docker 初始化脚本（pgvector 扩展）
├── test/               # Vitest 测试文件与配置
├── docker-compose.yml  # Docker 编排文件
├── pnpm-workspace.yaml # pnpm 工作空间配置
└── …
```

## 环境变量

复制 `.env.local.example` 为 `.env.local`，并根据实际环境填写：

```bash
cp .env.local.example .env.local
```

关键变量说明：

- `DATABASE_URL`：PostgreSQL 连接字符串。
- `REDIS_URL`：Redis 连接地址。
- `OPENAI_API_KEY`：调用 OpenAI 模型的密钥。
- `WECHAT_*` 系列：微信公众号 / 企业微信相关配置。
- `SITE_URL`：站点对外访问地址。
- `PINECONE_*`：可选的向量数据库配置。

## 本地开发

```bash
pnpm install
pnpm dev
```

首次安装会自动初始化 Husky 钩子。开发服务器默认运行在 [http://localhost:3000](http://localhost:3000)。

### 常用脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动 Next.js 开发服务器 |
| `pnpm lint` | 运行 ESLint 检查 |
| `pnpm test` | 使用 Vitest 执行测试 |
| `pnpm worker` | 启动后台任务示例（tsx 运行 TypeScript） |
| `pnpm docker:up` | 构建并启动 Docker Compose 服务 |
| `pnpm docker:down` | 停止并移除 Docker 容器 |
| `pnpm format` | 使用 Prettier 格式化项目 |

## 使用 Docker Compose

```bash
pnpm docker:up
```

服务包含：

- `app`：Next.js 开发服务器，挂载当前代码目录，可热更新。
- `postgres`：基于 `ankane/pgvector:pg16` 的数据库镜像，自动启用 `pgvector` 扩展。
- `redis`：用于缓存与消息队列的 Redis 7 服务。

首次启动会在 `docker/postgres/initdb.d` 下执行 SQL 脚本，确保向量扩展可用。

## 测试

```bash
pnpm test
```

Vitest 默认在 `jsdom` 环境中运行，并在 `test/setup.ts` 中引入 `@testing-library/jest-dom` 断言。

## 代码风格

- 提交前自动运行 `lint-staged`，确保代码格式与语法正确。
- 推荐使用 VS Code 并启用保存自动格式化（Format on Save）。

欢迎在此基础上继续扩展 API、认证与前端组件。祝开发顺利！
