import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OrderItem {
  itemId: string;
  dishId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  status: 'ORDERED' | 'CONFIRMED' | 'CANCELLED';
  confirmedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface OrderBatch {
  batchId: string;
  items: OrderItem[];
  confirmedAt: string;
  tabId: string; // Associate batch with specific diner
  dinerId: string; // Store diner ID for filtering
}

export interface Order {
  id: string;
  restaurantId: string;
  waiterId: string;
  tableNumber: string;
  dinerId: string;
  tabId: string;
  batches: OrderBatch[];
  totalConfirmedAmount: number;
  paidAmount?: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  isFromCustomerScan: boolean;
  scannedAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DraftItem {
  dishId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  dinerId: string; // Associate draft items with specific diner
}

export interface DinerTab {
  dinerId: string;
  tabId: string;
  name: string; // '🍴' for default, or user-provided name like 'Bob', 'Alice'
  tableNumber: string; // Associate diner with specific table
}

interface OrderState {
  currentOrder: Order | null;
  draftItems: DraftItem[];
  dinerTabs: DinerTab[];
  isLoading: boolean;
  error: string | null;
  selectedTableNumber: string | null;
  selectedDinerId: string;
  selectedTabId: string;
}

const initialState: OrderState = {
  currentOrder: null,
  draftItems: [],
  dinerTabs: [], // Will be populated based on selected table
  isLoading: false,
  error: null,
  selectedTableNumber: null,
  selectedDinerId: '0',
  selectedTabId: 'tab-0',
};

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    // 设置当前订单
    setCurrentOrder: (state, action: PayloadAction<Order>) => {
      state.currentOrder = action.payload;
      state.error = null;
    },

    // 清空当前订单
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
      state.draftItems = [];
      state.error = null;
    },

    // 添加菜品到草稿
    addDraftItem: (state, action: PayloadAction<DraftItem>) => {
      const existingIndex = state.draftItems.findIndex(
        item => item.dishId === action.payload.dishId && item.dinerId === action.payload.dinerId
      );

      if (existingIndex >= 0) {
        // 如果菜品已存在于当前diner，增加数量
        state.draftItems[existingIndex].quantity += action.payload.quantity;
      } else {
        // 新增菜品
        state.draftItems.push(action.payload);
      }
    },

    // 更新草稿菜品数量
    updateDraftItemQuantity: (
      state,
      action: PayloadAction<{ dishId: string; quantity: number; dinerId: string }>
    ) => {
      const item = state.draftItems.find(
        i => i.dishId === action.payload.dishId && i.dinerId === action.payload.dinerId
      );
      if (item) {
        item.quantity = Math.max(0, action.payload.quantity);
        if (item.quantity === 0) {
          state.draftItems = state.draftItems.filter(
            i => !(i.dishId === action.payload.dishId && i.dinerId === action.payload.dinerId)
          );
        }
      }
    },

    // 更新草稿菜品备注
    updateDraftItemNotes: (
      state,
      action: PayloadAction<{ dishId: string; notes: string; dinerId: string }>
    ) => {
      const item = state.draftItems.find(
        i => i.dishId === action.payload.dishId && i.dinerId === action.payload.dinerId
      );
      if (item) {
        item.notes = action.payload.notes;
      }
    },

    // 删除草稿菜品
    removeDraftItem: (state, action: PayloadAction<{ dishId: string; dinerId: string }>) => {
      state.draftItems = state.draftItems.filter(
        i => !(i.dishId === action.payload.dishId && i.dinerId === action.payload.dinerId)
      );
    },

    // 清空草稿菜品（清除指定diner的，如果不指定则清除所有）
    clearDraftItems: (state, action: PayloadAction<string | undefined>) => {
      if (action.payload) {
        // Clear only for the specified diner
        state.draftItems = state.draftItems.filter(item => item.dinerId !== action.payload);
      } else {
        // Clear all draft items
        state.draftItems = [];
      }
    },

    // 设置选中的桌号
    setSelectedTable: (state, action: PayloadAction<string>) => {
      const tableNumber = action.payload;
      state.selectedTableNumber = tableNumber;
      
      // Get existing diners for this table
      const tableDiners = state.dinerTabs.filter(tab => tab.tableNumber === tableNumber);
      
      if (tableDiners.length === 0) {
        // First time opening this table: add default diner
        const defaultTabId = `tab-${tableNumber}-0`;
        state.dinerTabs.push({
          dinerId: '0',
          tabId: defaultTabId,
          name: '🍴',
          tableNumber,
        });
        state.selectedDinerId = '0';
        state.selectedTabId = defaultTabId;
      } else {
        // Table already has diners: restore to first/default diner
        const defaultTab = tableDiners.find(tab => tab.dinerId === '0') || tableDiners[0];
        state.selectedDinerId = defaultTab.dinerId;
        state.selectedTabId = defaultTab.tabId;
      }
      
      // Clear draft items (new editing session for this table)
      state.draftItems = [];
    },

    // 设置分餐信息
    setDinerInfo: (
      state,
      action: PayloadAction<{ dinerId: string; tabId: string }>
    ) => {
      state.selectedDinerId = action.payload.dinerId;
      state.selectedTabId = action.payload.tabId;
    },

    // 添加新的分餐（diner）
    addDinerTab: (
      state,
      action: PayloadAction<{ name: string }>
    ) => {
      if (!state.selectedTableNumber) return;
      // Count diners for current table only
      const tableNumber = state.selectedTableNumber;
      const tableDiners = state.dinerTabs.filter(tab => tab.tableNumber === tableNumber);
      const nextDinerId = tableDiners.length.toString();
      const newTab: DinerTab = {
        dinerId: nextDinerId,
        tabId: `tab-${tableNumber}-${nextDinerId}`,
        name: action.payload.name,
        tableNumber,
      };
      state.dinerTabs.push(newTab);
      // 自动切换到新的 diner
      state.selectedDinerId = nextDinerId;
      state.selectedTabId = newTab.tabId;
    },

    // 移除分餐（不能移除 diner-0）
    removeDinerTab: (
      state,
      action: PayloadAction<string> // dinerId
    ) => {
      if (action.payload === '0') {
        console.warn('Cannot remove default diner (diner-0)');
        return;
      }
      state.dinerTabs = state.dinerTabs.filter(
        tab => !(tab.dinerId === action.payload && tab.tableNumber === state.selectedTableNumber)
      );
      // 如果删除的是当前选中的 diner，切换回 diner-0
      if (state.selectedDinerId === action.payload) {
        state.selectedDinerId = '0';
        state.selectedTabId = state.selectedTableNumber ? `tab-${state.selectedTableNumber}-0` : 'tab-0';
      }
    },

    // 重置分餐（删除当前表的所有 diner，只保留其他表的）
    resetDinerTabs: (state) => {
      if (state.selectedTableNumber) {
        state.dinerTabs = state.dinerTabs.filter(
          tab => tab.tableNumber !== state.selectedTableNumber
        );
      }
      state.selectedDinerId = '0';
      state.selectedTabId = state.selectedTableNumber ? `tab-${state.selectedTableNumber}-0` : 'tab-0';
    },

    // 设置加载状态
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // 设置错误
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // 更新订单总金额
    updateOrderTotal: (state, action: PayloadAction<number>) => {
      if (state.currentOrder) {
        state.currentOrder.totalConfirmedAmount = action.payload;
      }
    },

    // 更新订单状态
    updateOrderStatus: (
      state,
      action: PayloadAction<'PENDING' | 'PAID' | 'CANCELLED'>
    ) => {
      if (state.currentOrder) {
        state.currentOrder.status = action.payload;
      }
    },

    // 添加batch到订单
    addBatchToOrder: (state, action: PayloadAction<OrderBatch>) => {
      if (state.currentOrder) {
        state.currentOrder.batches.push(action.payload);
      }
    },

    // 从订单中删除item
    removeItemFromOrder: (state, action: PayloadAction<string>) => {
      if (state.currentOrder) {
        state.currentOrder.batches = state.currentOrder.batches
          .map(batch => ({
            ...batch,
            items: batch.items.filter(item => item.itemId !== action.payload),
          }))
          .filter(batch => batch.items.length > 0);
      }
    },

    // 更新item状态
    updateItemStatus: (
      state,
      action: PayloadAction<{
        itemId: string;
        status: 'ORDERED' | 'CONFIRMED' | 'CANCELLED';
        cancelReason?: string;
      }>
    ) => {
      if (state.currentOrder) {
        state.currentOrder.batches.forEach(batch => {
          const item = batch.items.find(i => i.itemId === action.payload.itemId);
          if (item) {
            item.status = action.payload.status;
            if (action.payload.status === 'CANCELLED') {
              item.cancelledAt = new Date().toISOString();
              item.cancelReason = action.payload.cancelReason;
            } else if (action.payload.status === 'CONFIRMED') {
              item.confirmedAt = new Date().toISOString();
            }
          }
        });
      }
    },
  },
});

export const {
  setCurrentOrder,
  clearCurrentOrder,
  addDraftItem,
  updateDraftItemQuantity,
  updateDraftItemNotes,
  removeDraftItem,
  clearDraftItems,
  setSelectedTable,
  setDinerInfo,
  addDinerTab,
  removeDinerTab,
  resetDinerTabs,
  setLoading,
  setError,
  updateOrderTotal,
  updateOrderStatus,
  addBatchToOrder,
  removeItemFromOrder,
  updateItemStatus,
} = orderSlice.actions;

export default orderSlice.reducer;
