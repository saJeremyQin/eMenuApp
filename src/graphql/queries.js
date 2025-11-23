import {gql} from 'graphql-request';

// Get restaurant info
export const GET_RESTAURANT = gql`
  query GetRestaurant {
    getRestaurant {
      id
      name
      logoUrl
      address
      phone
      subscriptionPlan
    }
  }
`;

// List dish types
export const LIST_DISH_TYPES = gql`
  query ListDishTypes {
    listDishTypes {
      id
      name
      alias
      sortOrder
      isActive
    }
  }
`;

// List dishes
export const LIST_DISHES = gql`
  query ListDishes($dishTypeId: ID) {
    listDishes(dishTypeId: $dishTypeId) {
      id
      name
      price
      imageUrl
      description
      isActive
      dishType {
        id
        name
      }
    }
  }
`;

// List orders
export const LIST_ORDERS = gql`
  query ListOrders($status: OrderStatus, $dateFrom: String, $dateTo: String) {
    listOrders(status: $status, dateFrom: $dateFrom, dateTo: $dateTo) {
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

// Get user by Cognito ID
export const GET_USER_BY_COGNITO = gql`
  query GetUserByCognito($cid: ID!) {
    getUserByCognito(cid: $cid) {
      id
      cognitoId
      email
      role
      restaurantId
    }
  }
`;
