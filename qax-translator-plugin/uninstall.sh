#!/bin/bash

# QAX 智能划词翻译插件 - 卸载脚本

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  QAX 智能划词翻译插件 - 卸载${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 查找插件安装位置
echo -e "${YELLOW}正在查找插件安装位置...${NC}"

FOUND=0

# 检查用户数据目录
USER_DATA_DIRS=(
    "$HOME/.config/qaxbrowser"
    "$HOME/.config/google-chrome"
    "$HOME/.config/chromium"
    "$HOME/.config/microsoft-edge"
)

for DIR in "${USER_DATA_DIRS[@]}"; do
    if [ -d "$DIR" ]; then
        EXT_DIR="${DIR}/Default/Extensions"
        if [ -d "$EXT_DIR" ]; then
            # 查找我们的插件（通过 ID 或内容）
            FOUND_DIRS=$(find "$EXT_DIR" -name "manifest.json" -exec grep -l "QAX 智能划词翻译" {} \; 2>/dev/null | head -5)
            if [ -n "$FOUND_DIRS" ]; then
                echo -e "${GREEN}找到插件安装位置：${NC}"
                for MANIFEST in $FOUND_DIRS; do
                    PLUGIN_DIR=$(dirname "$MANIFEST")
                    echo "  - $PLUGIN_DIR"
                    FOUND=$((FOUND + 1))
                done
            fi
        fi
    fi
done

# 检查系统级安装
SYSTEM_DIRS=(
    "/usr/share/qax-translator-plugin"
    "/opt/qax-translator-plugin"
)

for DIR in "${SYSTEM_DIRS[@]}"; do
    if [ -d "$DIR" ]; then
        echo -e "${GREEN}找到系统级安装：${NC} $DIR"
        FOUND=$((FOUND + 1))
    fi
done

# 检查外部扩展配置
EXT_CONFIG_DIRS=(
    "/usr/share/chromium/extensions"
    "/etc/chromium/policies/managed"
)

echo ""

if [ $FOUND -eq 0 ]; then
    echo -e "${YELLOW}未找到已安装的插件${NC}"
    echo ""
    read -p "是否删除当前目录的插件文件？[y/N]: " CONFIRM
    if [[ $CONFIRM =~ ^[Yy]$ ]]; then
        rm -rf build dist
        echo -e "${GREEN}插件文件已清理${NC}"
    fi
    exit 0
fi

echo ""
read -p "是否卸载以上所有插件？[y/N]: " CONFIRM

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}已取消卸载${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}开始卸载...${NC}"

# 删除用户数据目录中的插件
for DIR in "${USER_DATA_DIRS[@]}"; do
    if [ -d "$DIR" ]; then
        EXT_DIR="${DIR}/Default/Extensions"
        if [ -d "$EXT_DIR" ]; then
            FOUND_DIRS=$(find "$EXT_DIR" -name "manifest.json" -exec grep -l "QAX 智能划词翻译" {} \; 2>/dev/null)
            for MANIFEST in $FOUND_DIRS; do
                PLUGIN_DIR=$(dirname "$MANIFEST")
                echo "删除: $PLUGIN_DIR"
                rm -rf "$PLUGIN_DIR"
            done
        fi
    fi
done

# 删除系统级安装
for DIR in "${SYSTEM_DIRS[@]}"; do
    if [ -d "$DIR" ]; then
        echo "删除系统目录: $DIR"
        if [ -w "$DIR" ]; then
            rm -rf "$DIR"
        else
            sudo rm -rf "$DIR"
        fi
    fi
done

# 删除外部扩展配置
for DIR in "${EXT_CONFIG_DIRS[@]}"; do
    if [ -d "$DIR" ]; then
        # 删除相关的 JSON 配置文件
        for FILE in "$DIR"/*; do
            if [ -f "$FILE" ] && grep -q "qax-translator" "$FILE" 2>/dev/null; then
                echo "删除配置: $FILE"
                if [ -w "$FILE" ]; then
                    rm -f "$FILE"
                else
                    sudo rm -f "$FILE"
                fi
            fi
        done
    fi
done

echo ""
echo -e "${GREEN}卸载完成！${NC}"
echo ""
echo -e "请重启浏览器以完全生效。"
echo ""
