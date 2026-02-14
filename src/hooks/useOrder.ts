import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store/store';
import { setLoading, setError, setCurrentOrder } from '../store/orderSlice';
import GraphQLService from '../services/GraphQLService';
import { CONFIRM_ORDER_ITEMS, CANCEL_ORDER_ITEM, PAY_ORDER } from '../graphql/mutations';

/**
 * Hook: 送厨订单
 */
export function useConfirmOrderItems() {
  const dispatch = useDispatch<AppDispatch>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirmOrder = useCallback(
    async (input: {
      tableNumber: string;
      dinerId: string;
      tabId: string;
      items: Array<{
        dishId: string;
        quantity: number;
        notes?: string;
      }>;
      isFromCustomerScan?: boolean;
    }) => {
      setIsSubmitting(true);
      dispatch(setLoading(true));

      try {
        const response = await GraphQLService.mutation(CONFIRM_ORDER_ITEMS, { input });
        const order = (response as any).confirmOrderItems;
        dispatch(setCurrentOrder(order));
        dispatch(setError(null));
        return order;
      } catch (error) {
        const errorMsg = (error as any).message || '送厨失败';
        dispatch(setError(errorMsg));
        throw error;
      } finally {
        setIsSubmitting(false);
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  return { confirmOrder, isSubmitting };
}

/**
 * Hook: 退菜
 */
export function useCancelOrderItem() {
  const dispatch = useDispatch<AppDispatch>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cancelItem = useCallback(
    async (orderId: string, itemId: string, reason?: string) => {
      setIsSubmitting(true);
      dispatch(setLoading(true));

      try {
        const response = await GraphQLService.mutation(CANCEL_ORDER_ITEM, {
          orderId,
          itemId,
          reason,
        });
        const order = (response as any).cancelOrderItem;
        dispatch(setCurrentOrder(order));
        dispatch(setError(null));
        return order;
      } catch (error) {
        const errorMsg = (error as any).message || '退菜失败';
        dispatch(setError(errorMsg));
        throw error;
      } finally {
        setIsSubmitting(false);
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  return { cancelItem, isSubmitting };
}

/**
 * Hook: 支付订单
 */
export function usePayOrder() {
  const dispatch = useDispatch<AppDispatch>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const payOrder = useCallback(
    async (orderId: string) => {
      setIsSubmitting(true);
      dispatch(setLoading(true));

      try {
        const response = await GraphQLService.mutation(PAY_ORDER, { orderId });
        const order = (response as any).payOrder;
        dispatch(setCurrentOrder(order));
        dispatch(setError(null));
        return order;
      } catch (error) {
        const errorMsg = (error as any).message || '支付失败';
        dispatch(setError(errorMsg));
        throw error;
      } finally {
        setIsSubmitting(false);
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  return { payOrder, isSubmitting };
}
