import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { clearDraftItems } from '../store/orderSlice';
import { useConfirmOrderItems } from '../hooks/useOrder';
import { THEME } from '../config/theme';

interface OrderReviewModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function OrderReviewScreen({ visible, onClose }: OrderReviewModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const allDraftItems = useSelector((state: RootState) => state.order.draftItems);
  const selectedTableNumber = useSelector((state: RootState) => state.order.selectedTableNumber);
  const selectedDinerId = useSelector((state: RootState) => state.order.selectedDinerId);
  const selectedTabId = useSelector((state: RootState) => state.order.selectedTabId);
  
  // Filter draft items to show only for the current diner
  const draftItems = useMemo(() => {
    return allDraftItems.filter(item => item.dinerId === selectedDinerId);
  }, [allDraftItems, selectedDinerId]);
  
  const { confirmOrder, isSubmitting } = useConfirmOrderItems();
  const [isLoading, setIsLoading] = useState(false);

  const totalPrice = draftItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = draftItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleConfirm = async () => {
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
      const items = draftItems.map(item => ({
        dishId: item.dishId,
        quantity: item.quantity,
        notes: item.notes || undefined,
      }));

      console.log('📤 Sending order to kitchen', {
        tableNumber: selectedTableNumber,
        dinerId: selectedDinerId,
        tabId: selectedTabId,
        items,
      });

      await confirmOrder({
        tableNumber: selectedTableNumber,
        dinerId: selectedDinerId,
        tabId: selectedTabId,
        items,
        isFromCustomerScan: false,
      });

      console.log('✅ Order sent successfully');
      Alert.alert('Success', 'Order sent to kitchen', [
        {
          text: 'OK',
          onPress: () => {
            // Clear only the current diner's draft items
            dispatch(clearDraftItems(selectedDinerId));
            onClose();
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
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade"
      supportedOrientations={['landscape', 'portrait']}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1}
          onPress={onClose}
        />
        
        <View style={[styles.modal, { backgroundColor: THEME.colors.darkBg }]}>
          {/* Title */}
          <View style={styles.title}>
            <Text style={[styles.titleText, { color: THEME.colors.textPrimary }]}>
              Send to Kitchen
            </Text>
            <Text style={[styles.subtitle, { color: THEME.colors.textSecondary }]}>
              Table {selectedTableNumber}
            </Text>
          </View>

          {/* Items List */}
          <ScrollView style={styles.itemsContainer}>
            {draftItems.map((item, index) => (
              <View key={item.dishId} style={[styles.item, { borderBottomColor: THEME.colors.borderColor }]}>
                <View style={styles.itemLeft}>
                  <Text style={[styles.itemName, { color: THEME.colors.textPrimary }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.itemPrice, { color: THEME.colors.textSecondary }]}>
                    €{(item.price / 100).toFixed(2)}
                  </Text>
                </View>
                <Text style={[styles.itemQty, { color: THEME.colors.accent }]}>
                  ×{item.quantity}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Summary */}
          <View style={[styles.summary, { borderTopColor: THEME.colors.borderColor }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: THEME.colors.textSecondary }]}>
                Total:
              </Text>
              <Text style={[styles.summaryTotal, { color: THEME.colors.accent }]}>
                €{(totalPrice / 100).toFixed(2)}
              </Text>
            </View>
            <Text style={[styles.itemCount, { color: THEME.colors.textSecondary }]}>
              {totalItems} items
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity 
              activeOpacity={0.7}
              style={[styles.btn, styles.cancelBtn, { borderColor: THEME.colors.textSecondary }]}
              onPress={() => {
                console.log('Cancel pressed');
                onClose();
              }}
            >
              <Text style={[styles.btnText, { color: THEME.colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.85}
              style={[styles.btn, styles.confirmBtn, { backgroundColor: THEME.colors.accent }]}
              onPress={handleConfirm}
              disabled={isLoading || isSubmitting}
            >
              {isLoading || isSubmitting ? (
                <ActivityIndicator color={THEME.colors.textPrimary} />
              ) : (
                <Text style={[styles.btnText, { color: THEME.colors.textPrimary }]}>
                  Confirm
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modal: {
    width: '90%',
    maxWidth: 500,
    borderRadius: THEME.borderRadius.lg,
    maxHeight: '80%',
    minHeight: 300,
    flexDirection: 'column',
  },
  title: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderColor,
  },
  titleText: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: '700',
    marginBottom: THEME.spacing.xs,
  },
  subtitle: {
    fontSize: THEME.typography.sizes.sm,
  },
  itemsContainer: {
    flexGrow: 1,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flex: 1,
    marginRight: THEME.spacing.md,
  },
  itemName: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '600',
    marginBottom: THEME.spacing.xs,
  },
  itemPrice: {
    fontSize: THEME.typography.sizes.sm,
  },
  itemQty: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },
  summary: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    borderTopWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.sm,
  },
  summaryLabel: {
    fontSize: THEME.typography.sizes.base,
  },
  summaryTotal: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '700',
  },
  itemCount: {
    fontSize: THEME.typography.sizes.sm,
    textAlign: 'right',
  },
  buttons: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.lg,
  },
  btn: {
    flex: 1,
    paddingVertical: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelBtn: {
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  confirmBtn: {
    backgroundColor: THEME.colors.accent,
  },
  btnText: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '700',
  },
});
