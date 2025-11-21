import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {useQuery, useMutation} from '@apollo/client';
import {LIST_ORDERS} from '../graphql/queries';
import {UPDATE_ORDER_STATUS} from '../graphql/mutations';
import FCMService from '../services/FCMService';

const OrdersScreen = () => {
  const [refreshing, setRefreshing] = useState(false);

  // Query pending orders
  const {data, loading, refetch} = useQuery(LIST_ORDERS, {
    variables: {status: 'PENDING'},
    pollInterval: 30000, // Fallback polling every 30s
  });

  const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS);

  // Setup FCM listener for new orders
  useEffect(() => {
    const unsubscribe = FCMService.onMessageReceived(message => {
      console.log('📩 New order notification:', message);
      // Refetch orders when notification received
      refetch();
      
      // Show alert
      if (message.notification) {
        Alert.alert(
          message.notification.title || '新订单',
          message.notification.body || '有新的订单需要确认',
        );
      }
    });

    return unsubscribe;
  }, [refetch]);

  const handleConfirmOrder = async orderId => {
    try {
      await updateOrderStatus({
        variables: {
          orderId,
          status: 'CONFIRMED',
        },
      });

      Alert.alert('成功', '订单已确认，准备打印小票');
      // TODO: Trigger printer
      refetch();
    } catch (error) {
      console.error('Confirm order error:', error);
      Alert.alert('错误', '确认订单失败，请重试');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderOrderItem = ({item}) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.tableNumber}>桌号: {item.tableNumber}</Text>
        <Text style={styles.orderTime}>
          {new Date(item.createdAt).toLocaleTimeString('zh-CN')}
        </Text>
      </View>

      <View style={styles.itemsList}>
        {item.items.map((dish, index) => (
          <Text key={index} style={styles.dishItem}>
            {dish.name} x{dish.quantity}
            {dish.notes ? ` (${dish.notes})` : ''}
          </Text>
        ))}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.totalAmount}>
          总计: ¥{(item.totalAmount / 100).toFixed(2)}
        </Text>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => handleConfirmOrder(item.id)}>
          <Text style={styles.confirmButtonText}>确认订单</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>待处理订单</Text>
      
      <FlatList
        data={data?.listOrders || []}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {loading ? '加载中...' : '暂无待处理订单'}
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 20,
    backgroundColor: '#fff',
  },
  orderCard: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  orderTime: {
    fontSize: 14,
    color: '#666',
  },
  itemsList: {
    marginVertical: 10,
  },
  dishItem: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  confirmButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#999',
  },
});

export default OrdersScreen;
