## 2026-10-10维护导航

- 职责：模块/主题（模块/主题）。
- 当前阶段与下一步：[总计划](../../MAINTENANCE_OUTLINE.md)、[NEXT](../../NEXT.md)。本目录不另记独立进度。
- 数据/发布红线：[保护清单](../../docs/PROTECTION_AND_RELEASE.md)。只提交与软件直接相关的源码、必要说明和实际运行资源。
- 当前无直接实现文件，不将空目录计为已完成功能。
- 无子目录。
- 修改入口、数据结构或共享逻辑后，同步本说明和总表对应任务；查调用方、保存、重开恢复，不能仅看页面。
- 原有文件、备份、测试、许可证不能按名称猜测删除。新功能数据应复用明确权威来源，不建立第二份同义存档。

---

以下为原有说明；旧路径或阶段与上方当前导航冲突时，以当前源码和总表为准。

# 主题

当前真实代码入口：

- 主题选择页：`src/apps/themes/ThemesScreen.tsx` -> `ThemesScreen`
- 主题与气泡选项和类型：`src/themes/themeOptions.ts`
- 主题状态：`src/store.ts` -> `useAppStore.theme` / `setTheme`
- 气泡美化状态：`src/store.ts` -> `useAppStore.bubbleStyle` / `setBubbleStyle`
- 软件头像覆盖：`src/shell/appIconOverrides.ts` -> 默认小手机头像、上传头像和恢复默认图标的解析工具
- 界面字体：`src/store.ts` -> `fontStyle`；真实 WOFF2、许可和来源记录位于 `src/assets/fonts/`；`src/index.css` 负责 `@font-face` 与整机字体 class。
- 基础全局样式：`src/index.css`
- 独立主题视觉：每套整机主题位于 `src/themes/<theme-id>/index.css`；“潮汐邮局”使用 `src/themes/tidal-post-office/index.css`。
- 主题共享修饰层：`src/themes/polish/index.css`，处理跨主题安全区、短屏、Dock 防裁切和可读性问题
- 气泡美化与主题页预览：`src/themes/bubbles/index.css`，最后加载，让显式选择的气泡皮肤稳定覆盖整机主题自带气泡

当前主题：

- `pastel`：奶油手绘。完整视觉覆盖在 `src/themes/pastel/index.css`，不要被其它主题改动影响。
- `gothic`：P5R 红黑。完整视觉覆盖在 `src/themes/gothic/index.css`。
- `guofeng`：古风手札。宣纸米白、墨色文字、朱砂点印、黛青淡纹，完整视觉覆盖在 `src/themes/guofeng/index.css`。
- `celtic-paladin`：凯尔特手札。羊皮纸底、深林绿、橡木墨线和细金边，完整视觉覆盖在 `src/themes/celtic-paladin/index.css`。
- `status-terminal`：状态终端。磨砂玻璃、柔和蓝紫和信息卡片感，完整视觉覆盖在 `src/themes/status-terminal/index.css`。
- `alcheris-pixel`：阿尔切利斯像素。黑紫像素终端、等宽字体和硬边状态栏，完整视觉覆盖在 `src/themes/alcheris-pixel/index.css`。
- `lotus-letter`：荷笺云印。松绿、昆布绿、鼠尾草、米纸和浅铜构成现代新中式纸品系统；覆盖锁屏荷塘、桌面图标、Dock、通知与微信/QQ，完整视觉在 `src/themes/lotus-letter/index.css`，纹样资源在 `public/lotus-letter/lotus-paper.svg`。
- `tidal-post-office`：潮汐邮局。深海海图、海玻璃、羊皮纸、珊瑚火漆和邮票齿孔贯穿锁屏、桌面、通知、通用页面及微信/QQ；完整视觉覆盖在 `src/themes/tidal-post-office/index.css`。

当前气泡美化：

- `theme`：跟随整机主题，保持各主题自己配好的微信/QQ气泡。
- `wechat`：微信青绿，白色与青绿色、小尖角、紧凑圆角。
- `qq`：QQ 晴空，蓝紫渐变、大圆角、轻阴影。
- `glass`：雾面玻璃，半透明背景、柔和描边和磨砂效果。
- `scrapbook`：手账贴纸，奶油纸张、粉色贴纸、错位硬阴影。
- `pixel`：像素电波，黑紫硬边、青紫像素阴影。

维护边界：

- 主题只改视觉变量、样式覆盖和主题页文案，不改聊天、通知、锁屏、查手机、主动事件的数据逻辑。
- 气泡美化同时作用于微信与 QQ 的文字和语音条，只改外观；微信设置里的“RP 长短”仍只负责短 RP 多气泡、长 RP 单气泡或自动选择，两者不得混用。
- 软件头像属于主题页外观设置：可以上传自定义头像、切换到小手机默认头像，或恢复软件原本图标；不改变聊天或其他 App 数据。
- 界面字体属于全局设备偏好，系统字体加 10 套仓库字体共 11 个入口；选择立即应用到整台小手机并持久化。新增字体必须同时保留明确的再分发许可和来源记录，不得只写一个系统字体名冒充已打包字体。
- 新主题优先放在 `src/themes/` 下，避免继续把完整主题视觉堆进 `src/index.css`。
- 单一主题的设计仍放在该主题目录；只有两个以上主题共享的布局安全修正才能进入 `polish/index.css`。
- 每个主题应覆盖手机壳背景、锁屏、桌面图标、Dock、顶部状态/通知入口、卡片、按钮、输入框、微信/QQ 聊天变量和主题页预览文案。
- 主题颜色通过 CSS 变量统一控制，纹样只放边框、分隔线和按钮/图标角落，不遮挡内容。
- 桌面拖拽坐标按主题分别保存；切换主题时不得复用其它主题的坐标。
