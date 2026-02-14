import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

interface ScreenDimensions {
  width: number;
  height: number;
  isLandscape: boolean;
  isTablet: boolean;
}

export const useScreenDimensions = (): ScreenDimensions => {
  const [dimensions, setDimensions] = useState<ScreenDimensions>(() => {
    const window = Dimensions.get('window');
    return {
      width: window.width,
      height: window.height,
      isLandscape: window.width > window.height,
      isTablet: window.width > 600, // Simple heuristic: tablets typically > 600dp wide
    };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window, screen }: { window: ScaledSize; screen: ScaledSize }) => {
      setDimensions({
        width: window.width,
        height: window.height,
        isLandscape: window.width > window.height,
        isTablet: window.width > 600,
      });
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
};
