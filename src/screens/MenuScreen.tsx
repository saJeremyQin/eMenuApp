import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState, AppDispatch } from '../store/store';
import { addDraftItem, updateDraftItemQuantity, removeDraftItem } from '../store/orderSlice';
import GraphQLService from '../services/GraphQLService';
import { LIST_DISH_TYPES, LIST_DISHES } from '../graphql/queries';
import { THEME } from '../config/theme';
import DishCard from '../components/DishCard';

interface DishType {
  id: string;
  name: string;
  alias?: string;
  sortOrder: number;
  isActive: boolean;
  isDeleted: boolean;
}

interface Dish {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  dishType: {
    id: string;
    name: string;
    alias?: string;
    sortOrder: number;
  };
}

interface DraftItemUI extends Dish {
  quantity: number;
}

// Diner tab type
interface DinerTab {
  tabId: string;
  label: string;
  dinerId: number;
}

export default function MenuScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const draftItems = useSelector((state: RootState) => state.order.draftItems);

  const [dishTypes, setDishTypes] = useState<DishType[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [loadingDishes, setLoadingDishes] = useState(false);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [dinerTabs, setDinerTabs] = useState<DinerTab[]>([
    { tabId: 'default', label: '🍴', dinerId: 0 }, // Default shared tab
  ]);
  const [activeDinerTab, setActiveDinerTab] = useState<string>('default');

  const isLandscape = dimensions.width > dimensions.height;

  // Calculate grid columns based on screen size
  const getMenuColumns = () => {
    if (!isLandscape) return 2;
    if (dimensions.width > 1200) return 4;
    if (dimensions.width > 900) return 3;
    return 2;
  };

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Load dish types
  useEffect(() => {
    const loadDishTypes = async () => {
      try {
        const response = await GraphQLService.query(LIST_DISH_TYPES);
        const types = (response as any).listDishTypes || [];
        const activeTypes = types.filter((t: DishType) => t.isActive && !t.isDeleted);
        setDishTypes(activeTypes);
        if (activeTypes.length > 0) {
          setSelectedTypeId(activeTypes[0].id);
        }
      } catch (error) {
        console.error('Failed to load dish types:', error);
      }
    };

    loadDishTypes();
  }, []);

  // Load dishes when selected type changes
  useEffect(() => {
    if (selectedTypeId) {
      loadDishes(selectedTypeId);
    }
  }, [selectedTypeId]);

  const loadDishes = async (dishTypeId: string) => {
    setLoadingDishes(true);
    try {
      const response = await GraphQLService.query(LIST_DISHES, {
        dishTypeId: dishTypeId || null,
      });
      const allDishes = (response as any).listDishes || [];
      const activeDishes = allDishes.filter((d: Dish) => d.isActive && !d.isDeleted);
      setDishes(activeDishes);
    } catch (error) {
      console.error('Failed to load dishes:', error);
    } finally {
      setLoadingDishes(false);
    }
  };

  // Combine draft items with dishes
  const dishesWithQuantity: DraftItemUI[] = useMemo(() => {
    return dishes.map(dish => ({
      ...dish,
      quantity: draftItems.find(d => d.dishId === dish.id)?.quantity || 0,
    }));
  }, [dishes, draftItems]);

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
    const nextDinerId = dinerTabs.length;
    const newTab: DinerTab = {
      tabId: `diner-${nextDinerId}`,
      label: `👤${nextDinerId}`,
      dinerId: nextDinerId,
    };
    setDinerTabs([...dinerTabs, newTab]);
    setActiveDinerTab(newTab.tabId);
  };

  const totalDraftItems = draftItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = draftItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

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

  const renderDinerTab = (tab: DinerTab) => (
    <TouchableOpacity
      key={tab.tabId}
      style={[
        styles.dinerTab,
        {
          borderBottomColor: activeDinerTab === tab.tabId ? THEME.colors.accent : 'transparent',
          borderBottomWidth: activeDinerTab === tab.tabId ? 3 : 0,
        },
      ]}
      onPress={() => setActiveDinerTab(tab.tabId)}
    >
      <Text
        style={[
          styles.dinerTabText,
          {
            color: activeDinerTab === tab.tabId ? THEME.colors.accent : THEME.colors.textSecondary,
          },
        ]}
      >
        {tab.label}
      </Text>
    </TouchableOpacity>
  );

  // Left side: Menu
  const menuSection = (
    <View style={styles.leftPanel}>
      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.categoriesScroll, { borderBottomColor: THEME.colors.borderColor }]}
      >
        {dishTypes.map(type => (
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
        ListEmptyComponent={
          !dishesWithQuantity.length ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={THEME.colors.accent} />
              <Text style={[styles.loadingText, { color: THEME.colors.textSecondary, marginTop: THEME.spacing.md }]}>
                {loadingDishes ? 'Loading dishes...' : 'No dishes available'}
              </Text>
            </View>
          ) : null
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
        {dinerTabs.map(renderDinerTab)}
        <TouchableOpacity
          style={[styles.addDinerButton, { borderColor: THEME.colors.accent }]}
          onPress={handleAddDinerTab}
        >
          <Text style={[styles.addDinerButtonText, { color: THEME.colors.accent }]}>+</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Cart Items */}
      <ScrollView style={styles.cartItems}>
        {totalDraftItems === 0 ? (
          <View style={styles.emptyCart}>
            <Text style={[styles.emptyCartText, { color: THEME.colors.textSecondary }]}>
              No items added
            </Text>
          </View>
        ) : (
          draftItems.map(item => (
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
          ))
        )}
      </ScrollView>

      {/* Summary */}
      {totalDraftItems > 0 && (
        <View style={[styles.cartSummary, { borderTopColor: THEME.colors.accent, backgroundColor: THEME.colors.darkBg }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: THEME.colors.textSecondary }]}>
              Total:
            </Text>
            <Text style={[styles.summaryTotal, { color: THEME.colors.accent }]}>
              €{(totalPrice / 100).toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.reviewButton, { backgroundColor: THEME.colors.accent }]}
            onPress={() => navigation.navigate('OrderReview')}
          >
            <Text style={styles.reviewButtonText}>Review Order</Text>
          </TouchableOpacity>
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
});
