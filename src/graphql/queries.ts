import { gql } from 'graphql-request';

// Query: 获取订单详情
export const GET_ORDER = gql`
  query GetOrder($id: ID!) {
    getOrder(id: $id) {
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

// Query: 获取桌台状态
export const GET_TABLE_STATUS = gql`
  query GetTableStatus($tableNumber: String!) {
    getTableStatus(tableNumber: $tableNumber) {
      tableNumber
      totalConfirmedAmount
      activeOrders {
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
      diners {
        dinerId
        tabId
        confirmedAmount
        batches {
          batchId
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
  }
`;

// Query: 查询菜单
export const LIST_DISHES = gql`
  query ListDishes($dishTypeId: ID) {
    listDishes(dishTypeId: $dishTypeId) {
      id
      name
      price
      imageUrl
      description
      sortOrder
      isActive
      isDeleted
      dishType {
        id
        name
        alias
        sortOrder
      }
    }
  }
`;

// Query: 获取菜品分类
export const LIST_DISH_TYPES = gql`
  query ListDishTypes {
    listDishTypes {
      id
      name
      alias
      sortOrder
      isActive
      isDeleted
    }
  }
`;

// Query: 获取餐厅信息
export const GET_RESTAURANT = gql`
  query GetRestaurant {
    getRestaurant {
      id
      name
      logoUrl
      address
      phone
      subscriptionPlan
      subscriptionExpiry
    }
  }
`;
