## 2026-10-10维护导航

- 职责：模块/QQ（模块/QQ）。
- 当前阶段与下一步：[总计划](../../MAINTENANCE_OUTLINE.md)、[NEXT](../../NEXT.md)。本目录不另记独立进度。
- 数据/发布红线：[保护清单](../../docs/PROTECTION_AND_RELEASE.md)。只提交与软件直接相关的源码、必要说明和实际运行资源。
- 直接文件：`拆分审计.md`
- 无子目录。
- 修改入口、数据结构或共享逻辑后，同步本说明和总表对应任务；查调用方、保存、重开恢复，不能仅看页面。
- 原有文件、备份、测试、许可证不能按名称猜测删除。新功能数据应复用明确权威来源，不建立第二份同义存档。

---

以下为原有说明；旧路径或阶段与上方当前导航冲突时，以当前源码和总表为准。

# QQ

## 当前入口

- 桌面图标：`src/shell/appCatalog.tsx` 中 `screen: "qq"`。
- 功能分发：`src/App.tsx` 的 `FeatureScreen` 渲染 `src/apps/qq/QQScreen.tsx`。
- QQ 外壳：`src/apps/qq/QQScreen.tsx`，只负责当前页签、个人主页状态和底部导航。
- QQ 顶栏：`src/apps/qq/QQHeader.tsx`，读取 `userName/userAvatar`，显示玩家头像、昵称和“手机在线”状态。
- QQ 消息页：`src/apps/qq/messages/QQMessages.tsx`。
- QQ 联系人页：`src/apps/qq/contacts/QQContacts.tsx`。
- QQ 群聊页块：`src/apps/qq/contacts/QQGroups.tsx`。
- QQ 群资料页：`src/apps/qq/contacts/QQGroupProfile.tsx`。
- QQ 设备页块：`src/apps/qq/contacts/QQDevices.tsx`。
- QQ 通讯录页块：`src/apps/qq/contacts/QQPhonebook.tsx`。
- QQ 频道页：`src/apps/qq/channels/QQChannels.tsx`，频道逻辑在 `src/apps/qq/channels/qqChannelsLogic.ts`。
- QQ 动态页：`src/apps/qq/dynamic/QQDynamic.tsx`，空间动态逻辑在 `src/apps/qq/dynamic/qqDynamicLogic.ts`。
- QQ 个人主页：`src/apps/qq/contacts/QQProfile.tsx`。
- QQ 首页逻辑：`src/apps/qq/qqLogic.ts`，负责消息列表行、QQ 页签、联系人主页、群资料、设备和通讯录摘要。
- QQ 逻辑测试：`src/apps/qq/qqLogic.test.ts`。

## 当前行为

- “消息”页读取全局 `characters`、`groupChats` 和 `chatSessions`，只把 `channel === "qq"` 的会话当作 QQ 最近聊天。
- 点击好友消息行会调用 `openChat(characterId, "qq")`，点击群聊消息行会调用 `openChat(groupId, "qq")`，进入共享聊天房间。
- 群聊会显示在 QQ 消息首页；点群头像或群名会进入群资料页。
- QQ 消息行支持长按或右键菜单，菜单里可以置顶或取消置顶聊天。
- 点击消息行或联系人里的头像，会进入 QQ 个人主页。
- QQ 个人主页里的“发消息”会调用 `openChat(characterId, "qq")`；语音通话和视频通话会先建立 QQ 会话再进入通话界面。
- QQ 顶栏头像跟随 User 信息里的 `userAvatar`，昵称跟随 `userName`。
- “联系人”页展示已导入角色；导入角色卡后会自动出现在 QQ 联系人里。
- 不再内置默认角色卡；用户导入过的角色卡不会被自动删除，也不会改 API/DeepSeek 配置。
- “联系人”里的群聊已经支持创建、改名、解散和打开 QQ 群聊。
- 点击群聊头像或群名会进入群资料页，可以保存群公告、管理成员、修改群名或解散群。
- 设备和通讯录页已经有独立入口卡片，后续可继续接真实文件助手和手机通讯录数据。
- “频道”已经有真实消息流：默认频道、关注/取消关注、频道消息发送和频道消息预览都会保存。
- “动态”已经有 QQ 空间说说：支持发表文字动态、配图、点赞/取消点赞、评论和删除自己的动态。
- QQ 空间配图会优先尝试全局生图配置；生图不可用或失败时，会自动生成本地 SVG 文字图片，不会阻断发动态。

## 四功能拆分

- 消息：`src/apps/qq/messages/`
- 频道：`src/apps/qq/channels/`
- 联系人：`src/apps/qq/contacts/`
- 动态：`src/apps/qq/dynamic/`

拆分审计和后续清单见 `模块/QQ/拆分审计.md`。

## 聊天边界

- QQ 聊天数据仍复用 `src/store.ts` 的 `chatSessions`，通过 `channel: "qq"` 与微信隔离。
- QQ 聊天房间读取主题 App 的 `bubbleStyle`，与微信共享气泡美化选择；`src/themes/bubbles/index.css` 只覆盖外观，不改变 QQ 会话数据和 AI 回复逻辑。
- QQ 聊天房间暂时复用 `src/apps/wechat/chat/ChatScreen.tsx` 的发送、AI 回复、图片、语音、表情、引用、收藏、撤回能力。
- 共享聊天房间会按 `activeChannel === "qq"` 使用 QQ 专属提示词、QQ 软件预设和 QQ 日志文案；不再把 QQ API 回复要求写成微信气泡。
- 不复制微信四页签、朋友圈、微信通讯录或微信生活卡片整套实现到 QQ。
- 如果要做 QQ 专属语气、QQ 群、频道、空间动态或戳一戳，优先在 `src/apps/qq/` 内新增小模块，再按需要给共享聊天房间传轻量配置。

## 维护规则

- QQ 任务优先只改 `src/apps/qq/`、QQ 相关 `.qq-*` CSS、必要的共享聊天配置和本 README。视觉上优先跟随主题变量和小手机字体，不追求复刻官方 QQ。
- 改 QQ 入口或行为时，同步 `PROJECT_OUTLINE.md` 和 `docs/work-log.md`。
- 验证至少跑：
  - `npx tsx src/apps/qq/qqLogic.test.ts`
  - `npx tsx src/apps/appsStructure.test.ts`
  - `npm run lint`

## 2026-06-23 群资料补充

- QQ 群资料页已补群文件、群相册、群通知、群名片四个区块。
- 群文件、群相册、群通知和群名片跟随 `GroupChat` 持久化，不会写进角色卡。
- 新增 `src/apps/qq/contacts/qqGroupProfileLogic.ts` 和测试，负责群共享资料的创建和摘要。
- 已通过真实路径烟测：从 QQ 进入联系人、群聊、群资料，添加群文件、相册、通知并保存群名片。
