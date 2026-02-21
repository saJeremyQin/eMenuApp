import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { THEME } from '../config/theme';

interface TableCardProps {
  tableNumber: string;
  borderColor: string;
  backgroundColor: string;
  accentColor: string;
  onPress: (tableNumber: string) => void;
  totalAmount?: number; // 可选：当前桌的菜品总金额（单位：分）
}

export default function TableCard({
  tableNumber,
  borderColor,
  backgroundColor,
  accentColor,
  onPress,
  totalAmount = 0,
}: TableCardProps) {
  const hasOrder = totalAmount && totalAmount > 0;
  const totalEuro = (totalAmount / 100).toFixed(2);

  return (
    <TouchableOpacity
      style={[
        styles.tableCard,
        {
          borderColor,
          backgroundColor,
        },
      ]}
      onPress={() => onPress(tableNumber)}
    >
      <Text style={styles.tableIcon}>🍽️</Text>
      <Text style={[styles.tableNumber, { color: accentColor }]}>
        Table {tableNumber}
      </Text>
      
      {/* 显示总金额（如果有点单） */}
      {hasOrder && (
        <View style={styles.totalContainer}>
          <Text style={[styles.totalAmount, { color: accentColor }]}>
            €{totalEuro}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tableCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 2,
    padding: THEME.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  tableIcon: {
    fontSize: 48,
  },
  tableNumber: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '600',
  },
  totalContainer: {
    marginTop: THEME.spacing.sm,
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
    alignItems: 'center',
  },
  totalAmount: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
  },
});
