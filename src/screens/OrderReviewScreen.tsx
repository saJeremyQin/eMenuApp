import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState, AppDispatch } from '../store/store';
import {
  updateDraftItemQuantity,
  removeDraftItem,
  clearDraftItems,
} from '../store/orderSlice';
import { useConfirmOrderItems } from '../hooks/useOrder';
import { THEME } from '../config/theme';

export default function OrderReviewScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const draftItems = useSelector((state: RootState) => state.order.draftItems);
  const selectedTableNumber = useSelector((state: RootState) => state.order.selectedTableNumber);
  const selectedDinerId = useSelector((state: RootState) => state.order.selectedDinerId);
  const selectedTabId = useSelector((state: RootState) => state.order.selectedTabId);
  
  const { confirmOrder, isSubmitting } = useConfirmOrderItems();
  const [isLoading, setIsLoading] = useState(false);

  if (!selectedTableNumber || draftItems.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: THEME.colors.darkBg }]}>
        <View style={[styles.header, { borderBottomColor: THEME.colors.accent }]}>
          <Text style={[styles.headerTitle, { color: THEME.colors.textPrimary }]}>
            📋 Order Review
          </Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: THEME.colors.textPrimary }]}>
            No items in order
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: THEME.colors.accent }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back to Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const totalPrice = draftItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = draftItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleRemoveItem = (dishId: string) => {
    dispatch(removeDraftItem(dishId));
  };

  const handleUpdateQuantity = (dishId: string, quantity: number) => {
    if (quantity === 0) {
      dispatch(removeDraftItem(dishId));
    } else {
      dispatch(updateDraftItemQuantity({ dishId, quantity }));
    }
  };

  const handleSubmitOrder = async () => {
    if (!selectedTableNumber) {
      Alert.alert('Error', 'No table selected');
      return;
    }

    if (draftItems.length === 0) {
      Alert.alert('Error', 'No items to order');
      return;
    }

    setIsLoading(true);
    try {
      // 准备要发送的菜品数据
      const items = draftItems.map(item => ({
        dishId: item.dishId,
        quantity: item.quantity,
        notes: item.notes || undefined,
      }));

      console.log('📤 OrderReviewScreen: Sending order to kitchen', {
        tableNumber: selectedTableNumber,
        dinerId: selectedDinerId,
        tabId: selectedTabId,
        items,
      });

      // 调用送厨 API
      const orderResult = await confirmOrder({
        tableNumber: selectedTableNumber,
        dinerId: selectedDinerId,
        tabId: selectedTabId,
        items,
        isFromCustomerScan: false,
      });

      console.log('📦 OrderReviewScreen: Order sent successfully', orderResult);

      // 送厨成功
      Alert.alert('Success', 'Order sent to kitchen', [
        {
          text: 'OK',
          onPress: () => {
            console.log('✅ OrderReviewScreen: Clearing draft items and navigating back');
            dispatch(clearDraftItems());
            navigation.navigate('Menu');
          },
        },
      ]);
    } catch (error) {
      console.error('Order submission failed:', error);
      Alert.alert('Error', (error as any).message || 'Failed to submit order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: THEME.colors.darkBg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: THEME.colors.accent }]}>
        <View>
          <Text style={[styles.headerTitle, { color: THEME.colors.textPrimary }]}>
            📋 Order Review
          </Text>
          <Text style={[styles.tableLabel, { color: THEME.colors.textSecondary }]}>
            Table {selectedTableNumber}
          </Text>
        </View>
      </View>

      {/* Order Items */}
      <ScrollView style={styles.itemsList}>
        {draftItems.map((item) => (
          <View
            key={item.dishId}
            style={[
              styles.orderItem,
              {
                backgroundColor: THEME.colors.cardBg,
                borderColor: THEME.colors.borderColor,
              },
            ]}
          >
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: THEME.colors.textPrimary }]}>
                {item.name}
              </Text>
              <Text style={[styles.itemPrice, { color: THEME.colors.accent }]}>
                €{(item.price / 100).toFixed(2)} × {item.quantity}
              </Text>
              <Text style={[styles.itemTotal, { color: THEME.colors.accent }]}>
                Total: €{((item.price * item.quantity) / 100).toFixed(2)}
              </Text>
            </View>

            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => handleUpdateQuantity(item.dishId, item.quantity - 1)}
              >
                <Text style={[styles.quantityBtnText, { color: THEME.colors.accent }]}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.quantityValue, { color: THEME.colors.textPrimary }]}>
                {item.quantity}
              </Text>
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => handleUpdateQuantity(item.dishId, item.quantity + 1)}
              >
                <Text style={[styles.quantityBtnText, { color: THEME.colors.accent }]}>+</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemoveItem(item.dishId)}
              >
                <Text style={styles.removeBtnText}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Summary */}
      <View
        style={[
          styles.summary,
          {
            borderTopColor: THEME.colors.borderColor,
            backgroundColor: THEME.colors.cardBg,
          },
        ]}
      >
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: THEME.colors.textSecondary }]}>
            {totalItems} Items
          </Text>
          <Text style={[styles.summaryValue, { color: THEME.colors.textPrimary }]}>
            €{(totalPrice / 100).toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: THEME.colors.accent }]}
          onPress={handleSubmitOrder}
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting || isLoading ? (
            <ActivityIndicator color={THEME.colors.textPrimary} />
          ) : (
            <Text style={styles.submitButtonText}>Send to Kitchen →</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.backButton, { borderColor: THEME.colors.accent }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: THEME.colors.accent }]}>
            ← Continue Ordering
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: THEME.spacing.lg,
    paddingHorizontal: THEME.spacing.xl,
    borderBottomWidth: 2,
  },
  headerTitle: {
    fontSize: THEME.typography.sizes['2xl'],
    fontWeight: '700',
    marginBottom: THEME.spacing.xs,
  },
  tableLabel: {
    fontSize: THEME.typography.sizes.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.xl,
  },
  emptyText: {
    fontSize: THEME.typography.sizes.lg,
    marginBottom: THEME.spacing.lg,
  },
  itemsList: {
    flex: 1,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.lg,
  },
  orderItem: {
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginRight: THEME.spacing.lg,
  },
  itemName: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '600',
    marginBottom: THEME.spacing.xs,
  },
  itemPrice: {
    fontSize: THEME.typography.sizes.sm,
    marginBottom: THEME.spacing.sm,
  },
  itemTotal: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '700',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  quantityBtn: {
    width: 32,
    height: 32,
    borderRadius: THEME.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBgAlt,
  },
  quantityBtnText: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '700',
  },
  quantityValue: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: THEME.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.error,
  },
  removeBtnText: {
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.xl,
    fontWeight: '700',
  },
  summary: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.lg,
    borderTopWidth: 1,
    gap: THEME.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.md,
  },
  summaryLabel: {
    fontSize: THEME.typography.sizes.base,
  },
  summaryValue: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: '700',
  },
  submitButton: {
    paddingVertical: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  submitButtonText: {
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.base,
    fontWeight: '700',
  },
  backButton: {
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
  },
  backButtonText: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '600',
  },
});
