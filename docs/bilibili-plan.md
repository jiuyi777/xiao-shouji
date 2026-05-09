# B站模块计划

本文档记录小手机内置 B站 app 的第一版设计。目标是先做一个能沉浸式刷 B站条目的独立模块，后续再接 AI 生成、角色投稿、收藏和观看历史。

## 目标

- 在手机第二屏的 `B站` 图标进入一个独立页面，不再停留在占位文案。
- 第一版只读取和展示 B站条目：视频标题、UP 主、封面、简介、播放量、弹幕、评论、标签和来源链接。
- 搜索或生成结果时只产出 B站风格视频条目，不混入知乎、豆瓣、小红书、百科等其他平台。
- 条目可以作为角色手机内容的一部分，被“查手机”或后续 AI 上下文摘要读取。
- 默认不抓取真实 B站网页、不抽取真实视频音频；如有真实 URL，只作为外部链接或用户手动录入来源。

## 第一版范围

第一版做“刷视频流 + 条目详情 + 搜索生成”三件事。

1. 首页视频流
   - 顶部显示 B站标题、搜索入口和简单分区。
   - 卡片显示封面、标题、UP 主、播放量、弹幕数、收藏状态。
   - 条目来源优先读取本地保存的 B站条目；没有数据时使用内置示例。

2. 条目详情
   - 展示视频简介、标签、发布时间、评论区和弹幕预览。
   - 评论区是沉浸式文本，不需要真实网络评论。
   - 可收藏、取消收藏、写入观看历史。

3. 搜索生成
   - 输入关键词后生成 3-5 条 B站视频条目。
   - 如果配置了模型，就让模型输出严格 JSON。
   - 如果没有模型或请求失败，就用本地 fallback 生成 B站风格条目。
   - 搜索结果只允许 `https://www.bilibili.com/video/...`、`https://search.bilibili.com/...` 或模拟条目链接，不生成其他站点。

## 非目标

- 不在第一版播放真实视频。
- 不解析 B站页面 HTML。
- 不下载或抽取 B站音频。
- 不接账号登录、投币、真实收藏夹同步。
- 不把 B站逻辑混进浏览器通用搜索结果里；浏览器仍然可以搜全网，B站 app 只管 B站条目。

## 数据结构

建议在 `src/store.ts` 新增独立类型，不复用通用 `BrowserSearchResult`，避免平台字段混乱。

```ts
export interface BilibiliVideoEntry {
  id: string;
  title: string;
  upName: string;
  cover: string;
  url: string;
  description: string;
  tags: string[];
  playCount: string;
  danmakuCount: string;
  comments: BilibiliComment[];
  danmaku: string[];
  createdAt: number;
  watchedAt?: number;
  favorite?: boolean;
  source?: 'sample' | 'generated' | 'manual' | 'model';
}

export interface BilibiliComment {
  id: string;
  userName: string;
  content: string;
  likedCount: string;
  createdAt: number;
}
```

建议新增状态和 action：

- `bilibiliEntries: BilibiliVideoEntry[]`
- `bilibiliSearches: BilibiliSearchRecord[]`
- `addBilibiliEntries(entries)`
- `deleteBilibiliEntry(id)`
- `toggleBilibiliFavorite(id)`
- `markBilibiliWatched(id)`
- `addBilibiliSearch(record)`

如果修改持久化结构，必须提升 persist version 并写 migrate，补齐旧用户的空数组。

## 页面结构

入口仍由 `src/App.tsx` 的 `FeatureScreen` 分发。第一版可以先在 `App.tsx` 内新增 `BilibiliScreen`，等模块稳定后再拆到 `src/apps/bilibili/`。

页面建议分三层状态：

- `feed`：视频流首页。
- `detail`：条目详情页。
- `search`：搜索结果页。

主要组件：

- `BilibiliScreen`：负责读取 store、页面切换和搜索。
- `BilibiliVideoCard`：视频流卡片。
- `BilibiliDetail`：条目详情、弹幕、评论。
- `BilibiliSearchPanel`：关键词输入、生成状态、搜索历史。

## AI 生成规则

模型提示词要强调：

- 只生成 B站视频条目。
- 输出严格 JSON，不要 Markdown。
- 不要出现知乎、豆瓣、小红书、微博、贴吧、百科、新闻站等平台。
- 不要声称真实抓取或真实播放。
- 标题、UP 主、弹幕和评论要像中文视频社区，但不要逐字复用用户隐私内容。
- 最近聊天、日记、相册、备忘录只作为世界观参考，必须改写。

推荐 JSON 结构：

```json
{
  "summary": "这次搜索像刷到了一组相关视频。",
  "entries": [
    {
      "title": "标题",
      "upName": "UP主名",
      "url": "https://www.bilibili.com/video/BV...",
      "description": "简介",
      "tags": ["生活", "日常"],
      "playCount": "12.8万",
      "danmakuCount": "1832",
      "danmaku": ["前方高能", "这里好像真的发生过"],
      "comments": [
        {
          "userName": "用户昵称",
          "content": "评论内容",
          "likedCount": "128"
        }
      ]
    }
  ]
}
```

## 与查手机的关系

后续可以让 `PeekScreen` 读取 B站条目摘要，但第一版只做数据准备：

- 最近看过：读取 `watchedAt` 最新的 1-2 条。
- 收藏视频：读取 `favorite` 的 1-2 条。
- 搜索痕迹：读取最新 `bilibiliSearches`。

查手机展示时应写成自然摘要，例如：

`最近刷过「雨夜便利店的 12 分钟」，收藏了一个生活区剪辑。`

## 实施顺序

1. 新增 B站数据类型、状态、action 和 persist 迁移。
2. 新增 `BilibiliScreen`，让 `FeatureScreen` 的 `bilibili` 分支接入真实页面。
3. 做视频流、详情页、收藏和观看历史。
4. 增加搜索生成：先 fallback，再接模型 JSON。
5. 将 B站摘要接入查手机。
6. 补充测试：store action、fallback 生成、JSON 解析和 B站链接过滤。

## 验证清单

- `npm run lint`
- `npm run build`
- 搜索任意关键词后结果只出现 B站条目。
- 未配置模型时 fallback 可用。
- 模型返回混入其他平台时会被过滤或回退。
- 收藏、观看历史刷新后仍保留。
- 查手机只展示 B站摘要，不泄露完整最近内容。
