# 平台、文件与托管

Skill 是助手执行的规则和资源；HTML 在浏览器运行；在线托管是额外交付。默认始终制作可直接打开的自包含本地 HTML，同时按需保留源码目录。不把“有代码能力”“能加载 Skill”“能发布网站”混为同一种能力。

## 三个平台的接入方式

|平台|加载与本地文件|在线链接|本包验证边界|
|---|---|---|---|
|Codex|按当前客户端的 Skill 安装目录放完整包；助手需有文件/代码权限|当前会话具备 Sites 时按其发布工作流使用；不是每个 Codex 环境默认都有 Sites|本包已有真实网页发布和 Safari 本地 HTML 操作证据；新版本初始化另做隔离测试|
|WorkBuddy|官方支持“专家·技能·连接器 → 技能 → 添加技能 → 上传技能”导入本地技能包；任务选择用户授权的本地工作空间|官方提供网站应用发布和资料库轻量发布；网站应用完成后分享/发布可得到独立链接|2026-10-31 官方文档与本机 v5.3.8 入口核对；用户额度不足，未运行本包生成/发布测试|
|Kimi 桌面/网页 Work|官方说明技能包与商店；本机插件面板有“技能”入口；具体自定义导入方式以当前客户端为准。本地目录要授予工作空间访问，网页/云端不能凭作者绝对路径读取本机|本机插件商店显示 Build“搭建可在 Kimi 部署的静态网站”；需实际安装、账户额度和发布工具核验|官方资料与本机入口核对；用户额度不足，未运行本包生成/托管/文件访问测试|
|Kimi Code|官方支持项目 .agents/skills/、.kimi-code/skills/ 和用户 ~/.agents/skills/、~/.kimi-code/skills/；使用 /skill:physics-inquiry-web 调用|代码助手可生成本地文件，不能据此推断自动附带 Kimi Work 的托管工具|仅官方文档核对；本机 CLI 未实测|

依据（实际查阅于 2026-10-31）：[OpenAI Skills](https://learn.chatgpt.com/docs/customization/overview#skills)、[WorkBuddy 技能](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market)、[WorkBuddy 网站开发与发布](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/App-Publishing/Web-App)、[Kimi 技能说明](https://www.kimi.com/resources/agent-skills)。客户端可能更新，安装时再次看当前入口；文档支持不等于这个包的端到端验收。

## 默认本地 HTML 与可选上线

批准设计后，新题直接编写自包含 HTML 或使用合适的构建工具；CSS、脚本、图像内联，不依赖 CDN、相对模块、远程字体、网络 fetch。实际以 file URL 打开验证，不能仅据构建成功称可离线使用。一个 HTML 可含多个路由视图，目录站不必拆成多个文件。复杂资源确需目录版时，先在报告说明交付差异并得到用户选择，不静默把默认单文件换成需要服务器的项目。

源码目录可使用 HTML/CSS/ES modules 开发，本地通过 `python3 -m http.server 8765 --bind 127.0.0.1` 打开 http://127.0.0.1:8765/；这是本机开发地址，不是他人能访问的分享链接。原始模块直接 file URL 可能触发 CORS，依据 [MDN modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)。无需关闭浏览器安全保护。

随包 `scripts/export_single_html.py --output /absolute/experiment.html` 仅导出固定平面镜参考及其9个输入逐字节副本，拒绝改写输入和覆盖输出；它不是新题通用打包器。目录版 `scripts/scaffold.py` 同样只复制本例，仅在阶段 B 或明确的案例工具测试中使用。两者都不理解任意新题。

额外在线交付沿用户选定平台实际工具执行；报告确定单题/目录、目标站、受众及发布范围，保留现站身份，不拿作者账号、链接或配置代替接收者自己的环境。不需要的云数据库/登录/付费服务不因平台存在而开启。额度不足时只做资料核对，不能暗中换模型/平台消耗额度；本地交付可由用户选定的有额度工具继续完成。

## 如何记录测试

分别记录官方文档核对、界面入口、代码/数学检查、实际浏览器和端到端生成/托管。平面镜离线 HTML 曾在 macOS Safari 直接打开，实际拖动距离、镜底、镜长，切换中英保留状态；固定案例有58项数学/资源断言。这不等于手机、所有客户端或任意题型通过。WorkBuddy/Kimi 当前只核实功能与入口，不写成已通过本包实测。
