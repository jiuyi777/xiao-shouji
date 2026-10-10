## 2026-10-10维护导航

- 职责：模块/角色导入（模块/角色导入）。
- 当前阶段与下一步：[总计划](../../MAINTENANCE_OUTLINE.md)、[NEXT](../../NEXT.md)。本目录不另记独立进度。
- 数据/发布红线：[保护清单](../../docs/PROTECTION_AND_RELEASE.md)。只提交与软件直接相关的源码、必要说明和实际运行资源。
- 当前无直接实现文件，不将空目录计为已完成功能。
- 无子目录。
- 修改入口、数据结构或共享逻辑后，同步本说明和总表对应任务；查调用方、保存、重开恢复，不能仅看页面。
- 原有文件、备份、测试、许可证不能按名称猜测删除。新功能数据应复用明确权威来源，不建立第二份同义存档。

---

以下为原有说明；旧路径或阶段与上方当前导航冲突时，以当前源码和总表为准。

# 角色导入

当前真实代码入口：

- 全局通讯录导入：`src/App.tsx` 的 `ContactsScreen`
- 微信通讯录导入：`src/App.tsx` 的 `WeChatContacts`
- 解析器：`src/lib/charaParser.ts` 的 `parseCharacterCard`

相关状态：

- `src/store.ts`：`characters`、`addCharacter`、`updateCharacter`
- `src/lib/utils.ts`：`createId`

维护备注：

- 不要直接调用 `crypto.randomUUID`。
- 导入失败先查 `parseCharacterCard` 和浏览器兼容 API。
