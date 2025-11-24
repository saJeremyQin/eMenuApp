# eMenuApp Waiter 架构设计

## 📋 业务流程概览

```
Table Selection 
    ↓
Add Diners (姓名/A,B,C,D...) 
    ↓
Browse Menu & Place Order
    ↓
Confirm Order (打印两份小票：厨房+服务员)
    ↓
Kitchen Prepares Food
    ↓
Mark Items Complete (厨师敲铃/喊单，Waiter勾选菜单)
    ↓
Serve & Update Status
    ↓
Customer Payment (线下买单)
    ↓
Checkout in App (标记已付款，释放桌位)
```

---

## 🔄 状态管理设计

### 核心状态机：Order Status (简化版，3 种状态)
```
PENDING (待确认)
  ├─ 来自：顾客自助扫码点菜
  └─ Waiter 代为点餐：直接生成 CONFIRMED (跳过 PENDING)
  │
  ↓ Waiter 点击"确认"按钮 (仅自助点菜需要)
  │
CONFIRMED (已确认，服务中)
  ├─ 包含阶段：厨房制作 + 食物完成 + 上菜
  ├─ 处理方式：纸质小票勾选 (app 不操作)
  ├─ OrderItem.status 字段存在但 UI 不显示
  └─ 预留向前兼容：厨房设备可更新 item 状态
  │
  ↓ 顾客线下支付，Waiter 标记收款
  │
PAID (已付款，订单结束)
  └─ 释放桌位，变为 AVAILABLE

流程总结：
1. 自助点菜 → PENDING(需确认) → CONFIRMED → PAID
2. Waiter代点 → CONFIRMED(跳过确认) → PAID
3. 中间所有操作（厨房制作、上菜）离线进行，不涉及 app
```

### 数据模型
```typescript
// Table (桌位)
{
  tableNumber: number,
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED',
  currentOrderId: ID | null,
  diners: [
    { name: string, id: string }
  ],
  totalBill: number,
  createdAt: timestamp
}

// Order (订单) - 简化版本，支持向前兼容
{
  id: ID,
  restaurantId: ID,
  tableNumber: number,
  dinersInfo: [{
    name: string,  // A, B, C... 或自定义名字
    items: [DishItem]
  }],
  items: [
    {
      id: ID,
      dishId: ID,
      name: string,
      quantity: number,
      price: number,
      notes: string,
      // v2 扩展字段 (前期不显示)
      status: 'PENDING' | 'READY' | 'SERVED'  // 向前兼容厨房设备
    }
  ],
  totalAmount: number,
  status: 'PENDING' | 'CONFIRMED' | 'PAID',  // 只有 3 个状态
  createdBy: 'WAITER_ORDER' | 'CUSTOMER_SCAN',  // 点餐来源
  confirmedAt: timestamp,
  paidAt: timestamp,
  createdAt: timestamp
}

// Notification (通知) - 简化版
{
  id: ID,
  type: 'ORDER_READY' | 'NEW_ORDER',
  orderId: ID,
  tableNumber: number,
  title: string,
  message: string,
  read: boolean,
  createdAt: timestamp
}
```

---

## 📱 页面结构

### 当前有 (WhatsMenu)
- **Tables Screen** - 桌位选择
- **Orders Screen** - 点餐与管理
- **About Us Screen** - 关于

### 页面结构 (总共 7 个页面)

#### 1️⃣ **Login Screen** ✅ 已实现
- Cognito 邮箱/密码登录
- iPad 横屏响应式设计

#### 2️⃣ **Home/Dashboard Screen** (新增)
- 快速统计：待确认订单数、待支付订单数
- 快捷导航按钮：
  - "新订单" → 跳转 Tables Screen
  - "待处理" → 跳转 Orders Management
  - "消息中心" → 跳转 Notifications
- 实时订单提示（如有新待确认订单，红点提示）

#### 3️⃣ **Tables Screen** (桌位选择)
- 网格布局展示所有桌位 (responsive)
- 状态标记：
  - 绿色 = AVAILABLE (可选)
  - 红色 = OCCUPIED (不可选)
  - 灰色 = RESERVED (预留)
- 点击空闲桌位 → Add Diners Modal
- 长按已用餐桌 → 恢复未支付订单

#### 4️⃣ **Add Diners Modal** (人员录入)
```
┌─────────────────────────────┐
│ Table 7 - Add Diners        │
├─────────────────────────────┤
│ [+ Add Diner]               │
│ ───────────────────────── │
│ [A] Name Input...    ×     │
│ [B] Name Input...    ×     │
│ [C] Name Input...    ×     │
│ ───────────────────────── │
│ Quick: [A] [B] [C] [D]    │
│ ───────────────────────── │
│ [Cancel] [Next: Menu]     │
└─────────────────────────────┘
```

#### 5️⃣ **Menu & Order Entry Screen** (点菜)
```
Left Panel: Categories          Right Panel: Order Cart
┌──────────────────┐         ┌──────────────────────┐
│ Starters    ▶    │         │ Table 7 Order        │
│ Main Course ▶    │  ←→     │ [Diner: A, B, C]     │
│ Drinks      ▶    │         │ ──────────────────── │
│ Desserts    ▶    │         │ × Dish 1    ×1  $10 │
└──────────────────┘         │ × Dish 2    ×2  $20 │
                             │ × Dish 3    ×3  $30 │
  Dish Detail                 │ ──────────────────── │
  ┌──────────────────┐       │ Subtotal: $60        │
  │ Tomato Egg Soup  │       │ [Cancel] [Confirm]   │
  │ $8, Hot          │       └──────────────────────┘
  │ ────────────────│
  │ Qty: 1  [Add]   │
  └──────────────────┘
```

**流程说明：**
- **Waiter 代为点餐路径**：
  1. 选择桌位
  2. 输入用餐人员 (A, B, C...)
  3. 点菜选择 → 确认
  4. ✅ 订单直接进入 CONFIRMED 状态
  5. 打印小票，交给厨房
  6. 整个过程结束，去处理其他订单

#### 6️⃣ **Orders Management Screen** ⭐ 核心

**两个 Tab：**

**Tab 1: Pending Orders (待确认 - 仅来自顾客自助扫码)**
```
┌────────────────────────────────┐
│ Table 3 - Diners: A, B         │
│ ─────────────────────────────── │
│ Dish 1 × 1                     │
│ Dish 2 × 2                     │
│ Dish 3 × 1                     │
│ ─────────────────────────────── │
│ Total: $50                     │
│ [Confirm & Print] [Reject]     │
└────────────────────────────────┘

说明：只有顾客自助点菜才会出现在这里
Waiter 代点直接跳过这个 Tab
```

**Tab 2: Pending Payment (待支付 - CONFIRMED 订单)**
```
┌────────────────────────────────┐
│ Table 3 - Payment Due          │
│ [Diner A]  [Diner B]           │
│ ─────────────────────────────── │
│ Dish 1 × 1              ✓ 已上 │
│ Dish 2 × 2              ✓ 已上 │
│ Dish 3 × 1              ✓ 已上 │
│ ─────────────────────────────── │
│ Total: $50                     │
│ [Mark Paid & Release]          │
│ [Print Bill]                   │
└────────────────────────────────┘

说明：所有已确认订单都在这里等待支付
```

#### 7️⃣ **Notifications/Message Center** (消息中心)
```
┌──────────────────────────────────┐
│ 📬 Messages                      │
├──────────────────────────────────┤
│ [🔴 UNREAD] 🔔 New Order         │
│            Table 3               │
│            Diner A, B            │
│            [→ Confirm]           │
├──────────────────────────────────┤
│ [⚪ READ]   📝 Order Confirmed   │
│            Table 5               │
│            [→ Get Items]         │
├──────────────────────────────────┤
│ [⚪ READ]   ✅ Order Ready       │
│            Table 2               │
│            [Mark Served]         │
└──────────────────────────────────┘
```

---

## 🗂️ Redux/State 切片 (Slices)

### `ordersSlice` (简化版)
```typescript
{
  orders: Order[],                    // 所有订单
  currentOrder: Order | null,         // 正在编辑的订单
  pendingOrders: Order[],             // 待确认的订单(顾客自助)
  paymentPendingOrders: Order[],      // 待支付的订单(已确认)
  selectedTableNumber: number | null  // 选中的桌号
  notifications: Notification[]
}

// Actions (简化)
- createOrder(tableNumber, dinersInfo, createdBy)  // 创建订单
  └─ createdBy: 'WAITER_ORDER' 直接进 CONFIRMED
  └─ createdBy: 'CUSTOMER_SCAN' 进入 PENDING
- confirmOrder(orderId)               // Waiter 确认订单 (仅 PENDING)
- addItemToOrder(orderId, dish)       // 添加菜品
- removeItemFromOrder(orderId, itemId)// 移除菜品
- markOrderPaid(orderId, amount)      // 标记已支付
- cancelOrder(orderId)                // 取消订单
- subscribeToOrders()                 // WebSocket 实时订单
```

### `tablesSlice`
```typescript
{
  tables: Table[],
  selectedTable: number | null,
  filter: 'ALL' | 'AVAILABLE' | 'OCCUPIED'
}

// Actions
- fetchTables()
- selectTable(tableNumber)
- occupyTable(tableNumber, orderId)
- releaseTable(tableNumber)
- updateTableStatus(tableNumber, status)
```

### `notificationsSlice`
```typescript
{
  notifications: Notification[],
  unreadCount: number
}

// Actions
- addNotification(notification)       // 新通知
- markAsRead(notificationId)
- clearNotifications()
```

---

## 📡 GraphQL Queries & Mutations (简化版)

### Queries

```graphql
# 获取所有待确认订单 (来自顾客自助)
query ListPendingOrders {
  listOrders(status: PENDING, first: 50) { 
    id
    tableNumber
    dinersInfo { name }
    items { name, quantity, price }
    totalAmount
    createdAt
  }
}

# 获取所有待支付订单 (已确认)
query ListPaymentPendingOrders {
  listOrders(status: CONFIRMED, first: 50) { 
    id
    tableNumber
    dinersInfo { name }
    items { name, quantity }
    totalAmount
    confirmedAt
    createdBy
  }
}

# 获取单个订单详情
query GetOrder($orderId: ID!) {
  getOrder(id: $orderId) {
    id
    tableNumber
    dinersInfo { name }
    items { 
      id
      name
      quantity
      price
      status        # 预留字段，前期不用
    }
    totalAmount
    status
    createdBy
    createdAt
    confirmedAt
    paidAt
  }
}

# 获取通知列表
query GetNotifications {
  getNotifications(limit: 20) {
    id
    type              # 'NEW_ORDER' | 'ORDER_CONFIRMED'
    orderId
    tableNumber
    title
    message
    read
    createdAt
  }
}

# 获取所有桌位状态
query GetTables {
  getTables {
    tableNumber
    status            # 'AVAILABLE' | 'OCCUPIED'
    currentOrderId
    dinersCount
  }
}
```

### Mutations

```graphql
# 创建订单 (Waiter代点 或 顾客自助)
mutation CreateOrder($input: CreateOrderInput!) {
  createOrder(input: $input) {
    id
    tableNumber
    status            # 'CONFIRMED' (Waiter) 或 'PENDING' (Customer)
    createdBy         # 'WAITER_ORDER' | 'CUSTOMER_SCAN'
    items { id, name, quantity }
    totalAmount
    createdAt
  }
}

# 确认订单 (仅用于自助点菜)
mutation ConfirmOrder($orderId: ID!) {
  confirmOrder(id: $orderId) {
    id
    status            # PENDING → CONFIRMED
    confirmedAt
  }
}

# 标记订单已支付
mutation MarkOrderPaid($orderId: ID!, $amount: Float!) {
  markOrderPaid(id: $orderId, amount: $amount) {
    id
    status            # CONFIRMED → PAID
    paidAt
  }
}

# 取消订单
mutation CancelOrder($orderId: ID!) {
  cancelOrder(id: $orderId) {
    id
    status            # CANCELLED
  }
}

# 添加通知 (服务器端push)
subscription OnOrderNotification {
  orderNotification {
    id
    type
    orderId
    tableNumber
    title
    message
    createdAt
  }
}
```

---

## 🎯 导航结构

```
RootNavigator
├─ AuthStack
│  └─ LoginScreen
│
└─ AppStack (登录后)
   ├─ HomeScreen (首页)
   │
   ├─ TabNavigator
   │  ├─ OrdersManagementStack
   │  │  ├─ OrdersManagementScreen (2 tabs)
   │  │  └─ OrderDetailModal
   │  │
   │  ├─ TablesStack
   │  │  ├─ TablesScreen (桌位网格)
   │  │  ├─ AddDinersModal (用餐者)
   │  │  └─ MenuOrderEntryScreen (点菜)
   │  │
   │  └─ NotificationsStack
   │     └─ NotificationsScreen (消息)
   │
   └─ Modal Stack (全屏模态)
      ├─ CheckoutModal (支付)
      └─ OrderConfirmModal (确认订单)
```

---

## 📋 完整页面清单

| # | 页面名称 | 用途 | 状态 | 优先级 |
|---|---------|------|------|--------|
| 1 | **LoginScreen** | Cognito 认证 | ✅ 完成 | P0 |
| 2 | **HomeScreen** | 首页仪表板 | 📝 待开发 | P1 |
| 3 | **TablesScreen** | 桌位选择 | 📝 待开发 | P1 |
| 4 | **AddDinersModal** | 输入用餐者 | 📝 待开发 | P1 |
| 5 | **MenuOrderEntryScreen** | 点菜单页面 | 📝 待开发 | P1 |
| 6 | **OrdersManagementScreen** ⭐ | Waiter 订单处理 (2 tabs) | 📝 待开发 | P0 |
| 7 | **NotificationsScreen** | 消息中心 | 📝 待开发 | P1 |

**总页面数：7 个** (其中 1 个已完成，6 个待开发)

---

## 🚀 开发优先级

### MVP (最小可行产品) - Phase 1
完成以下 4 个页面，Waiter 就能完整工作：

1. **Tables Screen** - 选择桌位 + Add Diners Modal
2. **Menu Order Entry Screen** - 点菜 (Waiter 代点为主，支持快速点菜)
3. **Orders Management Screen** ⭐ - 确认订单 + 标记付款
4. **Checkout Modal** - 支付与释放桌位

**当前状态**：
- Login ✅
- Tables ⏳ (需要实现)
- Add Diners ⏳ (需要实现)
- Menu Order Entry ⏳ (需要实现)
- Orders Management ⏳ (需要实现)
- Checkout ⏳ (需要实现)

### Phase 2 (增强功能)
1. Home Screen - 快速统计和导航
2. Notifications - 实时消息中心
3. 顾客自助扫码点菜 (Tab 1 Pending Orders)
4. WebSocket 实时订单同步

### Phase 3 (高级功能)
1. 多 Waiter 协作管理
2. 打印系统集成
3. 报表统计
4. 厨房显示屏系统
5. Item-level 状态扩展 (READY/SERVED 追踪)

---

## 💡 关键设计原则

✅ **Waiter 最小交互**：整个订单生命周期只需 2 次 app 操作
- 操作 1: 新建订单 (选桌 → 加人 → 点菜 → 确认打印)
- 操作 2: 标记付款 (点击"已支付"→ 释放桌位)

✅ **离线操作支持**：
- 厨房制作、菜品完成、上菜都通过纸质小票
- Item-level 的 status 字段预留，但前期 UI 不显示
- 未来可扩展为厨房设备实时更新 item 状态

✅ **状态简洁**：
- Order 只有 3 个必要状态：PENDING → CONFIRMED → PAID
- Item status (READY/SERVED) 字段存在但不显示，向前兼容

✅ **自适应创建**：
- Waiter 代点：直接 CONFIRMED (跳过 PENDING)
- 顾客自助：先进 PENDING (需 Waiter 确认)

---

## 📝 后端 GraphQL Schema 简化版

```graphql
enum OrderStatus {
  PENDING    # 待确认 (仅来自顾客自助)
  CONFIRMED  # 已确认 (Waiter 代点或确认后)
  PAID       # 已支付
}

enum OrderItemStatus {
  PENDING   # 预留字段，前期不用
  READY
  SERVED
}

enum OrderCreatedBy {
  WAITER_ORDER    # Waiter 代为点餐
  CUSTOMER_SCAN   # 顾客扫码自助
}

type OrderItem {
  id: ID!
  dishId: ID!
  name: String!
  quantity: Int!
  price: Float!
  notes: String
  status: OrderItemStatus! = PENDING  # 预留，前期不显示
}

type OrderDiner {
  name: String!
  items: [OrderItem!]!
}

type Order {
  id: ID!
  restaurantId: ID!
  tableNumber: Int!
  dinersInfo: [OrderDiner!]!
  items: [OrderItem!]!
  totalAmount: Float!
  status: OrderStatus!
  createdBy: OrderCreatedBy!
  createdAt: String!
  confirmedAt: String
  paidAt: String
}

type Query {
  listOrders(status: OrderStatus, limit: Int): [Order!]!
  getOrder(id: ID!): Order!
  getTables: [Table!]!
}

type Mutation {
  createOrder(
    tableNumber: Int!
    dinersInfo: [DinerInput!]!
    items: [OrderItemInput!]!
    createdBy: OrderCreatedBy!
  ): Order!
  
  confirmOrder(id: ID!): Order!
  markOrderPaid(id: ID!, amount: Float!): Order!
  cancelOrder(id: ID!): Order!
}
```
