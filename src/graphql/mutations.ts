import { gql } from 'graphql-request';

// Mutation: 确认订单菜品（送厨）
export const CONFIRM_ORDER_ITEMS = gql`
  mutation ConfirmOrderItems($input: ConfirmOrderItemsInput!) {
    confirmOrderItems(input: $input) {
      id
      restaurantId
      waiterId
      tableNumber
      dinerId
      tabId
      status
      totalConfirmedAmount
      paidAmount
      paidAt
      isFromCustomerScan
      scannedAt
      createdAt
      updatedAt
      batches {
        batchId
        tabId
        dinerId
        confirmedAt
        items {
          itemId
          dishId
          name
          price
          quantity
          notes
          status
          confirmedAt
          cancelledAt
          cancelReason
        }
      }
    }
  }
`;

// Mutation: 取消订单中的单个菜品（退菜）
export const CANCEL_ORDER_ITEM = gql`
  mutation CancelOrderItem($orderId: ID!, $itemId: ID!, $reason: String) {
    cancelOrderItem(orderId: $orderId, itemId: $itemId, reason: $reason) {
      id
      restaurantId
      waiterId
      tableNumber
      dinerId
      tabId
      status
      totalConfirmedAmount
      paidAmount
      paidAt
      isFromCustomerScan
      scannedAt
      createdAt
      updatedAt
      batches {
        batchId
        tabId
        dinerId
        confirmedAt
        items {
          itemId
          dishId
          name
          price
          quantity
          notes
          status
          confirmedAt
          cancelledAt
          cancelReason
        }
      }
    }
  }
`;

// Mutation: 支付订单
export const PAY_ORDER = gql`
  mutation PayOrder($orderId: ID!) {
    payOrder(orderId: $orderId) {
      id
      restaurantId
      waiterId
      tableNumber
      dinerId
      tabId
      status
      totalConfirmedAmount
      paidAmount
      paidAt
      isFromCustomerScan
      scannedAt
      createdAt
      updatedAt
      batches {
        batchId
        tabId
        dinerId
        confirmedAt
        items {
          itemId
          dishId
          name
          price
          quantity
          notes
          status
          confirmedAt
          cancelledAt
          cancelReason
        }
      }
    }
  }
`;

// Mutation: 取消整个订单
export const CANCEL_ORDER = gql`
  mutation CancelOrder($orderId: ID!) {
    cancelOrder(orderId: $orderId) {
      id
      restaurantId
      waiterId
      tableNumber
      dinerId
      tabId
      status
      totalConfirmedAmount
      paidAmount
      paidAt
      isFromCustomerScan
      scannedAt
      createdAt
      updatedAt
      batches {
        batchId
        tabId
        dinerId
        confirmedAt
        items {
          itemId
          dishId
          name
          price
          quantity
          notes
          status
          confirmedAt
          cancelledAt
          cancelReason
        }
      }
    }
  }
`;
