import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState, AppDispatch } from '../store/store';
import { addDraftItem, updateDraftItemQuantity, removeDraftItem, addDinerTab, setDinerInfo, setCurrentOrder, completeDiningSession, clearDinerOrderIdsForTable, setDinerOrderId, setDinerCheckoutState, DinerTab } from '../store/orderSlice';
import { useCancelOrderItem, usePayOrder } from '../hooks/useOrder';
import { useDinerOrders } from '../hooks/useDinerOrders';
import { usePrintReceipt } from '../hooks/usePrintReceipt';
import {
  selectDishTypes,
  selectDishesByType,
  selectActiveDishTypes,
  fetchDishesAndTypes,
  Dish,
  DishType,
} from '../store/dishesSlice';
import { THEME } from '../config/theme';
import { formatDateTime } from '../lib/dateUtils';
import DishCard from '../components/DishCard';
import OrderReviewScreen from './OrderReviewScreen';

interface DraftItemUI extends Dish {
  quantity: number;
}

export default function MenuScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const allDraftItems = useSelector((state: RootState) => state.order.draftItems);
  
  // 从 Redux 获取分餐信息
  const selectedTableNumber = useSelector((state: RootState) => state.order.selectedTableNumber);
  const allDinerTabs = useSelector((state: RootState) => state.order.dinerTabs);
  const selectedDinerId = useSelector((state: RootState) => state.order.selectedDinerId);
  const selectedTabId = useSelector((state: RootState) => state.order.selectedTabId);
  const currentOrder = useSelector((state: RootState) => state.order.currentOrder);
  const selectedDinerIdStr = String(selectedDinerId);
  
  // 使用 hook 管理 diner 订单切换
  const { refreshTableOrders, tableOrders } = useDinerOrders();
  
  // Filter diner tabs to show only for the current table
  const dinerTabs = useMemo(() => {
    return selectedTableNumber ? allDinerTabs.filter(tab => tab.tableNumber === selectedTableNumber) : [];
  }, [allDinerTabs, selectedTableNumber]);

  const currentDinerTab = useMemo(() => {
    return dinerTabs.find(tab => String(tab.dinerId) === selectedDinerIdStr);
  }, [dinerTabs, selectedDinerIdStr]);

  const canMarkPaid = useMemo(() => {
    return currentDinerTab?.checkoutState === 'payable' && !!currentDinerTab?.orderId;
  }, [currentDinerTab]);

  // Verify selectedDinerId belongs to current table, reset if not
  useEffect(() => {
    if (selectedTableNumber && dinerTabs.length > 0) {
      const dinerExists = dinerTabs.some(tab => String(tab.dinerId) === selectedDinerIdStr);
      if (!dinerExists) {
        // Reset to default diner for current table
        const defaultTab = dinerTabs.find(tab => tab.dinerId === '0');
        if (defaultTab) {
          dispatch(setDinerInfo({ dinerId: '0', tabId: defaultTab.tabId }));
        }
      }
    }
  }, [selectedTableNumber, dinerTabs, selectedDinerIdStr, dispatch]);
  
  // Filter draft items to show only for the current diner
  const draftItems = useMemo(() => {
    return allDraftItems.filter(item => String(item.dinerId) === selectedDinerIdStr);
  }, [allDraftItems, selectedDinerIdStr]);
  
  // 从 Redux 获取缓存的菜品和分类
  const allDishTypes = useSelector(selectActiveDishTypes);
  const dishesLoading = useSelector((state: RootState) => state.dishes.isLoading);
  const dishesLoaded = useSelector((state: RootState) => state.dishes.isLoaded);
  const dishesError = useSelector((state: RootState) => state.dishes.error);
  const allDishes = useSelector((state: RootState) => state.dishes.dishes);
  
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const selectedDishes = useSelector((state: RootState) =>
    selectedTypeId ? selectDishesByType(selectedTypeId)(state) : []
  );

  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [editMode, setEditMode] = useState(false);
  const [showOrderReviewModal, setShowOrderReviewModal] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const paidOrdersByTableRef = useRef<Record<string, any[]>>({});
  const dinerActivityByTableRef = useRef<Record<string, Set<string>>>({});
  const { cancelItem } = useCancelOrderItem();
  const { payOrder: markPaidOrder, isSubmitting: isMarkPaidSubmitting } = usePayOrder();
  const {
    printReceipt,
    previewReceipt,
    printTableSummaryFromOrders,
    previewTableSummaryFromOrders,
  } = usePrintReceipt();

  const isLandscape = dimensions.width > dimensions.height;

  // Calculate grid columns based on screen size
  const getMenuColumns = () => {
    if (!isLandscape) return 2;
    if (dimensions.width > 1200) return 4;
    if (dimensions.width > 900) return 3;
    return 2;
  };

  // Debug logs
  useEffect(() => {
    console.log('MenuScreen Debug:', {
      dishesLoaded,
      dishesLoading,
      dishesError,
      allDishTypesCount: allDishTypes.length,
      allDishesCount: allDishes.length,
      selectedTypeId,
      selectedDishesCount: selectedDishes.length,
    });
  }, [dishesLoaded, dishesLoading, dishesError, allDishTypes, allDishes, selectedTypeId, selectedDishes]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // 手动加载菜品和分类（如果 Redux 中没有数据）
  useEffect(() => {
    if (!dishesLoaded && !dishesLoading && !allDishes.length) {
      console.log('📡 MenuScreen: Loading dishes from GraphQL...');
      dispatch(fetchDishesAndTypes());
    }
  }, []);

  // 监控 currentOrder 变化（用于调试）
  useEffect(() => {
    console.log('📊 MenuScreen: currentOrder updated', {
      hasOrder: !!currentOrder,
      orderId: currentOrder?.id,
      batchesCount: currentOrder?.batches?.length || 0,
      selectedDinerId,
      selectedTabId,
      batches: currentOrder?.batches?.map((b: any) => ({
        batchId: b.batchId,
        tabId: b.tabId,
        dinerId: b.dinerId,
        itemsCount: b.items?.length,
        itemStatuses: b.items?.map((i: any) => i.status),
      })),
      totalConfirmedAmount: currentOrder?.totalConfirmedAmount,
    });
  }, [currentOrder, selectedDinerId, selectedTabId]);

  // 当菜品分类加载完后，自动选中第一个
  useEffect(() => {
    if (allDishTypes.length > 0 && !selectedTypeId) {
      setSelectedTypeId(allDishTypes[0].id);
    }
  }, [allDishTypes, selectedTypeId]);

  // 组合草稿项目与菜品数据及数量
  const dishesWithQuantity: DraftItemUI[] = useMemo(() => {
    return selectedDishes.map(dish => ({
      ...dish,
      quantity: draftItems.find(d => d.dishId === dish.id)?.quantity || 0,
    }));
  }, [selectedDishes, draftItems]);

  const handleAddDish = (dish: Dish) => {
    if (guardPaidDinerEditAction()) return;

    dispatch(
      addDraftItem({
        dishId: dish.id,
        name: dish.name,
        price: dish.price,
        quantity: 1,
        dinerId: selectedDinerId,
      })
    );
  };

  const handleUpdateQuantity = (dishId: string, quantity: number) => {
    if (guardPaidDinerEditAction()) return;

    if (quantity === 0) {
      dispatch(removeDraftItem({ dishId, dinerId: selectedDinerId }));
    } else {
      dispatch(updateDraftItemQuantity({ dishId, quantity, dinerId: selectedDinerId }));
    }
  };

  const addPaidOrderSnapshot = (tableNumber: string, paidOrder: any) => {
    const existing = paidOrdersByTableRef.current[tableNumber] || [];
    const withoutSameId = existing.filter((o: any) => o.id !== paidOrder.id);
    paidOrdersByTableRef.current[tableNumber] = [...withoutSameId, paidOrder];
  };

  const getPaidOrdersForTable = (tableNumber: string) => {
    return paidOrdersByTableRef.current[tableNumber] || [];
  };

  const clearPaidOrdersForTable = (tableNumber: string) => {
    delete paidOrdersByTableRef.current[tableNumber];
  };

  const getPaidOrderForDiner = (tableNumber: string, dinerId: string) => {
    return getPaidOrdersForTable(tableNumber).find(
      (order: any) => String(order?.dinerId) === String(dinerId)
    );
  };

  const hasActiveOrderForDiner = (dinerId: string) => {
    return tableOrders.some((order: any) => String(order.dinerId) === String(dinerId));
  };

  const findFirstUnpaidTab = () => {
    const pendingDinerIds = new Set(
      tableOrders.map((order: any) => String(order.dinerId))
    );

    return dinerTabs.find(tab => pendingDinerIds.has(String(tab.dinerId)));
  };

  const switchToFirstUnpaidDiner = () => {
    const nextTab = findFirstUnpaidTab();
    if (!nextTab) {
      return;
    }

    dispatch(setDinerInfo({
      dinerId: String(nextTab.dinerId),
      tabId: String(nextTab.tabId),
    }));

    const nextOrder = tableOrders.find(
      (order: any) => String(order.dinerId) === String(nextTab.dinerId)
    );

    if (nextOrder) {
      dispatch(setDinerOrderId({
        dinerId: String(nextOrder.dinerId),
        orderId: String(nextOrder.id),
        tableNumber: String(selectedTableNumber),
      }));
      dispatch(setDinerCheckoutState({
        dinerId: String(nextOrder.dinerId),
        checkoutState: 'payable',
        tableNumber: String(selectedTableNumber),
      }));
      dispatch(setCurrentOrder(nextOrder));
    }
  };

  const isSelectedDinerPaid = useMemo(() => {
    if (!selectedTableNumber) return false;

    // Active backend orders are the source of truth for unpaid diners.
    if (hasActiveOrderForDiner(selectedDinerIdStr)) {
      return false;
    }

    const hasPaidSnapshot = !!getPaidOrderForDiner(selectedTableNumber, selectedDinerIdStr);
    return hasPaidSnapshot;
  }, [selectedTableNumber, selectedDinerIdStr, tableOrders]);

  const guardPaidDinerEditAction = () => {
    if (!isSelectedDinerPaid) {
      return false;
    }

    Alert.alert(
      'Diner Already Paid',
      'This diner is already paid. Switch to an unpaid diner to continue.',
      [
        {
          text: 'Stay',
          style: 'cancel',
        },
        {
          text: 'Switch',
          onPress: () => switchToFirstUnpaidDiner(),
        },
      ]
    );

    return true;
  };

  const getTabStatusLabel = (tab: DinerTab) => {
    if (!selectedTableNumber) return '';

    if (tab.checkoutState === 'sending') return 'Sending';

    const tabDinerId = String(tab.dinerId);
    const tabIsPending = hasActiveOrderForDiner(tabDinerId);

    if (tabIsPending) return 'Pending';

    const tabIsPaid = !!getPaidOrderForDiner(selectedTableNumber, tabDinerId);

    if (tabIsPaid) return 'Paid';
    return '';
  };

  const trackDinerActivity = (tableNumber: string, dinerIds: Array<string | number | undefined>) => {
    const normalized = dinerIds
      .filter((id): id is string | number => id !== undefined && id !== null)
      .map(id => String(id));

    if (normalized.length === 0) return;

    const existing = dinerActivityByTableRef.current[tableNumber] || new Set<string>();
    normalized.forEach(id => existing.add(id));
    dinerActivityByTableRef.current[tableNumber] = existing;
  };

  const getTrackedDinerActivity = (tableNumber: string) => {
    return Array.from(dinerActivityByTableRef.current[tableNumber] || new Set<string>());
  };

  const clearTrackedDinerActivity = (tableNumber: string) => {
    delete dinerActivityByTableRef.current[tableNumber];
  };

  useEffect(() => {
    if (!selectedTableNumber || !currentOrder?.dinerId) {
      return;
    }

    trackDinerActivity(selectedTableNumber, [currentOrder.dinerId]);
  }, [selectedTableNumber, currentOrder?.dinerId]);

  const askTableSummaryReceipt = (orders: any[]) => {
    return new Promise<void>((resolve) => {
      Alert.alert(
        'Table Summary Receipt',
        'All diners are marked paid. Print a full table summary receipt?',
        [
          {
            text: 'No',
            style: 'cancel',
            onPress: () => resolve(),
          },
          {
            text: 'Preview',
            onPress: async () => {
              try {
                await previewTableSummaryFromOrders(orders);
              } finally {
                resolve();
              }
            },
          },
          {
            text: 'Print',
            onPress: async () => {
              try {
                await printTableSummaryFromOrders(orders);
              } finally {
                resolve();
              }
            },
          },
        ]
      );
    });
  };

  const pickNextOrder = (orders: any[], currentDinerIdValue: string) => {
    if (!orders || orders.length === 0) return null;

    const sorted = [...orders].sort((a, b) => {
      const aNum = Number(a.dinerId);
      const bNum = Number(b.dinerId);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return aNum - bNum;
      }
      return String(a.dinerId).localeCompare(String(b.dinerId));
    });

    const currentIndex = sorted.findIndex(o => String(o.dinerId) === String(currentDinerIdValue));
    if (currentIndex >= 0 && currentIndex + 1 < sorted.length) {
      return sorted[currentIndex + 1];
    }

    return sorted[0];
  };

  const handleMarkPaid = async () => {
    if (!selectedTableNumber) {
      Alert.alert('Error', 'No active table selected.');
      return;
    }

    if (!canMarkPaid) {
      Alert.alert('Not Ready', 'Send to kitchen successfully before marking this diner as paid.');
      return;
    }

    setIsMarkingPaid(true);
    try {
      // Primary path: use the diner-scoped order id captured at send-to-kitchen time.
      let orderIdToPay = currentDinerTab?.orderId;

      let latestActiveOrders: any[] = [];
      let orderForCurrentDiner: any = null;

      // Fallback path is used only when diner-order mapping is unexpectedly missing.
      if (!orderIdToPay) {
        latestActiveOrders = await refreshTableOrders();
        trackDinerActivity(
          selectedTableNumber,
          latestActiveOrders.map((order: any) => order.dinerId)
        );

        orderForCurrentDiner = latestActiveOrders.find(
          (order: any) => String(order.dinerId) === String(selectedDinerId)
        );

        if (!orderIdToPay && orderForCurrentDiner?.id) {
          orderIdToPay = String(orderForCurrentDiner.id);
        }

        // Keep one retry for legacy path only.
        if (!orderForCurrentDiner) {
          await new Promise(resolve => setTimeout(resolve, 220));
          const retriedActiveOrders = await refreshTableOrders();
          trackDinerActivity(
            selectedTableNumber,
            retriedActiveOrders.map((order: any) => order.dinerId)
          );
          orderForCurrentDiner = retriedActiveOrders.find(
            (order: any) => String(order.dinerId) === String(selectedDinerId)
          );
          if (!orderIdToPay && orderForCurrentDiner?.id) {
            orderIdToPay = String(orderForCurrentDiner.id);
          }
        }

        if (
          !orderForCurrentDiner &&
          currentOrder?.id &&
          String(currentOrder.tableNumber) === String(selectedTableNumber) &&
          String(currentOrder.dinerId) === String(selectedDinerId) &&
          currentOrder.status !== 'PAID' &&
          currentOrder.status !== 'CANCELLED'
        ) {
          orderForCurrentDiner = currentOrder;
          if (!orderIdToPay) {
            orderIdToPay = String(currentOrder.id);
          }
        }
      }

      if (latestActiveOrders.length === 0) {
        latestActiveOrders = await refreshTableOrders();
        trackDinerActivity(
          selectedTableNumber,
          latestActiveOrders.map((order: any) => order.dinerId)
        );
      }

      const unpaidOtherOrdersBeforePay = latestActiveOrders.filter(
        (order: any) => String(order.dinerId) !== String(selectedDinerId)
      );

      if (!orderIdToPay) {
        Alert.alert('No Unpaid Order', 'There is no unpaid order for the current diner.');
        return;
      }

      const paidOrder = await markPaidOrder(orderIdToPay);
      addPaidOrderSnapshot(selectedTableNumber, paidOrder);
      trackDinerActivity(selectedTableNumber, [paidOrder?.dinerId, selectedDinerId]);
      const shouldShowPendingAlert = true;

      let activeOrders = await refreshTableOrders();
      trackDinerActivity(
        selectedTableNumber,
        activeOrders.map((order: any) => order.dinerId)
      );

      // Extra retry avoids edge cases where backend status propagation is briefly delayed.
      if (activeOrders.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 280));
        activeOrders = await refreshTableOrders();
        trackDinerActivity(
          selectedTableNumber,
          activeOrders.map((order: any) => order.dinerId)
        );
      }

      if (activeOrders.length > 0) {
        const nextOrder = pickNextOrder(activeOrders, selectedDinerId);
        if (nextOrder) {
          dispatch(setDinerInfo({
            dinerId: String(nextOrder.dinerId),
            tabId: String(nextOrder.tabId),
          }));
          dispatch(setDinerOrderId({
            dinerId: String(nextOrder.dinerId),
            orderId: String(nextOrder.id),
            tableNumber: String(selectedTableNumber),
          }));
          dispatch(setDinerCheckoutState({
            dinerId: String(nextOrder.dinerId),
            checkoutState: 'payable',
            tableNumber: String(selectedTableNumber),
          }));
          dispatch(setCurrentOrder(nextOrder));
        }
        return;
      }

      // Safety net: if there were clearly unpaid diners before pay, do not allow table checkout.
      if (unpaidOtherOrdersBeforePay.length > 0) {
        const fallbackNext = pickNextOrder(unpaidOtherOrdersBeforePay, selectedDinerId)
          || unpaidOtherOrdersBeforePay[0];
        if (fallbackNext) {
          dispatch(setDinerInfo({
            dinerId: String(fallbackNext.dinerId),
            tabId: String(fallbackNext.tabId),
          }));
          dispatch(setDinerOrderId({
            dinerId: String(fallbackNext.dinerId),
            orderId: String(fallbackNext.id),
            tableNumber: String(selectedTableNumber),
          }));
          dispatch(setDinerCheckoutState({
            dinerId: String(fallbackNext.dinerId),
            checkoutState: 'payable',
            tableNumber: String(selectedTableNumber),
          }));
          dispatch(setCurrentOrder(fallbackNext));
        }
        if (shouldShowPendingAlert) {
          Alert.alert(
            'More Diners Pending',
            'Other diners still have unpaid orders. Table checkout is not completed yet.'
          );
        }
        return;
      }

      // If no unpaid backend orders remain, still guard against local unsent drafts
      // for other diners to avoid releasing table too early.
      const dinersWithLocalDrafts = new Set(
        allDraftItems
          .filter(item => String(item.dinerId) !== String(selectedDinerId))
          .map(item => String(item.dinerId))
      );

      if (dinersWithLocalDrafts.size > 0) {
        const nextDraftTab = dinerTabs.find(tab => dinersWithLocalDrafts.has(String(tab.dinerId)));
        if (nextDraftTab) {
          dispatch(setDinerInfo({
            dinerId: String(nextDraftTab.dinerId),
            tabId: String(nextDraftTab.tabId),
          }));
        }
        if (shouldShowPendingAlert) {
          Alert.alert(
            'More Diners Pending',
            'Other diners still have unsubmitted items. Table checkout is not completed yet.'
          );
        }
        return;
      }

      const tablePaidOrders = getPaidOrdersForTable(selectedTableNumber);
      const trackedDinerIds = getTrackedDinerActivity(selectedTableNumber);
      const paidDinerIds = new Set(
        tablePaidOrders
          .map((order: any) => order?.dinerId)
          .filter((id: any) => id !== undefined && id !== null)
          .map((id: any) => String(id))
      );

      const unpaidTrackedDinerIds = trackedDinerIds.filter(id => !paidDinerIds.has(id));
      if (unpaidTrackedDinerIds.length > 0) {
        const targetDinerId = unpaidTrackedDinerIds[0];
        const fallbackTab = dinerTabs.find(tab => String(tab.dinerId) === String(targetDinerId));
        let fallbackOrder = activeOrders.find(
          (order: any) => String(order.dinerId) === String(targetDinerId)
        ) || unpaidOtherOrdersBeforePay.find(
          (order: any) => String(order.dinerId) === String(targetDinerId)
        ) || latestActiveOrders.find(
          (order: any) => String(order.dinerId) === String(targetDinerId)
        ) || tableOrders.find(
          (order: any) => String(order.dinerId) === String(targetDinerId)
        );

        // One final refresh keeps tab and currentOrder in sync if cache is stale.
        if (!fallbackOrder) {
          try {
            const refreshedOrders = await refreshTableOrders();
            fallbackOrder = refreshedOrders.find(
              (order: any) => String(order.dinerId) === String(targetDinerId)
            );
          } catch (error) {
            console.warn('⚠️ Unable to refresh fallback diner order:', error);
          }
        }

        if (fallbackTab) {
          dispatch(setDinerInfo({
            dinerId: String(fallbackTab.dinerId),
            tabId: String(fallbackTab.tabId),
          }));
        }

        if (fallbackOrder) {
          dispatch(setDinerOrderId({
            dinerId: String(fallbackOrder.dinerId),
            orderId: String(fallbackOrder.id),
            tableNumber: String(selectedTableNumber),
          }));
          dispatch(setDinerCheckoutState({
            dinerId: String(fallbackOrder.dinerId),
            checkoutState: 'payable',
            tableNumber: String(selectedTableNumber),
          }));
          dispatch(setCurrentOrder(fallbackOrder));
        }

        if (shouldShowPendingAlert) {
          Alert.alert(
            'More Diners Pending',
            'Some diners still have unpaid orders. Table checkout is not completed yet.'
          );
        }
        return;
      }

      if (tablePaidOrders.length > 1) {
        await askTableSummaryReceipt(tablePaidOrders);
      }

      clearPaidOrdersForTable(selectedTableNumber);
      clearTrackedDinerActivity(selectedTableNumber);
      dispatch(clearDinerOrderIdsForTable(selectedTableNumber));
      dispatch(completeDiningSession());
      navigation.navigate('TableSelection');
    } catch (error: any) {
      console.error('❌ Mark paid failed:', error);
      Alert.alert('Error', error.message || 'Failed to mark order as paid.');
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const handleAddDinerTab = () => {
    Alert.prompt(
      'Add Diner',
      'Enter diner name (e.g., Bob, Alice):',
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Cancelled'),
          style: 'cancel',
        },
        {
          text: 'Add',
          onPress: (name) => {
            if (name && name.trim()) {
              dispatch(addDinerTab({ name: name.trim() }));
            }
          },
        },
      ],
      'plain-text',
      ''
    );
  };

  // 处理取消已确认菜品
  const handleCancelConfirmedItem = (item: any) => {
    if (guardPaidDinerEditAction()) return;

    Alert.alert(
      'Reduce Item',
      `Cancel 1x ${item.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call backend to cancel item
              if (!currentOrder?.id) {
                Alert.alert('Error', 'Order ID not found');
                return;
              }
              await cancelItem(currentOrder.id, item.itemId, 'Customer request');
              console.log(`✅ Cancelled item: ${item.name}`);
            } catch (error) {
              console.error('❌ Failed to cancel item:', error);
              Alert.alert('Error', 'Failed to cancel item');
            }
          },
        },
      ]
    );
  };

  const totalDraftItems = draftItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = draftItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // 提取已送厨的批次（保留批次结构，按当前 diner 过滤）
  const confirmedBatches = useMemo(() => {
    if (!currentOrder?.batches) {
      console.log('🔍 MenuScreen: No currentOrder.batches', currentOrder);
      return [];
    }
    
    console.log('🔍 MenuScreen: Checking batches', {
      totalBatches: currentOrder.batches.length,
      selectedDinerId,
      batchesDetail: currentOrder.batches.map((b: any, idx: number) => ({
        index: idx,
        batchId: b.batchId,
        dinerId: b.dinerId,
        tabId: b.tabId,
        hasItems: !!b.items,
        itemsCount: b.items?.length,
        itemStatuses: b.items?.map((i: any) => i.status),
      })),
    });
    
    // Filter batches for current diner/tab and those with confirmed items
    const batchesWithConfirmed = currentOrder.batches.filter(batch => {
      const isForCurrentDiner = String(batch.dinerId) === selectedDinerIdStr;
      const hasConfirmedItems = batch.items.some(item => item.status === 'CONFIRMED');
      console.log(`  Batch ${batch.batchId}: dinerId=${batch.dinerId}, isForCurrentDiner=${isForCurrentDiner}, hasConfirmedItems=${hasConfirmedItems}`);
      return isForCurrentDiner && hasConfirmedItems;
    });
    console.log('🔍 MenuScreen: Confirmed batches for diner', selectedDinerId, {
      batchesCount: batchesWithConfirmed.length,
      batches: batchesWithConfirmed,
    });
    return batchesWithConfirmed;
  }, [currentOrder, selectedDinerIdStr]);

  // 跟踪所有已确认菜品总数（用于计算总金额）
  const confirmedItems = useMemo(() => {
    return confirmedBatches.flatMap(batch =>
      batch.items.filter(item => item.status === 'CONFIRMED')
    );
  }, [confirmedBatches]);

  const cancelledItems = useMemo(() => {
    if (!currentOrder?.batches) return [];
    // Filter cancelled items for current diner only
    return currentOrder.batches
      .filter(batch => String(batch.dinerId) === selectedDinerIdStr)
      .flatMap(batch =>
        batch.items.filter(item => item.status === 'CANCELLED')
      );
  }, [currentOrder, selectedDinerIdStr]);

  const totalConfirmedAmount = confirmedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalCancelledAmount = cancelledItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const gridColumns = getMenuColumns();
  const menuWidth = isLandscape ? dimensions.width * 0.6 : dimensions.width;
  const itemWidth = (menuWidth - THEME.spacing.xl * 2 - THEME.spacing.md * (gridColumns - 1)) / gridColumns;

  const renderDishCard = ({ item }: { item: DraftItemUI }) => (
    <DishCard
      id={item.id}
      name={item.name}
      price={item.price}
      imageUrl={item.imageUrl}
      description={item.description}
      quantity={item.quantity}
      onAddDish={() => handleAddDish(item)}
      onUpdateQuantity={(qty) => handleUpdateQuantity(item.id, qty)}
      itemWidth={itemWidth}
      disabled={isSelectedDinerPaid}
    />
  );

  // Left side: Menu
  const menuSection = (
    <View style={styles.leftPanel}>
      {/* Dishes Grid */}
      <FlatList
        data={dishesWithQuantity}
        numColumns={gridColumns}
        keyExtractor={item => item.id}
        scrollEnabled={true}
        columnWrapperStyle={{
          gap: THEME.spacing.md,
          marginBottom: THEME.spacing.md,
        }}
        contentContainerStyle={{
          paddingHorizontal: THEME.spacing.lg,
          paddingVertical: THEME.spacing.lg,
        }}
        renderItem={renderDishCard}
        ListHeaderComponent={
          // Category Tabs - 放在 FlatList 顶部
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.categoriesScroll, { borderBottomColor: THEME.colors.borderColor }]}
          >
            {allDishTypes.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.categoryTab,
                  {
                    borderBottomColor: selectedTypeId === type.id ? THEME.colors.accent : 'transparent',
                  },
                ]}
                onPress={() => setSelectedTypeId(type.id)}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    {
                      color: selectedTypeId === type.id ? THEME.colors.accent : THEME.colors.textSecondary,
                    },
                  ]}
                >
                  {type.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        }
        ListEmptyComponent={
          <View style={styles.loadingContainer}>
            {dishesLoading && (
              <>
                <Text style={[styles.loadingText, { color: THEME.colors.textSecondary }]}>
                  Loading dishes...
                </Text>
              </>
            )}
            {!dishesLoading && dishesError && (
              <Text style={[styles.loadingText, { color: '#ff6b6b' }]}>
                Error: {dishesError}
              </Text>
            )}
            {!dishesLoading && !dishesError && (
              <>
                <Text style={[styles.loadingText, { color: THEME.colors.textSecondary, marginBottom: THEME.spacing.md }]}>
                  No dishes available
                </Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );

  // Right side: Cart with diner tabs
  const cartSection = (
    <View style={[styles.rightPanel, { backgroundColor: THEME.colors.cardBg }]}>
      {/* Diner Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.dinerTabsScroll, { borderBottomColor: THEME.colors.borderColor }]}
        contentContainerStyle={styles.dinerTabsContainer}
      >
        {dinerTabs.map((tab) => {
          const statusLabel = getTabStatusLabel(tab);
          return (
            <TouchableOpacity
              key={tab.tabId}
              style={[
                styles.dinerTab,
                {
                  borderBottomColor: selectedTabId === tab.tabId ? THEME.colors.accent : 'transparent',
                  borderBottomWidth: selectedTabId === tab.tabId ? 3 : 0,
                },
              ]}
              onPress={() => dispatch(setDinerInfo({ dinerId: tab.dinerId, tabId: tab.tabId }))}
            >
              <Text
                style={[
                  styles.dinerTabText,
                  {
                    color: selectedTabId === tab.tabId ? THEME.colors.accent : THEME.colors.textSecondary,
                  },
                ]}
              >
                {statusLabel ? `${tab.name} · ${statusLabel}` : tab.name}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[styles.addDinerButton, { borderColor: THEME.colors.accent }]}
          onPress={handleAddDinerTab}
        >
          <Text style={[styles.addDinerButtonText, { color: THEME.colors.accent }]}>+</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Content Container - Flex layout for scrollable items + fixed buttons */}
      <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {isSelectedDinerPaid && (
          <View style={[styles.lockedNotice, { backgroundColor: '#2a2a2a', borderColor: THEME.colors.borderColor }]}>
            <Text style={[styles.lockedNoticeText, { color: THEME.colors.textSecondary }]}>
              This diner is already paid. Switch to an unpaid diner to continue.
            </Text>
            <TouchableOpacity
              style={[styles.lockedNoticeAction, { borderColor: THEME.colors.accent }]}
              onPress={switchToFirstUnpaidDiner}
            >
              <Text style={[styles.lockedNoticeActionText, { color: THEME.colors.accent }]}>Switch to Unpaid Diner</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cart Items */}
        <ScrollView style={[styles.cartItems, { flex: 1 }]}>
        {/* Sent to Kitchen Section - Grouped by Batch */}
        {confirmedItems.length > 0 && (
          <View style={{ marginBottom: THEME.spacing.lg }}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: THEME.colors.textPrimary }]}>
                Sent to Kitchen ({confirmedItems.length})
              </Text>
              <TouchableOpacity
                style={[
                  styles.editButton,
                  { backgroundColor: THEME.colors.accent, opacity: isSelectedDinerPaid ? 0.45 : 1 }
                ]}
                disabled={isSelectedDinerPaid}
                onPress={() => setEditMode(!editMode)}
              >
                <Text style={styles.editButtonText}>
                  {editMode ? 'Done' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>
            {confirmedBatches.map((batch, batchIndex) => {
              const confirmedBatchItems = batch.items.filter(item => item.status === 'CONFIRMED');
              
              return (
                <View key={batch.batchId} style={{ marginBottom: THEME.spacing.lg }}>
                  {/* Batch Title - Plain text with time */}
                  <Text style={[styles.batchTitle, { color: '#666', marginBottom: THEME.spacing.md }]}>
                    Batch {batchIndex + 1} • Sent at {formatDateTime(batch.confirmedAt, true)}
                  </Text>
                  
                  {/* Batch Container - All items together */}
                  <View
                    style={[
                      styles.batchContainer,
                      {
                        borderColor: THEME.colors.borderColor,
                        backgroundColor: '#f5f5f5',
                        opacity: 0.85,
                        borderRadius: 8,
                        borderWidth: 1,
                        overflow: 'hidden',
                      }
                    ]}
                  >
                    {confirmedBatchItems.map((item, itemIndex) => (
                      <View key={item.itemId}>
                        <View style={[styles.batchItem, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.cartItemName, { color: '#333' }]}>
                              {item.name}
                            </Text>
                            <View style={styles.cartItemFooter}>
                              <Text style={[styles.cartItemQty, { color: '#666' }]}>
                                {item.quantity}x
                              </Text>
                              <Text style={[styles.cartItemPrice, { color: THEME.colors.accent }]}>
                                €{(item.price * item.quantity / 100).toFixed(2)}
                              </Text>
                            </View>
                          </View>
                          {editMode && (
                            <TouchableOpacity
                              style={[styles.cancelButton, { opacity: isSelectedDinerPaid ? 0.45 : 1 }]}
                              disabled={isSelectedDinerPaid}
                              onPress={() => handleCancelConfirmedItem(item)}
                            >
                              <Text style={styles.cancelButtonText}>−</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        {/* Separator between items (not after last item) */}
                        {itemIndex < confirmedBatchItems.length - 1 && (
                          <View style={[styles.itemSeparator, { backgroundColor: '#e0e0e0' }]} />
                        )}
                      </View>
                    ))}
                  </View>
                  
                  {/* Batch Divider (except last batch) */}
                  {batchIndex < confirmedBatches.length - 1 && (
                    <View style={[styles.batchDivider, { 
                      height: 1, 
                      backgroundColor: '#d0d0d0', 
                      marginVertical: THEME.spacing.md 
                    }]} />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* 新增菜品 Section */}
        {draftItems.length > 0 && (
          <View style={{ marginBottom: THEME.spacing.lg }}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: THEME.colors.textPrimary }]}>
                New Items ({draftItems.length})
              </Text>
            </View>
            {draftItems.map(item => (
              <View
                key={item.dishId}
                style={[styles.cartItem, { borderColor: THEME.colors.borderColor }]}
              >
                <Text style={[styles.cartItemName, { color: THEME.colors.textPrimary }]}>
                  {item.name}
                </Text>
                <View style={styles.cartItemFooter}>
                  <Text style={[styles.cartItemQty, { color: THEME.colors.textSecondary }]}>
                    {item.quantity}x
                  </Text>
                  <Text style={[styles.cartItemPrice, { color: THEME.colors.accent }]}>
                    €{(item.price * item.quantity / 100).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 已取消 Section */}
        {cancelledItems.length > 0 && (
          <View style={{ marginBottom: THEME.spacing.lg }}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: THEME.colors.textSecondary, textDecorationLine: 'line-through' }]}>
                Cancelled ({cancelledItems.length})
              </Text>
            </View>
            {cancelledItems.map(item => (
              <View
                key={item.itemId}
                style={[
                  styles.cartItem,
                  {
                    borderColor: THEME.colors.borderColor,
                    opacity: 0.5,
                  }
                ]}
              >
                <Text style={[styles.cartItemName, { color: '#999', textDecorationLine: 'line-through' }]}>
                  {item.name}
                </Text>
                <View style={styles.cartItemFooter}>
                  <Text style={[styles.cartItemQty, { color: '#999', textDecorationLine: 'line-through' }]}>
                    {item.quantity}x
                  </Text>
                  <Text style={[styles.cartItemPrice, { color: '#999', textDecorationLine: 'line-through' }]}>
                    €{(item.price * item.quantity / 100).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 空状态 */}
        {confirmedItems.length === 0 && draftItems.length === 0 && cancelledItems.length === 0 && (
          <View style={styles.emptyCart}>
            <Text style={[styles.emptyCartText, { color: THEME.colors.textSecondary }]}>
              No items added
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Summary */}
      {(totalDraftItems > 0 || confirmedItems.length > 0) && (
        <View style={[styles.cartSummary, { borderTopColor: THEME.colors.accent, backgroundColor: THEME.colors.darkBg }]}>
          {confirmedItems.length > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: THEME.colors.textSecondary }]}>
                Confirmed:
              </Text>
              <Text style={[styles.summaryValue, { color: THEME.colors.accent }]}>
                €{(totalConfirmedAmount / 100).toFixed(2)}
              </Text>
            </View>
          )}
          {totalDraftItems > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: THEME.colors.textSecondary }]}>
                New Items:
              </Text>
              <Text style={[styles.summaryValue, { color: THEME.colors.accent }]}>
                €{(totalPrice / 100).toFixed(2)}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: THEME.colors.borderColor, paddingVertical: THEME.spacing.md, marginTop: THEME.spacing.md }]}>
            <Text style={[styles.summaryLabel, { color: THEME.colors.textPrimary, fontWeight: '700' }]}>
              Total:
            </Text>
            <Text style={[styles.summaryTotal, { color: THEME.colors.accent }]}>
              €{((totalConfirmedAmount + totalPrice) / 100).toFixed(2)}
            </Text>
          </View>
          {totalDraftItems > 0 && (
            <TouchableOpacity
              style={[styles.reviewButton, { backgroundColor: THEME.colors.accent, marginTop: THEME.spacing.md, opacity: isSelectedDinerPaid ? 0.45 : 1 }]}
              disabled={isSelectedDinerPaid}
              onPress={() => {
                if (guardPaidDinerEditAction()) return;
                setShowOrderReviewModal(true);
              }}
            >
              <Text style={styles.reviewButtonText}>Send to Kitchen</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Bottom actions */}
      <View style={styles.bottomActionRow}>
        <TouchableOpacity
          style={[
            styles.bottomActionButton,
            {
              backgroundColor: THEME.colors.cardBg,
              borderColor: THEME.colors.accent,
              borderWidth: 1,
              opacity: (isMarkingPaid || isMarkPaidSubmitting || isSelectedDinerPaid) ? 0.45 : 1,
            },
          ]}
          disabled={isMarkingPaid || isMarkPaidSubmitting || isSelectedDinerPaid}
          onPress={() => {
            if (guardPaidDinerEditAction()) return;

            Alert.alert(
              'Print Receipt',
              'Choose receipt action for this diner.',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Preview',
                  onPress: () => setTimeout(() => previewReceipt(false), 120),
                },
                {
                  text: 'Print',
                  onPress: () => setTimeout(() => printReceipt(false), 120),
                },
              ]
            );
          }}
        >
          <Text style={[styles.bottomActionButtonText, { color: THEME.colors.accent }]}>🧾 Print Receipt</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.bottomActionButton,
            {
              backgroundColor: THEME.colors.accent,
              opacity: (isMarkingPaid || isMarkPaidSubmitting || isSelectedDinerPaid || !canMarkPaid) ? 0.45 : 1,
            },
          ]}
          disabled={isMarkingPaid || isMarkPaidSubmitting || isSelectedDinerPaid || !canMarkPaid}
          onPress={() => {
            if (guardPaidDinerEditAction()) return;

            Alert.alert(
              'Mark Paid',
              'Confirm this order has been paid offline?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Mark Paid',
                  onPress: handleMarkPaid,
                },
              ]
            );
          }}
        >
          <Text style={styles.bottomActionButtonText}>✅ Mark Paid</Text>
        </TouchableOpacity>
      </View>
    </View>
    </View>
  );

  // Return layout based on orientation
  if (!isLandscape) {
    // For portrait: stack menu + cart vertically
    return (
      <View style={[styles.container, { backgroundColor: THEME.colors.darkBg }]}>
        {/* Main Header */}
        <View style={[styles.mainHeader, { paddingTop: insets.top, borderBottomColor: THEME.colors.accent }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={[styles.backButtonText, { color: THEME.colors.accent }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: THEME.colors.textPrimary }]}>
            🍽️ Menu
          </Text>
        </View>
        
        {menuSection}
        {cartSection}
        
        {/* Order Review Modal */}
        <OrderReviewScreen
          visible={showOrderReviewModal}
          onClose={() => setShowOrderReviewModal(false)}
        />
      </View>
    );
  }

  // For landscape: side-by-side layout
  return (
    <View style={[styles.containerRow, { backgroundColor: THEME.colors.darkBg }]}>
      {/* Main Header */}
      <View style={[styles.mainHeader, { paddingTop: insets.top, borderBottomColor: THEME.colors.accent, width: '100%' }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={[styles.backButtonText, { color: THEME.colors.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: THEME.colors.textPrimary, flex: 1 }]}>
          🍽️ Menu
        </Text>
      </View>

      {/* Content Area */}
      <View style={styles.contentRow}>
        {menuSection}
        {cartSection}
      </View>
      
      {/* Order Review Modal */}
      <OrderReviewScreen
        visible={showOrderReviewModal}
        onClose={() => setShowOrderReviewModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerRow: {
    flex: 1,
    flexDirection: 'column',
  },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.lg,
    paddingVertical: THEME.spacing.lg,
    paddingHorizontal: THEME.spacing.xl,
    borderBottomWidth: 2,
    backgroundColor: THEME.colors.darkBg,
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    flex: 1.5,
    borderRightWidth: 2,
    borderRightColor: THEME.colors.accent,
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  backButton: {
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
  },
  backButtonText: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: THEME.typography.sizes['2xl'],
    fontWeight: '700',
  },
  categoriesScroll: {
    borderBottomWidth: 1,
    maxHeight: 50,
  },
  dinerTabsScroll: {
    borderBottomWidth: 1,
    maxHeight: 50,
  },
  categoryTab: {
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    borderBottomWidth: 2,
  },
  categoryTabText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '600',
  },
  dishCardContainer: {
    marginVertical: THEME.spacing.sm,
    marginHorizontal: 0,
  },
  dishCard: {
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: THEME.colors.cardBg,
    // Enhanced shadow for card effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  imageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: THEME.colors.darkBg,
    overflow: 'hidden',
  },
  dishImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: THEME.typography.sizes['2xl'],
  },
  dishInfoContainer: {
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.cardBg,
  },
  dishDescription: {
    fontSize: THEME.typography.sizes.xs,
    lineHeight: 14,
    marginBottom: THEME.spacing.sm,
  },
  dishName: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '600',
    marginBottom: THEME.spacing.xs,
    lineHeight: 18,
  },
  dishFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: THEME.spacing.sm,
  },
  dishPrice: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '700',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.cardBgAlt,
    borderRadius: THEME.borderRadius.sm,
    paddingVertical: THEME.spacing.xs,
  },
  quantityButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: THEME.spacing.xs,
  },
  quantityText: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '700',
  },
  quantityDisplay: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '600',
    paddingHorizontal: THEME.spacing.sm,
  },
  addButton: {
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.sm,
    alignItems: 'center',
  },
  addButtonText: {
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: THEME.spacing.xl * 2,
  },
  loadingText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '500',
  },
  // Cart styles
  dinerTabsContainer: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dinerTab: {
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    marginRight: THEME.spacing.sm,
    borderBottomWidth: 3,
  },
  dinerTabText: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '600',
  },
  addDinerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: THEME.spacing.sm,
  },
  addDinerButtonText: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: '700',
  },
  lockedNotice: {
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    marginHorizontal: THEME.spacing.md,
    marginTop: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
    gap: THEME.spacing.sm,
  },
  lockedNoticeText: {
    fontSize: THEME.typography.sizes.sm,
    lineHeight: 18,
  },
  lockedNoticeAction: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: THEME.borderRadius.sm,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
  },
  lockedNoticeActionText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
  },
  cartItems: {
    flex: 1,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.lg,
  },
  emptyCart: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: THEME.spacing.xl,
  },
  emptyCartText: {
    fontSize: THEME.typography.sizes.base,
  },
  cartItem: {
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.darkBg,
  },
  cartItemName: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '600',
    marginBottom: THEME.spacing.sm,
  },
  cartItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cartItemQty: {
    fontSize: THEME.typography.sizes.sm,
  },
  cartItemPrice: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '600',
  },
  // Section styles
  sectionHeader: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '600',
  },
  sectionFooter: {
    fontSize: THEME.typography.sizes.xs,
    marginTop: THEME.spacing.sm,
  },
  // Batch styles
  batchHeader: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    marginBottom: THEME.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchHeaderText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '600',
  },
  batchTimeText: {
    fontSize: THEME.typography.sizes.xs,
  },
  batchTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '600',
  },
  batchContainer: {
    // Container for all items in a batch
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  batchItem: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
  },
  itemSeparator: {
    height: 1,
    marginHorizontal: THEME.spacing.md,
    backgroundColor: '#e0e0e0',
  },
  batchDivider: {
    height: 1,
    backgroundColor: '#d0d0d0',
    marginVertical: THEME.spacing.md,
    marginHorizontal: THEME.spacing.md,
  },
  cartSummary: {
    borderTopWidth: 2,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.lg,
  },
  summaryLabel: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '600',
  },
  summaryTotal: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '700',
  },
  summaryValue: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '600',
  },
  reviewButton: {
    paddingVertical: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },
  reviewButtonText: {
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.base,
    fontWeight: '700',
  },
  editButton: {
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '700',
    color: '#fff',
  },
  bottomActionRow: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginTop: THEME.spacing.md,
    marginHorizontal: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  bottomActionButton: {
    paddingVertical: THEME.spacing.lg,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActionButtonText: {
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.base,
    fontWeight: '700',
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ff6b6b',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: THEME.spacing.md,
  },
  cancelButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '700',
    lineHeight: 24,
  },
});

