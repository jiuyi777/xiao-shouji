# 小手机源码导航

更新：2026-10-10。先读[NEXT](NEXT.md)和[总计划](MAINTENANCE_OUTLINE.md)；进度只写总计划，本文只维护入口。旧版完整大纲已在本轮本地归档保留。

| 目录/文件 | 当前职责 | 维护注意 |
|---|---|---|
| src/main.tsx | React启动和主题CSS加载 | 新主题需注册、样式、选择器与真实效果一起检查 |
| src/App.tsx | 手机壳、全局自动任务与原生桥协作 | 不是所有软件页面的实现位置 |
| src/shell | 桌面、锁屏、通知、FeatureRouter/appCatalog | 24入口，以目录README为导航 |
| src/apps | 各软件界面、逻辑和测试 | 微信/QQ共用ChatScreen，不复制请求逻辑 |
| src/store.ts | 全局状态、动作和persist迁移 | 当前78；拆分不得改变旧数据兼容 |
| src/backup | 备份解析、安全合并、同步内存 | 关联apps/backup与媒体存储，不能只检查JSON |
| src/lib | 生图、付费任务、图片资产、错误与通用工具 | 多入口共用；修根因覆盖调用方 |
| src/themes | 9主题/18气泡目录与共享样式 | 当前选项优先于旧设计稿；隐藏滚动条但保留滚动 |
| src/index.css | 全局基础与历史共享样式 | 按职责逐步整理，不能全局替换破坏主题 |
| src/assets / public | 运行资源和字体许可 | 名称像参考图也可能正在使用，先查引用 |
| src/components / src/presets | 共用组件/预设 | 检查所有消费者 |
| server / api | 常驻Node后端和HTTP适配 | 现有提醒不是完整账号社交后端 |
| mobile-export | Expo/WebView/Android工程 | 固定包名、签名、存储来源；web内容由脚本生成 |
| scripts | 测试、构建与发布范围检查 | 付费smoke测试需独立授权，不能随全套默认调用 |
| docs | 当前方案、教程、公告、历史资料索引 | 历史过程资料留本地，不随公开代码上传 |
| 模块 | 中文旧模块文档与导航 | 查看对应src/apps目录README，旧状态不能当最新实现 |
| designs / 主题美化 / 气泡美化 | 本地视觉资料 | 不自动恢复被否决方案，不批量上传 |
| data / work / qa-screenshots | 运行数据、临时工作、验证证据 | 不公开上传，不靠清理解决存档问题 |

保护与发布规则见[docs/PROTECTION_AND_RELEASE.md](docs/PROTECTION_AND_RELEASE.md)。历史计划的原始文本仅用于找回需求，不指示当前实现位置。
