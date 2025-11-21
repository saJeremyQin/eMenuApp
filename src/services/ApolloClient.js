import {ApolloClient, InMemoryCache, createHttpLink} from '@apollo/client';
import {setContext} from '@apollo/client/link/context';
import {GRAPHQL_CONFIG} from '../config/aws-config';
import AuthService from './AuthService';

// HTTP connection to GraphQL API
const httpLink = createHttpLink({
  uri: GRAPHQL_CONFIG.endpoint,
});

// Middleware to add auth token to headers
const authLink = setContext(async (_, {headers}) => {
  try {
    const token = await AuthService.getIdToken();
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      },
    };
  } catch (error) {
    console.warn('Failed to get auth token:', error);
    return {headers};
  }
});

// Create Apollo Client
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});

export default client;
