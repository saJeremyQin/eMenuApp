import { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { setCurrentOrder, setError } from '../store/orderSlice';
import { query as gqlQuery } from '../services/GraphQLService';
import { GET_TABLE_STATUS } from '../graphql/queries';

/**
 * Hook: 管理 diner 订单切换
 * 当 selectedDinerId 改变时，自动从表的所有订单中查找并切换到对应的订单
 */
export function useDinerOrders() {
  const dispatch = useDispatch<AppDispatch>();
  const selectedTableNumber = useSelector((state: RootState) => state.order.selectedTableNumber);
  const selectedDinerId = useSelector((state: RootState) => state.order.selectedDinerId);
  const currentOrder = useSelector((state: RootState) => state.order.currentOrder);
  
  // 维护表的所有订单的本地缓存
  const [tableOrders, setTableOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastTableNumberRef = useRef<string | undefined>(undefined);

  // 初始化日志（只运行一次）
  useEffect(() => {
    console.log('🎣 useDinerOrders hook initialized');
  }, []);

  // Effect 1: 加载表的订单（当表号改变时）
  useEffect(() => {
    if (!selectedTableNumber) {
      setTableOrders([]);
      return;
    }

    // 如果表号没有改变，不需要重新加载
    if (selectedTableNumber === lastTableNumberRef.current) {
      return;
    }

    console.log('🎣 Table number changed to:', selectedTableNumber);
    lastTableNumberRef.current = selectedTableNumber;

    (async () => {
      setIsLoading(true);
      try {
        console.log('📦 Loading orders for table:', selectedTableNumber);
        const response = await gqlQuery(GET_TABLE_STATUS, {
          tableNumber: selectedTableNumber,
        });

        const tableStatus = (response as any).getTableStatus;
        console.log('📦 Table orders loaded:', {
          tableNumber: selectedTableNumber,
          activeOrdersCount: tableStatus?.activeOrders?.length || 0,
          orders: tableStatus?.activeOrders?.map((o: any) => ({
            id: o.id,
            dinerId: o.dinerId,
            tabId: o.tabId,
          })),
        });

        setTableOrders(tableStatus?.activeOrders || []);
        dispatch(setError(null));
      } catch (error) {
        console.error('❌ Failed to load table orders:', error);
        dispatch(setError(`Failed to load table orders: ${(error as any).message}`));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [selectedTableNumber, dispatch]);

  // Effect 1.5: 当 currentOrder 改变时，刷新 tableOrders（确保缓存最新）
  useEffect(() => {
    if (!selectedTableNumber || !currentOrder) {
      return;
    }

    console.log('🔄 currentOrder changed, refreshing tableOrders cache');
    
    // 刷新 tableOrders：添加新的 order 或更新现有的
    setTableOrders(prevOrders => {
      const existingIndex = prevOrders.findIndex(o => o.id === currentOrder.id);
      if (existingIndex >= 0) {
        // 更新现有订单
        const updated = [...prevOrders];
        updated[existingIndex] = currentOrder;
        return updated;
      } else {
        // 添加新订单
        return [...prevOrders, currentOrder];
      }
    });
  }, [currentOrder, selectedTableNumber]);

  // Effect 2: 切换 diner 的订单（当 diner 改变且订单已加载时）
  useEffect(() => {
    if (!selectedDinerId || tableOrders.length === 0) {
      return;
    }

    const dinerIdStr = String(selectedDinerId);

    console.log('🔄 Diner changed to:', {
      selectedDinerId: dinerIdStr,
      currentOrderId: currentOrder?.id,
      currentOrderDinerId: String(currentOrder?.dinerId),
      availableDiners: tableOrders.map(o => ({ id: o.id, dinerId: o.dinerId })),
    });

    // 在 tableOrders 中找出对应 dinerId 的订单
    const dinerOrder = tableOrders.find(order => String(order.dinerId) === dinerIdStr);

    if (!dinerOrder) {
      console.warn('⚠️ No order found for dinerId:', dinerIdStr);
      return;
    }

    if (dinerOrder.id === currentOrder?.id) {
      console.log('✅ Order already matches current diner');
      return;
    }

    console.log('✅ Switching currentOrder to:', {
      orderId: dinerOrder.id,
      dinerId: dinerOrder.dinerId,
      tabId: dinerOrder.tabId,
    });
    dispatch(setCurrentOrder(dinerOrder));
  }, [selectedDinerId, tableOrders, currentOrder?.id, dispatch]);

  return { isLoading, tableOrders };
}
