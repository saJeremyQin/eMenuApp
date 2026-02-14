import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { THEME } from '../config/theme';
import { signOut } from 'aws-amplify/auth';

const AboutScreen = () => {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              console.log('[Auth] Signing out from AboutScreen');
              await signOut();
              console.log('[Auth] Sign out successful');
              // App.tsx will detect the sign-out and update isAuthenticated state
            } catch (error) {
              console.error('[Auth] Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>About</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>eMenuApp</Text>
          <Text style={styles.sectionText}>Version 4.0</Text>
          <Text style={styles.description}>
            A modern restaurant ordering app designed for iPad and landscape
            tablets.
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <Text style={styles.featureItem}>📱 Responsive iPad Layout</Text>
          <Text style={styles.featureItem}>🍽️ Real-time Menu</Text>
          <Text style={styles.featureItem}>📦 Order Management</Text>
          <Text style={styles.featureItem}>👔 Waiter Role Support</Text>
          <Text style={styles.featureItem}>🎯 Demo Mode Available</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <Text style={styles.contactInfo}>Email: support@emenuapp.com</Text>
          <Text style={styles.contactInfo}>Website: www.emenuapp.com</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.copyright}>© 2026 eMenuApp. All rights reserved.</Text>
        </View>
      </ScrollView>

      {/* Sign Out Button */}
      <TouchableOpacity
        style={[styles.signOutButton, { backgroundColor: THEME.colors.error }]}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.signOutButtonText}>🚪 Sign Out</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.darkBg,
  },
  header: {
    backgroundColor: THEME.colors.darkBg,
    borderBottomColor: THEME.colors.accent,
    borderBottomWidth: 2,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: THEME.typography.sizes['3xl'],
    fontWeight: 'bold',
    color: THEME.colors.accent,
  },
  content: {
    padding: THEME.spacing.lg,
    paddingBottom: THEME.spacing['3xl'],
  },
  section: {
    marginBottom: THEME.spacing.xl,
  },
  sectionTitle: {
    fontSize: THEME.typography.sizes['2xl'],
    fontWeight: 'bold',
    color: THEME.colors.white,
    marginBottom: THEME.spacing.md,
  },
  sectionText: {
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.mutedText,
    marginBottom: THEME.spacing.sm,
  },
  description: {
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.mutedText,
    lineHeight: 22,
    marginTop: THEME.spacing.sm,
  },
  featureItem: {
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.white,
    marginBottom: THEME.spacing.md,
    marginLeft: THEME.spacing.lg,
  },
  contactInfo: {
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.mutedText,
    marginBottom: THEME.spacing.md,
  },
  copyright: {
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.mutedText,
    textAlign: 'center',
    marginTop: THEME.spacing.xl,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.borderColor,
    marginVertical: THEME.spacing.lg,
  },
  signOutButton: {
    position: 'absolute',
    bottom: THEME.spacing.lg,
    left: THEME.spacing.lg,
    right: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButtonText: {
    color: THEME.colors.white,
    fontSize: THEME.typography.sizes.base,
    fontWeight: '600',
  },
});

export default AboutScreen;
