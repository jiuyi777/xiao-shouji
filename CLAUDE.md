> 2026-10-10维护入口更正：开工先读NEXT.md→MAINTENANCE_OUTLINE.md→PROJECT_OUTLINE.md→目标目录README。下文旧流程中的App.tsx/未来占位描述以当前源码导航为准。当前阶段只在总表维护；必须保留旧资料，不得随发布整理删除本地原件。

# 小手机项目固定维护流程

## 每次开工

1. 先读 `PROJECT_OUTLINE.md`，确认要改的模块、文件和函数位置。
2. 先读 `docs/life-system-framework.md`，确认本次改动是否影响生活事件、角色记忆、通知或主动事件。
3. 只读本次任务相关文件；不要因为微信任务去改 QQ、电话、主题系统或其他模块。
4. 如果用户指出运行异常，先复现或检查 dev server 端口，确认浏览器打开的是当前项目。
5. 如果 `localhost:3000` 被旧项目占用，不杀旧服务；为当前项目另起端口并告知用户。

## 修改代码时

1. 优先在 `src/App.tsx` 里找当前真实入口；`src/pages/*` 目前是未来拆分占位，未接线前不要误改为空壳。
2. 修改前看目标文件顶部注释，确认函数、依赖、数据来源。
3. 改动保持在本次模块范围内；除非是为了修当前模块接入主题变量，不跨模块改逻辑。
4. 避免直接调用 `crypto.randomUUID`，统一使用 `createId`。
5. 修改持久化数据结构时，必须提升 `src/store.ts` 的 persist version 并写 migrate。

## 修改后必须同步

1. 更新被修改源码文件顶部注释：函数列表、依赖、维护备注有变化就同步。
2. 更新 `PROJECT_OUTLINE.md`：目录、文件用途、入口函数或状态迁移有变化就同步。
3. 更新对应模块文档：例如微信改 `docs/wechat.md`，音乐改 `docs/music-plan.md`，B站改 `docs/bilibili-plan.md`。
4. 如果改动影响跨 App 生活事件、角色记忆、通知中心、锁屏或主动事件，必须更新 `docs/life-system-framework.md`。
5. 每次实际修改都必须追加 `docs/work-log.md`，写清楚范围、原因、内容、同步文档、验证和后续事项。
6. 不重写 `MAINTENANCE_OUTLINE.md`，除非本次改动影响全局路线。

## 验证

1. 必跑 `npm run lint`。
2. 必跑 `npm run build`。
3. 检查源码中没有 `crypto.randomUUID` / `randomUUID` 直接调用。
4. 前端视觉改动要打开当前项目端口检查；若 in-app browser 不可用，要说明无法截图验证。

## 输出给用户

1. 先说是否修好运行问题。
2. 列出改了哪些文件和为什么。
3. 写明验证命令结果。
4. 如果端口不是 `3000`，明确给出当前可用 URL。
