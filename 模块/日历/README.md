## 2026-10-10维护导航

- 职责：模块/日历（模块/日历）。
- 当前阶段与下一步：[总计划](../../MAINTENANCE_OUTLINE.md)、[NEXT](../../NEXT.md)。本目录不另记独立进度。
- 数据/发布红线：[保护清单](../../docs/PROTECTION_AND_RELEASE.md)。只提交与软件直接相关的源码、必要说明和实际运行资源。
- 当前无直接实现文件，不将空目录计为已完成功能。
- 无子目录。
- 修改入口、数据结构或共享逻辑后，同步本说明和总表对应任务；查调用方、保存、重开恢复，不能仅看页面。
- 原有文件、备份、测试、许可证不能按名称猜测删除。新功能数据应复用明确权威来源，不建立第二份同义存档。

---

以下为原有说明；旧路径或阶段与上方当前导航冲突时，以当前源码和总表为准。

# 日历

当前日历已有真实模块，`src/App.tsx` 里的 `calendar` screen 进入 `CalendarScreen`。

下一步真实入口建议：

- 日历页面：`CalendarScreen`
- 日程状态：`src/store.ts` 的 `CalendarEvent[] calendarEvents`
- 日程新增/编辑/删除/收藏：`addCalendarEvent`、`updateCalendarEvent`、`deleteCalendarEvent`、`toggleCalendarEventFavorite`
- 查手机读取日程：`PeekScreen`，只展示 `char/shared` 日程，避免泄露用户私人日程

相关文档：

- `docs/calendar-plan.md`：日历模块需求和实施顺序。

维护备注：

- 日历已支持本地手动日程、月视图、今天页、列表、编辑页、详情页、经期快捷记录、当前年份节日、类型图标和从日记/备忘录转入。
- AI 生成和聊天提取日程仍是后续任务。
- char 日程和用户日程要分 owner，避免查手机读取到用户私人日程。
- 修改日历数据结构时需要同步 persist migrate 和 `PROJECT_OUTLINE.md`。
