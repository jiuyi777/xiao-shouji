## 2026-10-10维护导航

- 职责：模块/微信（模块/微信）。
- 当前阶段与下一步：[总计划](../../MAINTENANCE_OUTLINE.md)、[NEXT](../../NEXT.md)。本目录不另记独立进度。
- 数据/发布红线：[保护清单](../../docs/PROTECTION_AND_RELEASE.md)。只提交与软件直接相关的源码、必要说明和实际运行资源。
- 当前无直接实现文件，不将空目录计为已完成功能。
- 无子目录。
- 修改入口、数据结构或共享逻辑后，同步本说明和总表对应任务；查调用方、保存、重开恢复，不能仅看页面。
- 原有文件、备份、测试、许可证不能按名称猜测删除。新功能数据应复用明确权威来源，不建立第二份同义存档。

---

以下为原有说明；旧路径或阶段与上方当前导航冲突时，以当前源码和总表为准。

﻿# 微信

当前真实代码入口已经从 `src/App.tsx` 开始拆分：

- 微信容器：`src/App.tsx` -> `WeChatApp`
- 聊天列表：`src/apps/wechat/chats/WeChatChats.tsx`
- 通讯录/导入酒馆卡/群聊/联系人标签：`src/apps/wechat/contacts/WeChatContacts.tsx`
- 发现页入口/朋友圈/照片墙/表情包库：`src/apps/wechat/discover/WeChatDiscover.tsx`
- 我页面/收藏/订单与卡包/微信聊天预设：`src/apps/wechat/me/WeChatMe.tsx`
- 微信页签共享顶栏、头像、群头像、预设工具：`src/apps/wechat/shared/WeChatShared.tsx`
- 微信 AI 活人感、生活动作解析、新手教程：`src/apps/wechat/ai/`
- 微信 emoji/sticker 风格表情包 starter：`src/apps/wechat/stickers/`
- 聊天房间：`src/App.tsx` -> `ChatScreen`
- 气泡/语音条/转写：`src/App.tsx` -> `Bubble`
- 气泡美化选项：主题 App -> `src/themes/themeOptions.ts` 的 `bubbleStyleOptions`；样式在 `src/themes/bubbles/index.css`，微信与 QQ 共用

相关状态：

- `src/store.ts`：`characters`、`chatSessions`、`wechatId`、`wechatStatus`、`wechatPhotos`、`wechatMoments`、`stickers`、`groupChats`、`contactTags`
- `src/lib/charaParser.ts`：导入酒馆 PNG/JSON 卡
- `src/index.css`：`.wechat-*` 和主题下的微信样式

当前交互：

- 发现页先显示“朋友圈 / 照片墙 / 表情包”三条入口。
- 表情包必须先填写描述再上传，描述会随表情消息进入聊天记录。
- 表情包和聊天消息都支持收藏/删除；聊天消息还支持复制、引用回复、撤回。
- 聊天输入栏支持图片发送；模型接口失败会显示重试条；语音条播放中有波形动效。
- 聊天支持连续发送：用户可先发多条气泡，空白再按发送触发 char 回复。
- “我 > 设置”维护微信聊天预设：内置预设、上下文深度、温度、最大长度、RP 长短。
- 主题 App 的“气泡美化”只改变微信/QQ文字和语音气泡外观；“我 > 设置”的“RP 长短”控制短 RP 多条短气泡、长 RP 完整单气泡或自动选择。
- 支持在桌面“预设”App 导入 JSON/TXT 聊天预设；酒馆 JSON 完整保留条目顺序、开关与 system/user/assistant 身份，可在预设 App 中搜索、筛选、新增、编辑、上下移动、单独开关和删除，只有开启且有正文的条目会发送。微信设置只保留当前预设摘要、跳转入口与 RP/生成参数。
- 消息操作改为点击/长按气泡呼出，消息显示发送时间，char 回复会显示正在输入并延迟逐条出现。
- 群聊会显示在微信聊天列表，通讯录里可解散群聊。
- 表情描述只作为 AI 注释，不显示在用户聊天气泡里。
- AI 上下文包含角色人设和世界书；群聊会把群成员人设一起发送给 AI。
- 通讯录联系人先进入朋友资料页，标签编辑不会误触聊天。
- 预设导入适配 SillyTavern/酒馆 `prompts` 格式。
- char 消息操作是删除，不再模拟由用户撤回；用户消息支持引用、收藏、复制和撤回。
- 群聊 AI 回复按成员逐个生成消息。
- 微信设置含 AI助手预设，上下文消息数默认 500，可调到 1000。
- “我”页有收藏视图和订单与卡包视图；订单记录 char 给用户购买东西的记录。
- 联系人未设置标签时只显示姓名，设置标签后才显示标签行，并可通过标签 chip 筛选。
- 聊天加号面板支持转账、红包和购物卡片；AI 也可以根据角色人设低频主动发送这些生活动作。
- 群聊不再显示“群名正在输入中”；群聊行可长按或右键改名。
- 表情包 starter 只使用 OpenMoji、Noto Emoji、Twemoji 这类 emoji/sticker 风格素材，不引入斗图包。

维护时同步：

- 修改微信代码后更新 `docs/wechat.md`
- 如果入口函数变更，更新 `PROJECT_OUTLINE.md`
