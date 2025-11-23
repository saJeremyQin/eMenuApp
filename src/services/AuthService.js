/**
 * Authentication Service using AWS Amplify Auth
 * 
 * Amplify v6 handles all the complexity:
 * - Automatic token storage and refresh
 * - Session management
 * - No manual polyfills needed
 */
import {signIn, signOut, getCurrentUser, fetchAuthSession} from 'aws-amplify/auth';

class AuthService {
  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    console.log('🔐 AuthService.signIn called');
    
    const trimmedEmail = email.toLowerCase().trim();
    
    try {
      // Amplify handles everything: authentication, token storage, session management
      const {isSignedIn, nextStep} = await signIn({
        username: trimmedEmail,
        password: password,
      });

      if (!isSignedIn) {
        console.warn('⚠️ Sign in requires additional steps:', nextStep);
        throw new Error('Additional authentication steps required');
      }

      console.log('✅ Login successful!');

      // Get session with tokens
      const session = await fetchAuthSession();
      
      return {
        idToken: session.tokens?.idToken?.toString(),
        accessToken: session.tokens?.accessToken?.toString(),
        email: trimmedEmail,
      };
    } catch (error) {
      console.log('❌ Login failed!');
      console.log('Error name:', error.name);
      console.log('Error message:', error.message);
      throw error;
    }
  }

  /**
   * Sign out
   */
  async signOut() {
    try {
      await signOut();
      console.log('✅ Signed out successfully');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    try {
      const user = await getCurrentUser();
      return user;
    } catch (error) {
      console.log('No authenticated user');
      return null;
    }
  }

  /**
   * Get current session (with automatic token refresh)
   */
  async getCurrentSession() {
    try {
      const session = await fetchAuthSession();
      
      if (!session.tokens) {
        throw new Error('No valid session');
      }

      return {
        idToken: session.tokens.idToken?.toString(),
        accessToken: session.tokens.accessToken?.toString(),
      };
    } catch (error) {
      console.log('❌ No current session:', error.message);
      throw error;
    }
  }

  /**
   * Get ID token (automatically refreshed if expired)
   */
  async getIdToken() {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString();
    } catch (error) {
      console.error('❌ Failed to get ID token:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    try {
      await getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }
}

export default new AuthService();
