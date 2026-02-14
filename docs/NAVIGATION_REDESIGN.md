# eMenuApp 导航结构重新设计 (v3 - WhatsMenu 风格)

## 📋 概述

新设计基于实际 Waiter 工作流和 WhatsMenu 的验证设计，采用 **Stack Navigator + Tablet 分屏** 架构。
通过 Redux 管理全局订单状态，支持灵活的分账和多次支付流程。

**设备支持**：Tablet/iPad 横屏专用

---

## 🗺️ 整体架构

```
AppNavigator (根)
│
├─ isAuthenticated = false
│  └─ LoginScreen (身份认证)
│
└─ isAuthenticated = true
   │
   ├─ Redux Store (全局状态)
   │  ├─ orderSlice (订单数据)
   │  │  ├─ currentOrder {
   │  │  │    tableId,        // 当前桌位 ID
   │  │  │    dinersId,       // 当前 diner 标识 (0 / A / B / C / D...)
   │  │  │    diners {},      // 该桌的所有 diner: { dinersId: { name, seqNum }, ... }
   │  │  │    shoppingCart [] // 当前 diner 的购物车
   │  │  │  }
   │  │  │
   │  │  └─ allOrders [] // 所有订单 (CONFIRMED / FULLY_PAID)
   │  │     [
   │  │       {
   │  │         orderId,
   │  │         tableId,
   │  │         dinersId,      // 对应的 diner
   │  │         dinersName,    // diner 的名字或序号
   │  │         items: [
   │  │           { dishId, dishName, price, quantity, paid: boolean },
   │  │           ...
   │  │         ],
   │  │         totalPrice,
   │  │         status: 'CONFIRMED' | 'FULLY_PAID',
   │  │         paymentHistory: [  // 支付历史 (可选，用于分账记录)
   │  │           { timestamp, itemsCount, amount, method },
   │  │           ...
   │  │         ]
   │  │       },
   │  │       ...
   │  │     ]
   │  │
   │  ├─ tableSlice (表位数据)
   │  │  └─ tables[] (所有桌位)
   │  │
   │  └─ uiSlice (UI 状态)
   │     └─ (其他 UI 相关状态)
   │
   └─ BottomTabNavigator
      │
      ├─ Tab 1: 📋 Ordering (Stack Navigator)
      │  ├─ Screen 1: TableScreen (初始)
      │  │  - 显示所有桌位 (Table 1, Table 2, ...)
      │  │  - 每个桌位显示卡片：中心序号 [0]，周围选项卡 [A] [B] [C] [D]...
      │  │  - 点击卡片 → DinersModal 弹出
      │  │  - Redux: 无
      │  │
      │  ├─ Modal: DinersModal (在 TableScreen 上方)
      │  │  - 显示该桌位的已有 diner 选项卡 (A, B, C, D...)
      │  │  - 用户选择 diner → 输入名字 (可选，默认用字母)
      │  │  - 点击"确认" → Redux: 设置 currentOrder.tableId + currentOrder.dinersId
      │  │  - 关闭 Modal → Stack 内 push MenuScreen
      │  │
      │  └─ Screen 2: MenuScreen (Stack 内)
      │     - 左侧：菜单分类 + 菜品列表
      │     - 右侧：购物车 + "打印订单" 按钮
      │     - Redux: 读取 currentOrder (tableId, dinersId, shoppingCart)
      │     - 打印成功 → 订单进入 CONFIRMED → Redux: 清空 currentOrder
      │     - 点击返回 → pop 返回 TableScreen (丢弃未保存数据)
      │
      ├─ Tab 2: 📊 Orders (非 Stack)
      │  └─ OrderScreen
      │     - [待支付] Sub-Tab (默认显示)
      │     - 按桌号分组：Table 1, Table 2, ...
      │     - 每个桌号下分组各个 diner：Table 1-0, Table 1-A, Table 1-B...
      │     - 展开 diner 订单 → 显示菜品列表 (每个菜品前有 ☐ / ✓ 复选框)
      │     - 支持多选菜品 → "生成 Invoice" → "打印" → "标记已支付"
      │     - 无菜品选中时，按钮禁用 + 提示 "请选择至少 1 个菜品"
      │     - 订单内所有菜品都标记已支付 → 订单进入 FULLY_PAID → 从列表移除
      │
      └─ Tab 3: ℹ️ About (非 Stack)
         └─ AboutScreen
            - 版本信息
            - 设置
```

---

## 📊 Redux 状态管理设计

### orderSlice (订单管理)

```javascript
// State 结构
{
  // 当前正在编辑的订单信息
  currentOrder: {
    tableId: "table-5",              // 当前选中的桌位
    dinersId: "B",                   // 当前 diner 标识 (0 / A / B / C...)
    diners: {                        // 该桌位的所有 diner
      "0": { name: null, seqNum: 0 },     // 中心 [0]
      "A": { name: "Alice", seqNum: 1 },  // 选项 [A]
      "B": { name: "Bob", seqNum: 2 },    // 选项 [B]
      "C": { name: "Charlie", seqNum: 3 } // 选项 [C]
    },
    shoppingCart: [                  // 当前 diner 的购物车
      { dishId: "d1", name: "菜1", quantity: 2, price: 10 },
      { dishId: "d2", name: "菜2", quantity: 1, price: 20 }
    ]
  },
  
  // 所有已确认的订单
  allOrders: [
    {
      orderId: "ord-1",
      tableId: "table-1",
      dinersId: "A",                 // 对应的 diner
      dinersName: "Alice",           // 用户输入的名字或默认字母
      items: [
        { dishId: "d1", dishName: "菜1", price: 10, quantity: 2, paid: false },
        { dishId: "d2", dishName: "菜2", price: 20, quantity: 1, paid: true }
      ],
      totalPrice: 40,
      status: "CONFIRMED",           // CONFIRMED / FULLY_PAID
      paymentHistory: [
        { timestamp: "2025-11-24T10:15:00Z", itemsCount: 1, amount: 20, method: "cash" }
      ],
      createdAt: "2025-11-24T10:00:00Z"
    },
    // ... 更多订单
  ]
}

// Actions
- setCurrentOrder({ tableId, dinersId, diner })    // 设置当前编辑的订单
- setCurrentDiner(dinersId, dinersName)             // 切换或添加 diner
- addToCart(dish)                                   // 添加菜品到购物车
- removeFromCart(dishId)                            // 从购物车移除
- updateCartItem(dishId, quantity)                  // 更新购物车菜品数量
- clearCart()                                       // 清空购物车
- saveOrder()                                       // 打印成功 → 订单进入 CONFIRMED，清空 currentOrder
- markDishAsPaid(orderId, dishId)                   // 标记菜品为已支付
- markAllDishesAsPaid(orderId)                      // 标记所有菜品为已支付 → 订单进入 FULLY_PAID
- addPaymentRecord(orderId, paidItems, amount)     // 添加支付记录到 paymentHistory
- clearCurrentOrder()                               // 清除当前订单信息（返回前）
```

### tableSlice (桌位管理)

```javascript
// State 结构
{
  tables: [
    {
      tableId: "table-1",
      name: "Table 1",
      capacity: 4,
      diners: [
        { dinersId: "0", name: null, seqNum: 0 },
        { dinersId: "A", name: "Alice", seqNum: 1 }
      ]
    },
    // ... 更多桌位
  ]
}

// Actions
- setTables(tables[])                    // 初始化所有桌位
- addDiner(tableId, dinersId, name)      // 向某个桌位添加 diner
- removeDiner(tableId, dinersId)         // 移除某个 diner
```

### uiSlice (UI 状态)

```javascript
// State 结构
{
  activeTab: "Ordering",     // 当前活跃的 Tab
  // ... 其他 UI 状态
}

// Actions
- setActiveTab(tabName)     // 设置活跃 Tab
```

---

## 🔄 用户交互流程

### 情景 1: Waiter 从 Table 开始代点

```
1️⃣ TableScreen (Ordering Tab - Stack 初始)
   显示所有桌位网格:
   - Table 1: [0] [A] [B] [C]
   - Table 2: [0] [A]
   - Table 3: [0]
   - ...
   
   ↓ 点击 Table 1 的卡片 [A]
   
2️⃣ DinersModal (TableScreen 上方弹出)
   显示 Table 1 的所有 diner 选项: [0] [A] [B] [C]
   用户点击 [A] → 输入名字（可选）→ "确认"
   
   Redux dispatch:
   - setCurrentOrder({ tableId: "table-1", dinersId: "A", diner: { name: "Alice" } })
   
   ↓ 关闭 Modal
   
3️⃣ DinersModal 关闭后自动执行
   Stack.push(MenuScreen)
   
4️⃣ MenuScreen (Stack 内部)
   布局：
   - 左侧 50%: 菜单分类 + 菜品列表
   - 右侧 50%: 购物车 + 总价 + "打印订单" 按钮
   
   用户操作：
   - 浏览菜品 → 点击 "+" 添加到购物车
   - Redux dispatch: addToCart(dish) → shoppingCart 更新
   - 购物车显示菜品数量和小计
   
   ↓ 点击 "打印订单"
   
5️⃣ MenuScreen 触发打印
   - 生成订单单据
   - 打印机输出
   - 打印成功后:
     * Redux dispatch: saveOrder() → 订单进入 CONFIRMED，清空 currentOrder
     * Stack.pop() → 返回 TableScreen
     * 清空 shoppingCart
   
6️⃣ 返回 TableScreen
   可继续：
   - 点击同桌的其他 diner (如 [B]) → 重复流程 2-5
   - 或点击其他桌位 → 开始新的点餐
```

### 情景 2: Waiter 在 OrderScreen 处理支付

```
1️⃣ OrderScreen (Orders Tab - 默认活跃)
   显示 [待支付] Sub-Tab
   
   订单分组结构：
   ├─ Table 1
   │  ├─ Table 1-0
   │  │  └─ Items: [☐ 菜1 ¥10] [☐ 菜2 ¥20] (总: ¥30)
   │  ├─ Table 1-A (Alice)
   │  │  └─ Items: [☐ 菜3 ¥15] (总: ¥15)
   │  └─ Table 1-B (Bob)
   │     └─ Items: [☐ 菜1 ¥10] [☐ 菜4 ¥25] (总: ¥35)
   │
   ├─ Table 2
   │  ├─ Table 2-0
   │  │  └─ Items: [✓ 菜2 ¥20] [☐ 菜3 ¥15] (总: ¥35)
   │  └─ ...
   │
   └─ ...
   
   ↓ 点击展开 "Table 1-B"
   
2️⃣ 选择菜品进行支付
   用户勾选 Table 1-B 的菜品:
   - ☐ 菜1 ¥10 → ☑︎ 菜1 ¥10 (选中)
   - ☐ 菜4 ¥25 → 保持未选中
   
   ↓ 点击 "生成 Invoice"
   
3️⃣ 生成 Invoice（可选打印）
   显示选中菜品清单:
   - 菜1 x1 ¥10
   总计: ¥10
   
   选项：
   - [打印] (可选)
   - [标记已支付]
   
   ↓ 点击 [标记已支付]
   
4️⃣ 更新订单状态
   Redux dispatch:
   - markDishAsPaid(orderId, ["dish1"])  // 单个菜品标记为已支付
   - addPaymentRecord(orderId, ["dish1"], 10)  // 记录支付历史
   
   UI 更新：
   - Table 1-B: [✓ 菜1 ¥10] [☐ 菜4 ¥25] (已支付菜品显示 ✓)
   - 如果所有菜品都已支付 → 订单进入 FULLY_PAID → 从列表移除
   
5️⃣ 支持多次支付分账
   可继续选择其他菜品:
   - ☑︎ 菜4 ¥25
   - 重复 "生成 Invoice" → "标记已支付"
   - 直到所有菜品都标记为已支付
```

### 情景 3: 错误处理

```
❌ 用户在 OrderScreen 未选中任何菜品就点击 "生成 Invoice"
   → 显示错误提示: "请选择至少 1 个菜品"
   → 按钮保持禁用状态

❌ 用户在 MenuScreen 返回不清空购物车
   → Stack.pop() 触发 clearCurrentOrder()
   → 下次重新选择该桌位时，购物车为空（防止混淆）
```

---

## 📱 UI 布局详细说明（基于 WhatsMenu 设计）

### TableScreen 布局

```
┌─────────────────────────────────────┐
│         Ordering | Orders | About    │  ← Tab Bar
├─────────────────────────────────────┤
│  Table 1    Table 2    Table 3       │
│  [0] [A]    [0] [A]    [0]          │
│  [B] [C]    [B]        [A] [B]      │
│             [C]                      │
│                                      │
│  Table 4    Table 5    Table 6       │
│  [0]        [0] [A]    [0] [A]      │
│  [A]        [B] [C]    [B] [C]      │
│             [D]                      │
│                                      │
└─────────────────────────────────────┘

卡片说明:
- [0] 中心序号，代表 "无名字" 或第一个用餐者
- [A][B][C]... 用户输入的名字首字母或自动分配的字母
- 点击卡片 → 弹出 DinersModal
```

### MenuScreen 布局（Tablet 横屏）

```
┌──────────────────────────────┬──────────────────────────┐
│        Ordering Tab Bar       │   Orders | About         │
├──────────────────────────────┴──────────────────────────┤
│                                                          │
│  左侧 50%                          │  右侧 50%            │
│  ─────────────────────────────────────────────────────  │
│                                    │                      │
│  菜单分类:                         │  购物车              │
│  [热菜] [凉菜] [主食] ...         │  ─────────────       │
│                                    │  Table 1 - Alice     │
│  菜品列表:                         │  ─────────────       │
│  ┌─────────────────────┐          │  菜1 x2   ¥20        │
│  │ [+] 菜1        ¥10  │          │  菜2 x1   ¥20        │
│  │ [+] 菜2        ¥20  │          │  ─────────────       │
│  │ [+] 菜3        ¥15  │          │  小计: ¥40           │
│  │ [+] 菜4        ¥25  │          │                      │
│  │                     │          │  [打印订单]          │
│  │ ... 更多菜品 ...    │          │                      │
│  └─────────────────────┘          │                      │
│                                    │                      │
└────────────────────────────────────┴──────────────────────┘

菜品操作:
- 点击 [+] 添加到购物车 → Redux: addToCart(dish)
- 购物车显示已添加的菜品和数量
- 点击 "打印订单" → 生成单据并打印 → pop 返回 TableScreen
```

### OrderScreen 布局

```
┌─────────────────────────────────────────┐
│   Ordering  | Orders | About            │  ← Tab Bar
├─────────────────────────────────────────┤
│                                          │
│  [待支付] [已支付]  ← Sub-Tab           │
│                                          │
│  ▼ Table 1                               │
│    ▼ Table 1-0                          │
│      [☐] 菜1     ¥10                    │
│      [☐] 菜2     ¥20                    │
│      小计: ¥30                           │
│                                          │
│    ▼ Table 1-A (Alice)                  │
│      [☐] 菜3     ¥15                    │
│      小计: ¥15                           │
│                                          │
│    ▼ Table 1-B (Bob)                    │
│      [☐] 菜1     ¥10                    │
│      [☐] 菜4     ¥25                    │
│      小计: ¥35                           │
│      [生成 Invoice] [标记已支付]        │
│                                          │
│  ▼ Table 2                               │
│    ▼ Table 2-0                          │
│      [☑] 菜2     ¥20 ✓                  │
│      [☐] 菜3     ¥15                    │
│      小计: ¥35                           │
│                                          │
│  ...                                     │
│                                          │
└─────────────────────────────────────────┘

操作流程:
1. 展开订单 → 显示菜品列表
2. 勾选菜品 → [☑]
3. 点击 "生成 Invoice" → 显示选中菜品总价
4. (可选) 点击 "打印"
5. 点击 "标记已支付" → 更新 paid 状态
6. 重复支付或切换其他订单
```

---

## 🔐 防错设计

### 1. 防止误操作

✅ **TableScreen → MenuScreen 强制路径**
- MenuScreen 只能通过 Stack.push() 从 TableScreen 进入
- 无法直接从 Tab 导航访问
- 避免 Waiter 无意中打开 Menu 页面（无 Table 环境）

✅ **DinersModal 确保选择 Diner**
- 必须明确选择 diner 才能进入 MenuScreen
- 防止 "无 Diner" 的订单被创建

✅ **购物车自动清空**
- 返回 TableScreen 时自动清空购物车
- 防止菜品混淆或重复下单

### 2. 数据一致性

✅ **Dish-level Payment Tracking**
- 每个菜品独立记录 `paid` 状态
- 支持灵活分账 (分别结账不同菜品)

✅ **Payment History**
- 记录每次支付的时间、金额、菜品
- 便于对账和追溯

### 3. 错误提示

✅ **必须选中至少 1 个菜品**
- 如果未选菜品就点击 "生成 Invoice" → 提示: "请选择至少 1 个菜品"
- 防止生成空白单据

---

## 📋 状态迁移图

```
┌──────────────────────────────────────────────────────────┐
│ Redux State Transitions                                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  1. TableScreen (初始)                                  │
│     currentOrder = { tableId: null, dinersId: null }    │
│                                                          │
│  2. 选择 Diner → DinersModal                           │
│     currentOrder = { tableId: "t1", dinersId: "A" }    │
│                                                          │
│  3. 编辑菜品 → MenuScreen                              │
│     currentOrder.shoppingCart 不断更新                 │
│                                                          │
│  4. 打印成功 → 订单进入 CONFIRMED                       │
│     allOrders.push({ ..., status: "CONFIRMED" })       │
│     currentOrder 清空                                    │
│                                                          │
│  5. 标记支付 → OrderScreen                              │
│     allOrders[i].items[j].paid = true                  │
│     如果所有 items.paid = true → status: "FULLY_PAID"  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## ✅ 实现检查清单

- [ ] AppNavigator 更新为 3 Tab (Ordering Stack, Orders, About)
- [ ] TableScreen: 桌位卡片网格 + DinersModal
- [ ] MenuScreen: 左右分屏布局 (菜单 + 购物车)
- [ ] OrderScreen: 按桌号 + Diner 分组，支持菜品勾选和支付
- [ ] Redux: 实现 currentOrder + allOrders + dish.paid 状态
- [ ] Stack Navigator: 正确的 push/pop 逻辑
- [ ] 错误提示: 无菜品时禁用按钮 + 提示消息
- [ ] Tablet 适配: 确保横屏布局在 iPad 上正确显示
- [ ] 测试: 完整的多桌点餐流程 + 分账支付流程


---

## 🔄 工作流程

### 流程 1: Waiter 代点流程

```
1️⃣ TableScreen (Tab 1 - 🍽️)
   用户看到所有桌位 (从 Redux tableSlice.tables 获取)
   
   ↓ 点击某个桌位 (例如 Table 5)
   
2️⃣ AddDinersModal
   Redux dispatch: setCurrentTable("table-5")
   输入用餐者名单
   
   ↓ 点击"下一步"
   Redux dispatch: setCurrentDiners(["A", "B", "C"])
   关闭 Modal，显示 "开始点餐" 链接
   
3️⃣ 用户点击 "开始点餐" 链接
   navigation.navigate('Menu')
   
4️⃣ MenuScreen (Tab 2 - 🍴)
   - 显示当前桌位: "Table 5" (来自 Redux currentOrder.tableId)
   - 显示用餐者: "A, B, C" (来自 Redux currentOrder.diners)
   - 菜单列表: 用户可浏览并点击添加菜品
   - Redux dispatch: addToCart(dish) / updateCartItem(...)
   - 购物车实时更新 (来自 Redux currentOrder.shoppingCart)
   
   ↓ 点击"下单"
   
5️⃣ ConfirmOrderModal
   显示订单摘要:
   - 桌位: Table 5
   - 用餐者: A, B, C
   - 菜品列表 + 总价
   - 打印订单
   
   ↓ 点击"确认支付"
   Redux dispatch: placeOrder(...)
   Redux dispatch: clearCurrentOrder()  // 清空购物车和桌位信息
   显示 "查看订单" 链接 (可选)
   
6️⃣ 用户手动切换到 Tab 3 或点击链接
   OrderScreen (Tab 3 - 📋)
   显示新订单 (来自 Redux allOrders, status=PENDING)
   用户可以:
   - 点击"确认" → confirm 来自 Customer 的点单
   - 点击"支付" → 标记订单为已支付
```

### 流程 2: 多桌并发点餐 (实际场景)

典型场景：Table 1 有 A、B、C 三人，A 先点完，但 B、C 还在纠结，此时 Table 2 要点单

```
流程:
1️⃣ Table 1 - A 点菜
   - 选中 Table 1，添加 diners ["A", "B", "C"]
   - 进入 MenuScreen，A 选菜加到购物车
   
   ↓ A 点完了，打印
   
2️⃣ Table 1 - ConfirmOrderModal (A 的订单)
   - Redux dispatch: placeOrder(...) → allOrders
   - Redux dispatch: clearCurrentOrder() ✅ 清空当前订单
   
3️⃣ 返回 Tab 1，选 Table 2
   - Redux dispatch: setCurrentTable("table-2")
   - 选人、点菜、打印 (完整流程)
   
4️⃣ 返回 Tab 1，再选 Table 1 - B 或 C 继续点
   - Redux dispatch: setCurrentTable("table-1") ⚠️ 注意：这是新订单!
   - 添加 diners，比如 ["B"] 或 ["B", "C"] 或 ["A", "B"]（A 可以加菜）
   - 继续点菜
   
   ↓ 点完了，打印
   
5️⃣ Table 1 - ConfirmOrderModal (第 2 个订单)
   - Redux dispatch: placeOrder(...) → allOrders (新订单)
   - Redux dispatch: clearCurrentOrder()
   
6️⃣ 同理，再有人点菜
   - 又是一个新的 currentOrder for Table 1（可以是 C，也可以是 A 加菜）
   - placeOrder 时又产生一个新订单
   
最终状态 (举例):
allOrders = [
  { orderId: "ord-1", tableId: "table-1", diners: ["A"], items: [...], status: "CONFIRMED" },
  { orderId: "ord-2", tableId: "table-2", diners: ["X", "Y"], items: [...], status: "PENDING" },
  { orderId: "ord-3", tableId: "table-1", diners: ["B", "C"], items: [...], status: "PENDING" },
  { orderId: "ord-4", tableId: "table-1", diners: ["A"], items: [...], status: "PENDING" }  // A 的加菜单
]

说明：
- A 的第 1 个订单 (ord-1) 已确认
- A 的第 2 个订单 (ord-4) 是后来加的菜
- B、C 各有各的订单
- 每个订单独立管理和确认支付
```

### 流程 3: 处理订单

```
OrderScreen 状态分类:
- [待确认] Sub-Tab: 显示 status=PENDING 的订单
- [待支付] Sub-Tab: 显示 status=CONFIRMED 的订单

用户操作:
1. 在"待确认"看到新订单 → 点击"确认" 
   Redux dispatch: confirmOrder(orderId)
   订单状态: PENDING → CONFIRMED

2. 在"待支付"看到已确认订单 → 点击"支付"
   打开 CheckoutModal
   Redux dispatch: payOrder(orderId, method, amount)
   订单状态: CONFIRMED → PAID
   
3. Badge 实时更新
   unreadCount = allOrders.filter(o => o.status === 'PENDING').length
```

---

## 🔌 Redux 与 Navigation 的结合

### 手动导航 + 页面内链接

```javascript
// 当用户完成 AddDinersModal 时
const handleNextStep = () => {
  dispatch(setCurrentDiners(diners));
  // 关闭 Modal，显示 "开始点餐" 链接
  setShowStartOrderingLink(true);
};

// 用户点击 "开始点餐" 链接
const handleStartOrdering = () => {
  navigation.navigate('Menu');  // 手动导航到 Tab 2
};

// 当用户完成 MenuScreen 下单时
const handlePlaceOrder = () => {
  dispatch(placeOrder(...));
  dispatch(clearCurrentOrder());
  // 显示成功提示和可选的 "查看订单" 链接
  setShowViewOrdersLink(true);
};

// 用户点击 "查看订单" 链接 (可选)
const handleViewOrders = () => {
  navigation.navigate('Orders');  // 手动导航到 Tab 3（用户可选）
};
```

### 页面内链接示例

```javascript
// TablesScreen - 添加完用餐者后显示
{showStartOrderingLink && (
  <Button 
    text="🍴 开始为 Table 5 点餐"
    onPress={() => navigation.navigate('Menu')}
  />
)}

// MenuScreen - 下单成功后显示
{orderPlaced && (
  <Link 
    text="📋 查看订单" 
    onPress={() => navigation.navigate('Orders')}
  />
)}

// OrderScreen - 当有正在编辑的订单时显示返回按钮
{hasCurrentOrder && (
  <Link 
    text="← 继续点餐" 
    onPress={() => navigation.navigate('Menu')}
  />
)}
```

### 页面间数据同步（通过 Redux）

```javascript
// MenuScreen 初始化时
useEffect(() => {
  const { tableId, diners, shoppingCart } = useSelector(state => state.order.currentOrder);
  // 显示当前桌位和用餐者信息
  // 展示购物车
}, [dispatch])

// OrderScreen 初始化时
useEffect(() => {
  const allOrders = useSelector(state => state.order.allOrders);
  const pendingOrders = allOrders.filter(o => o.status === 'PENDING');
  dispatch(setUnreadCount(pendingOrders.length));
}, [dispatch])

// TablesScreen - 点击后显示内链
const handleDinersAdded = (diners) => {
  dispatch(setCurrentDiners(diners));
  setShowLink(true);  // 显示 "开始点餐" 链接
};
```

---

## 📝 技术要点

### 1. 状态管理
- ✅ Redux 管理全局订单和桌位状态
- ✅ 每个 Tab 都能访问当前订单信息
- ✅ 避免 Prop Drilling
- ✅ `currentOrder` 只保存一个正在编辑的订单，`allOrders` 保存所有已下单的订单

### 2. 导航同步
- ✅ 用户手动控制 Tab 切换，页面内链接引导
- ✅ Tab 内部数据从 Redux 动态读取
- ✅ 打印后 `clearCurrentOrder()`，下一个订单重新开始

### 3. 多桌并发设计
- ✅ **不需要增加状态**，`currentOrder` + `allOrders` 足够
- ✅ 每次 `placeOrder()` 时创建新订单，`clearCurrentOrder()` 清空当前编辑
- ✅ 选择不同桌位时，`setCurrentTable()` 更新 `currentOrder.tableId`
- ✅ **加菜视为新订单**：同一个桌位的 B、C 等用户各自点餐时产生独立订单

### 4. 数据流
- ✅ 用户输入 → Redux dispatch → 状态更新 → UI 重新渲染
- ✅ 支持多个订单同时处理（存储在 `allOrders` 中）
- ✅ 订单历史保存在 Redux allOrders

### 5. 实时更新
- ✅ 购物车实时计算总价
- ✅ Badge 自动计算待确认订单数
- ✅ 订单状态变化立即反映在 UI

---

## 🎯 与之前设计的对比

| 特性 | 旧设计 | 新设计 |
|------|------|------|
| MenuScreen | fullScreenModal (隐藏 Tab) | Tab 2 (Tab 始终可见) |
| 数据流 | Props/Navigation Params | Redux (集中管理) |
| Tab 切换 | 需要手动返回 | 用户手动 + 页面内链接引导 |
| 订单同步 | 可能不同步 | Redux 确保同步 |
| Tablet 支持 | ❌ (fullScreenModal 不友好) | ✅ (Tab 友好) |
| 用户体验 | 被迫自动跳转 | 主动控制，内链引导 |

---

## ✅ 实现检查清单

- [ ] Redux store 配置 (orderSlice + tableSlice + uiSlice) - **不需要增加额外字段**
- [ ] MenuScreen 成为独立的 Tab 2
- [ ] TablesScreen 支持选择不同桌位，调用 `setCurrentTable()`
- [ ] AddDinersModal 后显示 "开始点餐" 链接
- [ ] MenuScreen 从 Redux 读取当前订单信息
- [ ] 下单完成后调用 `clearCurrentOrder()` 清空当前编辑
- [ ] OrderScreen 显示 PENDING/CONFIRMED/PAID 订单
- [ ] OrderScreen Badge 实时更新待确认数
- [ ] CheckoutModal 支付流程
- [ ] 订单状态变化同步到 Redux
- [ ] **多桌并发**：打印后选新桌位时，自动清空并允许新订单 ✅

