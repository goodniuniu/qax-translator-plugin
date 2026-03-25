# QAX 智能划词翻译插件 - 快速入门

## 📋 两种角色，两种流程

### 角色1：开发者/管理员（准备安装包）

**环境要求**：可联网的开发环境

```bash
# 进入源码目录
cd qax-translator-plugin

# 构建安装包（自动生成图标 + 打包）
./build.sh

# 分发 dist/ 目录给最终用户
cp -r dist /path/to/distribute/
```

---

### 角色2：最终用户（安装使用）

**环境要求**：内网环境，无需联网，无需额外软件

```bash
# 进入收到的 dist 目录
cd dist

# 一键安装
./install.sh

# 按提示在浏览器中加载插件
```

**或手动加载**：
```bash
# 解压
tar -xzf qax-translator-plugin-v*.tar.gz -C qax-translator-plugin/

# 浏览器 → chrome://extensions/ → 开启开发者模式 → 加载已解压的扩展程序
```

---

## ⚙️ 配置插件

1. 点击浏览器工具栏的 🌐 图标
2. 设置 API 地址：`http://10.3.4.21:8000/v1`
3. 点击「测试连接」→「保存设置」

---

## 📝 使用方法

- **划词翻译**：选中任意文本，自动弹出翻译窗口
- **复制译文**：点击「复制译文」按钮
- **关闭弹窗**：点击页面任意位置或按 ESC

---

## 📚 更多文档

| 文档 | 内容 |
|------|------|
| [README.md](README.md) | 完整功能说明 |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | 详细的部署流程 |
| [BUILD_GUIDE.md](BUILD_GUIDE.md) | 构建详细指南 |
| [deploy/README.md](deploy/README.md) | 企业部署方案 |
