import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  NativeModules,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {THEME} from '../config/theme';

const {PrintModule} = NativeModules;
const PRINTER_STORAGE_KEY = '@emenu/printer_config';

type DiscoveredPrinter = {
  name?: string;
  host: string;
  port: number;
  serviceType?: string;
};

type SavedPrinterConfig = {
  host: string;
  port: number;
  name?: string;
  serviceType?: string;
};

const parsePort = (value: string): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 9100;
  }
  return Math.min(65535, Math.max(1, Math.floor(numeric)));
};

const SettingsScreen = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [printers, setPrinters] = useState<DiscoveredPrinter[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<DiscoveredPrinter | null>(null);
  const [savedPrinter, setSavedPrinter] = useState<SavedPrinterConfig | null>(null);
  const [manualHost, setManualHost] = useState('');
  const [manualPort, setManualPort] = useState('9100');

  const loadSavedConfig = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(PRINTER_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as SavedPrinterConfig;
      if (!parsed?.host) {
        return;
      }

      setSavedPrinter(parsed);
      setManualHost(parsed.host);
      setManualPort(String(parsed.port || 9100));
      setSelectedPrinter({
        name: parsed.name,
        host: parsed.host,
        port: parsed.port || 9100,
        serviceType: parsed.serviceType,
      });
    } catch (error) {
      console.error('[Settings] Failed to load printer config:', error);
    }
  }, []);

  useEffect(() => {
    loadSavedConfig();
  }, [loadSavedConfig]);

  const savePrinterConfig = useCallback(
    async (printer: DiscoveredPrinter) => {
      const config: SavedPrinterConfig = {
        host: printer.host,
        port: printer.port || 9100,
        name: printer.name,
        serviceType: printer.serviceType,
      };

      await AsyncStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(config));
      setSavedPrinter(config);
      setSelectedPrinter(printer);
    },
    [],
  );

  const handleSearchPrinters = useCallback(async () => {
    if (!PrintModule?.discoverLANPrinters) {
      Alert.alert('Unsupported', 'Printer discovery is not available in this build.');
      return;
    }

    try {
      setIsSearching(true);
      const result = await PrintModule.discoverLANPrinters(5000);
      const normalized = Array.isArray(result)
        ? result
            .map(item => ({
              name: item?.name,
              host: String(item?.host || '').trim(),
              port: Number(item?.port) || 9100,
              serviceType: item?.serviceType,
            }))
            .filter(item => item.host.length > 0)
        : [];

      setPrinters(normalized);

      if (normalized.length === 0) {
        Alert.alert('No Printers Found', 'No printer discovered. You can set printer IP manually below.');
      }
    } catch (error: any) {
      console.error('[Settings] Discovery failed:', error);
      Alert.alert('Search Failed', error?.message || 'Could not search printers on local network.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleConfirmSelectedPrinter = useCallback(async () => {
    if (!selectedPrinter) {
      Alert.alert('No Selection', 'Please select a printer first.');
      return;
    }

    try {
      await savePrinterConfig(selectedPrinter);
      Alert.alert('Saved', `Printer saved: ${selectedPrinter.host}:${selectedPrinter.port}`);
    } catch (error: any) {
      Alert.alert('Save Failed', error?.message || 'Failed to save printer settings.');
    }
  }, [savePrinterConfig, selectedPrinter]);

  const handleSaveManual = useCallback(async () => {
    const host = manualHost.trim();
    if (!host) {
      Alert.alert('Invalid Host', 'Please enter printer IP or host.');
      return;
    }

    const manualPrinter: DiscoveredPrinter = {
      name: 'Manual Printer',
      host,
      port: parsePort(manualPort),
      serviceType: 'manual',
    };

    try {
      await savePrinterConfig(manualPrinter);
      Alert.alert('Saved', `Printer saved: ${manualPrinter.host}:${manualPrinter.port}`);
    } catch (error: any) {
      Alert.alert('Save Failed', error?.message || 'Failed to save manual printer settings.');
    }
  }, [manualHost, manualPort, savePrinterConfig]);

  const savedPrinterLabel = useMemo(() => {
    if (!savedPrinter) {
      return 'No printer configured';
    }
    const title = savedPrinter.name ? `${savedPrinter.name} ` : '';
    return `${title}${savedPrinter.host}:${savedPrinter.port}`;
  }, [savedPrinter]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Printer Settings</Text>
      <Text style={styles.pageDescription}>
        Search printers in local network, select one, and confirm to save.
      </Text>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Current Printer</Text>
        <Text style={styles.currentPrinterValue}>{savedPrinterLabel}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Search Printer</Text>
        <TouchableOpacity
          style={[styles.searchButton, isSearching && styles.searchButtonDisabled]}
          disabled={isSearching}
          onPress={handleSearchPrinters}>
          {isSearching ? (
            <View style={styles.searchingRow}>
              <ActivityIndicator color={THEME.colors.textPrimary} size="small" />
              <Text style={styles.searchButtonText}>Searching...</Text>
            </View>
          ) : (
            <Text style={styles.searchButtonText}>Search Printers</Text>
          )}
        </TouchableOpacity>

        <View style={styles.printerListContainer}>
          {printers.length === 0 ? (
            <Text style={styles.emptyHint}>No discovered printers yet.</Text>
          ) : (
            printers.map((printer, index) => {
              const selected =
                selectedPrinter?.host === printer.host && selectedPrinter?.port === printer.port;
              return (
                <TouchableOpacity
                  key={`${printer.host}:${printer.port}:${index}`}
                  style={[styles.printerItem, selected && styles.printerItemSelected]}
                  onPress={() => setSelectedPrinter(printer)}>
                  <Text style={styles.printerName}>{printer.name || 'Unnamed Printer'}</Text>
                  <Text style={styles.printerMeta}>{printer.host}:{printer.port}</Text>
                  <Text style={styles.printerService}>{printer.serviceType || 'unknown service'}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmSelectedPrinter}>
          <Text style={styles.confirmButtonText}>Confirm Selected Printer</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Manual Setup</Text>
        <Text style={styles.inputLabel}>Printer IP / Host</Text>
        <TextInput
          placeholder="192.168.1.50"
          placeholderTextColor={THEME.colors.mutedText}
          value={manualHost}
          onChangeText={setManualHost}
          style={styles.input}
          autoCapitalize="none"
        />

        <Text style={styles.inputLabel}>Port</Text>
        <TextInput
          placeholder="9100"
          placeholderTextColor={THEME.colors.mutedText}
          value={manualPort}
          onChangeText={setManualPort}
          style={styles.input}
          keyboardType="number-pad"
        />

        <TouchableOpacity style={styles.manualSaveButton} onPress={handleSaveManual}>
          <Text style={styles.manualSaveButtonText}>Save Manual Printer</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.darkBg,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  pageDescription: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginBottom: 4,
  },
  sectionCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderColor,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  currentPrinterValue: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
  searchButton: {
    backgroundColor: THEME.colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  searchButtonDisabled: {
    opacity: 0.7,
  },
  searchButtonText: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  printerListContainer: {
    borderWidth: 1,
    borderColor: THEME.colors.borderColor,
    borderRadius: 10,
    backgroundColor: THEME.colors.darkBgSecondary,
    padding: 8,
    gap: 8,
    minHeight: 100,
  },
  emptyHint: {
    color: THEME.colors.mutedText,
    fontSize: 13,
    padding: 8,
  },
  printerItem: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderColor,
    padding: 10,
    backgroundColor: THEME.colors.cardBgAlt,
  },
  printerItemSelected: {
    borderColor: THEME.colors.accent,
    backgroundColor: '#3a2a45',
  },
  printerName: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  printerMeta: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  printerService: {
    color: THEME.colors.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  confirmButton: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.accent,
    paddingVertical: 11,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: THEME.colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.colors.borderColor,
    borderRadius: 10,
    backgroundColor: THEME.colors.darkBgSecondary,
    color: THEME.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  manualSaveButton: {
    borderRadius: 10,
    backgroundColor: THEME.colors.info,
    paddingVertical: 12,
    alignItems: 'center',
  },
  manualSaveButtonText: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
});

export default SettingsScreen;