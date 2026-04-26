import { NativeModules, Platform, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../store/store';
import { generateReceiptHTML, ReceiptData } from '../utils/receiptTemplate';

const { PrintModule } = NativeModules;
const PRINTER_STORAGE_KEY = '@emenu/printer_config';

type SavedPrinterConfig = {
  host: string;
  port?: number;
  name?: string;
  serviceType?: string;
};

// 餐馆信息 - 后续可改为从后端 API 获取
const fetchRestaurantInfo = async (): Promise<{
  company: string;
  address: string;
  logo: string;
}> => {
  // TODO: 替换为真实的后端接口
  return {
    company: 'Forks and Chopsticks Asian Restaurant',
    address: 'Unit 69/155 Brebner Dr, West Lakes SA 5021',
    logo: 'https://emenu-app-resources.s3.ap-southeast-2.amazonaws.com/restaurant_logo.png',
  };
};

type ReceiptOrderLike = {
  id?: string;
  dinerId?: string;
  batches?: Array<{
    dinerId?: string;
    items?: Array<{
      name: string;
      quantity: number;
      price: number;
      status: string;
    }>;
  }>;
};

export const usePrintReceipt = () => {
  const currentOrder = useSelector((state: RootState) => state.order.currentOrder);
  const selectedTableNumber = useSelector((state: RootState) => state.order.selectedTableNumber);
  const selectedDinerId = useSelector((state: RootState) => state.order.selectedDinerId);
  const allDinerTabs = useSelector((state: RootState) => state.order.dinerTabs);

  // 获取当前 diner 的已确认菜品
  const confirmedItems = useMemo(() => {
    if (!currentOrder?.batches) return [];
    return currentOrder.batches
      .filter((batch: any) => batch.dinerId === selectedDinerId)
      .flatMap((batch: any) =>
        batch.items.filter((item: any) => item.status === 'CONFIRMED')
      );
  }, [currentOrder, selectedDinerId]);

  // 获取当前桌所有 diner 的已确认菜品（用于整桌结账）
  const allConfirmedItems = useMemo(() => {
    if (!currentOrder?.batches) return [];
    const tableTabIds = allDinerTabs
      .filter(tab => tab.tableNumber === selectedTableNumber)
      .map(tab => tab.dinerId);
    return currentOrder.batches
      .filter((batch: any) => tableTabIds.includes(batch.dinerId))
      .flatMap((batch: any) =>
        batch.items.filter((item: any) => item.status === 'CONFIRMED')
      );
  }, [currentOrder, allDinerTabs, selectedTableNumber]);

  const buildReceiptHTML = useCallback(async (printAllDiners: boolean) => {
    const items = printAllDiners ? allConfirmedItems : confirmedItems;

    if (items.length === 0) {
      Alert.alert('No Items', 'No confirmed items to print.');
      return null;
    }

    const restaurant = await fetchRestaurantInfo();

    // 合并相同菜品
    const mergedDishes: { [key: string]: { name: string; quantity: number; price: number } } = {};
    items.forEach((item: any) => {
      if (mergedDishes[item.name]) {
        mergedDishes[item.name].quantity += item.quantity;
      } else {
        mergedDishes[item.name] = {
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        };
      }
    });

    const dishes = Object.values(mergedDishes);
    const subtotal = dishes.reduce((sum, d) => sum + d.price * d.quantity, 0);
    const tax = Math.round(subtotal * 0.1); // 10% GST
    const total = subtotal + tax;

    const dinerCount = printAllDiners
      ? allDinerTabs.filter(tab => tab.tableNumber === selectedTableNumber).length
      : 1;

    const receiptData: ReceiptData = {
      restaurant,
      tableNumber: Number(selectedTableNumber) || 0,
      diners: dinerCount,
      dishes,
      subtotal,
      tax,
      total,
      orderId: currentOrder?.id,
      printTime: new Date().toLocaleString('en-AU', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    };

    return generateReceiptHTML(receiptData);
  }, [confirmedItems, allConfirmedItems, selectedTableNumber, allDinerTabs, currentOrder]);

  const getSavedPrinterConfig = useCallback(async (): Promise<SavedPrinterConfig | null> => {
    try {
      const raw = await AsyncStorage.getItem(PRINTER_STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as SavedPrinterConfig;
      if (!parsed?.host) return null;
      return parsed;
    } catch (error) {
      console.warn('⚠️ Failed to read printer config:', error);
      return null;
    }
  }, []);

  // 错误分类辅助函数
  const classifyPrintError = (error: any) => {
    const msg = (error?.message || error?.localizedDescription || '').toLowerCase();
    const description = error?.localizedDescription?.toLowerCase() || '';
    
    if (msg.includes('timeout') || description.includes('timeout')) {
      return 'TIMEOUT';
    }
    if (msg.includes('connect') || description.includes('failed to connect') || description.includes('refused')) {
      return 'CONNECTION_FAILED';
    }
    if (msg.includes('resolve') || description.includes('failed to resolve')) {
      return 'DNS_RESOLUTION';
    }
    if (msg.includes('send') || description.includes('failed while sending')) {
      return 'TRANSMISSION_ERROR';
    }
    if (msg.includes('cancel')) {
      return 'USER_CANCELLED';
    }
    return 'UNKNOWN';
  };

  // 日志记录打印降级事件
  const logPrintFallback = useCallback((reason: string, printerIP: string | undefined, error: any) => {
    const errorType = classifyPrintError(error);
    console.log('📊 Print Fallback Event:', {
      timestamp: new Date().toISOString(),
      reason,
      printerIP,
      errorType,
      errorMessage: error?.localizedDescription || error?.message,
    });
  }, []);

  // LAN 打印重试机制
  const printToLANWithRetry = useCallback(
    async (html: string, host: string, port: number, maxRetries = 3) => {
      let lastError: any = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await PrintModule.printToLANPrinter(html, host, port);
          console.log(`✅ LAN print succeeded on attempt ${attempt}/${maxRetries}`);
          return true;
        } catch (error) {
          lastError = error;
          const errorType = classifyPrintError(error);
          console.warn(
            `⚠️ LAN print attempt ${attempt}/${maxRetries} failed [${errorType}]:`,
            error?.localizedDescription || error?.message
          );

          // 如果是用户取消，不需要重试
          if (errorType === 'USER_CANCELLED') {
            throw error;
          }

          // 如果不是最后一次尝试，延迟后重试
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500 * attempt)); // 递增延迟
          }
        }
      }

      // 所有重试都失败
      return false;
    },
    []
  );

  const printWithLanFallback = useCallback(
    async (html: string) => {
      if (!PrintModule?.printHTML) {
        throw new Error('Print module is not available. Please restart the app.');
      }

      const savedPrinter = await getSavedPrinterConfig();
      const canUseLan = !!savedPrinter?.host && !!PrintModule?.printToLANPrinter;

      if (canUseLan) {
        const port = Number(savedPrinter?.port) || 9100;
        try {
          const success = await printToLANWithRetry(html, savedPrinter!.host, port);
          if (success) {
            return; // LAN 打印成功
          }
        } catch (lanError) {
          // 用户主动取消的情况
          if (classifyPrintError(lanError) === 'USER_CANCELLED') {
            throw lanError;
          }
        }

        // LAN 打印失败，记录降级事件
        logPrintFallback(
          'LAN_FAILED',
          savedPrinter?.host,
          lastError || { message: 'Unknown error' }
        );
        Alert.alert(
          'LAN Printer Unavailable',
          'Using system print dialog (AirPrint) instead.'
        );
      }

      // 使用系统打印（AirPrint）作为备选
      await PrintModule.printHTML(html);
    },
    [getSavedPrinterConfig, printToLANWithRetry, logPrintFallback]
  );

  const printReceipt = useCallback(async (printAllDiners: boolean = true) => {
    try {
      const html = await buildReceiptHTML(printAllDiners);
      if (!html) return;

      if (Platform.OS === 'ios') {
        await printWithLanFallback(html);
        // 成功提示
        console.log('✅ Receipt printed successfully');
      } else {
        Alert.alert('Not Supported', 'Printing is currently only supported on iOS.');
      }
    } catch (error: any) {
      const errorType = classifyPrintError(error);
      console.error('❌ Print failed:', { errorType, error });

      // 不同错误类型的用户提示
      const errorMessages: Record<string, string> = {
        TIMEOUT: 'Printer connection timed out. Please check the printer and try again.',
        CONNECTION_FAILED: 'Cannot connect to the configured printer. Please verify the IP address and network connection.',
        DNS_RESOLUTION: 'Cannot resolve printer address. Please check the printer configuration.',
        TRANSMISSION_ERROR: 'Error sending print data. The printer may have lost connection.',
        USER_CANCELLED: 'Print cancelled.',
        UNKNOWN: 'Failed to print receipt. Please try again.',
      };

      Alert.alert(
        'Print Error',
        errorMessages[errorType] || error.message || 'Failed to print receipt.'
      );
    }
  }, [buildReceiptHTML, printWithLanFallback, classifyPrintError]);

  const previewReceipt = useCallback(async (printAllDiners: boolean = true) => {
    try {
      const html = await buildReceiptHTML(printAllDiners);
      if (!html) return;

      if (Platform.OS === 'ios') {
        if (!PrintModule?.previewHTML) {
          Alert.alert('Preview Error', 'Preview module is not available. Please restart the app.');
          return;
        }
        await PrintModule.previewHTML(html);
      } else {
        Alert.alert('Not Supported', 'Preview is currently only supported on iOS.');
      }
    } catch (error: any) {
      console.error('❌ Preview failed:', error);
      Alert.alert('Preview Error', error.message || 'Failed to preview receipt.');
    }
  }, [buildReceiptHTML]);

  const buildTableSummaryHTMLFromOrders = useCallback(async (orders: ReceiptOrderLike[]) => {
    if (!orders || orders.length === 0) {
      Alert.alert('No Orders', 'No paid orders to print for this table.');
      return null;
    }

    const allItems = orders.flatMap(order =>
      (order.batches || []).flatMap(batch =>
        (batch.items || []).filter(item => item.status === 'CONFIRMED')
      )
    );

    if (allItems.length === 0) {
      Alert.alert('No Items', 'No confirmed items to print.');
      return null;
    }

    const restaurant = await fetchRestaurantInfo();

    const mergedDishes: { [key: string]: { name: string; quantity: number; price: number } } = {};
    allItems.forEach(item => {
      if (mergedDishes[item.name]) {
        mergedDishes[item.name].quantity += item.quantity;
      } else {
        mergedDishes[item.name] = {
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        };
      }
    });

    const dishes = Object.values(mergedDishes);
    const subtotal = dishes.reduce((sum, d) => sum + d.price * d.quantity, 0);
    const tax = Math.round(subtotal * 0.1);
    const total = subtotal + tax;

    const uniqueDiners = new Set(
      orders
        .map(order => String(order.dinerId ?? '0'))
        .filter(Boolean)
    );

    const receiptData: ReceiptData = {
      restaurant,
      tableNumber: Number(selectedTableNumber) || 0,
      diners: uniqueDiners.size || 1,
      dishes,
      subtotal,
      tax,
      total,
      orderId: undefined,
      printTime: new Date().toLocaleString('en-AU', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    };

    return generateReceiptHTML(receiptData);
  }, [selectedTableNumber]);

  const printTableSummaryFromOrders = useCallback(async (orders: ReceiptOrderLike[]) => {
    try {
      const html = await buildTableSummaryHTMLFromOrders(orders);
      if (!html) return;

      if (Platform.OS === 'ios') {
        await printWithLanFallback(html);
      } else {
        Alert.alert('Not Supported', 'Printing is currently only supported on iOS.');
      }
    } catch (error: any) {
      console.error('❌ Table summary print failed:', error);
      Alert.alert('Print Error', error.message || 'Failed to print table summary receipt.');
    }
  }, [buildTableSummaryHTMLFromOrders, printWithLanFallback]);

  const previewTableSummaryFromOrders = useCallback(async (orders: ReceiptOrderLike[]) => {
    try {
      const html = await buildTableSummaryHTMLFromOrders(orders);
      if (!html) return;

      if (Platform.OS === 'ios') {
        if (!PrintModule?.previewHTML) {
          Alert.alert('Preview Error', 'Preview module is not available. Please restart the app.');
          return;
        }
        await PrintModule.previewHTML(html);
      } else {
        Alert.alert('Not Supported', 'Preview is currently only supported on iOS.');
      }
    } catch (error: any) {
      console.error('❌ Table summary preview failed:', error);
      Alert.alert('Preview Error', error.message || 'Failed to preview table summary receipt.');
    }
  }, [buildTableSummaryHTMLFromOrders]);

  const showPrintDialog = useCallback(() => {
    Alert.alert(
      'Print Receipt',
      'Would you like to print a receipt?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Preview',
          onPress: () => setTimeout(() => previewReceipt(true), 120),
        },
        {
          text: 'Print',
          onPress: () => setTimeout(() => printReceipt(true), 120),
        },
      ]
    );
  }, [printReceipt, previewReceipt]);

  return {
    printReceipt,
    previewReceipt,
    showPrintDialog,
    printTableSummaryFromOrders,
    previewTableSummaryFromOrders,
  };
};