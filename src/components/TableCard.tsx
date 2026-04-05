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
  totalAmount?: number; // 可选：当前桌进行中订单总金额（单位：分，含税）
  hasActiveOrder?: boolean; // 是否存在进行中的订单（即使金额为 0 也显示）
}

export default function TableCard({
  tableNumber,
  borderColor,
  backgroundColor,
  accentColor,
  onPress,
  totalAmount = 0,
  hasActiveOrder = false,
}: TableCardProps) {
  const showInProgressAmount = hasActiveOrder || totalAmount > 0;
  const totalDollar = (totalAmount / 100).toFixed(2);

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
      {showInProgressAmount && (
        <View style={styles.inProgressBadge}>
          <View style={styles.flagIcon}>
            <View style={styles.flagPole} />
            <View style={styles.flagCloth} />
          </View>
          <Text style={styles.totalAmount}>
            ${totalDollar}
          </Text>
        </View>
      )}

      <Text style={styles.tableIcon}>🍽️</Text>
      <Text style={[styles.tableNumber, { color: accentColor }]}>
        Table {tableNumber}
      </Text>
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
    position: 'relative',
  },
  tableIcon: {
    fontSize: 48,
  },
  tableNumber: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '600',
  },
  inProgressBadge: {
    position: 'absolute',
    top: THEME.spacing.md,
    left: THEME.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.xs,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(229, 57, 53, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(229, 57, 53, 0.35)',
  },
  flagIcon: {
    width: 18,
    height: 18,
    position: 'relative',
    justifyContent: 'center',
  },
  flagPole: {
    position: 'absolute',
    left: 1,
    top: 1,
    width: 2.5,
    height: 16,
    borderRadius: 1,
    backgroundColor: '#F6C1BF',
  },
  flagCloth: {
    position: 'absolute',
    left: 4,
    top: 1,
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#E53935',
  },
  totalAmount: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '700',
    color: '#FFD7D6',
  },
});
