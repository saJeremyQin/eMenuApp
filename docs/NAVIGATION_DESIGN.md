# eMenuApp 导航结构设计 - 文档索引

> 📌 **最新版本 (v4)** - 2025-12-09
>
> 基于餐馆老板实际需求重新设计的 Waiter 点菜系统

## 📚 文档列表

### ✅ 最新设计 (推荐)
- **[NAVIGATION_DESIGN_V4.md](./NAVIGATION_DESIGN_V4.md)** - 完整的 v4 架构设计
  - TableScreen → OrderScreen 直接流程
  - 多 Tab 购物车设计（类似 Excel）
  - 退菜流程（CONFIRMED 状态可退，需记录原因）
  - 完整的 Redux 状态设计、API 设计、数据库 Schema

### 📜 历史文档
- **[NAVIGATION_REDESIGN.md](./NAVIGATION_REDESIGN.md)** - v3 架构 (2025-11-29)
  - Stack Navigator + Tablet 分屏设计
  - TableScreen 卡片 + DinersModal
  - 已过时，仅供参考

- **[REDUX_NAVIGATION_GUIDE.md](./REDUX_NAVIGATION_GUIDE.md)** - v2 (2025-11-25)
  - Redux 集成指南
  - 已过时，仅供参考

---

## 🚀 快速开始

### 核心理解（5 分钟）

1. **TableScreen**：8 个桌位网格
   - 点击桌位 → 直接进 OrderScreen

2. **OrderScreen**：点菜页面
   - 左侧：菜品分类 + 菜单
   - 右侧：多 Tab 购物车（支持分餐）
     - 默认 1 个 Tab "整桌"
     - `+` 号创建分餐 Tab
     - 每个 Tab 独立的菜品列表和支付

3. **购物车菜品状态**
   ```
   DRAFT → CONFIRMED → PAID
                    ↓
                  CANCELLED (仅 CONFIRMED 时可)
   ```

4. **关键流程**
   - 加菜：左侧选菜 → 自动加到当前 Tab
   - PlaceOrder：当前 Tab 的所有菜 DRAFT → CONFIRMED
   - 退菜：CONFIRMED 状态可删除，需选择原因
   - Pay：计算总价（排除已退菜）→ 菜品状态变 PAID

---

## 📊 架构概览

```
App
├─ TableScreen (桌位选择)
│  └─ OrderScreen (点菜 + 购物车)
│     ├─ 左侧：Dishes (菜品分类 + 菜单)
│     └─ 右侧：ShoppingCart
│        ├─ [整桌] [Alice] [Bob] [+]  (多 Tab)
│        ├─ 菜品表格 (Excel 风格)
│        ├─ 总计/实付
│        └─ [PlaceOrder] [Pay] (按钮)
│
└─ Redux State
   ├─ currentOrder (当前桌的多 Tab 购物车)
   ├─ allOrders (历史订单)
   ├─ tables (桌位信息)
   └─ notifications (新订单提醒)
```

---

## 🔄 完整流程示例

### Scenario: 4 个人一张桌，2 人分开支付

```
1️⃣ TableScreen
   点击 Table 5 → 进 OrderScreen

2️⃣ OrderScreen - 初始状态
   右侧: [整桌] [+]
   
3️⃣ 为 "整桌" Tab 加共享菜（如饺子）
   - 左侧选 "Dumplings" → 加 2 份
   - 右侧表格显示菜品

4️⃣ 点 [+] 创建分餐
   → 弹出输入框 / 自动命名 Tab 2
   → 切换到新 Tab

5️⃣ 为 Tab 2 (Alice) 加菜
   - 左侧选 "Steak" → 加 1 份
   - 右侧表格更新

6️⃣ 重复 4️⃣-5️⃣，为 Tab 3 (Bob) 加菜

7️⃣ 全部加好菜后，PlaceOrder
   - 点 [PlaceOrder]
   - 所有菜 DRAFT → CONFIRMED
   - 右侧表格菜品标签改为 "已确认"

8️⃣ 取消某道菜（例: Alice 不要 Steak）
   - 切换到 Alice 的 Tab
   - 找到 Steak 行，点 [删除]
   - 弹出 "退菜原因" Modal
   - 选择原因 → 确认
   - 表格更新：Steak 显示删除线 + 灰色

9️⃣ 支付
   - 先支付 Alice：点 [Pay] → 计算金额（排除已退菜）
   - 再支付 Bob：切换 Tab，点 [Pay]
   - 共享菜：可单独支付 "整桌" Tab，或混入其他 Tab

✅ 订单完成
```

---

## 💡 关键设计决策

### 为什么简化成这样？

| 特性 | v3 (旧) | v4 (新) | 原因 |
|------|--------|--------|------|
| TableScreen → MenuScreen | Stack 导航 | 直接进 OrderScreen | 减少步骤，更快 |
| Diner 选择 | 前置 DinersModal | 在 OrderScreen 创建 Tab | 更灵活，支持动态分餐 |
| 购物车 | 单菜品列表 | 多 Tab (Excel 风格) | 清晰的分账视图 |
| 退菜 | 复杂的多状态 | CONFIRMED 时可退 | 与餐馆实际流程一致 |
| 支付 | 菜品级别 | Tab 级别 | 简化计算，符合分餐需求 |

### 为什么 CONFIRMED 才能退菜？

1. **前端验证**：DRAFT 直接删除，无需通知后端
2. **后端通知**：CONFIRMED 后已发送厨房，需记录取消
3. **已支付**：Pay 后不处理（餐馆线下退款）

---

## 🛠️ 实现建议

### 前端（React Native）

1. **TableScreen**
   ```jsx
   const [tables, setTables] = useState([...]);
   
   const handleTablePress = (tableId) => {
     dispatch(setCurrentTable(tableId));
     navigation.navigate('OrderScreen');
   };
   ```

2. **OrderScreen**
   ```jsx
   const [activeTabId, setActiveTabId] = useState('default');
   const activeTab = tabs[activeTabId];
   
   const handleAddDish = (dish) => {
     dispatch(addToCart({ tabId: activeTabId, dish }));
   };
   
   const handleDeleteDish = (dishId) => {
     const item = activeTab.items.find(i => i.dishId === dishId);
     if (item.status === 'DRAFT') {
       dispatch(removeFromCart({ tabId: activeTabId, dishId }));
     } else if (item.status === 'CONFIRMED') {
       openCancelReasonModal(dishId);
     }
   };
   ```

3. **Redux**
   ```javascript
   orderSlice.addToCart({ tabId, dish })
   orderSlice.placeOrder({ tabId })
   orderSlice.cancelDish({ tabId, dishId, reason })
   orderSlice.pay({ tabId, amount })
   ```

### 后端（Node.js / Python）

1. **PlaceOrder**
   - 更新 order_items.status: DRAFT → CONFIRMED
   - 记录 confirmed_at

2. **CancelDish**
   - 验证 status = CONFIRMED
   - 更新 status = CANCELLED，记录原因
   - 通知厨房 (可选)

3. **Pay**
   - 计算总额（排除 CANCELLED）
   - 更新 status = PAID，记录 paid_at
   - 返回订单完成

---

## 📞 支持

- 问题？查看 [NAVIGATION_DESIGN_V4.md](./NAVIGATION_DESIGN_V4.md)
- 想要图片原型？（待生成）
- 代码实现？（待开发）


### ❌ 旧结构 (WhatsMenu)
```
RootNavigator (Stack)
├─ MainTabNavigator (Tab)
│  ├─ Tables
│  └─ AboutUs
│
└─ OrdersScreen (全屏覆盖 Tab)
   └─ 问题: Tab 会隐藏，回不了其他页面
```

**问题：**
- ❌ Orders 是在 Stack 层级，会完全覆盖 Tab
- ❌ 从 Orders 无法快速回到 Tables 或其他功能
- ❌ 无法同时显示 Tab 和 Orders


---

### ✅ 新结构 (eMenuApp)
```
AppNavigator (Stack)
│
├─ Auth (isAuthenticated=false)
│  └─ LoginScreen
│
└─ AppStack (isAuthenticated=true)
   │
   ├─ AppTabs (Tab Navigation)
   │  │
   │  ├─ Home Tab
   │  │  └─ HomeStack
   │  │     └─ HomeScreen
   │  │
   │  ├─ OrdersManagement Tab
   │  │  └─ OrdersManagementStack
   │  │     └─ OrdersManagementScreen
   │  │
   │  ├─ Tables Tab
   │  │  └─ TablesStack
   │  │     ├─ TablesScreen
   │  │     ├─ AddDinersModal (presentation: 'modal')
   │  │     └─ MenuOrderEntryScreen (presentation: 'fullScreenModal')
   │  │
   │  └─ Notifications Tab
   │     └─ NotificationsStack
   │        └─ NotificationsScreen
   │
   └─ Global Modals (可从任何 Tab 打开)
      ├─ Checkout
      └─ OrderConfirm
```

**优势：**
- ✅ 4 个独立的 Tab，随时切换
- ✅ 每个 Tab 有自己的导航栈，互不影响
- ✅ Modal 和 fullScreenModal 可以在 Tab 上浮层显示
- ✅ 全局 Modal 可从任何地方打开（Checkout, OrderConfirm）
- ✅ 清晰的层级关系，易于维护

---

## 🎨 视觉流程示意

### 场景 1: Waiter 代点流程

```
┌─────────────────────────────────────────────────────┐
│  首页 (HomeScreen)                          [🏠📋🍽️📬] │
│  ┌─────────────────────────────────────────────┐   │
│  │ 快速统计: 3 个待确认订单                        │   │
│  │ [新订单] [查看订单] [消息]                    │   │
│  └─────────────────────────────────────────────┘   │
│                                                       │
│  点击 [新订单]  ↓↓↓                                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  点菜 Tab (TablesScreen)                   [🏠📋🍽️📬] │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🟢 桌 1    🔴 桌 2    🟢 桌 3              │   │
│  │ 🔴 桌 4    🟢 桌 5    🔴 桌 6              │   │
│  │ 🟢 桌 7    🟢 桌 8                         │   │
│  └─────────────────────────────────────────────┘   │
│                                                       │
│  点击 🟢 桌 5  ↓↓↓                                  │
└─────────────────────────────────────────────────────┘

┌──────────────────────────────────────────┐          ← Modal 浮层
│  添加用餐者 (AddDinersModal)              │          
│  ┌──────────────────────────────────────┐│          
│  │ 桌位 5 - 添加用餐者                    ││          
│  │ ┌──────────────────────────────────┐ ││          
│  │ │ [+ 添加用餐者]                    │ ││          
│  │ │ [A] ______ ×                    │ ││          
│  │ │ [B] ______ ×                    │ ││          
│  │ │ [C] ______ ×                    │ ││          
│  │ │ 快速: [A] [B] [C] [D]           │ ││          
│  │ │ ┌──────────────────────────────┐ │ ││          
│  │ │ │  [取消]  [下一步:点菜]        │ │ ││          
│  │ │ └──────────────────────────────┘ │ ││          
│  │ └──────────────────────────────────┘ ││          
│  └──────────────────────────────────────┘│          
│                                          │  ← 点击下一步
└──────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│  点菜 (MenuOrderEntryScreen)        ← 全屏 Modal     │
│  ┌───────────────────────────────────────────────┐   │
│  │ 左: 菜单分类              右: 购物车             │   │
│  │ ┌──────────────┐         ┌─────────────────┐│   │
│  │ │ 前菜  ▶      │         │ 桌 5 订单         ││   │
│  │ │ 主菜  ▶      │  ←→     │ 用餐: A, B, C    ││   │
│  │ │ 饮料  ▶      │         │ ─────────────── ││   │
│  │ │ 甜点  ▶      │         │ × 菜 1  ×1  $10 ││   │
│  │ └──────────────┘         │ × 菜 2  ×2  $20 ││   │
│  │                          │ × 菜 3  ×3  $30 ││   │
│  │                          │ ─────────────── ││   │
│  │                          │ 小计: $60        ││   │
│  │                          │ [取消] [确认打印] ││   │
│  │                          └─────────────────┘│   │
│  └───────────────────────────────────────────────┘   │
│                                                       │
│  点击 [确认打印]  ↓↓↓                                │
└───────────────────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  订单确认 (OrderConfirmModal)            │  ← Global Modal
│  ┌────────────────────────────────────┐ │
│  │ 确认打印？                          │ │
│  │ 订单 #5                             │ │
│  │ 3 道菜，总价 $60                    │ │
│  │ ┌────────────────────────────────┐ │ │
│  │ │  [取消]  [确认打印]            │ │ │
│  │ └────────────────────────────────┘ │ │
│  └────────────────────────────────────┘ │
│                                          │
│  点击 [确认打印]  ↓↓↓                   │
└────────────────────────────────────────┘

自动返回 ↓

┌─────────────────────────────────────────────────────┐
│  点菜 Tab (TablesScreen)                   [🏠📋🍽️📬] │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🟢 桌 1    🔴 桌 2    🟢 桌 3              │   │
│  │ 🔴 桌 4    🔴 桌 5    🔴 桌 6              │   │
│  │ 🟢 桌 7    🟢 桌 8    (桌5已占用)          │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│ 整个流程完成！用户可以:                              │
│ • 继续点菜 (选择其他桌位)                            │
│ • 切换到 📋 Tab 处理待支付订单                       │
│ • 切换到 📬 Tab 查看消息                            │
└─────────────────────────────────────────────────────┘
```

---

### 场景 2: 处理支付

```
┌─────────────────────────────────────────────────────┐
│  订单 Tab (OrdersManagementScreen)          [🏠📋🍽️📬] │
│  ┌─────────────────────────────────────────────┐   │
│  │ [待确认] [待支付]                            │   │
│  │                                              │   │
│  │ 待支付订单:                                 │   │
│  │ ┌─────────────────────────────────────────┐ │   │
│  │ │ 桌 3 - 3 位用餐者                       │ │   │
│  │ │ 3 道菜，总价 $50                       │ │   │
│  │ │ [标记已支付] [重新打印]                 │ │   │
│  │ └─────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  点击 [标记已支付]  ↓↓↓                           │
└─────────────────────────────────────────────────────┘

┌────────────────────────────────┐
│  支付 (CheckoutModal)            │  ← Global Modal
│  ┌────────────────────────────┐ │
│  │ 桌 3 - 支付确认              │ │
│  │ 总额: $50                    │ │
│  │ ┌────────────────────────┐  │ │
│  │ │ 收款方式:              │  │ │
│  │ │ ◉ 现金   ○ 刷卡        │  │ │
│  │ │                        │  │ │
│  │ │ 收款金额: [50  ]       │  │ │
│  │ │ 找零: $0               │  │ │
│  │ │ ┌────────────────────┐ │  │ │
│  │ │ │ [取消] [确认支付]   │ │  │ │
│  │ │ └────────────────────┘ │  │ │
│  │ └────────────────────────┘  │ │
│  └────────────────────────────┘ │
│                                  │
│  点击 [确认支付]  ↓↓↓           │
└────────────────────────────────┘

自动关闭 Modal ↓

┌─────────────────────────────────────────────────────┐
│  订单 Tab (OrdersManagementScreen)          [🏠📋🍽️📬] │
│  ┌─────────────────────────────────────────────┐   │
│  │ [待确认] [待支付]                            │   │
│  │                                              │   │
│  │ 待支付订单:                                 │   │
│  │ ┌─────────────────────────────────────────┐ │   │
│  │ │ (桌 3 已移除，自动刷新列表)               │ │   │
│  │ │                                          │ │   │
│  │ │ (如果还有其他待支付订单会显示)           │ │   │
│  │ └─────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│ 支付成功！                                          │
└─────────────────────────────────────────────────────┘
```

---

## 🔑 关键设计原则

### 1. **Tab 永不关闭**
- 4 个主 Tab (Home, OrdersManagement, Tables, Notifications) 始终可见
- 用户可随时切换，无需返回或确认

### 2. **Modal 层级清晰**
- **Stack 内 Modal**: AddDinersModal (在 TablesStack 内)
- **Stack 内 FullScreenModal**: MenuOrderEntryScreen (在 TablesStack 内)
- **全局 Modal**: Checkout, OrderConfirm (在所有 Stack 外)

### 3. **返回流程自动化**
```
MenuOrderEntry
    ↓ (fullScreenModal)
AddDinersModal
    ↓ (modal)
TablesScreen
    ↓ (goBack 或 navigate)
可以立即切换到其他 Tab
```

### 4. **数据通过 Redux 或 Context**
- 不依赖导航参数传递复杂数据
- Modal 完成后，通过状态管理自动更新 UI
- 例如: Checkout Modal 完成支付后，OrdersManagement 自动刷新

---

## 💻 代码使用示例

### 从 HomeScreen 跳转到新订单流程
```javascript
const HomeScreen = ({navigation}) => {
  const handleNewOrder = () => {
    // 直接跳转到 Tables Tab
    navigation.navigate('Tables')
  }

  return (
    <View>
      <Button onPress={handleNewOrder} title="新订单" />
    </View>
  )
}
```

### 从 TablesScreen 打开 AddDiners Modal
```javascript
const TablesScreen = ({navigation}) => {
  const handleTablePress = (tableNumber) => {
    navigation.navigate('AddDiners', {tableNumber})
  }

  return (
    <View>
      {/* 桌位网格 */}
    </View>
  )
}
```

### 从任何地方打开全局 Checkout Modal
```javascript
const OrderCard = ({navigation, orderId}) => {
  const handlePayment = () => {
    navigation.navigate('Checkout', {orderId})
  }

  return (
    <Pressable onPress={handlePayment}>
      <Text>标记已支付</Text>
    </Pressable>
  )
}
```

---

## ✅ 总结

| 特点 | 旧结构 | 新结构 |
|-----|-------|-------|
| 页面数 | 3 | 7 |
| 底部 Tab 数 | 2 | 4 |
| 支持 Modal | ❌ | ✅ |
| 快速切换功能 | ❌ | ✅ |
| 易于扩展 | ❌ | ✅ |
| 用户体验 | 一般 | 优秀 |

新结构完全满足 eMenuApp 的 7 页面设计，灵活、清晰、易维护！
