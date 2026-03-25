#!/bin/bash

# QAX 智能划词翻译插件 - 企业级部署脚本
# 适用于大规模部署场景，通过组策略强制安装

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  QAX 智能划词翻译插件 - 企业部署${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}错误：请使用 sudo 运行此脚本${NC}"
    exit 1
fi

# 配置
PLUGIN_NAME="qax-translator-plugin"
INSTALL_DIR="/opt/${PLUGIN_NAME}"
POLICY_DIR="/etc/chromium/policies/managed"
EXT_ID=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${YELLOW}[1/5] 检查源文件...${NC}"

if [ ! -f "${SOURCE_DIR}/manifest.json" ]; then
    echo -e "${RED}错误：未找到插件源文件${NC}"
    echo "请确保从正确的目录运行此脚本"
    exit 1
fi

echo -e "${GREEN}源文件检查通过！${NC}"
echo ""

# 检查图标
echo -e "${YELLOW}[2/5] 检查图标文件...${NC}"
if [ ! -f "${SOURCE_DIR}/icons/icon16.png" ]; then
    echo -e "${YELLOW}生成图标文件...${NC}"
    if command -v convert &> /dev/null; then
        cd "${SOURCE_DIR}/icons"
        convert -background none icon.svg -resize 16x16 icon16.png
        convert -background none icon.svg -resize 32x32 icon32.png
        convert -background none icon.svg -resize 48x48 icon48.png
        convert -background none icon.svg -resize 128x128 icon128.png
        cd "$SCRIPT_DIR"
    else
        echo -e "${RED}错误：未安装 ImageMagick${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}图标检查通过！${NC}"
echo ""

# 计算扩展 ID
echo -e "${YELLOW}[3/5] 计算扩展 ID...${NC}"

# 生成或使用现有私钥
KEY_FILE="${SOURCE_DIR}/${PLUGIN_NAME}.pem"
if [ ! -f "$KEY_FILE" ]; then
    echo "生成私钥..."
    openssl genrsa -out "$KEY_FILE" 2048 2>/dev/null
fi

# 从公钥计算扩展 ID
EXT_ID=$(openssl rsa -in "$KEY_FILE" -pubout -outform DER 2>/dev/null | sha256sum | head -c32 | tr '0-9a-f' 'a-p')
echo -e "${GREEN}扩展 ID: ${EXT_ID}${NC}"
echo ""

# 安装插件文件
echo -e "${YELLOW}[4/5] 安装插件文件...${NC}"

# 清理旧版本
rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

# 复制文件
cp "${SOURCE_DIR}/manifest.json" "$INSTALL_DIR/"
cp "${SOURCE_DIR}/background.js" "$INSTALL_DIR/"
cp "${SOURCE_DIR}/content.js" "$INSTALL_DIR/"
cp "${SOURCE_DIR}/styles.css" "$INSTALL_DIR/"
cp "${SOURCE_DIR}/popup.html" "$INSTALL_DIR/"
cp "${SOURCE_DIR}/popup.js" "$INSTALL_DIR/"

mkdir -p "${INSTALL_DIR}/icons"
cp "${SOURCE_DIR}/icons/"*.png "${INSTALL_DIR}/icons/" 2>/dev/null || true

# 设置权限
chmod -R 755 "$INSTALL_DIR"
chown -R root:root "$INSTALL_DIR"

echo -e "${GREEN}插件已安装到: ${INSTALL_DIR}${NC}"
echo ""

# 创建组策略配置
echo -e "${YELLOW}[5/5] 配置组策略...${NC}"

mkdir -p "$POLICY_DIR"

cat > "${POLICY_DIR}/${PLUGIN_NAME}.json" << EOF
{
  "ExtensionInstallForcelist": {
    "Value": [
      "${EXT_ID};file://${INSTALL_DIR}/update.xml"
    ],
    "Status": "enabled"
  },
  "ExtensionInstallSources": {
    "Value": [
      "file:///*",
      "http://localhost/*",
      "http://127.0.0.1/*"
    ],
    "Status": "enabled"
  }
}
EOF

# 创建 update.xml
cat > "${INSTALL_DIR}/update.xml" << EOF
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='${EXT_ID}'>
    <updatecheck codebase='file://${INSTALL_DIR}/plugin.crx' version='1.0.0' />
  </app>
</gupdate>
EOF

echo -e "${GREEN}组策略配置完成！${NC}"
echo ""

# 汇总
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  企业部署完成！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "安装信息："
echo -e "  扩展 ID: ${YELLOW}${EXT_ID}${NC}"
echo -e "  安装目录: ${YELLOW}${INSTALL_DIR}${NC}"
echo -e "  策略文件: ${YELLOW}${POLICY_DIR}/${PLUGIN_NAME}.json${NC}"
echo ""
echo "注意事项："
echo "  1. 用户重启浏览器后插件将自动安装"
echo "  2. 插件将显示为'由贵单位管理'"
echo "  3. 用户无法卸载此插件"
echo "  4. 如需更新，替换 ${INSTALL_DIR} 中的文件即可"
echo ""
echo -e "卸载命令：${YELLOW}sudo rm -rf ${INSTALL_DIR} ${POLICY_DIR}/${PLUGIN_NAME}.json${NC}"
echo ""
