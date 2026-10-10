## 2026-10-10维护导航

- 职责：src/assets/fonts（src/assets/fonts）。
- 当前阶段与下一步：[总计划](../../../MAINTENANCE_OUTLINE.md)、[NEXT](../../../NEXT.md)。本目录不另记独立进度。
- 数据/发布红线：[保护清单](../../../docs/PROTECTION_AND_RELEASE.md)。只提交与软件直接相关的源码、必要说明和实际运行资源。
- 当前无直接实现文件，不将空目录计为已完成功能。
- 子目录：`dotgothic16/`、`longcang/`、`lxgwmarkergothic/`、`mashanzheng/`、`zcoolkuaile/`、`zcoolqingkehuangyou/`、`zcoolxiaowei/`、`zenmarugothic/`、`zenoldmincho/`、`zhuquefangsong/`
- 修改入口、数据结构或共享逻辑后，同步本说明和总表对应任务；查调用方、保存、重开恢复，不能仅看页面。
- 原有文件、备份、测试、许可证不能按名称猜测删除。新功能数据应复用明确权威来源，不建立第二份同义存档。

---

以下为原有说明；旧路径或阶段与上方当前导航冲突时，以当前源码和总表为准。

# Bundled interface fonts

These fonts were copied from `jiuyi777/sillytavern-theme-assets` commit `358a9f9e18c996f0042c82cfcd6ac1f7455ad05c`.

- Each font keeps its original `OFL.txt`, `source.json`, and metadata beside the WOFF2 file.
- Total bundled WOFF2 size: 22,288,640 bytes.
- The app loads only the selected family through CSS; the files remain part of the offline web/APK bundle.
- Do not add a font without preserving an explicit redistribution license and source record.
