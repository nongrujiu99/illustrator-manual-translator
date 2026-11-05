# 说明书翻译插件｜安装与使用

此包是 Windows 版 Illustrator CEP 扩展。先解压整个 ZIP，保持 `install.ps1` 与 `extension` 文件夹在同一目录。安装包不含 API Key、示例文档或项目开发文件。

## 在另一台 Windows 电脑安装

1. 安装并关闭 Adobe Illustrator。确认其版本及对应的 CEP 版本（见下表）。
2. 在解压后的文件夹空白处打开 PowerShell。
3. 按该电脑的 CEP 版本运行，例如 Illustrator CC 2019：

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\install.ps1 -CepMajor 9 -EnableUnsigned
   ```

   Illustrator 25.0 用 `-CepMajor 10`；25.3 用 `-CepMajor 11`；29.5.1 用 `-CepMajor 12`。安装脚本把扩展复制到当前 Windows 用户的 `%APPDATA%\Adobe\CEP\extensions\com.codex.manualtranslator`，并核对文件。

4. 重启 Illustrator，在「窗口 → 扩展功能 → 说明书翻译」打开面板。较新版本的菜单名称可能包含“旧版”。

若这台电脑已装过同一扩展，安装脚本会停止。确认需要替换后，给同一命令加 `-Update`。旧版会备份到 `%APPDATA%\Adobe\CEP\extension-backups`，再复制新版。安装脚本不会覆盖其他扩展。

此包未签名。`-EnableUnsigned` 会为指定 CEP 版本设置当前用户的 `PlayerDebugMode=1`，使该版本的无签名 CEP 扩展可加载；这一设置也影响其他无签名扩展。若已自行完成相应 CEP 版本的签名或调试设置，可省略该参数。此 ZIP 不是已签名的 ZXP 安装包。

## 兼容版本

| Illustrator | Adobe 对应的 CEP | 本插件验证情况 |
| --- | --- | --- |
| CC 2019 / 23.x | CEP 9 | **23.1.0 在 Windows 上实测**：读取、选区回写和批量工作副本样例；真实 API 调用未实测 |
| CC 2020 / 24.x | CEP 9 | 未实测 |
| 25.0 | CEP 10 | 未实测 |
| 25.3 | CEP 11 | 未实测 |
| 29.5.1 | CEP 12 | 未实测 |

扩展清单声明 Illustrator `23.0–99.9`，最低运行时为 CEP 9。这是允许加载的版本范围，并不代表各版本已通过功能验证。其他版本请先确认其 CEP 版本，再选 `-CepMajor 9`、`10`、`11` 或 `12`；新版 Illustrator 上建议先用副本文档试运行。此包的安装脚本仅支持 Windows；macOS 未验证。

参考：[Adobe CEP 12 兼容表及扩展目录](https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_12.x/Documentation/CEP%2012%20HTML%20Extension%20Cookbook.md)、[Adobe 无签名扩展调试设置](https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_12.x/Documentation/CEP%2012%20HTML%20Extension%20Cookbook.md#debugging-unsigned-extensions)。

## 使用方法

1. 在 Illustrator 打开 `.ai` 或可编辑 PDF。扫描件、转曲文字和图片中的字无法直接翻译。
2. 在面板选择目标语言。首次使用时打开“高级设置”，选择阿里云百炼地域或“自定义接口”，填写完整 HTTPS Chat Completions 地址、模型名和该渠道的 API Key，点击“测试连接”。百炼接口的地域须与 Key 一致。
3. 要在下次打开面板时继续使用，填写“预设名称”并点击“保存预设”。之后在“已保存的渠道”中切换。修改配置后再次点击“保存预设”可更新；点击“新建预设”可添加其他渠道；点击“删除当前预设”会删除该预设和保存的 Key。未保存的当前配置仍只在本次面板会话有效。保存的 Key 使用当前 Windows 账户加密，留在这台电脑的当前用户配置中；换电脑或换 Windows 账户时需重新输入，安装 ZIP 不包含预设或 Key。
4. **翻译所选文字：**用选择工具选中一个或多个文字框对象，点击大按钮“翻译所选文字”。译文直接写回当前打开的文档，不自动保存。先检查版面再自行保存。Illustrator 可撤销修改，但多个文字框或字号调整**不能保证一次撤销全部恢复**。
5. **批量翻译文档：**点击“读取当前文档”→“开始翻译”→“查看或修改译文”→“应用到 AI 工作副本”→“另存翻译版 .ai”。批量模式只处理含中文的可编辑文字框，原稿不被批量回写。写入后按“需复核”提示检查版面。
6. “文字排版”可调整字号适配限制；“术语表”每行填写 `原文=译文`。网络或 API 出错时，可调整高级设置后继续翻译未完成条目。

正式翻译仅发送待翻译文字和术语到所选模型接口，不上传整份 AI/PDF。接口请求可能产生模型费用。请勿把 Coding Plan 专用密钥用于普通百炼接口。

## 安装后找不到面板

- 确认已重启 Illustrator，且 `extension\CSXS\manifest.xml` 随整个文件夹安装。
- 确认 Illustrator 版本在扩展清单的 23.0 及以上范围内，并选对 `-CepMajor`。
- 若使用无签名包，确认安装时带了 `-EnableUnsigned`；它只设置所选 CEP 版本、当前 Windows 用户。
- 先用 `.ai` 小样本测试。若面板可见但翻译失败，检查 API Key、地域、网络和模型接口地址。
