## 2026-10-10维护导航

- 职责：模块/电话（模块/电话）。
- 当前阶段与下一步：[总计划](../../MAINTENANCE_OUTLINE.md)、[NEXT](../../NEXT.md)。本目录不另记独立进度。
- 数据/发布红线：[保护清单](../../docs/PROTECTION_AND_RELEASE.md)。只提交与软件直接相关的源码、必要说明和实际运行资源。
- 当前无直接实现文件，不将空目录计为已完成功能。
- 无子目录。
- 修改入口、数据结构或共享逻辑后，同步本说明和总表对应任务；查调用方、保存、重开恢复，不能仅看页面。
- 原有文件、备份、测试、许可证不能按名称猜测删除。新功能数据应复用明确权威来源，不建立第二份同义存档。

---

以下为原有说明；旧路径或阶段与上方当前导航冲突时，以当前源码和总表为准。

﻿# 电话

当前真实代码入口在 `src/App.tsx`：

- 电话页面：`PhoneScreen`
- 视频通话页面：`VideoCallScreen`
- 通话按钮：`CallButton`
- TTS 播放：`speak`

相关状态：

- `src/store.ts`：`characters`、`ttsEnabled`
- `src/index.css`：通用通话按钮和面板样式

维护备注：

- 微信任务不要改电话。
- 后续接真实 TTS 服务时同步 `PROJECT_OUTLINE.md`。
# 电话模块（2026-05-07）

当前真实入口：

- `src/apps/phone/PhoneScreen.tsx`：电话模块 UI 和电话 AI 短句逻辑。包含最近通话、未接/拨出/来电筛选、角色拨号、呼叫中、来电中、通话中计时、通话详情、收藏、删除、再次拨打、写入聊天记录。
- `src/store.ts`：`PhoneCallRecord[] phoneCallRecords` 和 `addPhoneCallRecord` / `updatePhoneCallRecord` / `deletePhoneCallRecord` / `togglePhoneCallFavorite`。
- `src/tts.ts`：电话 TTS 播放工具，支持浏览器免费语音、本地 HTTP、OpenAI、Gemini、MiniMax 和豆包。
- `src/ttsQueue.ts`：所有聊天和电话语音进入同一 FIFO 队列；“停止全部”会中止当前播放与请求，并清空等待项。
- `src/ttsAudioCache.ts`：外部 TTS 音频缓存，上限 64 MiB；达到上限后不自动删除任何内容，只停止写入新缓存。
- `src/App.tsx`：只在 `FeatureScreen` 分发 `phone` 到 `PhoneScreen`；不要把电话业务逻辑重新塞进 `App.tsx`。

维护边界：

- 电话记录是独立状态，不再只靠聊天 `call-note` 假装电话。
- 写入聊天记录是详情页按钮触发，不强制。
- `ttsEnabled` 关闭时不自动出声，设置页主动试听仍可用；TTS 配置和 Key 不得给生图或 MiniMax 音乐复用。
- 不要改微信、QQ、小剧场、日记等模块，除非只是消费电话记录或写入一条通话摘要。
