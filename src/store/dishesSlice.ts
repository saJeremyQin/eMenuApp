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

// Async thunk: 一次性加载菜品和分类
export const fetchDishesAndTypes = createAsyncThunk(
  'dishes/fetchDishesAndTypes',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 Starting fetchDishesAndTypes...');
      // 并行请求分类和菜品
      const [typesResponse, dishesResponse] = await Promise.all([
        GraphQLService.query(LIST_DISH_TYPES),
        GraphQLService.query(LIST_DISHES, { dishTypeId: null }),
      ]);

      console.log('📦 Raw responses:', { typesResponse, dishesResponse });

      const allTypes = (typesResponse as any).listDishTypes || [];
      const allDishes = (dishesResponse as any).listDishes || [];

      console.log('📊 Data before filtering:', {
        allTypesCount: allTypes.length,
        allDishesCount: allDishes.length,
        allTypes,
        allDishes,
      });

      // 过滤出活跃的数据
      // 注意：如果数据库中没有 isActive 字段或都是 false，则会返回空数组
      // 暂时先不过滤，看看是否能逻辑问题
      // const activeTypes = allTypes.filter((t: DishType) => t.isActive && !t.isDeleted);
      // const activeDishes = allDishes.filter((d: Dish) => d.isActive && !d.isDeleted);
      
      // 只过滤已删除的，不过滤 isActive 状态
      const activeTypes = allTypes.filter((t: DishType) => !t.isDeleted);
      const activeDishes = allDishes.filter((d: Dish) => !d.isDeleted);

      console.log('✨ Data after filtering:', {
        activeTypesCount: activeTypes.length,
        activeDishesCount: activeDishes.length,
        activeTypes,
        activeDishes,
      });

      return {
        dishTypes: activeTypes,
        dishes: activeDishes,
        fetchTime: Date.now(),
      };
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
      .addCase(fetchDishesAndTypes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDishesAndTypes.fulfilled, (state, action) => {
        state.dishTypes = action.payload.dishTypes;
        state.dishes = action.payload.dishes;
        state.isLoaded = true;
        state.isLoading = false;
        state.lastFetchTime = action.payload.fetchTime;
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
