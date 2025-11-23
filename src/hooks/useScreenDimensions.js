import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';

/**
 * Custom hook to get responsive screen dimensions
 * Automatically updates when device orientation changes
 */
export const useScreenDimensions = () => {
  const [dimensions, setDimensions] = useState({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    isLandscape: Dimensions.get('window').width > Dimensions.get('window').height,
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({
        width: window.width,
        height: window.height,
        isLandscape: window.width > window.height,
      });
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
};
