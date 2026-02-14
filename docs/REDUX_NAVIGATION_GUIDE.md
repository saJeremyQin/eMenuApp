# Redux + Navigation 实现快速参考

## 📦 需要的 Redux Slices

### 1. orderSlice.js

```javascript
// 管理订单相关状态
{
  currentOrder: {
    tableId: null,
    diners: [],
    shoppingCart: [],  // [{ dishId, name, quantity, price }]
    createdAt: null
  },
  allOrders: []  // [{ orderId, tableId, diners, items, totalAmount, status, ... }]
}

Actions:
- setCurrentTable(tableId)
- setCurrentDiners(diners)
- addToCart(dish)
- removeFromCart(dishId)
- updateCartItem(dishId, quantity)
- clearCart()
- placeOrder(orderData)         // 创建新订单，status: PENDING
- confirmOrder(orderId)         // 确认订单，status: CONFIRMED
- payOrder(orderId, payment)    // 标记支付，status: PAID
- clearCurrentOrder()           // 清空当前订单
```

### 2. tableSlice.js

```javascript
// 管理桌位相关状态
{
  tables: [
    { id: "table-1", number: 1, status: "EMPTY", occupants: 0 }
  ]
}

Actions:
- setTables(tables)
- updateTableStatus(tableId, status)
- updateTableOccupants(tableId, count)
```

### 3. uiSlice.js

```javascript
// 管理 UI 相关状态
{
  unreadNotificationCount: 0,
  activeTab: "Tables"
}

Actions:
- setUnreadCount(count)
- setActiveTab(tabName)
```

---

## 🔗 Navigation 流程

### 关键 Navigation 自动触发

```javascript
// 1. AddDinersModal 完成后
const handleNextStep = (diners) => {
  dispatch(setCurrentDiners(diners));
  // 自动切换到 MenuScreen Tab
  navigation.navigate('Menu');
}

// 2. MenuScreen PlaceOrder 后
const handlePlaceOrder = () => {
  // 创建订单
  dispatch(placeOrder({
    tableId: currentOrder.tableId,
    diners: currentOrder.diners,
    items: currentOrder.shoppingCart
  }));
  
  // 清空当前订单
  dispatch(clearCurrentOrder());
  
  // 自动切换到 OrderScreen Tab
  navigation.navigate('Orders');
}

// 3. CheckoutModal 支付后
const handlePayment = (orderId, paymentData) => {
  dispatch(payOrder(orderId, paymentData));
  // 返回 OrderScreen，订单列表自动刷新
}
```

---

## 📊 数据流图

```
┌─────────────────────────────────────────────┐
│         Redux Store                         │
├─────────────────────────────────────────────┤
│  orderSlice:                                │
│  ├─ currentOrder { tableId, diners, cart }  │
│  └─ allOrders []                            │
│                                             │
│  tableSlice:                                │
│  └─ tables []                               │
│                                             │
│  uiSlice:                                   │
│  └─ unreadCount                             │
└────────────┬─────────────────────────────────┘
             │
             ├──→ TableScreen (读取 tables)
             │    └──→ AddDinersModal (dispatch: setCurrentTable, setCurrentDiners)
             │
             ├──→ MenuScreen (读取 currentOrder)
             │    └──→ PlaceOrder (dispatch: placeOrder, clearCurrentOrder)
             │
             ├──→ OrderScreen (读取 allOrders, 计算 unreadCount)
             │    └──→ CheckoutModal (dispatch: payOrder)
             │
             └──→ Badge (显示 unreadCount)
```

---

## 💾 Redux Store 初始化

```javascript
// src/store/store.js
import { configureStore } from '@reduxjs/toolkit';
import orderSlice from './orderSlice';
import tableSlice from './tableSlice';
import uiSlice from './uiSlice';

export const store = configureStore({
  reducer: {
    order: orderSlice,
    table: tableSlice,
    ui: uiSlice,
  },
});
```

---

## 📱 各 Screen 的 Redux 集成

### TableScreen
```javascript
const { tables } = useSelector(state => state.table);
const dispatch = useDispatch();

const selectTable = (tableId) => {
  dispatch(setCurrentTable(tableId));
  // 打开 AddDinersModal
}
```

### MenuScreen
```javascript
const { currentOrder } = useSelector(state => state.order);
const { tableId, diners, shoppingCart } = currentOrder;
const dispatch = useDispatch();

// 显示当前桌位和用餐者
// 菜品列表允许添加到购物车
const addDish = (dish) => {
  dispatch(addToCart(dish));
}

const placeOrder = () => {
  dispatch(placeOrder({
    tableId,
    diners,
    items: shoppingCart,
    totalAmount: calculateTotal(shoppingCart)
  }));
  dispatch(clearCurrentOrder());
  navigation.navigate('Orders');
}
```

### OrderScreen
```javascript
const { allOrders } = useSelector(state => state.order);
const dispatch = useDispatch();

useEffect(() => {
  // 计算待确认订单数
  const pendingCount = allOrders.filter(o => o.status === 'PENDING').length;
  dispatch(setUnreadCount(pendingCount));
}, [allOrders, dispatch]);

const pendingOrders = allOrders.filter(o => o.status === 'PENDING');
const confirmedOrders = allOrders.filter(o => o.status === 'CONFIRMED');

// 显示 2 个 Sub-Tab 的订单列表
```

### BadgeComponent (右上角通知)
```javascript
const { unreadNotificationCount } = useSelector(state => state.ui);

return (
  <View>
    {unreadNotificationCount > 0 && (
      <Badge count={unreadNotificationCount} />
    )}
  </View>
);
```

---

## 🔄 Redux Actions 示例

### placeOrder Action

```javascript
export const placeOrder = (payload) => (dispatch) => {
  const newOrder = {
    orderId: generateId(),
    tableId: payload.tableId,
    diners: payload.diners,
    items: payload.items,
    totalAmount: payload.totalAmount,
    status: 'PENDING',  // 初始状态
    createdAt: new Date().toISOString()
  };
  
  dispatch(addOrder(newOrder));
  // TODO: 发送到后端 API
  // API.createOrder(newOrder)
};
```

### confirmOrder Action

```javascript
export const confirmOrder = (orderId) => (dispatch, getState) => {
  dispatch(updateOrderStatus({ orderId, status: 'CONFIRMED' }));
  // TODO: 发送到后端 API
  // API.confirmOrder(orderId)
};
```

### payOrder Action

```javascript
export const payOrder = (orderId, paymentData) => (dispatch) => {
  dispatch(updateOrderStatus({
    orderId,
    status: 'PAID',
    paidAt: new Date().toISOString()
  }));
  // TODO: 发送到后端 API
  // API.payOrder(orderId, paymentData)
};
```

---

## ✅ 实现检查清单

### Phase 1: Redux 基础设施
- [ ] 创建 orderSlice.js 及所有 actions
- [ ] 创建 tableSlice.js 及所有 actions
- [ ] 创建 uiSlice.js 及所有 actions
- [ ] 配置 Redux store
- [ ] 在 App.tsx 中包装 Provider

### Phase 2: Navigation 修改
- [ ] 将 MenuScreen 改为独立的 Tab 2
- [ ] 移除 fullScreenModal 实现
- [ ] 添加 AddDinersModal → MenuScreen 自动导航
- [ ] 添加 MenuScreen → OrderScreen 自动导航

### Phase 3: Screen 集成 Redux
- [ ] TableScreen 连接 Redux (读取 tables)
- [ ] AddDinersModal 连接 Redux (dispatch actions)
- [ ] MenuScreen 连接 Redux (读取 + dispatch)
- [ ] OrderScreen 连接 Redux (读取 + dispatch)
- [ ] Badge 显示 unreadCount

### Phase 4: 数据同步
- [ ] 购物车实时计算总价
- [ ] Badge 实时更新待确认数
- [ ] 订单状态变化立即反映
- [ ] 支持多个订单同时处理

