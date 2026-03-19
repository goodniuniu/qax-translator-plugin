@echo off
REM QAX 智能划词翻译插件 - Windows 打包构建脚本
REM 在开发环境（可联网）运行，生成完整安装包
REM 用户环境（内网）无需额外软件即可安装

chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

REM 配置
set PLUGIN_NAME=qax-translator-plugin
set BUILD_DIR=build
set DIST_DIR=dist
set ICONS_DIR=icons

echo ========================================
echo   QAX 智能划词翻译插件 - 构建脚本
echo ========================================
echo.

REM 读取版本号（使用 PowerShell）
for /f "usebackq delims=" %%i in (`powershell -Command "(Get-Content manifest.json | ConvertFrom-Json).version"`) do set VERSION=%%i

echo 版本: v%VERSION%
echo.

REM ============================================================
REM 第1步：检查图标文件
REM ============================================================
echo [1/5] 检查图标文件...

set ICON_MISSING=0
if not exist "%ICONS_DIR%\icon16.png" set ICON_MISSING=1
if not exist "%ICONS_DIR%\icon32.png" set ICON_MISSING=1
if not exist "%ICONS_DIR%\icon48.png" set ICON_MISSING=1
if not exist "%ICONS_DIR%\icon128.png" set ICON_MISSING=1

if %ICON_MISSING%==1 (
    echo 警告：缺少 PNG 图标文件
    echo 请确保以下文件存在：
    echo   - icons\icon16.png
    echo   - icons\icon32.png
    echo   - icons\icon48.png
    echo   - icons\icon128.png
    echo.
    echo 提示：可以使用在线工具将 SVG 转换为 PNG
    echo   https://cloudconvert.com/svg-to-png
    echo.
    pause
    exit /b 1
) else (
    echo 图标文件检查通过！
)
echo.

REM ============================================================
REM 第2步：检查必要文件
REM ============================================================
echo [2/5] 检查必要文件...

set MISSING_FILES=0
if not exist "manifest.json" (
    echo   [X] 缺少 manifest.json
    set MISSING_FILES=1
) else (
    echo   [√] manifest.json
)

if not exist "background.js" (
    echo   [X] 缺少 background.js
    set MISSING_FILES=1
) else (
    echo   [√] background.js
)

if not exist "content.js" (
    echo   [X] 缺少 content.js
    set MISSING_FILES=1
) else (
    echo   [√] content.js
)

if not exist "styles.css" (
    echo   [X] 缺少 styles.css
    set MISSING_FILES=1
) else (
    echo   [√] styles.css
)

if not exist "popup.html" (
    echo   [X] 缺少 popup.html
    set MISSING_FILES=1
) else (
    echo   [√] popup.html
)

if not exist "popup.js" (
    echo   [X] 缺少 popup.js
    set MISSING_FILES=1
) else (
    echo   [√] popup.js
)

if not exist "diagnose.html" (
    echo   [X] 缺少 diagnose.html
    set MISSING_FILES=1
) else (
    echo   [√] diagnose.html
)

if not exist "diagnose.js" (
    echo   [X] 缺少 diagnose.js
    set MISSING_FILES=1
) else (
    echo   [√] diagnose.js
)

if %MISSING_FILES%==1 (
    echo.
    echo 错误：缺少必要文件，请检查！
    pause
    exit /b 1
)

echo 文件检查通过！
echo.

REM ============================================================
REM 第3步：清理并准备构建目录
REM ============================================================
echo [3/5] 准备构建目录...

if exist "%BUILD_DIR%" rmdir /s /q "%BUILD_DIR%"
if exist "%DIST_DIR%" rmdir /s /q "%DIST_DIR%"

mkdir "%BUILD_DIR%"
mkdir "%DIST_DIR%"

REM 复制核心文件
copy /y "manifest.json" "%BUILD_DIR%\" >nul
copy /y "background.js" "%BUILD_DIR%\" >nul
copy /y "content.js" "%BUILD_DIR%\" >nul
copy /y "styles.css" "%BUILD_DIR%\" >nul
copy /y "popup.html" "%BUILD_DIR%\" >nul
copy /y "popup.js" "%BUILD_DIR%\" >nul
copy /y "diagnose.html" "%BUILD_DIR%\" >nul
copy /y "diagnose.js" "%BUILD_DIR%\" >nul

REM 复制图标
mkdir "%BUILD_DIR%\icons"
copy /y "%ICONS_DIR%\icon16.png" "%BUILD_DIR%\icons\" >nul
copy /y "%ICONS_DIR%\icon32.png" "%BUILD_DIR%\icons\" >nul
copy /y "%ICONS_DIR%\icon48.png" "%BUILD_DIR%\icons\" >nul
copy /y "%ICONS_DIR%\icon128.png" "%BUILD_DIR%\icons\" >nul
if exist "%ICONS_DIR%\icon.svg" copy /y "%ICONS_DIR%\icon.svg" "%BUILD_DIR%\icons\" >nul

echo 构建目录准备完成！
echo.

REM ============================================================
REM 第4步：生成安装包
REM ============================================================
echo [4/5] 生成安装包...

REM 使用 PowerShell 创建 ZIP 文件
powershell -Command "Compress-Archive -Path '%BUILD_DIR%\*' -DestinationPath '%DIST_DIR%\%PLUGIN_NAME%-v%VERSION%.zip' -Force"

echo 安装包生成完成！
echo.

REM ============================================================
REM 第5步：生成安装说明
REM ============================================================
echo [5/5] 生成安装说明...

(
echo ============================================================
echo   QAX 智能划词翻译插件 - 安装说明 ^(Windows^)
echo ============================================================
echo.
echo 📦 文件说明
echo -----------
echo • qax-translator-plugin-v*.zip  插件安装包（包含所有必需文件^)
echo • 安装说明.txt                   本文件
echo.
echo 🚀 快速安装
echo -----------
echo 1. 解压安装包：
echo    • 右键点击 qax-translator-plugin-v*.zip
echo    • 选择"解压到当前文件夹"或"解压到..."
echo    • 解压后会生成 qax-translator-plugin 文件夹
echo.
echo 2. 浏览器加载：
echo    • 打开谷歌浏览器
echo    • 地址栏输入: chrome://extensions/
echo    • 开启右上角「开发者模式」开关
echo    • 点击「加载已解压的扩展程序」
echo    • 选择解压后的 qax-translator-plugin 文件夹
echo.
echo ⚙️ 配置插件
echo -----------
echo 1. 点击浏览器工具栏的插件图标（地球图标^)
echo 2. 设置 API 地址: http://10.3.4.21:8000/v1
echo 3. 模型名称: Qwen/Qwen3.5-122B-A10B（或留空自动获取^)
echo 4. 点击「测试连接」验证
echo 5. 点击「保存设置」
echo.
echo 📝 使用方法
echo -----------
echo • 划词翻译：选中任意文本，自动弹出翻译窗口
echo • 复制译文：点击「复制译文」按钮
echo • 关闭弹窗：点击页面任意位置
echo.
echo ❓ 常见问题
echo -----------
echo Q: 插件无法加载？
echo A: 确认已开启「开发者模式」，检查是否选择了正确的文件夹
echo.
echo Q: 接口连接失败？
echo A: 检查网络是否可以访问 10.3.4.21:8000
echo.
echo Q: 如何卸载？
echo A: 访问 chrome://extensions/，点击插件卡片的「删除」按钮
echo.
echo ============================================================
) > "%DIST_DIR%\安装说明.txt"

echo 安装说明生成完成！
echo.

REM ============================================================
REM 构建完成汇总
REM ============================================================
echo ========================================
echo   ✅ 构建完成！
echo ========================================
echo.
echo 版本：v%VERSION%
echo 输出目录：%DIST_DIR%\
echo.
echo 生成的文件：
dir /b "%DIST_DIR%"
echo.
echo [分发方式]
echo.
echo   方式1：复制整个目录
echo     xcopy /s /i /e "%DIST_DIR%" 目标路径
echo.
echo   方式2：复制 ZIP 文件
echo     复制 %PLUGIN_NAME%-v%VERSION%.zip 到目标电脑
echo.
echo [用户安装方式]
echo     1. 解压 ZIP 文件
echo     2. 打开 chrome://extensions/
echo     3. 开启"开发者模式"
echo     4. 点击"加载已解压的扩展程序"
echo     5. 选择解压后的文件夹
echo.
echo ========================================
echo.
pause
