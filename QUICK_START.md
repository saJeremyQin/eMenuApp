# React Native eMenu Waiter App - 快速开始指南

## 📱 应用概述

这是一个React Native应用，专为餐厅服务员设计，用于实时订单管理和菜品销售。

**核心功能:**
- ✅ 选择桌号和分餐方式
- ✅ 浏览菜单并实时选菜
- ✅ 订单确认和修改
- ✅ 订单管理和退菜
- ✅ 支付管理

## 🏗️ 架构设计

### 屏幕流程

```
TableSelectionScreen 
    ↓
MenuScreen (菜单浏览和选菜)
    ↓
OrderReviewScreen (订单确认)
    ↓
OrderDetailsScreen (订单管理)
```

### 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React Native | 0.82.1 | 跨平台应用框架 |
| Redux Toolkit | 2.0.1 | 状态管理 |
| GraphQL Request | 7.3.4 | GraphQL客户端 |
| React Navigation | 7.x | 应用导航 |
| NativeWind | 2.0.11 | Tailwind CSS样式 |
| TypeScript | 5.8.3 | 类型安全 |

## 📦 项目结构详解

```
src/
├── screens/                          # 所有应用屏幕
│   ├── TableSelectionScreen.tsx      # 1. 选择桌号（分餐/整桌）
│   ├── MenuScreen.tsx                # 2. 菜单浏览和选菜
│   ├── OrderReviewScreen.tsx         # 3. 订单审核和确认
│   └── OrderDetailsScreen.tsx        # 4. 订单详情和管理
│
├── store/                            # Redux状态管理
│   ├── store.ts                      # Store配置
│   └── orderSlice.ts                 # 订单状态切片
│
├── graphql/                          # GraphQL操作
│   ├── queries.ts                    # 所有查询(GET_ORDER, LIST_DISHES等)
│   └── mutations.ts                  # 所有变更(CONFIRM_ORDER, PAY_ORDER等)
│
├── services/                         # 服务层
│   └── GraphQLService.ts             # GraphQL客户端包装
│
├── hooks/                            # 自定义React hooks
│   └── useOrder.ts                   # 订单操作hooks
│
├── navigation/                       # 导航配置
│   └── OrderNavigator.tsx            # 堆栈导航器
│
└── AppRoot.tsx                       # 应用根组件(Redux + Navigation)
```

## 🔄 数据流

### 1. Redux Store 结构

```typescript
Order State = {
  currentOrder: Order | null              // 当前正在编辑的订单
  draftItems: DraftItem[]                 // 还未送厨的菜品
  isLoading: boolean                      // 加载状态
  error: string | null                    // 错误消息
  selectedTableNumber: string | null      // 已选桌号
  selectedDinerId: string                 // 分餐食客编号
  selectedTabId: string                   // 对应的tab ID
}
```

### 2. 订单对象结构

```typescript
Order = {
  id: string                              // 订单ID
  restaurantId: string                    // 餐厅ID
  waiterId: string                        // 服务员ID
  tableNumber: string                     // 桌号
  dinerId: string                         // "0"=整桌, "1"/"2"...=分餐食客
  tabId: string                           // "tab-0", "tab-1"...
  
  batches: OrderBatch[]                   // 多个送厨批次
  totalConfirmedAmount: number            // 已确认的总金额(分)
  status: 'PENDING' | 'PAID' | 'CANCELLED'
  
  paidAmount?: number                     // 已支付金额
  paidAt?: string                         // 支付时间
  isFromCustomerScan: boolean             // 是否来自顾客自助
}

OrderBatch = {
  batchId: string                         // 批次ID(唯一)
  items: OrderItem[]                      // 该批次的菜品
  confirmedAt: string                     // 送厨时间
}

OrderItem = {
  itemId: string                          // 菜品项ID(唯一)
  dishId: string                          // 菜品ID
  name: string                            // 菜品名称
  price: number                           // 菜品价格(分)
  quantity: number                        // 数量
  notes?: string                          // 备注
  status: 'ORDERED' | 'CONFIRMED' | 'CANCELLED'
  confirmedAt?: string                    // 确认时间
  cancelledAt?: string                    // 取消时间
  cancelReason?: string                   // 取消原因
}
```

## 🎯 完整工作流

### 流程 1: 创建新订单

```
用户进入 TableSelectionScreen
  ↓
选择桌号(如"5号桌") + 分餐方式(如"整桌")
  ↓ dispatch(setSelectedTable("5"), setDinerInfo({dinerId:"0", tabId:"tab-0"}))
MenuScreen加载
  ↓
浏览菜单, 选择菜品
  ↓ dispatch(addDraftItem({dishId, name, price, quantity:1}))
草稿中显示选中的菜品
  ↓
点击"确认订单" → OrderReviewScreen
  ↓
确认数量和备注后点击"确认送厨"
  ↓ GraphQL: CONFIRM_ORDER_ITEMS mutation
后端创建Order, 生成第一个Batch
  ↓ dispatch(setCurrentOrder(order), clearDraftItems())
订单保存到Redux, 清空草稿
  ↓
弹出成功提示, 可选择返回菜单继续选菜或查看订单详情
```

### 流程 2: 加菜

```
MenuScreen 已有已确认订单(currentOrder存在)
  ↓
用户继续选菜, 选择新的菜品
  ↓ dispatch(addDraftItem(...))
新菜品加入草稿
  ↓
点击"确认订单" → OrderReviewScreen
  ↓
点击"确认送厨"
  ↓ GraphQL: CONFIRM_ORDER_ITEMS mutation
后端在同一Order中添加新的Batch
  ↓ dispatch(addBatchToOrder(newBatch))
新Batch添加到currentOrder
  ↓
OrderDetailsScreen显示2个Batch(第一批+第二批)
```

### 流程 3: 退菜

```
OrderDetailsScreen 查看订单
  ↓
点击某个菜品右下的"退菜" → Alert要求输入退菜原因
  ↓ 用户输入原因(如"不想要"、"做错了"等)
  ↓ GraphQL: CANCEL_ORDER_ITEM mutation
后端标记item为CANCELLED, 自动删除空batch
  ↓ dispatch(updateItemStatus({itemId, status:'CANCELLED', cancelReason}))
Redux更新该item状态
  ↓
OrderDetailsScreen中该菜品变灰色显示,　显示"已退菜"
```

### 流程 4: 支付

```
OrderDetailsScreen 查看订单
  ↓
订单状态为'PENDING', 底部显示"支付¥XX.XX"按钮
  ↓
用户点击支付按钮
  ↓ Alert确认金额
  ↓ GraphQL: PAY_ORDER mutation
后端标记order为PAID, 记录paidAt
  ↓ dispatch(updateOrderStatus('PAID'))
Redux更新订单状态
  ↓
OrderDetailsScreen标题栏变绿色显示"已支付"
支付按钮消失
```

## 🚀 快速开发

### 安装依赖

```bash
cd /Users/nicolezhang/Desktop/eMenu/eMenuApp

# 安装npm包
npm install

# 如果需要清理
npm ci
```

### 运行应用

#### iOS 开发

```bash
# 第一次
npm run ios

# 后续可以直接运行 Xcode
open ios/eMenuApp.xcworkspace

# 或使用 react-native CLI
npx react-native run-ios
```

#### Android 开发

```bash
# 确保有Android SDK配置
npm run android
```

#### Metro Bundler (调试)

```bash
# 启动Metro包裹工具
npm start

# 然后在iOS/Android模拟器中按照提示运行
```

## 🔌 API 集成

### 配置 GraphQL 端点

在 `.env` 文件或 `AppRoot.tsx` 中配置:

```
REACT_APP_GRAPHQL_ENDPOINT=https://your-api-endpoint.com/graphql
```

### 常用GraphQL操作

#### 1. 查询菜品

```typescript
import { LIST_DISHES, LIST_DISH_TYPES } from '../graphql/queries';
import GraphQLService from '../services/GraphQLService';

// 获取分类
const response = await GraphQLService.query(LIST_DISH_TYPES);
const dishTypes = response.listDishTypes;

// 获取菜品
const response = await GraphQLService.query(LIST_DISHES, { 
  dishTypeId: selectedTypeId 
});
const dishes = response.listDishes;
```

#### 2. 送厨

```typescript
import { CONFIRM_ORDER_ITEMS } from '../graphql/mutations';
import GraphQLService from '../services/GraphQLService';

const response = await GraphQLService.mutation(CONFIRM_ORDER_ITEMS, {
  input: {
    tableNumber: "5",
    dinerId: "0",
    tabId: "tab-0",
    items: [
      { dishId: "123", quantity: 2, notes: "不要辣" }
    ],
    isFromCustomerScan: false
  }
});
const order = response.confirmOrderItems;
```

#### 3. 退菜

```typescript
import { CANCEL_ORDER_ITEM } from '../graphql/mutations';

const response = await GraphQLService.mutation(CANCEL_ORDER_ITEM, {
  orderId: order.id,
  itemId: itemId,
  reason: "客户要求"
});
const updatedOrder = response.cancelOrderItem;
```

#### 4. 支付

```typescript
import { PAY_ORDER } from '../graphql/mutations';

const response = await GraphQLService.mutation(PAY_ORDER, {
  orderId: order.id
});
const paidOrder = response.payOrder;
```

## 🎨 样式使用

应用使用NativeWind (Tailwind for React Native)

### 常用样式类

```typescript
// 布局
className="flex-1"                    // 充满可用空间
className="flex-row"                  // 横向布局
className="items-center justify-between"  // 弹性对齐

// 背景色
className="bg-white"                  // 白色背景
className="bg-blue-500"               // 蓝色背景
className="bg-gray-50"                // 浅灰色背景

// 文本
className="text-lg font-bold"         // 大字体粗体
className="text-gray-500"             // 灰色文本
className="text-center"               // 文本居中

// 间距
className="p-4"                       // 内边距
className="m-2"                       // 外边距
className="mt-2"                      // 顶部外边距

// 圆角和边框
className="rounded-lg"                // 圆角
className="border border-gray-300"    // 边框
```

## 📊 Redux 操作示例

### 添加菜品到购物车

```typescript
import { useDispatch } from 'react-redux';
import { addDraftItem } from '../store/orderSlice';

const dispatch = useDispatch();

dispatch(addDraftItem({
  dishId: '123',
  name: '红烧肉',
  price: 2800,      // 单位：分，所以2800 = 28元
  quantity: 1
}));
```

### 更新菜品数量

```typescript
import { updateDraftItemQuantity } from '../store/orderSlice';

// 增加数量
dispatch(updateDraftItemQuantity({ dishId: '123', quantity: 2 }));

// 数量为0时自动删除
dispatch(updateDraftItemQuantity({ dishId: '123', quantity: 0 }));
```

### 保存订单

```typescript
import { setCurrentOrder } from '../store/orderSlice';

const orderData = {
  id: '123',
  tableNumber: '5',
  dinerId: '0',
  // ... 其他订单字段
};

dispatch(setCurrentOrder(orderData));
```

## 🐛 调试技巧

### 查看Redux State

```typescript
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

const orderState = useSelector((state: RootState) => state.order);
console.log('Order State:', orderState);
```

### 网络请求调试

```typescript
// 在 GraphQLService.ts 中添加日志
console.log('Query:', document);
console.log('Variables:', variables);
console.log('Response:', response);
```

### React Native Debugger

```bash
# 安装工具
npm install -g react-native-debugger

# 启动调试器
react-native-debugger

# 在应用中: Cmd+D (iOS) 或 Cmd+M (Android) → "Debug with Chrome"
```

## 📝 常见问题

### Q: 如何重新安装依赖?
```bash
rm -rf node_modules package-lock.json
npm install
```

### Q: TypeScript错误怎么办?
```bash
npm run tsc --noEmit  # 检查类型错误
```

### Q: 如何测试GraphQL连接?
在 `MenuScreen` 中打印响应数据:
```typescript
console.log('Dishes loaded:', dishes);
```

### Q: Redux状态为什么没更新?
确保:
1. 使用了正确的dispatch
2. reducer中返回新对象(immutable)
3. selector返回了正确的state部分

## 🔗 相关资源

- [React Navigation 文档](https://reactnavigation.org/)
- [Redux Toolkit 文档](https://redux-toolkit.js.org/)
- [GraphQL Request](https://github.com/jasonkuhrt/graphql-request)
- [NativeWind 文档](https://www.nativewind.dev/)
- [React Native 官网](https://reactnative.dev/)

## 📞 支持

如有问题，请检查:
1. GraphQL 端点配置是否正确
2. 后端 API 是否在线
3. Redux DevTools 中的状态
4. React Native Debugger 中的网络请求
