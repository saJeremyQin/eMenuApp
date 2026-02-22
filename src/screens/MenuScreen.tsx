import React, { useEffect, useState, useMemo } from 'react';
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
import { addDraftItem, updateDraftItemQuantity, removeDraftItem, addDinerTab, setDinerInfo, DinerTab } from '../store/orderSlice';
import { useCancelOrderItem } from '../hooks/useOrder';
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

interface DraftItemUI extends Dish {
  quantity: number;
}

export default function MenuScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const draftItems = useSelector((state: RootState) => state.order.draftItems);
  
  // 从 Redux 获取分餐信息
  const dinerTabs = useSelector((state: RootState) => state.order.dinerTabs);
  const selectedDinerId = useSelector((state: RootState) => state.order.selectedDinerId);
  const selectedTabId = useSelector((state: RootState) => state.order.selectedTabId);
  const currentOrder = useSelector((state: RootState) => state.order.currentOrder);
  
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
  const { cancelItem } = useCancelOrderItem();

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
      totalConfirmedAmount: currentOrder?.totalConfirmedAmount,
    });
  }, [currentOrder]);

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
    dispatch(
      addDraftItem({
        dishId: dish.id,
        name: dish.name,
        price: dish.price,
        quantity: 1,
      })
    );
  };

  const handleUpdateQuantity = (dishId: string, quantity: number) => {
    if (quantity === 0) {
      dispatch(removeDraftItem(dishId));
    } else {
      dispatch(updateDraftItemQuantity({ dishId, quantity }));
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

  // 提取已送厨的批次（保留批次结构）
  const confirmedBatches = useMemo(() => {
    if (!currentOrder?.batches) {
      console.log('🔍 MenuScreen: No currentOrder.batches', currentOrder);
      return [];
    }
    // 只返回包含已确认菜品的批次
    const batchesWithConfirmed = currentOrder.batches.filter(batch =>
      batch.items.some(item => item.status === 'CONFIRMED')
    );
    console.log('🔍 MenuScreen: Confirmed batches', {
      batchesCount: batchesWithConfirmed.length,
      batches: batchesWithConfirmed,
    });
    return batchesWithConfirmed;
  }, [currentOrder]);

  // 跟踪所有已确认菜品总数（用于计算总金额）
  const confirmedItems = useMemo(() => {
    return confirmedBatches.flatMap(batch =>
      batch.items.filter(item => item.status === 'CONFIRMED')
    );
  }, [confirmedBatches]);

  const cancelledItems = useMemo(() => {
    if (!currentOrder?.batches) return [];
    return currentOrder.batches.flatMap(batch =>
      batch.items.filter(item => item.status === 'CANCELLED')
    );
  }, [currentOrder]);

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

  // Debug Panel - 固定在底部，始终显示
  const debugPanel = (
    <View style={{ backgroundColor: '#222', padding: 8, borderTopWidth: 1, borderTopColor: '#444', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
      <Text style={{ color: '#0f0', fontSize: 9, fontFamily: 'Courier New' }}>
        Loaded={dishesLoaded ? 'Y' : 'N'} Loading={dishesLoading ? 'Y' : 'N'} Error={dishesError ? 'Y' : 'N'} | Types={allDishTypes.length} Dishes={allDishes.length} Selected={selectedDishes.length}
      </Text>
      {dishesError && (
        <Text style={{ color: '#f00', fontSize: 8, fontFamily: 'Courier New' }}>
          Error: {dishesError.substring(0, 60)}...
        </Text>
      )}
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
        {dinerTabs.map((tab) => (
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
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.addDinerButton, { borderColor: THEME.colors.accent }]}
          onPress={handleAddDinerTab}
        >
          <Text style={[styles.addDinerButtonText, { color: THEME.colors.accent }]}>+</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Cart Items */}
      <ScrollView style={styles.cartItems}>
        {/* Sent to Kitchen Section - Grouped by Batch */}
        {confirmedItems.length > 0 && (
          <View style={{ marginBottom: THEME.spacing.lg }}>
            <View style={[styles.sectionHeader, { backgroundColor: '#e8e8e8' }]}>
              <Text style={[styles.sectionTitle, { color: '#333' }]}>
                Sent to Kitchen ({confirmedItems.length})
              </Text>
              <TouchableOpacity
                style={[
                  styles.editButton,
                  { backgroundColor: THEME.colors.accent }
                ]}
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
                              style={styles.cancelButton}
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
            <View style={[styles.sectionHeader, { backgroundColor: THEME.colors.cardBg }]}>
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
            <View style={[styles.sectionHeader, { backgroundColor: '#f0f0f0' }]}>
              <Text style={[styles.sectionTitle, { color: '#999', textDecorationLine: 'line-through' }]}>
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
              style={[styles.reviewButton, { backgroundColor: THEME.colors.accent, marginTop: THEME.spacing.md }]}
              onPress={() => navigation.navigate('OrderReview')}
            >
              <Text style={styles.reviewButtonText}>Review Order</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
        {debugPanel}
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
      
      {/* Debug Panel */}
      {debugPanel}
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
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderColor,
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

