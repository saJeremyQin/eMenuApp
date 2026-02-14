import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { THEME } from '../config/theme';

interface DishCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  quantity: number;
  onAddDish: () => void;
  onUpdateQuantity: (quantity: number) => void;
  itemWidth: number;
}

export default function DishCard({
  name,
  price,
  imageUrl,
  description,
  quantity,
  onAddDish,
  onUpdateQuantity,
  itemWidth,
}: DishCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.card,
        {
          width: itemWidth,
          backgroundColor: THEME.colors.cardBg,
          borderColor: THEME.colors.borderColor,
        },
      ]}
      onPress={() => quantity === 0 && onAddDish()}
    >
      {/* Image Container */}
      <View style={[styles.imageContainer, { height: itemWidth * 0.65 }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onError={() => console.log('Image load error for:', name)}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={[styles.placeholderText, { color: THEME.colors.textSecondary }]}>
              📷
            </Text>
          </View>
        )}
      </View>

      {/* Content Container */}
      <View style={styles.contentContainer}>
        {/* Title */}
        <Text
          style={[styles.title, { color: THEME.colors.textPrimary }]}
          numberOfLines={2}
        >
          {name}
        </Text>

        {/* Description */}
        {description && (
          <Text
            style={[styles.description, { color: THEME.colors.textSecondary }]}
            numberOfLines={2}
          >
            {description}
          </Text>
        )}

        {/* Footer: Price + Control */}
        <View style={styles.footer}>
          <Text style={[styles.price, { color: THEME.colors.accent }]}>
            €{(price / 100).toFixed(2)}
          </Text>

          {quantity > 0 ? (
            <View
              style={[
                styles.quantityControl,
                { backgroundColor: THEME.colors.darkBg },
              ]}
            >
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => onUpdateQuantity(quantity - 1)}
              >
                <Text style={[styles.quantitySymbol, { color: THEME.colors.accent }]}>
                  −
                </Text>
              </TouchableOpacity>
              <Text
                style={[
                  styles.quantityValue,
                  { color: THEME.colors.textPrimary },
                ]}
              >
                {quantity}
              </Text>
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => onUpdateQuantity(quantity + 1)}
              >
                <Text style={[styles.quantitySymbol, { color: THEME.colors.accent }]}>
                  +
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: THEME.colors.accent }]}
              onPress={onAddDish}
            >
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: THEME.spacing.sm,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // Elevation for Android
    elevation: 8,
  },
  imageContainer: {
    width: '100%',
    backgroundColor: THEME.colors.darkBg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.darkBg,
  },
  placeholderText: {
    fontSize: 48,
  },
  contentContainer: {
    padding: THEME.spacing.md,
  },
  title: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '600',
    marginBottom: THEME.spacing.xs,
    lineHeight: 18,
  },
  description: {
    fontSize: THEME.typography.sizes.xs,
    lineHeight: 14,
    marginBottom: THEME.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: THEME.spacing.sm,
    gap: THEME.spacing.sm,
  },
  price: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '700',
  },
  quantityControl: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: THEME.borderRadius.sm,
    paddingVertical: THEME.spacing.xs,
    paddingHorizontal: THEME.spacing.xs,
  },
  quantityBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: THEME.spacing.xs,
  },
  quantitySymbol: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '700',
  },
  quantityValue: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '600',
    paddingHorizontal: THEME.spacing.sm,
  },
  addBtn: {
    flex: 1,
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
});
