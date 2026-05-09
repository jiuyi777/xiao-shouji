# 电话

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
- `src/tts.ts`：电话 TTS 播放工具，支持浏览器免费语音、本地 HTTP、OpenAI、Gemini。
- `src/App.tsx`：只在 `FeatureScreen` 分发 `phone` 到 `PhoneScreen`；不要把电话业务逻辑重新塞进 `App.tsx`。

维护边界：

- 电话记录是独立状态，不再只靠聊天 `call-note` 假装电话。
- 写入聊天记录是详情页按钮触发，不强制。
- 不要改微信、QQ、小剧场、日记等模块，除非只是消费电话记录或写入一条通话摘要。
