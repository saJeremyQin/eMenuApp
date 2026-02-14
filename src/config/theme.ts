// Theme Colors - Based on prototype-v4 design
export const THEME = {
  colors: {
    // Primary
    darkBg: '#0a1f3f',      // Deep blue background
    darkBgSecondary: '#0f2a48',
    accent: '#ff3d7f',      // Pink accent
    accentLight: '#ff6ba3',
    
    // Text
    textPrimary: '#ffffff',
    textSecondary: '#7a8fa3',
    textMuted: '#999999',
    mutedText: '#7a8fa3',
    white: '#ffffff',
    
    // Cards & Elements
    cardBg: '#1a3a5c',
    cardBgAlt: '#2a4a6c',
    borderColor: '#2a4a6c',
    
    // Status
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
  },
  
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    sizes: {
      xs: 11,
      sm: 12,
      base: 14,
      lg: 16,
      xl: 18,
      '2xl': 24,
      '3xl': 28,
      '4xl': 32,
    },
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 999,
  },
  
  shadow: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
    },
  },
};

export type Theme = typeof THEME;
