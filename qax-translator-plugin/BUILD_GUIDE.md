# QAX 智能划词翻译插件 - 构建与分发指南

## 📋 概述

本文档说明如何在**开发环境（可联网）**准备完整的安装包，以便在**用户环境（内网/无互联网）**一键安装。

## 🖥️ 开发环境准备

### 环境要求

- Linux / 麒麟操作系统
- 可访问互联网
- 以下任一工具（用于生成图标）：
  - `rsvg-convert` (推荐)
  - `inkscape`
  - Python3 + `cairosvg`
  - Python3 + `svglib`

### 安装依赖（选择其一）

```bash
# 方案1: 安装 librsvg2-bin (推荐，最轻量)
sudo apt update
sudo apt install librsvg2-bin

# 方案2: 安装 Inkscape
sudo apt install inkscape

# 方案3: 使用 Python + CairoSVG
pip3 install cairosvg

# 方案4: 使用 Python + svglib
pip3 install svglib reportlab pillow
```

## 📦 构建步骤

### 方式1：使用 build.sh（推荐）

```bash
cd /path/to/qax-translator-plugin
./build.sh
```

构建完成后，`dist/` 目录包含：
- `qax-translator-plugin-v1.0.0.zip` - 完整插件包
- `install.sh` - 一键安装脚本
- `INSTALL.txt` - 安装说明

### 方式2：使用 Python 脚本

```bash
# 1. 生成图标
python3 generate_icons.py

# 2. 构建安装包
./build.sh
```

### 方式3：手动构建

```bash
# 1. 生成图标（使用已安装的任意工具）
rsvg-convert -w 16 -h 16 icons/icon.svg > icons/icon16.png
rsvg-convert -w 32 -h 32 icons/icon.svg > icons/icon32.png
rsvg-convert -w 48 -h 48 icons/icon.svg > icons/icon48.png
rsvg-convert -w 128 -h 128 icons/icon.svg > icons/icon128.png

# 2. 打包
cd /path/to/qax-translator-plugin
./build.sh
```

## 📤 分发到用户环境

### 方法一：直接复制 dist 目录

```bash
# 将整个 dist 目录复制到 U 盘或共享目录
cp -r dist /media/usb/qax-translator-dist/

# 或打包为压缩文件
cd dist
tar -czvf ../qax-translator-v1.0.0-release.tar.gz .
```

### 方法二：打包完整源码（含图标）

```bash
# 构建完成后，打包整个项目
cd /path/to

# 排除不需要的文件
tar -czvf qax-translator-plugin-v1.0.0-full.tar.gz \
  --exclude='build' \
  --exclude='dist' \
  --exclude='*.pem' \
  qax-translator-plugin/

# 然后单独复制 dist 目录
cp -r qax-translator-plugin/dist /destination/
```

## 🏭 用户环境安装（内网/无互联网）

### 用户收到的文件

```
qax-translator-dist/
├── qax-translator-plugin-v1.0.0.zip    # 插件包
├── install.sh                           # 一键安装脚本
└── INSTALL.txt                          # 安装说明
```

### 安装步骤

```bash
# 1. 进入目录
cd qax-translator-dist

# 2. 执行一键安装
chmod +x install.sh
./install.sh

# 3. 按提示选择安装方式
# 4. 在浏览器中加载插件
```

**用户环境无需安装任何额外软件！**

## ✅ 构建验证

构建完成后，请验证：

```bash
cd dist

# 1. 检查文件是否存在
ls -la

# 2. 验证 ZIP 包含图标
unzip -l qax-translator-plugin-v1.0.0.zip | grep icon

# 3. 验证安装脚本可执行
file install.sh
```

## 🔧 故障排除

### 问题：build.sh 提示缺少图标工具

**解决方案：**

```bash
# 安装 rsvg-convert（推荐）
sudo apt install librsvg2-bin

# 或安装 Inkscape
sudo apt install inkscape

# 或使用 Python
pip3 install cairosvg
```

### 问题：Python 脚本提示缺少模块

```bash
# 安装所需 Python 包
pip3 install cairosvg
# 或
pip3 install svglib reportlab pillow
```

### 问题：用户环境无法加载插件

**检查清单：**
1. 确认 ZIP 包中包含 PNG 图标
2. 确认用户开启了浏览器的「开发者模式」
3. 确认用户选择的目录包含 manifest.json

## 📊 构建流程图

```
开发环境（可联网）                    用户环境（内网）
┌─────────────────┐                ┌─────────────────┐
│  1. 安装依赖    │                │                 │
│  (rsvg/inkscape)│                │                 │
└────────┬────────┘                │                 │
         │                         │                 │
┌────────▼────────┐                │                 │
│  2. 运行 build.sh│               │                 │
│  生成 PNG 图标  │                │                 │
│  打包 ZIP       │                │                 │
└────────┬────────┘                │                 │
         │                         │                 │
┌────────▼────────┐                │                 │
│  3. 复制 dist/  │ ──────────────>│ 4. 运行 install.sh│
│  到用户环境     │                │  解压安装       │
└─────────────────┘                │  浏览器加载     │
                                   └─────────────────┘
```

## 📝 检查清单

分发前请确认：

- [ ] 在开发环境成功执行 `./build.sh`
- [ ] `dist/` 目录包含 3 个文件
- [ ] ZIP 文件中包含 `icons/icon16.png` 等 4 个图标
- [ ] 在测试机器上成功安装
- [ ] 插件能在浏览器中正常加载
- [ ] 划词翻译功能正常

## 📞 技术支持

如有构建或分发问题，请联系开发团队。
