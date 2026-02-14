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
}

interface OrderState {
  currentOrder: Order | null;
  draftItems: DraftItem[];
  isLoading: boolean;
  error: string | null;
  selectedTableNumber: string | null;
  selectedDinerId: string;
  selectedTabId: string;
}

const initialState: OrderState = {
  currentOrder: null,
  draftItems: [],
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
        item => item.dishId === action.payload.dishId
      );

      if (existingIndex >= 0) {
        // 如果菜品已存在，增加数量
        state.draftItems[existingIndex].quantity += action.payload.quantity;
      } else {
        // 新增菜品
        state.draftItems.push(action.payload);
      }
    },

    // 更新草稿菜品数量
    updateDraftItemQuantity: (
      state,
      action: PayloadAction<{ dishId: string; quantity: number }>
    ) => {
      const item = state.draftItems.find(i => i.dishId === action.payload.dishId);
      if (item) {
        item.quantity = Math.max(0, action.payload.quantity);
        if (item.quantity === 0) {
          state.draftItems = state.draftItems.filter(
            i => i.dishId !== action.payload.dishId
          );
        }
      }
    },

    // 更新草稿菜品备注
    updateDraftItemNotes: (
      state,
      action: PayloadAction<{ dishId: string; notes: string }>
    ) => {
      const item = state.draftItems.find(i => i.dishId === action.payload.dishId);
      if (item) {
        item.notes = action.payload.notes;
      }
    },

    // 删除草稿菜品
    removeDraftItem: (state, action: PayloadAction<string>) => {
      state.draftItems = state.draftItems.filter(i => i.dishId !== action.payload);
    },

    // 清空所有草稿
    clearDraftItems: (state) => {
      state.draftItems = [];
    },

    // 设置选中的桌号
    setSelectedTable: (state, action: PayloadAction<string>) => {
      state.selectedTableNumber = action.payload;
    },

    // 设置分餐信息
    setDinerInfo: (
      state,
      action: PayloadAction<{ dinerId: string; tabId: string }>
    ) => {
      state.selectedDinerId = action.payload.dinerId;
      state.selectedTabId = action.payload.tabId;
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
  setLoading,
  setError,
  updateOrderTotal,
  updateOrderStatus,
  addBatchToOrder,
  removeItemFromOrder,
  updateItemStatus,
} = orderSlice.actions;

export default orderSlice.reducer;
