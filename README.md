# QAX 智能划词翻译插件

一款基于大模型的智能划词翻译浏览器扩展，专为麒麟操作系统（UKUI 桌面）和奇安信浏览器设计。

## ✨ 功能特性

- ✨ **划词即译**：选中任意文本自动触发翻译
- 🖱️ **右键翻译**：选中文本后右键点击「翻译选中文本」菜单项（v1.1.0 新增）
- 🌐 **语言检测**：智能识别文本语言（英语、日语、韩语等）
- 📝 **精准翻译**：基于大模型的高质量中文翻译
- 🎨 **UKUI 风格**：完美适配麒麟系统蓝色系主题
- 🌙 **暗色模式**：自动适配系统暗色主题
- ⚙️ **灵活配置**：支持自定义 API 地址和模型名称
- 🔧 **兼容性优化**：移除 Promise 依赖，兼容奇安信浏览器等不支持 Promise 的环境（v1.1.0 新增）

## 📋 更新日志

### v1.1.0 (2026-03-26)

**新增功能**：
- 🖱️ **右键菜单翻译**：选中文本后右键点击「翻译选中文本」菜单项即可翻译
- 解决某些页面划词无法触发翻译的问题

**优化改进**：
- 🔧 **兼容性优化**：移除 Promise 依赖，改用纯回调方式
- 兼容奇安信浏览器等不支持 Promise 的环境
- 使用 XMLHttpRequest 替代 fetch API
- 使用 document.execCommand('copy') 替代 navigator.clipboard.writeText()

**配置更新**：
- 默认 API 地址更新为：`http://10.3.4.1:1025/v1`
- 默认模型名称更新为：`deepseekr1`

---

### v1.0.0 (初始版本)

**基础功能**：
- 划词即译
- 语言检测和中文翻译
- UKUI 风格界面
- 暗色模式支持

## 📁 文件结构

### 开发者源码（构建前）

```
qax-translator-plugin/                 # 源码根目录
├── manifest.json                      # 插件配置
├── background.js                      # Service Worker
├── content.js                         # 内容脚本
├── popup.html / popup.js              # 设置页面
├── styles.css                         # 样式
├── build.sh                           # 🔧 构建脚本（开发者使用）
├── uninstall.sh                       # 卸载脚本
├── generate_icons_stdlib.py           # 图标生成脚本
├── icons/
│   └── icon.svg                       # 图标源文件
├── deploy/                            # 企业部署方案
└── README.md                          # 说明文档
```

### 用户安装包（构建后 dist/ 目录）

```
dist/                                  # 构建输出（分发给用户）
├── qax-translator-plugin-v*.tar.gz   # 📦 完整插件包（含图标）
├── install.sh                         # 一键安装脚本
└── INSTALL.txt                        # 安装说明
```

## 🚀 安装指南

### 两种角色

| 角色 | 职责 | 需要的文件 |
|------|------|-----------|
| **开发者/管理员** | 构建安装包 | 完整源码 + `build.sh` |
| **最终用户** | 安装使用 | `dist/` 目录或 `.tar.gz` 文件 |

---

### 📦 方式一：用户一键安装（推荐）

**适用场景**：已收到开发者分发的安装包

```bash
# 1. 进入收到的 dist 目录
cd dist

# 2. 执行安装脚本
./install.sh

# 3. 按提示在浏览器中加载插件
```

**说明**：用户无需联网，无需安装任何工具！

---

### 📦 方式二：用户手动加载（最简单）

**适用场景**：直接收到解压后的插件目录

```bash
# 1. 解压安装包（如果收到的是 tar.gz）
tar -xzf qax-translator-plugin-v1.0.0.tar.gz -C qax-translator-plugin/

# 2. 浏览器加载插件
# 打开 chrome://extensions/ → 开启开发者模式 → 加载已解压的扩展程序 → 选择文件夹
```

---

### 🔧 方式三：开发者构建安装包

**适用场景**：首次构建，准备分发给用户

```bash
# 1. 进入源码目录
cd /path/to/qax-translator-plugin

# 2. 构建（自动生成图标 + 打包）
./build.sh

# 3. 分发 dist/ 目录给用户
cp -r dist /path/to/distribute/
```

**说明**：此步骤只需在开发环境（可联网）执行一次

### 方式二：开发者模式安装

适合开发和调试。

1. **准备图标文件**

```bash
cd qax-translator-plugin/icons

# 使用 ImageMagick 生成图标
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 32x32 icon32.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png
```

2. **浏览器加载插件**

- 打开奇安信浏览器
- 地址栏输入：`chrome://extensions/`
- 开启右上角「开发者模式」
- 点击「加载已解压的扩展程序」
- 选择 `qax-translator-plugin` 文件夹

### 方式三：命令行启动

适合临时使用，不修改浏览器配置。

```bash
# 直接启动浏览器并加载插件
qaxbrowser --load-extension=/path/to/qax-translator-plugin

# 或创建桌面快捷方式
cat > ~/Desktop/QAX-Browser-With-Translation.desktop << 'EOF'
[Desktop Entry]
Name=奇安信浏览器(带翻译)
Exec=qaxbrowser --load-extension=/path/to/qax-translator-plugin
Type=Application
Icon=qaxbrowser
Terminal=false
Comment=集成智能划词翻译的浏览器
Categories=Network;WebBrowser;
EOF
chmod +x ~/Desktop/QAX-Browser-With-Translation.desktop
```

### 方式四：企业组策略部署

适合大规模批量部署，用户无法卸载。

```bash
cd qax-translator-plugin/deploy
sudo ./install-enterprise.sh
```

部署后：
- 插件自动安装，显示"由贵单位管理"
- 用户无法卸载或禁用
- 集中管理，统一更新

详见 [deploy/README.md](deploy/README.md)

## ⚙️ 配置插件

1. 点击浏览器工具栏的插件图标（地球图标）
2. 配置以下选项：
   - **API 接口地址**：`http://10.3.4.21:8000/v1`
   - **模型名称**：**推荐留空**，插件会自动获取并使用第一个可用模型
     - 如果需要指定特定模型，可使用诊断工具的"获取模型列表"功能查看可用模型
     - 插件会自动处理模型名称，无需担心 "Model Not Exist" 或 "missing field `model`" 错误
   - **API Key**：如果使用内部部署服务（如 10.3.4.21），可留空；如果使用互联网服务，需填写对应的 API Key
3. 点击「测试连接」验证配置
4. 点击「保存设置」

### 🔍 模型自动选择机制

插件采用智能模型选择策略：

1. **自动获取模型**（推荐）
   - 将模型名称留空
   - 插件会自动调用 `/models` 接口获取可用模型列表
   - 自动使用第一个可用模型进行翻译

2. **手动指定模型**（高级用户）
   - 使用诊断工具的"获取模型列表"功能查看所有可用模型
   - 将需要的模型名称复制到设置页面的「模型名称」输入框
   - 适用于需要使用特定模型的场景

### ❓ 常见问题

**Q: 为什么会出现 "Model Not Exist" 错误？**
A: 这是因为配置的模型名称在服务器上不存在。解决方案：
- 将模型名称留空，让插件自动选择
- 使用诊断工具查看正确的模型名称

**Q: 为什么会出现 "missing field `model`" 错误？**
A: 后端要求必须提供 model 参数。插件已自动处理此问题：
- 当模型名称为空时，插件会自动获取第一个可用模型
- 无需手动干预

**Q: 为什么会出现 HTTP 401 错误？**
A: HTTP 401 表示未授权，需要提供正确的 API Key。解决方案：
- **内部部署服务**（如 10.3.4.21）：通常不需要 API Key，可以留空
- **互联网服务**（如 OpenAI、智谱 AI）：必须在设置中填写正确的 API Key
- 检查 API Key 是否填写正确且未过期

**Q: 如何查看当前使用的模型？**
A:
- 打开浏览器开发者工具（F12）
- 切换到 Console 标签
- 执行翻译时会显示当前使用的模型名称

**Q: 插件如何选择模型？**
A: 插件采用智能选择策略：
1. 如果模型名称留空，插件会自动调用 `/models` 接口获取可用模型
2. 如果获取成功，使用第一个可用模型
3. 如果获取失败（如 HTTP 401），使用备用模型：`MiniMax/MiniMax-M2.5`
4. 如果手动指定了模型名称，直接使用指定的模型

## 📝 使用方法

### 划词翻译

1. 在任意网页中，用鼠标选中需要翻译的文本
2. 等待约 300ms，翻译弹窗将自动出现
3. 弹窗显示：
   - **原文**：选中的文本内容
   - **语言**：检测到的语言（如：英语、日语）
   - **译文**：流畅的中文翻译
4. 点击「复制译文」按钮可复制翻译结果

### 右键菜单翻译（v1.1.0 新增）

1. 在任意网页中，用鼠标选中需要翻译的文本
2. 点击鼠标右键
3. 选择「翻译选中文本」菜单项
4. 翻译弹窗立即出现
5. 弹窗显示：
   - **原文**：选中的文本内容
   - **语言**：检测到的语言（如：英语、日语）
   - **译文**：流畅的中文翻译
6. 点击「复制译文」按钮可复制翻译结果

**注意**：右键菜单翻译适用于划词事件无法触发的页面，作为划词翻译的补充方式。

### 键盘操作

- **Shift + 方向键**：支持键盘选词触发翻译
- **ESC**：关闭翻译弹窗（点击页面任意位置也可关闭）

## 🧪 接口测试方法

### 方法 1：curl 命令

```bash
# 测试大模型接口
curl -X POST http://10.3.4.21:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen",
    "messages": [
      {
        "role": "system",
        "content": "你是一个语言检测和翻译助手。请检测用户输入文本的语言，并将其翻译为中文。必须严格按照以下JSON格式返回，不要包含其他内容：{\"detectedLanguage\": \"语言名称\", \"translation\": \"中文译文\"}"
      },
      {
        "role": "user",
        "content": "Hello, world!"
      }
    ],
    "temperature": 0.3
  }'
```

### 方法 2：插件内置测试

1. 点击浏览器工具栏的插件图标
2. 点击「测试连接」按钮
3. 查看测试结果：
   - 🟢 绿色提示：连接成功，显示检测结果和译文
   - 🔴 红色提示：连接失败，显示错误原因

### 方法 3：浏览器开发者工具

1. 在任意页面按 F12 打开开发者工具
2. 切换到 Console（控制台）标签
3. 执行以下代码：

```javascript
chrome.runtime.sendMessage(
  { action: 'translate', text: 'Hello, world!' },
  (response) => console.log(response)
);
```

## 🗑️ 卸载方法

### 个人卸载

```bash
cd /path/to/qax-translator-plugin
./uninstall.sh
```

### 手动卸载

1. 打开浏览器，访问 `chrome://extensions/`
2. 找到「QAX 智能划词翻译」插件
3. 点击「删除」按钮

### 企业卸载

```bash
# 删除插件文件
sudo rm -rf /opt/qax-translator-plugin

# 删除策略配置
sudo rm -f /etc/chromium/policies/managed/qax-translator-plugin.json

# 重启浏览器
```

## ❓ 故障排除

### 问题：插件无法加载

**解决方案**：
- 确认已开启「开发者模式」
- 检查文件结构是否完整
- 确认图标文件（PNG 格式）已正确放置
- 查看浏览器控制台错误信息

### 问题：划词后没有弹窗

**解决方案**：
- 刷新页面后重试
- 检查控制台是否有错误信息
- 确认页面允许执行 JavaScript
- 检查是否有其他扩展冲突

### 问题：接口连接失败

**解决方案**：
- 检查 API 地址是否正确
- 确认网络可以访问 `10.3.4.21:8000`
- 测试接口是否可用：
  ```bash
  ping 10.3.4.21
  curl http://10.3.4.21:8000/v1/models
  ```

### 问题：翻译结果格式错误

**解决方案**：
- 检查大模型是否正确配置了提示词
- 查看 background.js 的日志输出
- 确认模型返回 JSON 格式的响应

## 🌐 浏览器兼容性

| 浏览器 | 版本要求 | 兼容性 |
|--------|----------|--------|
| 奇安信浏览器 | Chromium 88+ | ✅ 完全兼容 |
| Google Chrome | 88+ | ✅ 完全兼容 |
| Microsoft Edge | 88+ | ✅ 完全兼容 |
| 360 安全浏览器 | 极速模式 | ✅ 兼容 |

## 🔧 技术栈

- **Manifest V3**：Chrome 扩展最新标准
- **Service Worker**：后台脚本处理 API 调用
- **Content Script**：页面内容交互
- **Fetch API**：HTTP 请求
- **Chrome Storage**：配置持久化

## 📊 配置说明

### 默认配置

```json
{
  "apiUrl": "http://10.3.4.21:8000/v1",
  "modelName": "qwen",
  "timeout": 30000
}
```

### 参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| apiUrl | 大模型 API 基础地址 | `http://10.3.4.21:8000/v1` |
| modelName | 模型名称 | `qwen`、`gpt-3.5-turbo` |
| timeout | 请求超时时间（毫秒） | `30000` |

## 📦 打包分发

### 生成分发包

```bash
./build.sh
```

执行后将生成：
- `dist/qax-translator-plugin-v1.0.0.zip` - 插件安装包
- `dist/install.sh` - 一键安装脚本
- `dist/INSTALL.txt` - 安装说明

### 分发给其他用户

```bash
# 方式1：直接复制 dist 目录
cp -r dist /path/to/share/

# 方式2：打包为 tar.gz
tar -czvf qax-translator-release.tar.gz dist/
```

## 📝 更新日志

### v1.0.0 (2024)

- ✨ 初始版本发布
- 🌐 支持多种语言检测和翻译
- 🎨 适配麒麟 UKUI 桌面风格
- 🌙 支持暗色模式
- ⚙️ 可配置的 API 地址和模型
- 📦 支持一键安装和企业部署

## 📄 许可证

内部使用，未经授权不得外传。

## 📞 联系方式

如有问题，请联系系统管理员或技术支持团队。

---

**提示**：如需查看更详细的部署方案，请阅读 [deploy/README.md](deploy/README.md)
