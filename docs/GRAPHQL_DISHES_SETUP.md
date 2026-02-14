# 菜品数据连接指南

## 概述
eMenuApp 现已升级为支持从真实数据库获取菜品数据。本指南说明如何配置 GraphQL endpoint 以连接到您恢复的数据库。

## GraphQL 设置

### 1. 环境变量配置

在项目根目录创建 `.env` 文件（如果还没有的话）：

```bash
# .env 文件
REACT_APP_GRAPHQL_ENDPOINT=https://your-graphql-endpoint.com/graphql
```

### 2. 获取 GraphQL Endpoint

根据您的部署方式：

**AWS AppSync 部分：**
```
https://xxxxxxx.appsync-api.ap-southeast-2.amazonaws.com/graphql
```

**自托管 GraphQL Server：**
```
https://your-domain.com/graphql
```

**Lambda + API Gateway：**
```
https://api-id.execute-api.ap-southeast-2.amazonaws.com/stage/graphql
```

### 3. GraphQL 服务配置

文件位置：`src/services/GraphQLService.ts`

该服务会自动：
- 从环境变量读取 endpoint
- 获取 AWS Cognito 认证 token
- 添加到 GraphQL 请求的 Authorization header

## 菜品数据查询

### 获取菜品分类

```typescript
import GraphQLService from '../services/GraphQLService';
import { LIST_DISH_TYPES } from '../graphql/queries';

const response = await GraphQLService.query(LIST_DISH_TYPES);
// 返回: { listDishTypes: [...] }
```

**返回数据结构：**
```typescript
{
  id: string;
  name: string;           // 例如: "Appetizers"
  alias?: string;         // 例如: "starters"
  sortOrder: number;      // 排序顺序
  isActive: boolean;      // 是否激活
  isDeleted: boolean;     // 是否删除
}
```

### 获取菜品列表

```typescript
import GraphQLService from '../services/GraphQLService';
import { LIST_DISHES } from '../graphql/queries';

// 获取所有菜品
const response = await GraphQLService.query(LIST_DISHES);

// 或按分类获取
const response = await GraphQLService.query(LIST_DISHES, {
  dishTypeId: 'category-123'
});
// 返回: { listDishes: [...] }
```

**返回数据结构：**
```typescript
{
  id: string;
  name: string;           // 菜品名称
  price: number;          // 价格（单位：分，例如：2800 = €28.00）
  imageUrl?: string;      // 菜品图片 URL
  description?: string;   // 菜品描述
  sortOrder: number;      // 排序顺序
  isActive: boolean;      // 是否激活
  isDeleted: boolean;     // 是否删除
  dishType: {
    id: string;
    name: string;
    alias?: string;
    sortOrder: number;
  };
}
```

## MenuScreen 数据流

### 流程图

```
MenuScreen 初始化
    ↓
加载菜品分类 (LIST_DISH_TYPES)
    ↓
获取分类列表 → 设置第一个分类为默认选中
    ↓
加载该分类的菜品 (LIST_DISHES)
    ↓
获取菜品列表 → 显示菜品卡片
    ↓
用户交互
├─ 选择菜品 → 添加到购物车
├─ 调整数量 → 更新 Redux state
└─ 选择其他分类 → 重新加载菜品
```

### 源代码位置

- **MenuScreen 组件**：`src/screens/MenuScreen.tsx`
  - 负责加载菜品数据和显示
  - 集成 Redux 购物车管理

- **DishCard 组件**：`src/components/DishCard.tsx`
  - 单个菜品卡片展示
  - 参考 WhatsMenu 设计，包含：
    - 菜品图片
    - 名称和描述
    - 价格
    - 数量控制（+/− 按钮）

- **GraphQL 查询**：`src/graphql/queries.ts`
  - `LIST_DISH_TYPES`：获取分类列表
  - `LIST_DISHES`：获取菜品列表

- **GraphQL 服务**：`src/services/GraphQLService.ts`
  - 处理 GraphQL 请求
  - 自动添加 Cognito 认证 token

## 菜品卡片的 UI 改进

新的 `DishCard` 组件基于 WhatsMenu 设计，提供：

✅ **视觉改进**
- 卡片阴影效果（iOS shadowColor 和 Android elevation）
- 更好的图片容器尺寸（高度为宽度的 65%）
- 响应式布局

✅ **交互改进**
- 长按保留轻微按压效果
- 菜品数量控制（+/− 按钮）
- 添加按钮用于新菜品

✅ **信息展示**
- 菜品图片（支持占位符）
- 菜品名称（2 行截断）
- 菜品描述（如可用，2 行截断）
- 价格和数量控制

## 测试菜品数据加载

### 1. 检查网络连接
```bash
# 测试 GraphQL endpoint 是否可达
curl https://your-graphql-endpoint.com/graphql
```

### 2. 查看浏览器开发者工具
- Network 标签：查看 GraphQL 请求
- Console 标签：查看任何错误日志

### 3. 模拟器日志
```bash
# iOS 模拟器日志
xcrun simctl spawn booted log stream --predicate 'eventMessage contains[cd] "graphql"'
```

## 常见问题

### Q: GraphQL 请求失败，提示 "endpoint not found"
**A:** 检查 `.env` 文件中的 `REACT_APP_GRAPHQL_ENDPOINT` 是否正确，以及该 endpoint 是否真的可访问。

### Q: 菜品数据为空或加载很慢
**A:** 
- 检查数据库是否真的恢复了
- 确认 GraphQL query 返回的数据格式正确
- 考虑添加缓存或分页

### Q: 图片不显示
**A:** 确认：
- 菜品数据中的 `imageUrl` 字段有正确的 URL
- 图片 URL 可以通过网络访问
- 检查浏览器网络标签中的图片加载错误

### Q: 认证失败 (Authorization 错误)
**A:**
- 检查 AWS Cognito 配置是否正确
- 确保用户已登录且有效的 token
- 检查 GraphQL endpoint 是否需要特定的权限

## 下一步

1. **连接真实数据库**
   - 配置 `.env` 文件中的 GraphQL endpoint
   - 测试数据加载

2. **优化性能**
   - 实现菜品分页
   - 添加数据缓存

3. **改进 UX**
   - 添加搜索/过滤功能
   - 实现菜品详情页面
   - 添加收藏功能

4. **生产部署**
   - 测试在物理 iPad 上的数据加载
   - 配置错误处理和重试机制
   - 设置离线模式支持

## 相关文件

| 文件 | 说明 |
|------|------|
| `src/services/GraphQLService.ts` | GraphQL 通信服务 |
| `src/graphql/queries.ts` | GraphQL 查询定义 |
| `src/screens/MenuScreen.tsx` | 菜品显示屏幕 |
| `src/components/DishCard.tsx` | 单个菜品卡片 |
| `src/config/aws-config.ts` | AWS Amplify 配置 |

## 支持

如有问题，请检查：
1. 类型定义是否正确
2. GraphQL 查询是否返回预期数据
3. Redux 状态是否正确更新
4. 网络连接和认证状态
