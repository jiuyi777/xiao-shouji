# 2026-10-10 文档恢复与盘点证据

- 仓库基线021d7a2；本轮核对远端main一致。
- Git删除记录：06eb9ae删除下一轮-微信聊天/README.md、下一轮-日历/README.md、下一轮-日记/README.md、模块/音乐/CURRENT_SPEC.md、模块/音乐/NEXT_HANDOFF.md。原文从其父提交恢复到docs/archive/recovered-20261010，注明过期，保留原路径索引。
- 未消失的资料：docs各模块计划、PROJECT_OUTLINE、MAINTENANCE_OUTLINE、模块目录README。问题是缺少统一当前阶段且部分内容过时，不是所有MD均不存在。
- 数量证据：src/shell/appCatalog.tsx为20桌面+4底栏；src/themes/themeOptions.ts为9整机+18独立气泡。旧交付清单不能覆盖当前选项。
- 双存储证据：mobile-export/App.js稳定来源与BROKEN_V1161_STORAGE_ORIGIN；BackupScreen已有切换导出与安全合并；safeMerge当前值优先。
- 备份缺口：BackupScreen exportImageAssets().catch(()=>({}))可能静默省略图片；TTS缓存未在现有备份链显式导出。
- 提醒后端：server/nai-proxy.cjs有登记/outbox/ACK与Expo发送；当前未见账号鉴权与后续receipt查询，VPS生产状态未连接核验。
- 生图语义：此前本地函数检查中，双人转solo、否定笑变smile、橘猫丢失、房间中的人变无人；列入IMG-01，没有将旧测试通过当语义正确。
- 只移出公开追踪的开发过程文件保留原本地路径，清单由本轮整理脚本写入work/plan-recovery-20261010。未读取玩家真实数据，未运行付费模型或部署服务。
- 本地验证：TypeScript检查、生产构建通过（既有大分块提示）；3个备份回归文件通过。发布脚本语法检查、允许源码/拒绝3种非发布文件、真实v39 APK与公告只复制3个交付文件、哈希匹配和拒绝覆盖通过；未重签名或上传测试交付。
- 文档验证：5份找回原文与Git内容SHA-256相同；99份目录README新增或补导航，字体资源叶目录保留许可证、以父级README管理。当前总表/导航链接可解析。
- 公开整理：17份旧过程文档只移出Git追踪，本地原件与整理前副本均保留。发布状态待远端回读。
