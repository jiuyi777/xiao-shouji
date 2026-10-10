## 2026-10-10维护导航

- 职责：微信（src/apps/wechat/ai）。
- 当前阶段与下一步：[总计划](../../../../MAINTENANCE_OUTLINE.md)、[NEXT](../../../../NEXT.md)。本目录不另记独立进度。
- 数据/发布红线：[保护清单](../../../../docs/PROTECTION_AND_RELEASE.md)。只提交与软件直接相关的源码、必要说明和实际运行资源。
- 直接文件：`wechatAi.test.ts`、`wechatAi.ts`、`wechatAiMessages.test.ts`、`wechatAiMessages.ts`
- 无子目录。
- 修改入口、数据结构或共享逻辑后，同步本说明和总表对应任务；查调用方、保存、重开恢复，不能仅看页面。
- 原有文件、备份、测试、许可证不能按名称猜测删除。新功能数据应复用明确权威来源，不建立第二份同义存档。

---

以下为原有说明；旧路径或阶段与上方当前导航冲突时，以当前源码和总表为准。

# 微信 AI 新手教程

这里放微信聊天 AI 的规则。想调“活人感”，优先改这个文件夹，不要先去翻 `App.tsx`。

## 文件

- `wechatAi.ts`：组装系统提示词、生活动作规则、fallback 回复。
- `wechatAiMessages.ts`：解析 AI 输出，把动作行转成真实微信消息。
- `wechatAiMessages.test.ts`：验证动作解析不会坏。

## 让角色更像活人

改 `wechatAi.ts` 里的 `weChatLifeActionInstruction`。建议保持这几条：

- 生活动作低频出现，不要每轮都发红包或转账。
- 普通文字要短，像手机上随手打的。
- 表情包用于安慰、开心、撒娇、吐槽和缓和气氛。
- 转账、红包、购物必须有动机，比如吃饭、哄人、庆祝、补偿、照顾。

## AI 可以输出的动作

```text
普通短句
[sticker mood=comfort]
[transfer amount=188 note=晚饭钱]
[red-packet amount=52 note=买点甜的]
[shopping item=奶茶 amount=18 note=我下单了]
```

坏格式会当普通文字显示，不会让聊天崩掉。

## 以后加新动作

1. 在 `src/store.ts` 的 `MessageKind` 加类型和可选字段。
2. 在 `wechatAiMessages.ts` 加解析。
3. 在 `App.tsx` 的 `Bubble` 加渲染。
4. 跑 `npx tsx src\wechat\ai\wechatAiMessages.test.ts`、`npm run lint`、`npm run build`。
