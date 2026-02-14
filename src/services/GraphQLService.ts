import { GraphQLClient } from 'graphql-request';
import { fetchAuthSession } from 'aws-amplify/auth';
import { GRAPHQL_CONFIG } from '../config/aws-config';

// Use Amplify configuration
const GRAPHQL_ENDPOINT = GRAPHQL_CONFIG.endpoint;

let client: GraphQLClient | null = null;
let lastTokenTime = 0;
const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes

/**
 * 初始化GraphQL Client，自动添加认证token
 */
async function initializeGraphQLClient(): Promise<GraphQLClient> {
  const now = Date.now();
  
  // Refresh client if token might be expired
  if (client && (now - lastTokenTime) < TOKEN_REFRESH_INTERVAL) {
    return client;
  }

  try {
    console.log('[GraphQL] Initializing GraphQL client with endpoint:', GRAPHQL_ENDPOINT);
    
    // 获取Cognito session和tokens
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString() || '';
    
    if (!idToken) {
      console.warn('[GraphQL] No ID token available - using unauthenticated client');
      // 为开发环境创建无认证的client
      client = new GraphQLClient(GRAPHQL_ENDPOINT, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return client;
    }

    console.log('[GraphQL] Successfully obtained ID token, creating authenticated client');
    
    // 创建GraphQL client并添加Authorization header
    client = new GraphQLClient(GRAPHQL_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    lastTokenTime = now;
    return client;
  } catch (error) {
    console.error('[GraphQL] Failed to get auth session:', error);
    console.log('[GraphQL] Falling back to unauthenticated client');
    
    // 如果没有auth session，创建一个无认证的client（用于开发/测试）
    client = new GraphQLClient(GRAPHQL_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return client;
  }
}

/**
 * 执行GraphQL查询
 */
export async function query<T>(
  document: string,
  variables?: Record<string, any>
): Promise<T> {
  try {
    const graphQLClient = await initializeGraphQLClient();
    console.log('[GraphQL] Executing query:', variables);
    const result = await graphQLClient.request<T>(document, variables);
    console.log('[GraphQL] Query succeeded');
    return result;
  } catch (error: any) {
    console.error('[GraphQL] Query failed:', {
      message: error?.message,
      status: error?.status,
      response: error?.response,
    });
    throw error;
  }
}

/**
 * 执行GraphQL mutation
 */
export async function mutation<T>(
  document: string,
  variables?: Record<string, any>
): Promise<T> {
  try {
    const graphQLClient = await initializeGraphQLClient();
    console.log('[GraphQL] Executing mutation:', variables);
    const result = await graphQLClient.request<T>(document, variables);
    console.log('[GraphQL] Mutation succeeded');
    return result;
  } catch (error: any) {
    console.error('[GraphQL] Mutation failed:', {
      message: error?.message,
      status: error?.status,
      response: error?.response,
    });
    throw error;
  }
}

/**
 * 重置client（用于登出时）
 */
export function resetGraphQLClient(): void {
  console.log('[GraphQL] Resetting GraphQL client');
  client = null;
  lastTokenTime = 0;
}

export default {
  query,
  mutation,
  resetGraphQLClient,
  initializeGraphQLClient,
};
