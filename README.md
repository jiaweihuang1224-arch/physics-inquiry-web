# Physics Inquiry Web

把一道物理题转成精美、可操作的中英双语实验网页。**先初始化 → 题目分类 → 报告和逐屏效果图 → 确认 → 制作与验证**。默认始终交付可直接打开的本地 HTML；有对应能力时，再提供在线链接。

## 安装和启动

下载完整仓库，将含 SKILL.md 的目录命名为 physics-inquiry-web。Codex 使用当前客户端 Skill 目录（官方通用目录 ~/.agents/skills/，已有 ~/.codex/skills/ 安装可原位更新）；WorkBuddy 用技能面板上传完整 ZIP；Kimi Work 按当前技能导入入口操作，Kimi Code 使用 ~/.kimi-code/skills/。保留 assets、references 和 scripts。私有仓库需要本人或已获准账号访问，不需要把 GitHub 令牌交给此 Skill。

第一次在实验项目里调用：“使用 physics-inquiry-web，开始首次初始化。”助手识别工具，询问单实验/分类目录、额外在线链接和本地位置，得到回复才保存项目偏好。以后在同一项目直接引用 Skill 并附题，无需重复初始化；每道新题仍先交报告等确认。具体方法见 [使用说明](references/sharing-and-use.md) 和 [平台与验证边界](references/platforms.md)。

## 当前能力

通用流程支持逐题分析和自动建议分类；没有题型覆盖率统计。固定平面镜案例可运行，其他新题需重新建模、设计和验证。报告逐屏给出画面及功能/实现说明；通常1–3个主要操作，不堆叠通关步骤。语言切换保留实验状态。自动分类是助手执行流程，网站本身没有上传识题后端。

Codex/Sites 与本地 HTML 有既有实际验证；WorkBuddy、Kimi 目前只核对官方文档与客户端入口，因测试账号额度不足没有执行本包生成/托管测试。普通 Skill 文件夹不是三个产品的插件商店上架，也不附带托管账号。

## 参考检查

有 Python/Node 的制作环境可运行 `python3 -m unittest discover -s tests -v` 和 `node scripts/verify_reference.mjs`。偏好工具 `python3 scripts/preferences.py --project /absolute/project status` 不会创建设置；得到用户选择后才 init。固定案例导出器只接受原始参考输入，不支持任意网站打包。

源码与资源不含个人路径、项目凭据或教材截图。未授予额外开源许可证，素材身份和限制见 [素材说明](references/package-assets.md)。
