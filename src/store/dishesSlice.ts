import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Alert } from 'react-native';
import GraphQLService from '../services/GraphQLService';
import { LIST_DISH_TYPES, LIST_DISHES } from '../graphql/queries';
import { RootState } from './store';

// Types
export interface DishType {
  id: string;
  name: string;
  alias?: string;
  sortOrder: number;
  isActive: boolean;
  isDeleted: boolean;
}

export interface Dish {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  dishType: {
    id: string;
    name: string;
    alias?: string;
    sortOrder: number;
  };
}

interface DishesState {
  dishTypes: DishType[];
  dishes: Dish[];
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  lastFetchTime: number | null;
}

const initialState: DishesState = {
  dishTypes: [],
  dishes: [],
  isLoaded: false,
  isLoading: false,
  error: null,
  lastFetchTime: null,
};

// Async thunk: 先加载菜品分类（快速）
export const fetchDishTypes = createAsyncThunk(
  'dishes/fetchDishTypes',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 Starting fetchDishTypes...');
      const typesResponse = await GraphQLService.query(LIST_DISH_TYPES);
      
      const allTypes = (typesResponse as any).listDishTypes || [];
      const activeTypes = allTypes.filter((t: DishType) => !t.isDeleted);
      
      console.log('✨ Dish types loaded:', {
        count: activeTypes.length,
        types: activeTypes,
      });

      return activeTypes;
    } catch (error) {
      console.error('❌ fetchDishTypes error:', error);
      return rejectWithValue((error as Error).message || 'Failed to fetch dish types');
    }
  }
);

// Async thunk: 再加载菜品（可能较慢）
export const fetchDishes = createAsyncThunk(
  'dishes/fetchDishes',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 Starting fetchDishes...');
      const dishesResponse = await GraphQLService.query(LIST_DISHES, { dishTypeId: null });
      
      const allDishes = (dishesResponse as any).listDishes || [];
      const activeDishes = allDishes.filter((d: Dish) => !d.isDeleted);
      
      console.log('✨ Dishes loaded:', {
        count: activeDishes.length,
      });

      return activeDishes;
    } catch (error) {
      console.error('❌ fetchDishes error:', error);
      return rejectWithValue((error as Error).message || 'Failed to fetch dishes');
    }
  }
);

// Async thunk: 一次性加载菜品和分类（保留向后兼容）
export const fetchDishesAndTypes = createAsyncThunk(
  'dishes/fetchDishesAndTypes',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      console.log('🔄 Starting fetchDishesAndTypes...');
      // 先加载types，然后加载dishes
      await dispatch(fetchDishTypes()).unwrap();
      const dishes = await dispatch(fetchDishes()).unwrap();
      return dishes;
    } catch (error) {
      console.error('❌ fetchDishesAndTypes error:', error);
      return rejectWithValue((error as Error).message || 'Failed to fetch dishes');
    }
  }
);

const dishesSlice = createSlice({
  name: 'dishes',
  initialState,
  reducers: {
    // 清空缓存
    clearDishesCache: (state) => {
      state.dishTypes = [];
      state.dishes = [];
      state.isLoaded = false;
      state.lastFetchTime = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchDishTypes
      .addCase(fetchDishTypes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDishTypes.fulfilled, (state, action) => {
        state.dishTypes = action.payload;
        state.error = null;
      })
      .addCase(fetchDishTypes.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Handle fetchDishes
      .addCase(fetchDishes.pending, (state) => {
        // Don't set isLoading to true here to keep UI responsive
      })
      .addCase(fetchDishes.fulfilled, (state, action) => {
        state.dishes = action.payload;
        state.isLoaded = true;
        state.isLoading = false;
        state.lastFetchTime = Date.now();
        state.error = null;
      })
      .addCase(fetchDishes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Handle fetchDishesAndTypes (for backward compatibility)
      .addCase(fetchDishesAndTypes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDishesAndTypes.fulfilled, (state) => {
        // Types and dishes are already loaded by individual thunks
        state.isLoaded = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchDishesAndTypes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearDishesCache } = dishesSlice.actions;
export default dishesSlice.reducer;

// Selectors
export const selectDishTypes = (state: RootState) => state.dishes.dishTypes;
export const selectDishes = (state: RootState) => state.dishes.dishes;
export const selectDishesLoaded = (state: RootState) => state.dishes.isLoaded;
export const selectDishesLoading = (state: RootState) => state.dishes.isLoading;
export const selectDishesError = (state: RootState) => state.dishes.error;

// 获取指定分类的菜品
export const selectDishesByType = (dishTypeId: string) => (state: RootState) =>
  state.dishes.dishes.filter(dish => dish.dishType.id === dishTypeId);

// 获取所有活跃的分类（按 sortOrder 排序）
export const selectActiveDishTypes = (state: RootState) =>
  state.dishes.dishTypes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
