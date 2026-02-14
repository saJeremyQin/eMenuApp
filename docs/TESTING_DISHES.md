# 菜品数据加载测试指南

## 快速开始

### 第 1 步：配置 GraphQL Endpoint

创建 `.env` 文件在项目根目录：

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置 GraphQL endpoint：

```
REACT_APP_GRAPHQL_ENDPOINT=https://your-backend.com/graphql
```

### 第 2 步：启动 Metro Bundler

```bash
npm start -- --reset-cache
```

### 第 3 步：启动 iOS 模拟器

在新的终端窗口：

```bash
npm run ios
```

## 测试菜品加载流程

### 预期行为

1. **应用启动**
   - 应看到登录屏幕（Waiter / Demo 选项）

2. **登录**
   - 选择 Demo（快速登录，无需输入密码）
   - 或选择 Waiter 并输入凭证

3. **表格选择**
   - 应看到 24 个表格的网格（4 列 × 6 行）
   - 点击任何表格应导航到 MenuScreen

4. **菜品加载**
   - MenuScreen 应加载菜品分类
   - 左侧面板应显示菜品分类标签
   - 菜品网格应显示分类中的菜品卡片

5. **菜品卡片**
   - 每张卡片应显示：
     - 菜品图片（或占位符 📷）
     - 菜品名称
     - 菜品描述（如有）
     - 价格（€ 格式）
     - 数量控制（+ 按钮或 +/− 控制）

6. **交互**
   - 点击菜品卡片 → 数量增加（显示 +/− 控制）
   - 点击 + 按钮 → 数量增加
   - 点击 − 按钮 → 数量减少
   - 数量为 0 时 → 显示 + 按钮（用于添加）

### 调试步骤

如果菜品未显示：

#### 1. 检查 GraphQL Endpoint

打开浏览器开发者工具，在应用中查看 Network 标签：

```text
预期请求：
- 请求 URL：https://your-backend.com/graphql
- 请求方法：POST
- Headers：Authorization: Bearer <cognito-token>
- Body：{
    "operationName": "ListDishTypes",
    "query": "query ListDishTypes { ... }",
    "variables": {}
  }
```

#### 2. 查看控制台日志

检查应该显示的日志：

```text
✅ 成功：
"Loaded dish types: 5"
"Loaded dishes: 24"

❌ 失败：
"Failed to load dish types: <error>"
"Failed to load dishes: <error>"
```

#### 3. 检查数据库连接

确认：
- 数据库已恢复并在运行
- GraphQL endpoint 已启动
- 菜品分类和菜品数据存在于数据库

#### 4. 验证 AWS Amplify 认证

确认：
- 用户已成功认证
- Cognito token 有效
- GraphQL endpoint 允许该用户访问

### 常见问题排查

#### 问题：菜品卡片不显示，但没有错误

**解决方案：**
1. 检查 GraphQL 查询是否返回数据
2. 在 Redux DevTools (如已安装) 中检查 order 状态
3. 检查菜品数据是否按预期转换

#### 问题：菜品图片加载失败

**解决方案：**
1. 检查 `imageUrl` 字段是否有效 URL
2. 验证图片 URL 对公众可访问
3. 检查网络连接是否允许图片加载
4. 考虑配置图片代理或 CDN

#### 问题：价格显示不正确

**解决方案：**
1. 确认价格单位是否为分（centavos）
   - €28.00 应存储为 2800
2. 检查转换公式：€ = price / 100

#### 问题：分类标签不显示

**解决方案：**
1. 检查 `LIST_DISH_TYPES` 查询是否返回数据
2. 确认至少有一个分类标记为 `isActive: true` 且 `isDeleted: false`
3. 验证菜品是否关联到正确的分类

## 手动测试场景

### 场景 1：验证菜品分类加载

预期：
1. MenuScreen 加载
2. 左侧面板的分类标签出现
3. 第一个分类自动选中（有下划线）

### 场景 2：验证菜品加载

预期：
1. 分类选中后，菜品网格填充
2. 菜品卡片以 2-4 列网格显示（取决于屏幕尺寸）
3. 每张卡片展示菜品信息

### 场景 3：验证购物车更新

预期：
1. 点击菜品 → 购物车中添加该菜品
2. 右侧面板显示"Order Summary"更新
3. 总项数和总价更新

### 场景 4：验证数量控制

预期：
1. 首次点击菜品 → 卡片显示 +/− 按钮
2. 点击 + → 数量增加
3. 点击 − → 数量减少
4. 数量为 0 → 卡片显示 + 按钮

### 场景 5：验证分类切换

预期：
1. 点击其他分类标签
2. 菜品网格更新以显示新分类的菜品
3. 之前选中的菜品仍在购物车中

## 性能测试

### 大数据集测试

如果有 100+ 菜品：

1. 检查滚动是否流畅
2. 验证 FlatList 优化是否有效
3. 监控应用内存使用

### 网络性能测试

模拟慢速网络：

1. 打开 DevTools Network 标签
2. 选择"Slow 3G"或"Fast 3G"
3. 观察数据加载时间和用户体验

## 提交前检查清单

- [ ] `.env` 文件已创建并配置正确的 GraphQL endpoint
- [ ] 菜品分类显示在 MenuScreen 中
- [ ] 菜品卡片显示菜品信息（名称、价格、图片）
- [ ] 可以添加菜品到购物车
- [ ] 可以调整菜品数量
- [ ] 购物车总数和总价更新正确
- [ ] 没有 TypeScript 或运行时错误
- [ ] 应用在 iPad 上正常运行（横屏模式）

## 相关文件

- 配置：[.env.example](.env.example)
- 模块：[GRAPHQL_DISHES_SETUP.md](GRAPHQL_DISHES_SETUP.md)
- 代码：
  - MenuScreen：`src/screens/MenuScreen.tsx`
  - DishCard：`src/components/DishCard.tsx`
  - GraphQL 服务：`src/services/GraphQLService.ts`
  - 查询定义：`src/graphql/queries.ts`
