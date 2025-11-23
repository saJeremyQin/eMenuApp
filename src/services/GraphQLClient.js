import {GraphQLClient} from 'graphql-request';
import {GRAPHQL_CONFIG} from '../config/aws-config';
import AuthService from './AuthService';

/**
 * Create GraphQL client with automatic Cognito authentication
 * Uses graphql-request (lightweight alternative to Apollo Client)
 */
class GraphQLService {
  constructor() {
    this.client = new GraphQLClient(GRAPHQL_CONFIG.endpoint);
  }

  /**
   * Execute GraphQL query with automatic token injection
   */
  async request(query, variables = {}) {
    try {
      // Get fresh ID token from Cognito
      const token = await AuthService.getIdToken();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Set authorization header
      this.client.setHeader('authorization', token);

      // Execute query
      const data = await this.client.request(query, variables);
      return data;
    } catch (error) {
      console.error('❌ GraphQL request failed:', error);
      throw error;
    }
  }

  /**
   * Execute mutation (same as request, but clearer intent)
   */
  async mutate(mutation, variables = {}) {
    return this.request(mutation, variables);
  }
}

// Export singleton instance
export default new GraphQLService();
