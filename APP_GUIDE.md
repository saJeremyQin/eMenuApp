# eMenu Waiter App - React Native

React Native应用，用于服务员在餐厅进行订单管理和菜品销售。

## 项目结构

```
src/
├── screens/
│   ├── TableSelectionScreen.tsx      # 选择桌号和分餐信息
│   ├── MenuScreen.tsx                 # 菜单浏览和菜品选择
│   ├── OrderReviewScreen.tsx          # 订单确认和修改
│   └── OrderDetailsScreen.tsx         # 订单详情和管理
├── store/
│   ├── store.ts                       # Redux store配置
│   └── orderSlice.ts                  # 订单状态管理
├── graphql/
│   ├── queries.ts                     # GraphQL查询
│   └── mutations.ts                   # GraphQL Mutations
├── services/
│   └── GraphQLService.ts              # GraphQL客户端
├── navigation/
│   └── OrderNavigator.tsx             # 导航栈配置
└── AppRoot.tsx                        # 应用根组件
```

## 核心功能

### 1. 选择桌号 (TableSelectionScreen)
- 显示常用桌号快捷按钮（1-20号）
- 支持自定义桌号输入
- 选择分餐方式：整桌或分餐（食客1/2/3）
- 确认后进入菜单

### 2. 菜单浏览 (MenuScreen)
- 按菜品分类标签页切换
- 网格显示菜品卡片（2列）
- 显示菜品图片、名称、价格
- 直接在菜单中添加/修改数量
- 底部购物车按钮显示总数和价格

### 3. 订单确认 (OrderReviewScreen)
- 详细显示所有选中的菜品
- 支持修改数量
- 支持添加菜品备注
- 计算合计金额
- 确认送厨调用GraphQL mutation

### 4. 订单详情 (OrderDetailsScreen)
- 按批次(batch)显示菜品
- 显示每个菜品的状态：已确认/待确认/已退菜
- 支持单个菜品退菜（需要输入原因）
- 显示订单统计信息（已确认、已退菜、待支付）
- 支持订单支付

## Redux State 结构

```typescript
OrderState {
  currentOrder: Order | null              // 当前订单
  draftItems: DraftItem[]                 // 未送厨的菜品草稿
  isLoading: boolean                      // 加载状态
  error: string | null                    // 错误消息
  selectedTableNumber: string | null      // 选中的桌号
  selectedDinerId: string                 // 分餐食客号（"0"=整桌）
  selectedTabId: string                   // 分餐标签ID
}
```

## GraphQL Queries

### GET_ORDER
获取订单详情，包括所有批次和菜品

```graphql
query GetOrder($id: ID!) {
  getOrder(id: $id) {
    # ... 订单字段
  }
}
```

### GET_TABLE_STATUS
获取桌台状态，包括该桌所有未支付订单

```graphql
query GetTableStatus($tableNumber: String!) {
  getTableStatus(tableNumber: $tableNumber) {
    # ... 桌台信息
  }
}
```

### LIST_DISHES
查询菜品列表

```graphql
query ListDishes($dishTypeId: ID) {
  listDishes(dishTypeId: $dishTypeId) {
    # ... 菜品字段
  }
}
```

### LIST_DISH_TYPES
获取菜品分类列表

```graphql
query ListDishTypes {
  listDishTypes {
    # ... 分类字段
  }
}
```

## GraphQL Mutations

### CONFIRM_ORDER_ITEMS
送厨，创建或更新订单

```graphql
mutation ConfirmOrderItems($input: ConfirmOrderItemsInput!) {
  confirmOrderItems(input: $input) {
    # ... 返回更新后的订单
  }
}
```

### CANCEL_ORDER_ITEM
取消单个菜品（退菜）

```graphql
mutation CancelOrderItem($orderId: ID!, $itemId: ID!, $reason: String) {
  cancelOrderItem(orderId: $orderId, itemId: $itemId, reason: $reason) {
    # ... 返回更新后的订单
  }
}
```

### PAY_ORDER
支付订单

```graphql
mutation PayOrder($orderId: ID!) {
  payOrder(orderId: $orderId) {
    # ... 返回更新后的订单
  }
}
```

### CANCEL_ORDER
取消整个订单

```graphql
mutation CancelOrder($orderId: ID!) {
  cancelOrder(orderId: $orderId) {
    # ... 返回更新后的订单
  }
}
```

## 样式系统

使用NativeWind (Tailwind CSS for React Native)

### 按钮样式
```tsx
// 蓝色主按钮
className="bg-blue-500 py-4 rounded-lg"

// 灰色辅助按钮
className="border border-gray-300 py-3 rounded-lg"

// 绿色成功按钮
className="bg-green-500 py-4 rounded-lg"
```

### 卡片样式
```tsx
// 白色卡片
className="bg-white rounded-lg p-4 border border-gray-200"

// 灰色背景卡片
className="bg-gray-100 rounded-lg p-4"
```

### 文本样式
```tsx
// 大标题
className="text-2xl font-bold text-gray-900"

// 小文本
className="text-xs text-gray-500"
```

## 环境配置

需要在 `.env` 或 `app.json` 中配置以下环境变量：

```
REACT_APP_GRAPHQL_ENDPOINT=https://your-graphql-endpoint.com/graphql
```

## 安装依赖

```bash
npm install
# 或
yarn install
```

## 运行项目

### Android
```bash
npm run android
```

### iOS
```bash
npm run ios
```

### Metro Bundler
```bash
npm start
```

## 核心工作流

### 完整的订单流程

1. **选择桌号** → TableSelectionScreen
   - 选择桌号和分餐方式
   - 状态保存到Redux

2. **浏览菜单** → MenuScreen
   - 按分类查看菜品
   - 添加菜品到草稿
   - 显示购物车总计

3. **确认订单** → OrderReviewScreen
   - 查看所有选中菜品
   - 修改数量和备注
   - 调用 `confirmOrderItems` mutation 送厨

4. **订单管理** → OrderDetailsScreen
   - 查看按批次显示的菜品
   - 支持单菜退菜
   - 调用 `cancelOrderItem` mutation
   - 调用 `payOrder` mutation 支付

## API集成

### GraphQL Service

所有API调用通过 `GraphQLService.ts` 进行：

```typescript
// 查询
const response = await GraphQLService.query(GET_ORDER, { id: '123' });

// Mutation
const response = await GraphQLService.mutation(CONFIRM_ORDER_ITEMS, {
  input: { ... }
});
```

服务自动处理认证token和请求头。

## 状态管理最佳实践

### 添加菜品
```typescript
dispatch(addDraftItem({
  dishId: '123',
  name: '红烧肉',
  price: 2800,  // 单位：分
  quantity: 1
}));
```

### 更新订单
```typescript
dispatch(setCurrentOrder(orderData));
```

### 清空草稿
```typescript
dispatch(clearDraftItems());
```

## 常见问题

### Q: 如何处理离线状态？
A: 在 GraphQLService 中添加缓存和重试逻辑

### Q: 如何实现实时订单更新？
A: 使用GraphQL subscriptions或定期polling

### Q: 如何支持多语言？
A: 集成i18n库并在所有字符串中使用翻译key

## 下一步改进

- [ ] 添加订单实时更新(WebSocket/Subscriptions)
- [ ] 优化图片加载和缓存
- [ ] 添加离线支持
- [ ] 实现订单历史和统计
- [ ] 添加推送通知集成
- [ ] 支持多种支付方式
- [ ] 订单打印功能
