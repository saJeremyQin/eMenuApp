import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AppDispatch, RootState } from '../store/store';
import { setSelectedTable } from '../store/orderSlice';
import { THEME } from '../config/theme';
import TableCard from '../components/TableCard';
import { query as gqlQuery } from '../services/GraphQLService';
import { GET_TABLE_STATUS } from '../graphql/queries';

// Generate table numbers 1-24
const PRESET_TABLES = Array.from({ length: 24 }, (_, i) => `${i + 1}`);

interface TableItem {
  id: string;
  number: string;
}

interface TableSummary {
  totalAmount: number;
  hasActiveOrder: boolean;
}

export default function TableSelectionScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const selectedTableNumber = useSelector((state: RootState) => state.order.selectedTableNumber);
  const currentOrder = useSelector((state: RootState) => state.order.currentOrder);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [tableSummaries, setTableSummaries] = useState<Record<string, TableSummary>>({});

  const isLandscape = dimensions.width > dimensions.height;

  // Calculate grid columns based on screen width
  const getGridColumns = () => {
    if (!isLandscape) return 3;
    return 4; // Fixed 4 columns for landscape
  };

  const tableItems: TableItem[] = PRESET_TABLES.map(num => ({
    id: `table-${num}`,
    number: num,
  }));

  const addTax = (subtotal: number) => subtotal + Math.round(subtotal * 0.1);

  const calculateOrderSubtotalFromBatches = (order: any) => {
    return (order?.batches || []).reduce((sum: number, batch: any) => {
      const confirmedItems = (batch?.items || []).filter((item: any) => item?.status === 'CONFIRMED');
      const batchSubtotal = confirmedItems.reduce(
        (itemSum: number, item: any) => itemSum + (Number(item?.price) || 0) * (Number(item?.quantity) || 0),
        0
      );
      return sum + batchSubtotal;
    }, 0);
  };

  const loadTableSummaries = useCallback(async () => {
    const nextSummaries: Record<string, TableSummary> = PRESET_TABLES.reduce((acc, tableNumber) => {
      acc[tableNumber] = tableSummaries[tableNumber] || { totalAmount: 0, hasActiveOrder: false };
      return acc;
    }, {} as Record<string, TableSummary>);

    let optimisticTableNumber: string | null = null;
    let optimisticSummary: TableSummary | null = null;

    // Optimistic display for the table the waiter just worked on.
    if (
      selectedTableNumber &&
      currentOrder &&
      String(currentOrder.tableNumber) === String(selectedTableNumber) &&
      currentOrder.status !== 'PAID' &&
      currentOrder.status !== 'CANCELLED'
    ) {
      const localSubtotal = (() => {
        const totalConfirmed = Number(currentOrder.totalConfirmedAmount);
        if (!Number.isNaN(totalConfirmed) && totalConfirmed > 0) {
          return totalConfirmed;
        }
        return calculateOrderSubtotalFromBatches(currentOrder);
      })();

      nextSummaries[selectedTableNumber] = {
        totalAmount: addTax(Math.max(localSubtotal, 0)),
        hasActiveOrder: true,
      };
      optimisticTableNumber = selectedTableNumber;
      optimisticSummary = nextSummaries[selectedTableNumber];

      setTableSummaries({ ...nextSummaries });
    }

    for (const tableNumber of PRESET_TABLES) {
      try {
        const response = await gqlQuery(GET_TABLE_STATUS, { tableNumber });
        const tableStatus = (response as any)?.getTableStatus || {};
        const activeOrders = (tableStatus?.activeOrders || [])
          .filter((order: any) => order?.status !== 'PAID' && order?.status !== 'CANCELLED');

        const subtotalFromTable = Number(tableStatus?.totalConfirmedAmount) || 0;
        const subtotalFromDiners = (tableStatus?.diners || []).reduce(
          (sum: number, diner: any) => sum + (Number(diner?.confirmedAmount) || 0),
          0
        );
        const subtotalFromOrders = activeOrders.reduce((sum: number, order: any) => {
          const orderSubtotal = Number(order?.totalConfirmedAmount);
          if (!Number.isNaN(orderSubtotal) && orderSubtotal > 0) {
            return sum + orderSubtotal;
          }
          return sum + calculateOrderSubtotalFromBatches(order);
        }, 0);

        const subtotal = Math.max(subtotalFromTable, subtotalFromDiners, subtotalFromOrders, 0);
        const totalAmount = addTax(subtotal);
        const hasActiveOrder = activeOrders.length > 0 || subtotal > 0;

        const remoteSummary: TableSummary = {
          totalAmount,
          hasActiveOrder,
        };

        // Guard against temporary stale backend reads right after returning from Menu.
        if (
          optimisticTableNumber &&
          optimisticSummary &&
          tableNumber === optimisticTableNumber &&
          !remoteSummary.hasActiveOrder &&
          remoteSummary.totalAmount === 0
        ) {
          nextSummaries[tableNumber] = optimisticSummary;
        } else {
          nextSummaries[tableNumber] = remoteSummary;
        }

        if (selectedTableNumber && tableNumber === selectedTableNumber) {
          console.log(`📊 Table ${tableNumber} summary:`, {
            subtotalFromTable,
            subtotalFromDiners,
            subtotalFromOrders,
            subtotal,
            totalAmount,
            hasActiveOrder,
            activeOrdersCount: activeOrders.length,
          });
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load table summary for table ${tableNumber}:`, error);
      }
    }

    setTableSummaries(nextSummaries);
  }, [selectedTableNumber, currentOrder, tableSummaries]);

  useFocusEffect(
    useCallback(() => {
      loadTableSummaries();
      return undefined;
    }, [loadTableSummaries])
  );

  const handleSelectTable = (tableNumber: string) => {
    dispatch(setSelectedTable(tableNumber)); // Handles reset and initialization
    navigation.navigate('Menu');
  };

  const renderTableCard = ({ item }: { item: TableItem }) => {
    const summary = tableSummaries[item.number] || { totalAmount: 0, hasActiveOrder: false };

    return (
      <TableCard
        tableNumber={item.number}
        borderColor={THEME.colors.borderColor}
        backgroundColor={THEME.colors.cardBg}
        accentColor={THEME.colors.accent}
        onPress={handleSelectTable}
        totalAmount={summary.totalAmount}
        hasActiveOrder={summary.hasActiveOrder}
      />
    );
  };

  const gridColumns = getGridColumns();

  return (
    <View style={[styles.container, { backgroundColor: THEME.colors.darkBg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: THEME.colors.accent, paddingTop: insets.top + THEME.spacing.xl }]}>
        <Text style={[styles.headerTitle, { color: THEME.colors.textPrimary }]}>
          🪑 Select Table
        </Text>
      </View>

      {/* Main Content - Tables Grid */}
      <FlatList
        data={tableItems}
        renderItem={renderTableCard}
        keyExtractor={(item) => item.id}
        numColumns={gridColumns}
        scrollEnabled={true}
        columnWrapperStyle={{
          gap: THEME.spacing.lg,
          marginBottom: THEME.spacing.lg,
        }}
        contentContainerStyle={{
          paddingHorizontal: THEME.spacing.xl,
          paddingVertical: THEME.spacing.xl,
        }}
        style={styles.gridContainer}
      />
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
  },
  gridContainer: {
    flex: 1,
  },
});
