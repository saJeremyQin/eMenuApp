# eMenuApp 导航结构设计 - v4 (2025-12 最新)

## 📋 概述

基于餐馆老板的实际需求设计的简化、高效的 Waiter 点菜系统。核心特点：
- **简洁流程**：TableScreen → OrderScreen（无复杂 Modal）
- **灵活分账**：支持多 Tab 分餐、分别支付
- **退菜支持**：CONFIRMED 状态下可退菜并记录原因
- **实时通知**：新订单闪动提示

**目标设备**：iPad 横屏专用

---

## 🗺️ 导航架构

```
AppNavigator (根)
│
├─ isAuthenticated = false
│  └─ LoginScreen (身份认证)
│
└─ isAuthenticated = true
   │
   ├─ Redux Store (全局状态)
   │  ├─ orderSlice (订单数据 + 多 Tab 购物车)
   │  ├─ tableSlice (桌位信息)
   │  └─ notificationSlice (新订单通知)
   │
   └─ BottomTabNavigator (底部 3 Tab)
      │
      ├─ Tab 1: 📋 Ordering
      │  ├─ TableScreen (初始)
      │  │  - 8x2 或 4x2 桌位网格
      │  │  - 点击桌位 → OrderScreen
      │  │  - 🔔 新订单时闪动动画
      │  │
      │  └─ OrderScreen (点菜页面)
      │     - 左侧 (50%)：Dishes (菜品分类 + 菜单)
      │     - 右侧 (50%)：ShoppingCart (Excel 风格多 Tab 购物车)
      │       ├─ Tab: [整桌] [Alice] [Bob] [+]
      │       ├─ 菜品表格 (菜名/数量/单价/小计/操作)
      │       ├─ 总计/实付显示
      │       └─ [PlaceOrder] [Pay] 按钮 (作用于当前 Tab)
      │
      ├─ Tab 2: 📊 Orders (订单管理 - 后续可加)
      │  └─ OrdersManagementScreen
      │
      └─ Tab 3: ℹ️ About (关于)
         └─ AboutScreen
```

---

## 📊 Redux 状态设计

### orderSlice

```javascript
{
  currentOrder: {
    tableId: 'table-1',
    
    // 多 Tab 购物车设计
    tabs: {
      'default': {
        tabId: 'default',
        name: '整桌',
        
        items: [
          {
            itemId: 'item-1001',
            dishId: 'd1',
            name: 'Veg Biriyani',
            price: 140,
            quantity: 2,
            
            // 状态流转: DRAFT → CONFIRMED → (可 CANCELLED) → PAID
            status: 'DRAFT | CONFIRMED | CANCELLED | PAID',
            
            // 仅当 status = CANCELLED 时填充
            cancelledAt: '2025-12-09T10:30:00Z',
            cancelReason: '顾客要求',  // '做坏了', '上错菜', '其他'
            cancelledBy: 'waiter-001'
          },
          {
            itemId: 'item-1002',
            dishId: 'd2',
            name: 'CheeseBurger',
            price: 300,
            quantity: 1,
            status: 'DRAFT'
          }
        ],
        
        // 计算字段（排除 CANCELLED）
        totalPrice: 580,      // 所有菜品小计（排除已退）
        paidAmount: 0,        // 已支付金额
        status: 'pending | confirmed | paid'
      },
      
      'alice': {
        tabId: 'alice',
        name: 'Alice',
        items: [...],
        totalPrice: 250,
        paidAmount: 0,
        status: 'pending'
      }
    },
    
    activeTabId: 'default'  // 当前活跃 Tab
  },
  
  // 历史订单（已提交的）
  allOrders: [
    {
      orderId: 'ord-001',
      tableId: 'table-1',
      tabId: 'default',
      tabName: '整桌',
      items: [...],         // 状态为 CONFIRMED/CANCELLED/PAID
      totalPrice: 580,
      paidAmount: 580,
      confirmedAt: '2025-12-09T10:20:00Z',
      paidAt: '2025-12-09T10:45:00Z'
    }
  ]
}
```

### tableSlice

```javascript
{
  tables: [
    {
      tableId: 'table-1',
      number: 1,
      capacity: 4,
      status: 'empty | occupied',  // 是否有订单未支付
      hasNewOrder: false           // 是否有新订单（用于闪动）
    },
    // ... 更多桌位
  ]
}
```

### notificationSlice

```javascript
{
  hasNewOrders: false,
  newOrderCount: 0,
  lastNewOrderTableId: null
}
```

---

## 🔄 用户交互流程

### 情景 1: Waiter 从 TableScreen 进入点菜

```
1️⃣ TableScreen
   - 显示所有桌位网格 (Table 1-8)
   - 每个卡片显示: 桌号, 客容量, 订单状态, 总金额
   
   ↓ 点击 Table 5
   
2️⃣ OrderScreen (Table 5)
   - 左侧: 菜品分类 (Starters, Main...) + 菜单
   - 右侧: ShoppingCart Tab: [整桌] [+]
     * 默认 1 个 Tab "整桌"
     * 可添加多个分餐 Tab
   - 右侧活跃 Tab 为 "整桌"，框内显示该 Tab 的菜品
   
   ↓ 点击菜品 → 加到 "整桌" Tab
   
3️⃣ 添加菜品
   - Redux dispatch: addToCart({ tabId: 'default', dish })
   - 右侧表格更新，显示: 菜名 | 数量 | 单价 | 小计 | [删除]
   
   ↓ PlaceOrder
   
4️⃣ PlaceOrder (整张桌子的整桌 Tab)
   - 所有 DRAFT 菜 → CONFIRMED
   - 发送给后端/厨房
   - Redux: 订单进入 allOrders
   - 右侧表格菜品标签改为 "已确认"（可删除但需选原因）
   - 支持继续加菜
   
   ↓ 继续操作（加菜/退菜/支付）
   
5️⃣ Pay
   - 计算当前 Tab 的实付金额（排除 CANCELLED）
   - 发送支付请求
   - 所有非 CANCELLED 菜 → PAID
   - 右侧框清空或显示 "已支付" 状态
   - 订单结束
```

### 情景 2: 分账场景（同一桌不同 Diner）

```
1️⃣ OrderScreen (Table 5 - 整桌)
   - 右侧 Tab: [整桌] [+]
   
   ↓ 点击 [+] 新增分餐
   
2️⃣ 新增 Tab
   - 弹出输入框或自动命名 "Tab 2"
   - 新 Tab 对应新的 items 数组
   
   ↓ 点击新 Tab，切换活跃 Tab
   
3️⃣ 为不同 Tab 加菜
   - 在左侧菜单选菜
   - 菜自动加到当前活跃 Tab
   - Tab 标题旁显示菜品数和总价
   
   ↓ PlaceOrder 和 Pay（可分别操作）
   
4️⃣ 分别支付
   - 点 [PlaceOrder] → 当前 Tab 的菜发送厨房
   - 点 [Pay] → 当前 Tab 的菜结账
   - 其他 Tab 继续点菜/支付
   - 所有 Tab 都支付后，订单真正结束
```

### 情景 3: 退菜流程

```
1️⃣ 菜品在 CONFIRMED 状态下
   - 右侧表格对应菜品行的 [删除] 按钮可点击
   
   ↓ 点击 [删除]
   
2️⃣ 弹出 "退菜原因" Modal
   ┌─────────────────────────┐
   │ 退菜原因                 │
   │ 菜品: Veg Biriyani x2   │
   │                         │
   │ ○ 顾客要求              │
   │ ○ 做坏了                │
   │ ○ 上错菜                │
   │ ○ 其他: [输入框]        │
   │                         │
   │ [取消]    [确认退菜]     │
   └─────────────────────────┘
   
   ↓ 选择原因 + 确认
   
3️⃣ 退菜处理
   - Redux: item.status = 'CANCELLED'
   - 记录: cancelledAt, cancelReason, cancelledBy
   - UI: 菜品行显示删除线 + 灰色 + 原因标签
   - 重新计算 totalPrice（排除已退）
   
   ↓ 支付时自动计算（排除已退菜）
```

### 情景 4: 新订单通知（客户扫码点菜 - 后期）

```
1️⃣ TableScreen
   - 所有桌位正常显示
   
   ↓ 顾客通过 QR Code 扫码点菜 (独立客户端)
   
2️⃣ 后端推送新订单
   - notificationSlice.hasNewOrders = true
   - 对应桌位卡片闪动动画 🔔
   
   ↓ Waiter 点击闪动的桌位
   
3️⃣ OrderScreen (Table X)
   - 右侧自动显示顾客的菜品（已经是 CONFIRMED 状态）
   - 可选: 创建新 Tab "顾客订单" 或混入 "整桌"
   
   ↓ Waiter 可继续加菜或直接支付
```

---

## 📱 UI 布局详细说明

### TableScreen

```
┌────────────────────────────────────────────┐
│ Ordering | Orders | About                  │ ← Tab Bar
├────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │ 🪑      │  │ 🪑      │  │ 🪑      │   │
│  │ Table 1 │  │ Table 2 │  │ Table 3 │   │
│  │   ¥200  │  │  ¥0     │  │  ¥350   │   │
│  └─────────┘  └─────────┘  └─────────┘   │
│                                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │ 🪑      │  │ 🪑🔔    │  │ 🪑      │   │ ← Table 5 闪动
│  │ Table 4 │  │ Table 5 │  │ Table 6 │   │
│  │  ¥0     │  │  ¥580   │  │  ¥0     │   │
│  └─────────┘  └─────────┘  └─────────┘   │
│                                            │
│  ┌─────────┐  ┌─────────┐                 │
│  │ 🪑      │  │ 🪑      │                 │
│  │ Table 7 │  │ Table 8 │                 │
│  │  ¥100   │  │  ¥0     │                 │
│  └─────────┘  └─────────┘                 │
└────────────────────────────────────────────┘
```

**卡片信息**：
- 桌号
- 容量（可选）
- 当前订单总金额
- 🔔 闪动标记（有新订单）

---

### OrderScreen 布局（Tablet 横屏）

```
┌─────────────────────────────────────────────────────────────────┐
│ Ordering | Orders | About       🔔(新订单)  [<]  [>]            │
├───────────────────────┬─────────────────────────────────────────┤
│                       │ Table 5 - Ordering                      │
│  菜品分类:             ├─────────────────────────────────────────┤
│  [Starters]           │ [整桌] [Alice] [Bob] [+]                │
│  [Main Courses]       ├─────────────────────────────────────────┤
│  [Drinks]             │ 菜品      数量  单价  小计  [操作]       │
│  [Desserts]           ├─────────────────────────────────────────┤
│                       │ Veg Biriyani  2   ¥140  ¥280  [🗑️]    │
│  菜品列表:             │ CheeseBurger  1   ¥300  ¥300  [🗑️]    │
│  ┌─────────────────┐  │ ─────────────────────────────────────  │
│  │ [+] Egg Curry   │  │ Fish SalaD    1   ¥200  ¥200  [☓] ❌  │
│  │     ¥100        │  │   └─ 退菜: 做坏了                       │
│  │                 │  ├─────────────────────────────────────────┤
│  │ [+] Aloo Massal │  │ 小计: ¥780                              │
│  │     ¥100        │  │ 已退: -¥200                             │
│  │                 │  │ 总计: ¥580                              │
│  │ [+] Veg Biriyani│  │ 已支付: ¥0                              │
│  │     ¥140        │  │ 实付: ¥580                              │
│  │                 │  ├─────────────────────────────────────────┤
│  │ [+] CheeseBurger│  │ [PlaceOrder]              [Pay]         │
│  │     ¥300        │  │ (当前 Tab: 整桌)                        │
│  │                 │  │                                         │
│  │ ... 更多菜品 ... │  │                                         │
│  └─────────────────┘  │                                         │
│                       │                                         │
└───────────────────────┴─────────────────────────────────────────┘

图例:
- [整桌] = 第一个 Tab（默认）
- [Alice] = 分餐用户 1
- [Bob] = 分餐用户 2
- [+] = 添加新 Tab
- [🗑️] = 可删除（DRAFT 或 CONFIRMED）
- [☓] = 已删除/灰显（CANCELLED）
- ❌ = 删除线标记
```

**右侧购物车表格说明**：

| 列 | 说明 |
|----|------|
| 菜品 | 菜名 |
| 数量 | 可修改（+/- 按钮或直接输入） |
| 单价 | 菜品单价 |
| 小计 | 数量 × 单价 |
| [操作] | [🗑️] 删除 |

**菜品行状态显示**：

```
DRAFT 状态:
┌─────────────────────────────────────┐
│ Veg Biriyani  2   ¥140  ¥280  [🗑️] │
└─────────────────────────────────────┘

CONFIRMED 状态:
┌─────────────────────────────────────┐
│ Veg Biriyani  2   ¥140  ¥280  [🗑️] │
│ (背景色稍深，表示已确认)             │
└─────────────────────────────────────┘

CANCELLED 状态:
┌─────────────────────────────────────┐
│ ~~Veg Biriyani  2   ¥140  ¥200~~ │
│ 退菜: 做坏了  (灰色显示)   [☓]     │
└─────────────────────────────────────┘

PAID 状态:
┌─────────────────────────────────────┐
│ ✓ Veg Biriyani  2   ¥140  ¥280      │
│ (绿色勾选，隐藏删除按钮)             │
└─────────────────────────────────────┘
```

---

## 🔌 API 设计

### 1. PlaceOrder

**请求**：
```http
POST /api/orders/place
Content-Type: application/json

{
  "tableId": "table-1",
  "tabId": "default",
  "items": [
    {
      "itemId": "item-1001",
      "dishId": "d1",
      "name": "Veg Biriyani",
      "quantity": 2,
      "price": 140
    },
    {
      "itemId": "item-1002",
      "dishId": "d2",
      "name": "CheeseBurger",
      "quantity": 1,
      "price": 300
    }
  ]
}
```

**响应**：
```json
{
  "success": true,
  "orderId": "ord-001",
  "tabId": "default",
  "items": [
    {
      "itemId": "item-1001",
      "status": "CONFIRMED",
      "confirmedAt": "2025-12-09T10:20:00Z"
    }
  ],
  "confirmedAt": "2025-12-09T10:20:00Z"
}
```

---

### 2. CancelDish

**请求**：
```http
PUT /api/orders/:orderId/items/:itemId/cancel
Content-Type: application/json

{
  "reason": "顾客要求",  // '做坏了', '上错菜', 其他自定义
  "cancelledBy": "waiter-001"
}
```

**响应**：
```json
{
  "success": true,
  "itemId": "item-1001",
  "status": "CANCELLED",
  "cancelledAt": "2025-12-09T10:30:00Z",
  "cancelReason": "顾客要求",
  "cancelledBy": "waiter-001"
}
```

---

### 3. Pay

**请求**：
```http
POST /api/orders/:orderId/pay
Content-Type: application/json

{
  "tabId": "default",
  "amount": 580,  // 排除已退菜后的金额
  "items": [
    {
      "itemId": "item-1001",
      "status": "PAID"
    },
    {
      "itemId": "item-1002",
      "status": "PAID"
    }
  ],
  "paymentMethod": "cash"  // 或 'card'
}
```

**响应**：
```json
{
  "success": true,
  "orderId": "ord-001",
  "tabId": "default",
  "amount": 580,
  "paidAt": "2025-12-09T10:45:00Z",
  "items": [
    {
      "itemId": "item-1001",
      "status": "PAID",
      "paidAt": "2025-12-09T10:45:00Z"
    }
  ]
}
```

---

## 🗄️ 数据库 Schema

### orders 表

```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  table_id INT NOT NULL REFERENCES tables(id),
  tab_id VARCHAR(50),           -- 分餐标识（整桌 / Alice / Bob）
  tab_name VARCHAR(100),
  total_price DECIMAL(10, 2),
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(20),           -- pending / confirmed / paid
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  paid_at TIMESTAMP
);
```

### order_items 表

```sql
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id),
  dish_id INT NOT NULL REFERENCES dishes(id),
  quantity INT DEFAULT 1,
  price DECIMAL(10, 2),
  
  -- 状态字段
  status VARCHAR(20) DEFAULT 'DRAFT',  -- DRAFT / CONFIRMED / CANCELLED / PAID
  
  -- 确认时间
  confirmed_at TIMESTAMP,
  
  -- 退菜信息（仅 CANCELLED 时填充）
  cancelled_at TIMESTAMP,
  cancel_reason VARCHAR(100),  -- '顾客要求' / '做坏了' / '上错菜' / 自定义
  cancelled_by VARCHAR(50),
  
  -- 支付时间
  paid_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔐 状态迁移图

```
┌─────────────────────────────────────────┐
│ 菜品状态机 (ItemLifecycle)              │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────┐                         │
│  │  DRAFT    │  (购物车中)              │
│  └──────┬────┘                         │
│         │ PlaceOrder                   │
│         ↓                               │
│  ┌──────────────┐                      │
│  │ CONFIRMED    │ (已发送厨房)         │
│  └──────┬───────┘                      │
│         │ ├─ 删除 (需选原因)          │
│         │ │   ↓                        │
│         │ │ ┌──────────┐               │
│         │ │ │CANCELLED │ (已退菜)    │
│         │ │ └──────────┘               │
│         │ │                            │
│         │ └─ Pay                       │
│         ↓                               │
│  ┌───────────┐                         │
│  │   PAID    │ (已支付)                │
│  └───────────┘ (不可修改/删除)         │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🎯 关键特性

### ✅ 支持的操作

| 操作 | DRAFT | CONFIRMED | CANCELLED | PAID |
|------|-------|-----------|-----------|------|
| 修改数量 | ✓ | ✓ | ✗ | ✗ |
| 删除 | ✓ | ✓ (需选原因) | ✗ | ✗ |
| PlaceOrder | ✓ | ✗ | ✗ | ✗ |
| Pay | ✗ | ✓ | ✗ | ✗ |

### ✅ 支付计算

```javascript
总价 = Σ(非CANCELLED菜品 × 数量 × 单价)
实付 = 总价 - (已支付金额)

例:
菜品1: ¥140 × 2 = ¥280
菜品2: ¥300 × 1 = ¥300
菜品3: ¥200 × 1 = ¥200 (已退菜)
───────────────────
小计: ¥580 (排除菜品3)
已退: ¥200
实付: ¥580
```

### ✅ 分账支持

```
Tab 1 (整桌):     ¥580 未支付
Tab 2 (Alice):   ¥250 未支付
Tab 3 (Bob):     ¥300 已支付

支付流程:
1. 先支付 Tab 3 (Bob) ← Alice 和 Bob 分别支付
2. 再支付 Tab 1 (整桌)
3. 也可先支付 Tab 1，再支付 Tab 2/3
（顺序灵活）
```

---

## 📋 实现检查清单

### 前端 (React Native)

- [ ] TableScreen：桌位网格 + 闪动动画
- [ ] OrderScreen：左菜单 + 右购物车分屏
- [ ] ShoppingCart：多 Tab + Excel 表格样式
- [ ] 退菜 Modal：原因选择
- [ ] 状态管理：Redux orderSlice / tableSlice / notificationSlice
- [ ] API 集成：PlaceOrder / CancelDish / Pay
- [ ] UI 细节：删除线、灰色、绿色勾选等视觉区分

### 后端

- [ ] 数据库 Schema：orders / order_items 表
- [ ] PlaceOrder API：状态迁移 (DRAFT → CONFIRMED)
- [ ] CancelDish API：退菜记录 (CANCELLED + reason)
- [ ] Pay API：支付处理 (CONFIRMED → PAID)
- [ ] 业务逻辑：排除 CANCELLED 菜品的价格计算
- [ ] 推送通知：新订单到达时的消息系统
- [ ] 权限：Waiter 可退菜，经理可处理异常

---

## 🚀 未来扩展（Phase 2）

1. **客户自助扫码点菜**
   - QR Code 生成订单
   - 后端推送新订单通知
   - Waiter 在 OrderScreen 看到客户菜品

2. **Orders Tab 完整实现**
   - 查看历史订单
   - 订单统计分析
   - 按桌号/时间过滤

3. **高级退菜管理**
   - 按天统计退菜原因
   - 退菜率分析
   - 做菜损耗预警

4. **打印单据**
   - 点菜单 (PlaceOrder 后)
   - 支付清单 (Pay 前)
   - 收据 (Pay 后)

---

## 📝 变更日志

### v4 (2025-12-09)
- 简化 TableScreen：直接进 OrderScreen，取消 DinersModal
- 新增多 Tab ShoppingCart 设计（类似 Excel）
- 简化退菜逻辑：仅 CONFIRMED 状态可退，需记录原因
- 支付后不可退菜（由餐馆线下处理）
- 新增完整的 API 和数据库设计

### v3 (2025-11-29)
- Stack Navigator + Tablet 分屏设计
- TableScreen 卡片 + DinersModal
- MenuScreen 左右分屏（菜单 + 购物车）
- 菜品级别的支付状态

### v2 (2025-11-25)
- 4 Tab 手动导航设计
- 简化分账需求

### v1 (2025-11-24)
- 初始概念设计
