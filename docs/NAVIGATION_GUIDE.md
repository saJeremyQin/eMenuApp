# eMenuApp 导航结构设计指南

## 🗺️ 整体架构

```
AppNavigator (根)
│
├─ isAuthenticated = false
│  └─ LoginScreen (身份认证)
│
└─ isAuthenticated = true
   │
   └─ AppTabs (底部 Tab 导航)
      │
      ├─ Tab 1: Home (首页)
      │  └─ HomeStack
      │     └─ HomeScreen
      │
      ├─ Tab 2: OrdersManagement (订单处理)
      │  └─ OrdersManagementStack
      │     └─ OrdersManagementScreen (2 tabs)
      │
      ├─ Tab 3: Tables (点菜)
      │  └─ TablesStack
      │     ├─ TablesScreen (主页面)
      │     ├─ AddDinersModal (modal)
      │     └─ MenuOrderEntryScreen (fullScreenModal)
      │
      ├─ Tab 4: Notifications (消息)
      │  └─ NotificationsStack
      │     └─ NotificationsScreen
      │
      └─ 全局 Modals (从任何地方打开)
         ├─ Checkout (支付)
         └─ OrderConfirm (订单确认)
```

---

## 📱 各 Stack 详解

### 1. HomeStack
```javascript
// 简单结构，只有首页
// 用途：快速统计和导航

// 如何从其他页面跳转到 Home Tab:
navigation.navigate('Home')
```

### 2. OrdersManagementStack
```javascript
// OrdersManagementScreen 包含 2 个 Tab
// Tab 1: Pending Orders (待确认)
// Tab 2: Pending Payment (待支付)

// 跳转方式:
navigation.navigate('OrdersManagement')
```

### 3. TablesStack ⭐ (最复杂)
```javascript
// 流程: Tables → AddDiners (modal) → MenuOrderEntry (fullScreenModal)

// 从 TablesScreen 打开 AddDiners Modal:
navigation.navigate('AddDiners', {tableNumber: 5})

// 从 AddDinersModal 打开 Menu (全屏):
navigation.navigate('MenuOrderEntry', {
  tableNumber: 5,
  diners: ['A', 'B', 'C']
})

// 从 MenuOrderEntry 完成后回到 Tables:
navigation.navigate('TablesMain')  // 或使用 goBack()

// 关键：Add Diners 和 Menu 使用 presentation: 'modal' / 'fullScreenModal'
// 所以关闭时会自动返回 TablesScreen，不需要手动处理
```

### 4. NotificationsStack
```javascript
// 简单，只有一个页面

// 跳转方式:
navigation.navigate('Notifications')
```

---

## 🔀 常见导航场景

### 场景 1: 创建新订单（Waiter 代点）
```
1. 用户在 Home Tab
2. 点击"新订单"按钮
3. 跳转到 Tables Tab: navigation.navigate('Tables')
4. 选择桌位 5
5. 打开 AddDiners Modal: navigation.navigate('AddDiners', {tableNumber: 5})
6. 输入用餐者 A, B, C，点"下一步"
7. 打开 Menu 全屏: navigation.navigate('MenuOrderEntry', {...})
8. 点菜完成，点"确认"
9. 触发全局 OrderConfirm Modal: navigation.navigate('OrderConfirm', {...})
10. 确认打印后，自动返回 Tables Tab
```

### 场景 2: 处理订单支付
```
1. 用户在 OrdersManagement Tab
2. 看到 Tab 2 (Pending Payment) 中的订单
3. 点击某个订单的"标记已支付"
4. 打开全局 Checkout Modal: navigation.navigate('Checkout', {orderId: '123'})
5. 确认支付后，关闭 Modal
6. OrdersManagement 自动刷新数据
```

### 场景 3: 从消息跳转到订单
```
1. 用户在 Notifications Tab，收到"订单 #5 待确认"消息
2. 点击消息
3. 直接跳转: navigation.navigate('OrdersManagement')
4. 自动定位到对应的订单
```

---

## 🎯 导航调用参考

### 导航到 Tab
```javascript
// 在任何地方都可以快速切换 Tab
navigation.navigate('Home')              // 首页
navigation.navigate('OrdersManagement')  // 订单
navigation.navigate('Tables')            // 点菜
navigation.navigate('Notifications')     // 消息
```

### 导航到 Stack 内部页面
```javascript
// TableStack 内部
navigation.navigate('Tables', {
  screen: 'TablesMain',
  params: {refreshKey: Math.random()}
})

// 或简写 (自动找到首个屏幕)
navigation.navigate('Tables')
```

### 打开 Modal
```javascript
// 全局 Modal - 从任何地方都能打开
navigation.navigate('Checkout', {
  orderId: '123',
  amount: 50.00
})

navigation.navigate('OrderConfirm', {
  orderId: '123',
  items: [...]
})

// Stack 内部 Modal - 只在 TablesStack 内打开
navigation.navigate('AddDiners', {
  tableNumber: 5
})
```

### 返回和关闭
```javascript
// 关闭 Modal (返回到前一个屏幕)
navigation.goBack()

// 返回到特定屏幕
navigation.navigate('TablesMain')

// 重置到首页
navigation.reset({
  index: 0,
  routes: [{name: 'Home'}]
})
```

---

## 📋 屏幕命名约定

| 屏幕类型 | 命名规则 | 示例 |
|---------|---------|------|
| 主屏幕 | `{Name}Screen` | `HomeScreen` |
| Modal/Dialog | `{Name}Modal` | `AddDinersModal` |
| Tab 栈主屏幕 | `{Name}Stack` | `HomeStack` |
| 栈内主页面 | `{Name}Main` | `HomeMain` |

---

## ✅ 导航检查清单

开发时确保：

- [ ] **HomeScreen 已创建** - 首页
- [ ] **OrdersManagementScreen 已创建** - 2 tab 订单处理
- [ ] **TablesScreen 已创建** - 桌位网格
- [ ] **AddDinersModal 已创建** - 输入用餐者
- [ ] **MenuOrderEntryScreen 已创建** - 点菜页面
- [ ] **NotificationsScreen 已创建** - 消息中心
- [ ] **CheckoutModal 已创建** - 支付模态
- [ ] **OrderConfirmModal 已创建** - 订单确认模态

---

## 🐛 常见问题

### Q1: 如何在 MenuOrderEntry 完成后自动返回 Tables？
```javascript
// MenuOrderEntry 中
const onConfirm = () => {
  // 1. 上传数据
  // 2. 显示确认 Modal
  navigation.navigate('OrderConfirm', {...})
  
  // 3. 确认后自动返回
  // (Modal 关闭时会自动回到 MenuOrderEntry)
  // (再关闭 MenuOrderEntry 会回到 AddDiners)
  // (再关闭 AddDiners 会回到 TablesScreen)
}
```

### Q2: 如何从 Notifications 跳转到某个订单？
```javascript
const onOrderPress = (orderId) => {
  // 跳转到 OrdersManagement Tab，并传递参数
  navigation.navigate('OrdersManagement', {
    screen: 'OrdersManagementMain',
    params: {selectedOrderId: orderId}
  })
}
```

### Q3: 底部 Tab 能否隐藏？
```javascript
// 在需要隐藏 Tab 的页面（如 MenuOrderEntry）使用:
useEffect(() => {
  navigation.setOptions({
    tabBarStyle: {display: 'none'}
  })
  
  return () => {
    navigation.setOptions({
      tabBarStyle: {display: 'flex'}
    })
  }
}, [navigation])
```

---

## 📚 相关文件位置

```
eMenuApp/
├── src/
│  ├── navigation/
│  │  └── AppNavigator.js (你现在要编辑的)
│  │
│  └── screens/
│     ├── LoginScreen.js ✅
│     ├── HomeScreen.js (待创建)
│     ├── TablesScreen.js (待创建)
│     ├── AddDinersModal.js (待创建)
│     ├── MenuOrderEntryScreen.js (待创建)
│     ├── OrdersManagementScreen.js (待创建)
│     ├── NotificationsScreen.js (待创建)
│     └── modals/
│        ├── CheckoutModal.js (待创建)
│        └── OrderConfirmModal.js (待创建)
└── NAVIGATION_GUIDE.md (本文件)
```
