# QAX 智能划词翻译插件 - 部署流程说明

## 📋 职责分离

| 角色 | 环境 | 操作 |
|------|------|------|
| **开发者/管理员** | 开发环境（可联网） | 运行 `build.sh` 生成安装包 |
| **最终用户** | 用户环境（内网） | 解压安装包，浏览器加载插件 |

---

## 🏭 开发者流程（只需执行一次）

### 1. 准备开发环境

```bash
# 进入插件目录
cd /path/to/qax-translator-plugin

# 检查 Python3（一般系统已自带）
python3 --version
```

### 2. 构建安装包

```bash
# 运行构建脚本（自动生成图标 + 打包）
./build.sh
```

构建完成后，`dist/` 目录包含：
- `qax-translator-plugin-v1.0.0.tar.gz` - **完整插件包（含图标）**
- `install.sh` - 一键安装脚本（可选）
- `INSTALL.txt` - 安装说明

### 3. 分发给用户

```bash
# 方式1：复制整个 dist 目录
cp -r dist /path/to/distribute/

# 方式2：打包为单个文件
cd dist
tar -czvf ../qax-translator-v1.0.0-release.tar.gz .
```

---

## 👤 用户流程（内网环境）

### 方式1：一键安装（推荐）

```bash
# 1. 收到 dist 目录后，进入该目录
cd dist

# 2. 执行安装脚本
./install.sh

# 3. 按提示完成浏览器加载
```

### 方式2：手动加载（最简单）

```bash
# 1. 解压安装包
tar -xzf qax-translator-plugin-v1.0.0.tar.gz -C qax-translator-plugin/

# 2. 浏览器加载插件
# 打开 chrome://extensions/ → 开启开发者模式 → 加载已解压的扩展程序 → 选择文件夹
```

### 方式3：命令行启动

```bash
# 直接指定插件目录启动浏览器
qaxbrowser --load-extension=/path/to/qax-translator-plugin
```

---

## 📦 用户收到的内容

用户只需要以下任一形式：

### 形式A：dist 目录
```
dist/
├── qax-translator-plugin-v1.0.0.tar.gz   ← 核心：完整插件包
├── install.sh                            ← 可选：一键安装脚本
└── INSTALL.txt                           ← 可选：安装说明
```

### 形式B：单个 tar.gz 文件
```
qax-translator-v1.0.0-release.tar.gz
├── qax-translator-plugin-v1.0.0.tar.gz
├── install.sh
└── INSTALL.txt
```

### 形式C：直接解压后的插件目录
```
qax-translator-plugin/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── styles.css
└── icons/
    ├── icon16.png     ← 已包含生成好的图标
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

**无论哪种形式，用户都不需要运行 build.sh，也不需要安装任何工具！**

---

## ❌ 常见误解

### 误解1：用户需要运行 build.sh

**错误理解**：
```bash
# 用户在无网络环境运行
./build.sh  # ❌ 会失败，因为缺少工具
```

**正确做法**：
```bash
# 用户在无网络环境运行
./install.sh  # ✓ 或手动解压加载
```

### 误解2：用户需要生成图标

**错误理解**：用户需要自己从 SVG 生成 PNG 图标

**正确做法**：开发者已在 build.sh 中生成好图标，打包在安装包内

### 误解3：需要联网安装依赖

**错误理解**：安装过程需要下载软件

**正确做法**：所有依赖（包括图标）已包含在安装包内

---

## 🎯 关键点总结

1. **build.sh 只在开发环境运行一次** - 由开发者执行
2. **用户收到的是完整安装包** - 包含所有必需文件
3. **用户无需运行任何构建脚本** - 只需解压或运行 install.sh
4. **用户无需联网** - 所有内容已打包在内

---

## 📞 问题排查

### 问题：用户运行 build.sh 失败

**原因**：build.sh 需要在开发环境运行，用于生成图标和打包

**解决**：
- 开发者：重新运行 build.sh 生成安装包
- 用户：不要运行 build.sh，改为运行 install.sh 或手动加载

### 问题：用户说缺少图标

**原因**：分发的包不完整，可能漏了 icons/ 目录

**解决**：
- 开发者：确保运行了 build.sh 并检查了 dist/ 内容
- 用户：确认收到的 tar.gz 文件大小约为 15KB（包含图标）
