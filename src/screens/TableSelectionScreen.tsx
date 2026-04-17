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
  const allActiveOrders = useSelector((state: RootState) => state.order.allActiveOrders);
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
    // Step 1: immediately seed from Redux allActiveOrders cache so no table flashes to 0.
    setTableSummaries(prev => {
      const seeded: Record<string, TableSummary> = { ...prev };
      PRESET_TABLES.forEach(tableNumber => {
        const cachedOrders = allActiveOrders[tableNumber]
          ? Object.values(allActiveOrders[tableNumber])
          : [];
        if (cachedOrders.length > 0) {
          const subtotal = cachedOrders.reduce((sum: number, o: any) => {
            const amt = Number(o?.totalConfirmedAmount);
            return sum + (amt > 0 ? amt : calculateOrderSubtotalFromBatches(o));
          }, 0);
          seeded[tableNumber] = {
            totalAmount: addTax(Math.max(subtotal, 0)),
            hasActiveOrder: true,
          };
        } else if (!seeded[tableNumber]) {
          seeded[tableNumber] = { totalAmount: 0, hasActiveOrder: false };
        }
      });
      return seeded;
    });

    // Step 2: fetch each table from backend incrementally — update as each comes back.
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
          return sum + ((!Number.isNaN(orderSubtotal) && orderSubtotal > 0)
            ? orderSubtotal
            : calculateOrderSubtotalFromBatches(order));
        }, 0);

        const subtotal = Math.max(subtotalFromTable, subtotalFromDiners, subtotalFromOrders, 0);
        const totalAmount = addTax(subtotal);
        const hasActiveOrder = activeOrders.length > 0 || subtotal > 0;

        const cachedOrders = allActiveOrders[tableNumber]
          ? Object.values(allActiveOrders[tableNumber])
          : [];
        const hasCachedActive = cachedOrders.length > 0;
        const cachedSubtotal = cachedOrders.reduce((sum: number, o: any) => {
          const amt = Number(o?.totalConfirmedAmount);
          return sum + (amt > 0 ? amt : calculateOrderSubtotalFromBatches(o));
        }, 0);
        const cachedSummary: TableSummary = {
          totalAmount: addTax(Math.max(cachedSubtotal, 0)),
          hasActiveOrder: hasCachedActive,
        };

        // Update this table as soon as its result arrives — no need to wait for all 24.
        setTableSummaries(prev => {
          // Guard against transient stale backend reads when a table just got new orders.
          if (!hasActiveOrder && totalAmount === 0 && hasCachedActive) {
            return {
              ...prev,
              [tableNumber]: cachedSummary,
            };
          }
          return {
            ...prev,
            [tableNumber]: { totalAmount, hasActiveOrder },
          };
        });
      } catch (error) {
        console.warn(`⚠️ Failed to load table summary for table ${tableNumber}:`, error);
      }
    }
  }, [allActiveOrders]);

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
