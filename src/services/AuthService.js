import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AWS_CONFIG} from '../config/aws-config';

const userPool = new CognitoUserPool({
  UserPoolId: AWS_CONFIG.userPoolId,
  ClientId: AWS_CONFIG.userPoolWebClientId,
});

class AuthService {
  // Sign in with email and password
  async signIn(email, password) {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      const authDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });

      user.authenticateUser(authDetails, {
        onSuccess: async result => {
          const idToken = result.getIdToken().getJwtToken();
          const accessToken = result.getAccessToken().getJwtToken();
          const refreshToken = result.getRefreshToken().getToken();

          // Store tokens
          await AsyncStorage.setItem('idToken', idToken);
          await AsyncStorage.setItem('accessToken', accessToken);
          await AsyncStorage.setItem('refreshToken', refreshToken);
          await AsyncStorage.setItem('userEmail', email);

          resolve({
            idToken,
            accessToken,
            refreshToken,
            email,
          });
        },
        onFailure: err => {
          reject(err);
        },
      });
    });
  }

  // Get current session
  async getCurrentSession() {
    return new Promise((resolve, reject) => {
      const currentUser = userPool.getCurrentUser();
      
      if (!currentUser) {
        reject(new Error('No current user'));
        return;
      }

      currentUser.getSession((err, session) => {
        if (err) {
          reject(err);
          return;
        }

        if (!session.isValid()) {
          reject(new Error('Session is invalid'));
          return;
        }

        resolve({
          idToken: session.getIdToken().getJwtToken(),
          accessToken: session.getAccessToken().getJwtToken(),
        });
      });
    });
  }

  // Get ID token (for GraphQL Authorization header)
  async getIdToken() {
    try {
      const session = await this.getCurrentSession();
      return session.idToken;
    } catch (error) {
      // Try from storage
      const token = await AsyncStorage.getItem('idToken');
      if (token) {
        return token;
      }
      throw error;
    }
  }

  // Sign out
  async signOut() {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
    }

    // Clear stored tokens
    await AsyncStorage.multiRemove([
      'idToken',
      'accessToken',
      'refreshToken',
      'userEmail',
    ]);
  }

  // Check if user is authenticated
  async isAuthenticated() {
    try {
      await this.getCurrentSession();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default new AuthService();
