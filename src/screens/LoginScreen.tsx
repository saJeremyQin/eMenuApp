import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { signIn } from 'aws-amplify/auth';
import { THEME } from '../config/theme';

type LoginScreenProps = NativeStackScreenProps<any, 'Auth'>;

type UserRole = 'waiter' | 'demo';

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [role, setRole] = useState<UserRole>('waiter');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  const isLandscape = dimensions.width > dimensions.height;
  const isTablet = dimensions.width > 600;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  // Demo credentials
  const DEMO_CREDENTIALS = {
    waiter: { email: 'waiter@demo.com', password: 'demo123' },
    demo: { email: 'demo@demo.com', password: 'demo123' },
  };

  const handleDemoLogin = async (): Promise<void> => {
    const creds = DEMO_CREDENTIALS[role];
    setEmail(creds.email);
    setPassword(creds.password);
    setLoading(true);
    
    try {
      await signIn({ username: creds.email, password: creds.password });
      // Navigation will be handled by App.tsx auth state check
    } catch (error) {
      console.error('Demo login error:', error);
      Alert.alert('Demo Mode', `Entering as ${role}`);
      // For demo purposes, proceed anyway
      setLoading(false);
    }
  };

  const handleLogin = async (): Promise<void> => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      await signIn({ username: email, password });
      // Navigation will be handled by App.tsx auth state check
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Invalid email or password, please try again';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };;

  return (
    <View style={[styles.container, { backgroundColor: THEME.colors.darkBg }]}>
      {/* Logo/Title */}
      <View style={styles.logoSection}>
        <Text style={styles.title}>eMenu</Text>
        <Text style={styles.subtitle}>Waiter App</Text>
      </View>

      {/* Role Selection */}
      <View style={styles.roleSection}>
        <Text style={styles.roleLabel}>Select Role:</Text>
        <View style={styles.roleButtons}>
          <TouchableOpacity
            style={[
              styles.roleButton,
              role === 'waiter' && styles.roleButtonActive,
            ]}
            onPress={() => setRole('waiter')}
          >
            <Text style={styles.roleButtonText}>👨‍💼 Waiter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.roleButton,
              role === 'demo' && styles.roleButtonActive,
            ]}
            onPress={() => setRole('demo')}
          >
            <Text style={styles.roleButtonText}>🎯 Demo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Login Form */}
      <View style={styles.formContainer}>
        <TextInput
          style={[styles.input, { borderColor: THEME.colors.borderColor }]}
          placeholder="Email"
          placeholderTextColor={THEME.colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <View style={[styles.passwordContainer, { borderColor: THEME.colors.borderColor }]}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor={THEME.colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            textContentType="none"
            autoCorrect={false}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>

        {/* Sign In Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled, { backgroundColor: THEME.colors.accent }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Demo Login Button */}
        <TouchableOpacity
          style={[styles.demoButton, { borderColor: THEME.colors.accent }]}
          onPress={handleDemoLogin}
          disabled={loading}
        >
          <Text style={[styles.demoButtonText, { color: THEME.colors.accent }]}>
            Quick Demo Login
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  logoSection: {
    marginBottom: THEME.spacing['3xl'],
    alignItems: 'center',
  },
  title: {
    fontSize: THEME.typography.sizes['4xl'],
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.sm,
  },
  subtitle: {
    fontSize: THEME.typography.sizes.lg,
    color: THEME.colors.textSecondary,
  },
  roleSection: {
    marginBottom: THEME.spacing.xl,
    width: '100%',
    maxWidth: 500,
  },
  roleLabel: {
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
    fontWeight: '600',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
  },
  roleButton: {
    flex: 1,
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 2,
    borderColor: THEME.colors.borderColor,
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBg,
  },
  roleButtonActive: {
    backgroundColor: THEME.colors.accent,
    borderColor: THEME.colors.accent,
  },
  roleButtonText: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  formContainer: {
    width: '100%',
    maxWidth: 500,
    gap: THEME.spacing.md,
  },
  input: {
    backgroundColor: THEME.colors.cardBg,
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.md,
    fontSize: THEME.typography.sizes.base,
    borderWidth: 1,
    borderColor: THEME.colors.borderColor,
    color: THEME.colors.textPrimary,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderColor,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.textPrimary,
  },
  eyeIcon: {
    paddingHorizontal: THEME.spacing.lg,
  },
  eyeText: {
    fontSize: THEME.typography.sizes.xl,
  },
  button: {
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    marginTop: THEME.spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.base,
    fontWeight: '600',
  },
  demoButton: {
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    marginTop: THEME.spacing.md,
  },
  demoButtonText: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '600',
  },
});

export default LoginScreen;
