# 小手机

围绕角色聊天与日常生活的虚拟手机，提供微信/QQ式聊天、角色卡导入、日记、相册、小剧场、音乐和主题自定义。

[下载最新版APK](https://github.com/jiuyi777/xiao-shouji/releases/latest) · [更新公告](CHANGELOG.md) · [使用教程](docs/小手机配置与使用教程.md) · [问题反馈](https://github.com/jiuyi777/xiao-shouji/issues)

## 安装与数据

- Android安装包请从Releases下载。GitHub自动生成的Source code压缩包用于开发，不是安装包。
- 更新前导出备份，在原应用上覆盖安装；不要先卸载或清除数据。签名冲突时停止安装并反馈。
- 曾使用1.16.1且看到两份数据的玩家，可在“数据备份”中查看临时数据、导出，再返回原数据安全合并。先保留双方备份，勿清空旧区。
- 角色聊天、生图和语音按玩家配置的服务使用；相关服务是否收费以提供方为准。

## 源码开发

需要Node.js 22。安装依赖后运行：

~~~sh
npm ci
npm run dev
~~~

模型与语音/生图在应用设置中配置。后端环境变量参考.env.example，不要提交真实.env或玩家备份。

~~~sh
npm test
npm run lint
npm run build
~~~

维护入口：[当前阶段](NEXT.md)、[总计划](MAINTENANCE_OUTLINE.md)、[源码导航](PROJECT_OUTLINE.md)、[保护与发布边界](docs/PROTECTION_AND_RELEASE.md)。

本仓库保留软件源码、运行资源、必要文档与构建测试工具；设计草稿、私人数据、调试截图和开发过程归档不作为软件发布内容。小游戏、真人好友与云同步属于计划功能，不在当前APK中宣称可用。
