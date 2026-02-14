import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '../config/theme';

export default function OrderDetailsScreen() {
  const navigation = useNavigation<any>();

  // Mock order data for now
  const order = {
    id: 'ORDER-001',
    tableNumber: '5',
    items: [
      { id: '1', name: 'Pasta Carbonara', quantity: 1, status: 'Confirmed', price: 1399 },
      { id: '2', name: 'Caesar Salad', quantity: 2, status: 'Ready', price: 899 },
    ],
    totalPrice: 3197,
  };

  return (
    <View style={[styles.container, { backgroundColor: THEME.colors.darkBg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: THEME.colors.accent }]}>
        <Text style={[styles.headerTitle, { color: THEME.colors.textPrimary }]}>
          🍽️ Order Details
        </Text>
        <Text style={[styles.orderId, { color: THEME.colors.textSecondary }]}>
          Table {order.tableNumber}
        </Text>
      </View>

      {/* Order Items */}
      <ScrollView style={styles.content}>
        {order.items.map((item) => (
          <View
            key={item.id}
            style={[
              styles.orderItem,
              {
                backgroundColor: THEME.colors.cardBg,
                borderColor: THEME.colors.borderColor,
              },
            ]}
          >
            <View style={styles.itemLeft}>
              <Text style={[styles.itemName, { color: THEME.colors.textPrimary }]}>
                {item.name}
              </Text>
              <Text style={[styles.itemDetails, { color: THEME.colors.textSecondary }]}>
                Qty: {item.quantity}
              </Text>
            </View>
            <View style={styles.itemRight}>
              <Text style={[styles.itemPrice, { color: THEME.colors.accent }]}>
                €{(item.price / 100).toFixed(2)}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      item.status === 'Ready'
                        ? THEME.colors.success
                        : THEME.colors.info,
                  },
                ]}
              >
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Summary */}
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
            Total:
          </Text>
          <Text style={[styles.summaryTotal, { color: THEME.colors.accent }]}>
            €{(order.totalPrice / 100).toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: THEME.colors.accent }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
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
  orderId: {
    fontSize: THEME.typography.sizes.sm,
  },
  content: {
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
  itemLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '600',
    marginBottom: THEME.spacing.xs,
  },
  itemDetails: {
    fontSize: THEME.typography.sizes.sm,
  },
  itemRight: {
    alignItems: 'flex-end',
    marginLeft: THEME.spacing.lg,
  },
  itemPrice: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '700',
    marginBottom: THEME.spacing.sm,
  },
  statusBadge: {
    paddingVertical: THEME.spacing.xs,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.sm,
  },
  statusText: {
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
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
  summaryTotal: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: '700',
  },
  backButton: {
    paddingVertical: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },
  backButtonText: {
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.base,
    fontWeight: '700',
  },
});
