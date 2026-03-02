import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { getStoredUser, clearAuth, StoredUser } from '../../utils/storage'

export default function ProfileScreen() {
  const [user, setUser] = useState<StoredUser | null>(null)

  useEffect(() => {
    getStoredUser().then(setUser)
  }, [])

  async function handleLogout() {
    await clearAuth()
    router.replace('/')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={44} color="#22c55e" />
          </View>
          <View style={styles.onlineDot} />
        </View>

        <Text style={styles.name}>{user?.name ?? '—'}</Text>
        <Text style={styles.email}>{user?.email ?? ''}</Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>MOTORISTA</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="id-card-outline" size={18} color="#555" />
            <Text style={styles.infoLabel}>ID</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{user?.id ?? '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#555" />
            <Text style={styles.infoLabel}>Papel</Text>
            <Text style={styles.infoValue}>{user?.role ?? '—'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c1c',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#0d2a1a',
    borderWidth: 2,
    borderColor: '#166534',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#0f0f0f',
  },
  name: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  email: {
    color: '#666',
    fontSize: 14,
  },
  badge: {
    backgroundColor: '#0d2a1a',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#166534',
    marginTop: 2,
  },
  badgeText: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1c1c1c',
    padding: 4,
    marginTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#1c1c1c',
    marginHorizontal: 14,
  },
  infoLabel: {
    color: '#555',
    fontSize: 13,
    width: 40,
  },
  infoValue: {
    color: '#ccc',
    fontSize: 13,
    flex: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    backgroundColor: '#2a0a0a',
    borderWidth: 1,
    borderColor: '#7f1d1d',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
})
