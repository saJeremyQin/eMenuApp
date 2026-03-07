import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { AppDispatch } from '../store/store';
import { setSelectedTable } from '../store/orderSlice';
import { THEME } from '../config/theme';
import TableCard from '../components/TableCard';

// Generate table numbers 1-24
const PRESET_TABLES = Array.from({ length: 24 }, (_, i) => `${i + 1}`);

interface TableItem {
  id: string;
  number: string;
}

export default function TableSelectionScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

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

  const handleSelectTable = (tableNumber: string) => {
    dispatch(setSelectedTable(tableNumber)); // Handles reset and initialization
    navigation.navigate('Menu');
  };

  const renderTableCard = ({ item }: { item: TableItem }) => {
    return (
      <TableCard
        tableNumber={item.number}
        borderColor={THEME.colors.borderColor}
        backgroundColor={THEME.colors.cardBg}
        accentColor={THEME.colors.accent}
        onPress={handleSelectTable}
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
