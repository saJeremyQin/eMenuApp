import React, { useEffect } from 'react';
import { Provider as ReduxProvider, useDispatch } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { store, AppDispatch } from './store/store';
import { fetchDishesAndTypes } from './store/dishesSlice';
import AppNavigator from './navigation/AppNavigator';

function AppNavigatorWithInitialization() {
  const dispatch = useDispatch<AppDispatch>();

  // 应用启动时加载菜品和分类
  useEffect(() => {
    console.log('🚀 AppRoot mounted, dispatching fetchDishesAndTypes...');
    const result = dispatch(fetchDishesAndTypes());
    console.log('📤 dispatch result:', result);
    
    // 添加 then 监听
    if (typeof result === 'object' && 'then' in result) {
      (result as any)
        .then((res: any) => {
          console.log('✅ fetchDishesAndTypes fulfilled:', res);
        })
        .catch((err: any) => {
          console.log('❌ fetchDishesAndTypes rejected:', err);
        });
    }
  }, [dispatch]);

  return <AppNavigator isAuthenticated={true} />;
}

export default function AppRoot() {
  return (
    <ReduxProvider store={store}>
      <AppNavigatorWithInitialization />
    </ReduxProvider>
  );
}
