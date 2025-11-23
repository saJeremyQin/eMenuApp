import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AuthService from '../services/AuthService';
import {useScreenDimensions} from '../hooks/useScreenDimensions';

const LoginScreen = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {width, height, isLandscape} = useScreenDimensions();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('错误', '请输入邮箱和密码');
      return;
    }

    setLoading(true);
    try {
      await AuthService.signIn(email, password);
      // Navigation will be handled by App.js auth state check
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        '登录失败',
        error.message || '邮箱或密码错误，请重试',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTitleLongPress = async () => {
    // Developer feature: long press title to logout
    await AuthService.signOut();
    Alert.alert('已登出', '会话已清除，请重新登录');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onLongPress={handleTitleLongPress}>
        <Text style={[styles.title, isLandscape && styles.titleLandscape]}>
          Waiter log in
        </Text>
      </TouchableOpacity>
      <Text style={[styles.subtitle, isLandscape && styles.subtitleLandscape]}>
        eMenu Waiter App
      </Text>

      <View style={[styles.formContainer, isLandscape && styles.formContainerLandscape]}>
        <TextInput
          style={[styles.input, isLandscape && styles.inputLandscape]}
          placeholder="邮箱"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={[styles.passwordContainer, isLandscape && styles.passwordContainerLandscape]}>
          <TextInput
            style={[styles.passwordInput, isLandscape && styles.passwordInputLandscape]}
            placeholder="密码"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            textContentType="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, isLandscape && styles.buttonLandscape, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>登录</Text>
          )}
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
    backgroundColor: '#fff',
  },
  formContainer: {
    width: '85%',
    maxWidth: 500,
  },
  formContainerLandscape: {
    width: '60%',
    maxWidth: 600,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  titleLandscape: {
    fontSize: 40,
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  subtitleLandscape: {
    fontSize: 20,
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputLandscape: {
    padding: 20,
    fontSize: 18,
    marginBottom: 20,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  passwordContainerLandscape: {
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  passwordInputLandscape: {
    padding: 20,
    fontSize: 18,
  },
  eyeIcon: {
    padding: 15,
  },
  eyeText: {
    fontSize: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonLandscape: {
    padding: 20,
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;
