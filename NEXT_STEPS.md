# 🚀 现在该做什么？

## 菜品数据集成 - 快速行动指南

您的 eMenuApp 已准备好连接真实的菜品数据！以下是快速行动步骤。

---

## 第一步：获取 GraphQL Endpoint

您需要从后端获取 GraphQL endpoint URL。这通常是您早前部署的后端服务地址。

**可能的格式：**
- AWS AppSync: `https://xxxxxx.appsync-api.ap-southeast-2.amazonaws.com/graphql`
- 自托管: `https://api.yourcompany.com/graphql`
- Lambda+APIGateway: `https://abcdef.execute-api.ap-southeast-2.amazonaws.com/prod/graphql`

**获取方式：**
1. 查看您的后端部署文档
2. 查看 eMenu-backend 项目的部署输出
3. 或在您的数据库/服务器管理面板中查找

---

## 第二步：配置 GraphQL Endpoint

### 方式 1：快速配置（推荐）

```bash
# 进入项目目录
cd /Users/nicolezhang/Desktop/eMenu/eMenuApp

# 复制环境变量配置文件
cp .env.example .env

# 编辑 .env 文件，设置实际的 endpoint
# 打开 .env 并将以下内容
# REACT_APP_GRAPHQL_ENDPOINT=https://your-graphql-endpoint.com/graphql
# 改为实际的 endpoint
```

### 方式 2：直接创建 .env

```bash
echo "REACT_APP_GRAPHQL_ENDPOINT=https://your-actual-endpoint-here.com/graphql" > .env
```

---

## 第三步：测试连接

运行连接测试脚本：

```bash
bash test-graphql-connection.sh
```

**预期输出：**
- ✅ 找到 GraphQL endpoint
- ✅ 网络连接正常
- ✅ GraphQL 查询成功

---

## 第四步：启动应用

### 终端 1：启动 Metro Bundler

```bash
npm start -- --reset-cache
```

等待看到：
```
Metro Bundler ready.
```

### 终端 2：启动 iOS 模拟器

```bash
npm run ios
```

等待应用启动并显示登录屏幕。

---

## 第五步：测试菜品加载

### 登录

1. 选择 **Demo** 选项（快速登录，无需密码）
2. 或输入 Waiter 凭证

### 导航到菜品

1. 看到 **Table Selection** 屏幕（24 个表格）
2. 点击任一表格
3. 进入 **MenuScreen**

### 验证菜品显示

应该看到：
- ✅ 左侧面板显示菜品分类标签
- ✅ 菜品网格显示菜品卡片
- ✅ 每张卡片显示：
  - 菜品图片（或占位符 📷）
  - 菜品名称
  - 菜品描述（如有）
  - 价格（€ 格式）
  - + 按钮

### 测试交互

1. **添加菜品**：点击任一菜品卡片 → 数量变为 1，+ 按钮变成 +/− 控制
2. **增加数量**：点击 + 按钮 → 数量递增
3. **减少数量**：点击 − 按钮 → 数量递减（数量为 0 时显示 + 按钮）
4. **查看购物车**：右侧面板显示选中的菜品和总数
5. **切换分类**：点击不同的分类标签 → 菜品网格更新

---

## 如果出现问题？

### 问题：菜品不显示

**检查清单：**
1. ✓ .env 文件是否存在且有正确的 endpoint
2. ✓ GraphQL endpoint 是否可访问（运行连接测试脚本）
3. ✓ 数据库是否有菜品数据
4. ✓ 查看浏览器 DevTools Network 标签中的 GraphQL 请求
5. ✓ 检查浏览器 Console 中的错误日志

### 问题：菜品图片加载失败

1. 检查菜品数据中的 `imageUrl` 是否有效
2. 验证图片 URL 是否可公开访问
3. 检查网络连接

### 问题：价格显示不对

1. 确认价格单位是否为**分**（centavos）
   - €28.00 应存储为 **2800**
2. 查看 MenuScreen 中的价格转换公式

---

## 文档参考

| 文档 | 说明 |
|------|------|
| 📋 [GRAPHQL_DISHES_SETUP.md](./docs/GRAPHQL_DISHES_SETUP.md) | 详细的 GraphQL 集成指南 |
| 🧪 [TESTING_DISHES.md](./docs/TESTING_DISHES.md) | 菜品测试和调试指南 |
| 📝 [DISHES_INTEGRATION_SUMMARY.md](./docs/DISHES_INTEGRATION_SUMMARY.md) | 完整的功能总结 |
| 🔧 [test-graphql-connection.sh](./test-graphql-connection.sh) | GraphQL 连接测试脚本 |

---

## 改进概览

✨ **您的应用现在拥有：**

- 🏪 从真实数据库加载菜品
- 📊 按分类组织的菜品显示
- 🎨 基于 WhatsMenu 设计的现代卡片 UI
- 🛒 完整的购物车集成
- 📱 响应式横屏布局（iPad 优化）
- 🔐 AWS Cognito 认证支持
- ✅ 零 TypeScript 错误

---

## 下一步建议

### 立即做（今天）
1. ✓ 获取 GraphQL endpoint URL
2. ✓ 配置 .env 文件
3. ✓ 运行连接测试脚本
4. ✓ 启动应用并验证菜品显示

### 稍后做（本周）
1. 在物理 iPad 上测试应用
2. 优化菜品加载性能（如有大量菜品）
3. 优化图片加载和缓存
4. 测试完整的订单流程

### 后续改进（本月）
1. 添加搜索/过滤功能
2. 实现菜品收藏功能
3. 添加菜品详情页面
4. 优化错误处理和用户反馈

---

## 支持联系

如果遇到问题：

1. 查看相关文档
2. 检查浏览器 Console 和 DevTools
3. 运行测试脚本诊断问题
4. 检查 GraphQL 端点日志

---

## 快速命令参考

```bash
# 测试 GraphQL 连接
bash test-graphql-connection.sh

# 启动开发服务器
npm start -- --reset-cache

# 启动 iOS 模拟器
npm run ios

# TypeScript 类型检查
npx tsc --noEmit

# 查看 React Navigation 日志
# 添加到 AppNavigator.tsx 顶部：
// import { NavigationContainer } from '@react-navigation/native';
// const routeNameRef = React.useRef();
// logging={linking => {console.log(linking);}}
```

---

## 成功后的样子

✅ 应用启动
✅ 登录成功
✅ 看到 24 个餐桌
✅ 点击表格进入菜单
✅ 菜品分类和菜品卡片显示
✅ 可以添加菜品到购物车
✅ 菜品总数和总价实时更新
✅ 无任何错误或警告

---

**现在就开始吧！** 🚀

在终端运行：
```bash
cd /Users/nicolezhang/Desktop/eMenu/eMenuApp
bash test-graphql-connection.sh
```

然后按照提示配置和启动应用。
