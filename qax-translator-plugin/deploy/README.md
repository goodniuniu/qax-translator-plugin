# 企业部署方案

本目录包含企业级批量部署插件的方案和脚本。

## 方案对比

| 方案 | 适用场景 | 难度 | 用户权限 |
|------|---------|------|---------|
| 开发者模式安装 | 个人/测试 | 简单 | 普通用户 |
| 命令行启动 | 开发环境 | 简单 | 普通用户 |
| 企业组策略部署 | 大规模部署 | 中等 | 需要 root |

## 方案一：开发者模式安装（推荐个人使用）

最简单的方式，适合个人用户或测试环境。

```bash
# 1. 进入插件目录
cd /path/to/qax-translator-plugin

# 2. 运行打包脚本
./build.sh

# 3. 运行生成的安装脚本
./dist/install.sh
```

## 方案二：命令行启动（开发环境）

适合开发调试，不需要打包。

```bash
# 直接指定插件目录启动浏览器
qaxbrowser --load-extension=/path/to/qax-translator-plugin

# 或添加到桌面快捷方式
cat > ~/Desktop/QAX-Browser-With-Translation.desktop << 'EOF'
[Desktop Entry]
Name=奇安信浏览器(带翻译)
Exec=qaxbrowser --load-extension=/path/to/qax-translator-plugin
Type=Application
Icon=qaxbrowser
Terminal=false
EOF
chmod +x ~/Desktop/QAX-Browser-With-Translation.desktop
```

## 方案三：企业组策略部署（推荐企业使用）

适用于需要在多台机器上批量部署的场景。

### 特点

- ✅ 强制安装，用户无法卸载
- ✅ 集中管理，统一更新
- ✅ 静默安装，无需用户操作
- ✅ 适用于域环境

### 部署步骤

1. **准备部署包**

```bash
cd /path/to/qax-translator-plugin/deploy
sudo ./install-enterprise.sh
```

2. **验证安装**

```bash
# 检查插件文件
ls -la /opt/qax-translator-plugin/

# 检查策略文件
cat /etc/chromium/policies/managed/qax-translator-plugin.json
```

3. **重启浏览器**

用户重启浏览器后，插件将自动安装并显示"由贵单位管理"。

### 批量部署脚本

创建批量部署脚本 `batch-deploy.sh`：

```bash
#!/bin/bash
# 批量部署到多台机器

SERVERS=(
    "user1@192.168.1.101"
    "user2@192.168.1.102"
    "user3@192.168.1.103"
)

for SERVER in "${SERVERS[@]}"; do
    echo "部署到: $SERVER"
    
    # 复制部署脚本
    scp -r qax-translator-plugin/deploy "$SERVER:/tmp/"
    
    # 执行部署
    ssh "$SERVER" "cd /tmp/deploy && sudo ./install-enterprise.sh"
    
    echo "完成: $SERVER"
done
```

### 域环境部署

如果使用 Active Directory 或 LDAP，可以通过组策略推送：

1. 将 `policy.json` 内容导入域控的组策略管理器
2. 将插件文件复制到网络共享目录
3. 配置客户端通过 UNC 路径加载插件

## 更新插件

### 个人用户

重新运行安装脚本，选择覆盖安装。

### 企业用户

```bash
# 1. 停止浏览器服务（可选）
sudo pkill -f qaxbrowser

# 2. 更新文件
sudo cp -r new-version/* /opt/qax-translator-plugin/

# 3. 重启浏览器
# 插件将自动更新
```

## 卸载方法

### 个人卸载

```bash
cd /path/to/qax-translator-plugin
./uninstall.sh
```

### 企业卸载

```bash
# 删除插件文件
sudo rm -rf /opt/qax-translator-plugin

# 删除策略配置
sudo rm -f /etc/chromium/policies/managed/qax-translator-plugin.json

# 重启浏览器
```

## 故障排除

### 插件未自动安装

1. 检查策略文件是否存在：
   ```bash
   ls -la /etc/chromium/policies/managed/
   ```

2. 检查插件目录权限：
   ```bash
   ls -la /opt/qax-translator-plugin/
   ```

3. 查看浏览器策略页面：
   - 地址栏输入：`chrome://policy/`
   - 确认策略已加载

### 策略加载失败

1. 检查 JSON 语法：
   ```bash
   cat /etc/chromium/policies/managed/qax-translator-plugin.json | python3 -m json.tool
   ```

2. 检查文件权限：
   ```bash
   sudo chmod 644 /etc/chromium/policies/managed/qax-translator-plugin.json
   ```

## 联系支持

如有部署问题，请联系系统管理员或技术支持团队。
