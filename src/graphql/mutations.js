import {gql} from '@apollo/client';

// Place order
export const PLACE_ORDER = gql`
  mutation PlaceOrder($input: OrderInput!) {
    placeOrder(input: $input) {
      id
      restaurantId
      waiterId
      tableNumber
      status
      totalAmount
      createdAt
      items {
        dishId
        name
        price
        quantity
        notes
      }
    }
  }
`;

// Update order status
export const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($orderId: ID!, $status: OrderStatus!) {
    updateOrderStatus(orderId: $orderId, status: $status) {
      id
      status
    }
  }
`;

// Checkout order
export const CHECKOUT_ORDER = gql`
  mutation CheckoutOrder($orderId: ID!) {
    checkoutOrder(orderId: $orderId) {
      id
      status
      totalAmount
    }
  }
`;
