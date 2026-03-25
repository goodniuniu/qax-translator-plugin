#!/bin/bash

# QAX 智能划词翻译插件 - 打包构建脚本
# 在开发环境（可联网）运行，生成完整安装包
# 用户环境（内网）无需额外软件即可安装

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
PLUGIN_NAME="qax-translator-plugin"
VERSION=$(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4)
BUILD_DIR="build"
DIST_DIR="dist"
ICONS_DIR="icons"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  QAX 智能划词翻译插件 - 构建脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "版本: ${YELLOW}v${VERSION}${NC}"
echo ""

# ============================================================
# 第1步：检查并生成图标（关键：在开发环境完成）
# ============================================================
echo -e "${YELLOW}[1/5] 生成图标文件...${NC}"

ICON_SIZES=(16 32 48 128)
ICON_MISSING=0

for size in "${ICON_SIZES[@]}"; do
    if [ ! -f "${ICONS_DIR}/icon${size}.png" ]; then
        ICON_MISSING=1
        break
    fi
done

if [ $ICON_MISSING -eq 1 ]; then
    echo "检测到缺少 PNG 图标，正在生成..."
    
    # 方法1：使用 rsvg-convert（最佳选择）
    if command -v rsvg-convert &> /dev/null; then
        echo "  使用 rsvg-convert 生成图标..."
        for size in "${ICON_SIZES[@]}"; do
            rsvg-convert -w $size -h $size "${ICONS_DIR}/icon.svg" > "${ICONS_DIR}/icon${size}.png"
            echo "    ✓ icon${size}.png"
        done
        
    # 方法2：使用 Inkscape
    elif command -v inkscape &> /dev/null; then
        echo "  使用 Inkscape 生成图标..."
        for size in "${ICON_SIZES[@]}"; do
            inkscape -w $size -h $size "${ICONS_DIR}/icon.svg" -o "${ICONS_DIR}/icon${size}.png" 2>/dev/null
            echo "    ✓ icon${size}.png"
        done
        
    # 方法3：使用 Python + PIL/Pillow
    elif command -v python3 &> /dev/null && python3 -c "from PIL import Image; import cairosvg" 2>/dev/null; then
        echo "  使用 Python + CairoSVG 生成图标..."
        python3 << PYEOF
import cairosvg
import os

sizes = [16, 32, 48, 128]
for size in sizes:
    output = f"${ICONS_DIR}/icon{size}.png"
    cairosvg.svg2png(
        url="${ICONS_DIR}/icon.svg",
        write_to=output,
        output_width=size,
        output_height=size
    )
    print(f"    ✓ icon{size}.png")
PYEOF
        
    # 方法4：使用 Python + svglib + reportlab
    elif command -v python3 &> /dev/null && python3 -c "from svglib.svglib import svg2rlg; from reportlab.graphics import renderPM" 2>/dev/null; then
        echo "  使用 Python + svglib 生成图标..."
        python3 << PYEOF
from svglib.svglib import svg2rlg
from reportlab.graphics import renderPM

sizes = [16, 32, 48, 128]
drawing = svg2rlg("${ICONS_DIR}/icon.svg")

for size in sizes:
    output = f"${ICONS_DIR}/icon{size}.png"
    renderPM.drawToFile(drawing, output, fmt="PNG", dpi=size*5)
    print(f"    ✓ icon{size}.png")
PYEOF
        
    else
        # 方法5：使用纯 Python 标准库（最终备选）
        echo "  使用纯 Python 标准库生成图标..."
        if command -v python3 &> /dev/null; then
            python3 generate_icons_stdlib.py
        else
            echo -e "${RED}错误：无法生成图标，请安装以下任一工具：${NC}"
            echo ""
            echo "推荐方案（选择其一）："
            echo "  1. librsvg2-bin (rsvg-convert)"
            echo "     sudo apt install librsvg2-bin"
            echo ""
            echo "  2. Inkscape"
            echo "     sudo apt install inkscape"
            echo ""
            echo "  3. Python + CairoSVG"
            echo "     pip3 install cairosvg"
            echo ""
            echo "  4. Python + svglib"
            echo "     pip3 install svglib reportlab"
            echo ""
            exit 1
        fi
    fi
    
    echo -e "${GREEN}图标生成完成！${NC}"
else
    echo -e "${GREEN}图标文件已存在，跳过生成${NC}"
fi
echo ""

# ============================================================
# 第2步：检查必要文件
# ============================================================
echo -e "${YELLOW}[2/5] 检查必要文件...${NC}"

required_files=("manifest.json" "background.js" "content.js" "styles.css" "popup.html" "popup.js")
missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    echo -e "${RED}错误：缺少以下必要文件：${NC}"
    for file in "${missing_files[@]}"; do
        echo "  - $file"
    done
    exit 1
fi

echo -e "${GREEN}文件检查通过！${NC}"
echo ""

# ============================================================
# 第3步：清理并准备构建目录
# ============================================================
echo -e "${YELLOW}[3/5] 准备构建目录...${NC}"

rm -rf "$BUILD_DIR" "$DIST_DIR"
mkdir -p "$BUILD_DIR" "$DIST_DIR"

# 复制核心文件
cp manifest.json "$BUILD_DIR/"
cp background.js "$BUILD_DIR/"
cp content.js "$BUILD_DIR/"
cp styles.css "$BUILD_DIR/"
cp popup.html "$BUILD_DIR/"
cp popup.js "$BUILD_DIR/"
cp diagnose.html "$BUILD_DIR/"
cp diagnose.js "$BUILD_DIR/"

# 复制图标（必需）
mkdir -p "${BUILD_DIR}/icons"
cp "${ICONS_DIR}/icon16.png" "${BUILD_DIR}/icons/"
cp "${ICONS_DIR}/icon32.png" "${BUILD_DIR}/icons/"
cp "${ICONS_DIR}/icon48.png" "${BUILD_DIR}/icons/"
cp "${ICONS_DIR}/icon128.png" "${BUILD_DIR}/icons/"
cp "${ICONS_DIR}/icon.svg" "${BUILD_DIR}/icons/" 2>/dev/null || true

echo -e "${GREEN}构建目录准备完成！${NC}"
echo ""

# ============================================================
# 第4步：生成安装包
# ============================================================
echo -e "${YELLOW}[4/5] 生成安装包...${NC}"

# 生成安装包（使用 tar.gz，Linux 标准格式）
cd "$BUILD_DIR"
tar --exclude="*.DS_Store" --exclude="*.git*" -czf "../$DIST_DIR/${PLUGIN_NAME}-v${VERSION}.tar.gz" .
cd ..

echo -e "${GREEN}安装包生成完成！${NC}"
echo ""

# ============================================================
# 第5步：生成一键安装脚本
# ============================================================
echo -e "${YELLOW}[5/5] 生成一键安装脚本...${NC}"

cat > "${DIST_DIR}/install.sh" << 'INSTALL_SCRIPT_EOF'
#!/bin/bash
# QAX 智能划词翻译插件 - 一键安装脚本
# 适用于内网环境，无需额外软件

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  QAX 智能划词翻译插件 - 安装程序${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 获取当前目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 查找 tar.gz 文件
TAR_FILE=$(ls "${SCRIPT_DIR}"/${PLUGIN_NAME}-v*.tar.gz 2>/dev/null | head -1)

if [ -z "$TAR_FILE" ]; then
    echo -e "${RED}错误：未找到插件安装包${NC}"
    exit 1
fi

echo -e "找到安装包: ${YELLOW}$(basename "$TAR_FILE")${NC}"
echo ""

# 询问安装方式
echo -e "${YELLOW}请选择安装方式：${NC}"
echo ""
echo "1) 开发者模式安装（推荐）"
echo "   解压到本地目录，手动加载到浏览器"
echo "   适合：个人用户、测试环境"
echo ""
echo "2) 系统目录安装（需要 sudo）"
echo "   安装到 /opt/ 目录"
echo "   适合：多用户共享"
echo ""
read -p "请选择 [1/2] (默认: 1): " INSTALL_METHOD
INSTALL_METHOD=${INSTALL_METHOD:-1}

echo ""

if [ "$INSTALL_METHOD" == "2" ]; then
    # 系统安装
    INSTALL_DIR="/opt/${PLUGIN_NAME}"
    echo -e "${YELLOW}安装到系统目录: ${INSTALL_DIR}${NC}"
    
    sudo rm -rf "$INSTALL_DIR"
    sudo mkdir -p "$INSTALL_DIR"
    sudo tar -xzf "$TAR_FILE" -C "$INSTALL_DIR"
    sudo chmod -R 755 "$INSTALL_DIR"
    
    echo ""
    echo -e "${GREEN}系统安装完成！${NC}"
    echo ""
    echo -e "请手动加载插件："
    echo -e "  1. 打开浏览器，访问 chrome://extensions/"
    echo -e "  2. 开启'开发者模式'"
    echo -e "  3. 点击'加载已解压的扩展程序'"
    echo -e "  4. 选择目录: ${YELLOW}${INSTALL_DIR}${NC}"
else
    # 本地安装
    INSTALL_DIR="${SCRIPT_DIR}/${PLUGIN_NAME}"
    echo -e "${YELLOW}解压到本地目录: ${INSTALL_DIR}${NC}"
    
    rm -rf "$INSTALL_DIR"
    mkdir -p "$INSTALL_DIR"
    tar -xzf "$TAR_FILE" -C "$INSTALL_DIR"
    
    echo ""
    echo -e "${GREEN}解压完成！${NC}"
    echo ""
    echo -e "请手动加载插件："
    echo -e "  1. 打开浏览器，访问 chrome://extensions/"
    echo -e "  2. 开启'开发者模式'"
    echo -e "  3. 点击'加载已解压的扩展程序'"
    echo -e "  4. 选择目录: ${YELLOW}${INSTALL_DIR}${NC}"
fi

echo ""
echo -e "${GREEN}安装完成！${NC}"
echo ""
echo -e "配置插件："
echo -e "  1. 点击浏览器工具栏的插件图标"
echo -e "  2. 设置 API 地址: ${YELLOW}http://10.3.4.21:8000/v1${NC}"
echo -e "  3. 点击'测试连接'验证"
echo -e "  4. 点击'保存设置'"
echo ""
echo -e "使用方法："
echo -e "  • 在网页中选中任意文本，自动弹出翻译窗口"
echo -e "  • 点击'复制译文'可快速复制翻译结果"
echo ""
INSTALL_SCRIPT_EOF

# 替换脚本中的插件名变量
sed -i "s/\${PLUGIN_NAME}/${PLUGIN_NAME}/g" "${DIST_DIR}/install.sh"
chmod +x "${DIST_DIR}/install.sh"

# 生成安装说明
cat > "${DIST_DIR}/INSTALL.txt" << 'EOF'
═══════════════════════════════════════════════════════════════
  QAX 智能划词翻译插件 - 安装说明
═══════════════════════════════════════════════════════════════

📦 文件说明
-----------
• qax-translator-plugin-v*.tar.gz 插件安装包（包含所有必需文件）
• install.sh                       一键安装脚本
• INSTALL.txt                      本文件

🚀 快速安装
-----------
1. 打开终端，进入本目录
2. 执行: ./install.sh
3. 按提示完成安装

🛠️ 手动安装（备用方案）
---------------------
如果自动安装失败，可手动安装：

1. 解压安装包：
   tar -xzf qax-translator-plugin-v*.tar.gz -C qax-translator-plugin/

2. 浏览器加载：
   • 打开奇安信浏览器
   • 地址栏输入: chrome://extensions/
   • 开启右上角「开发者模式」
   • 点击「加载已解压的扩展程序」
   • 选择解压后的文件夹

⚙️ 配置插件
-----------
1. 点击浏览器工具栏的插件图标（地球图标）
2. 设置 API 地址: http://10.3.4.21:8000/v1
3. 模型名称: qwen（或留空）
4. 点击「测试连接」验证
5. 点击「保存设置」

📝 使用方法
-----------
• 划词翻译：选中任意文本，自动弹出翻译窗口
• 复制译文：点击「复制译文」按钮
• 关闭弹窗：点击页面任意位置

❓ 常见问题
-----------
Q: 插件无法加载？
A: 确认已开启「开发者模式」，检查图标文件是否存在

Q: 接口连接失败？
A: 检查网络是否可以访问 10.3.4.21:8000

Q: 如何卸载？
A: 访问 chrome://extensions/，点击插件卡片的「删除」按钮

═══════════════════════════════════════════════════════════════
EOF

echo -e "${GREEN}安装脚本生成完成！${NC}"
echo ""

# ============================================================
# 构建完成汇总
# ============================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  ✅ 构建完成！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "版本：${YELLOW}v${VERSION}${NC}"
echo -e "输出目录：${YELLOW}${DIST_DIR}/${NC}"
echo ""
echo "生成的文件："
ls -lh "$DIST_DIR/" | tail -n +2 | awk '{print "  " $9 " (" $5 ")"}'
echo ""
echo -e "${GREEN}下一步：分发给最终用户${NC}"
echo ""
echo -e "📦 分发方式（选择其一）："
echo ""
echo -e "  方式1：复制整个目录"
echo -e "    ${YELLOW}cp -r ${DIST_DIR} /path/to/distribute/${NC}"
echo ""
echo -e "  方式2：打包为单个文件"
echo -e "    ${YELLOW}cd ${DIST_DIR} && tar -czvf ../qax-translator-release.tar.gz .${NC}"
echo ""
echo -e "👤 用户安装方式（在用户环境执行）："
echo -e "    ${YELLOW}cd dist && ./install.sh${NC}"
echo ""
echo -e "${BLUE}========================================${NC}"
