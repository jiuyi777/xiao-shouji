# 微信

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
- “我 > 设置”维护微信聊天预设：内置预设、上下文深度、温度、最大长度、气泡方式。
- 支持导入 JSON/TXT 聊天预设，酒馆式字段会映射到微信预设参数。
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
