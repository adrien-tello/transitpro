import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Colors, FontSize, FontWeight, Typography } from '@/theme';
import { useLogout } from '@/modules/auth/auth.queries';
import { meCustomer } from '@contracts/mocks';

interface MenuItem {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuRow({ item }: { item: MenuItem }) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, item.danger && styles.menuRowDanger]}
      onPress={item.onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.menuIcon}>{item.icon}</Text>
      <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
        {item.label}
      </Text>
      {!item.danger ? <Text style={styles.menuChevron}>›</Text> : null}
    </TouchableOpacity>
  );
}

function UserInitials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View style={styles.avatarCircle}>
      <Text style={styles.avatarInitials}>{initials}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { mutate: logout, isPending } = useLogout();

  // Use mock data — will be replaced when auth/me returns real data
  const user = meCustomer;

  function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          logout(undefined, {
            onSuccess: () => router.replace('/(auth)/login'),
            onError: () => router.replace('/(auth)/login'), // Always redirect
          });
        },
      },
    ]);
  }

  const menuItems: MenuItem[] = [
    {
      icon: '🎫',
      label: 'My Tickets',
      onPress: () => router.push('/(customer)/(tabs)/trips'),
    },
    {
      icon: '📦',
      label: 'My Parcels',
      onPress: () => router.push('/(customer)/(tabs)/parcels'),
    },
    {
      icon: '🔔',
      label: 'Notifications',
      onPress: () => {},
    },
    {
      icon: '🔒',
      label: 'Change Password',
      onPress: () => {},
    },
    {
      icon: '❓',
      label: 'Help & Support',
      onPress: () => {},
    },
    {
      icon: 'ℹ️',
      label: 'About TransitPro',
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[Typography.h3]}>Profile</Text>
        </View>

        {/* User card */}
        <View style={styles.userCard}>
          <UserInitials name={user.fullName} />
          <Text style={styles.userName}>{user.fullName}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          {user.phone ? (
            <Text style={styles.userPhone}>{user.phone}</Text>
          ) : null}
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Customer</Text>
          </View>
        </View>

        {/* Menu */}
        <Card noPadding style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <View key={item.label}>
              <MenuRow item={item} />
              {i < menuItems.length - 1 ? <View style={styles.menuDivider} /> : null}
            </View>
          ))}
        </Card>

        {/* Logout */}
        <Button
          title="Log out"
          onPress={handleLogout}
          variant="danger"
          loading={isPending}
          style={styles.logoutBtn}
        />

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },

  userCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  userName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.ink,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: FontSize.sm,
    color: Colors.inkSecondary,
    marginTop: 4,
  },
  userPhone: {
    fontSize: FontSize.sm,
    color: Colors.inkSecondary,
    marginTop: 2,
  },
  roleBadge: {
    marginTop: 12,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  menuCard: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuRowDanger: { backgroundColor: Colors.errorLight },
  menuIcon: { fontSize: 20, width: 32 },
  menuLabel: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.ink,
    marginLeft: 4,
  },
  menuLabelDanger: { color: Colors.error },
  menuChevron: { fontSize: 20, color: Colors.inkDisabled },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 56,
  },

  logoutBtn: {
    marginHorizontal: 20,
  },
  bottomPad: { height: 32 },
});
