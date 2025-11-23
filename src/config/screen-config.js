import { Dimensions } from 'react-native';

// Get initial dimensions
const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

export const SCREEN = {
  width: windowWidth,
  height: windowHeight,
  isLandscape: windowWidth > windowHeight,
};

// Common spacing values
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// Responsive layout breakpoints
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
};

export const isTablet = () => Math.min(windowWidth, windowHeight) >= BREAKPOINTS.tablet;
