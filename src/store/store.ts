import { configureStore } from '@reduxjs/toolkit';
import orderReducer from './orderSlice';
import dishesReducer from './dishesSlice';

export const store = configureStore({
  reducer: {
    order: orderReducer,
    dishes: dishesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
