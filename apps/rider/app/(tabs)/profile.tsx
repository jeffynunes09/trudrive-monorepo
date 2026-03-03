import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { getStoredUser, clearAuth, StoredUser } from '../../utils/storage'
import { getMe, updateMe, getUploadUrl, UserProfile } from '../../utils/api'

const C = {
  bg: '#0a0f1e',
  card: '#111827',
  border: '#1f2937',
  fg: '#e5e7eb',
  fgMuted: '#4b5563',
  fgSub: '#9ca3af',
  primary: '#3b82f6',
  primaryDark: '#1e3a5f',
  primaryBg: '#0d1f3c',
  error: '#ef4444',
  errorBg: '#2a0a0a',
  errorBorder: '#7f1d1d',
}

async function uploadToS3(uri: string, folder: string): Promise<{ key: string; publicUrl: string }> {
  const ext = uri.split('.').pop()?.toLowerCase() || 'jpg'
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'

  const { url, key, publicUrl } = await getUploadUrl(folder, mimeType)

  const fileRes = await fetch(uri)
  const blob = await fileRes.blob()

  const s3Res = await fetch(url, { method: 'PUT', body: blob, headers: { 'Content-Type': mimeType } })
  if (!s3Res.ok) {
    const body = await s3Res.text()
    throw new Error(`S3 recusou upload: ${s3Res.status} — ${body.slice(0, 200)}`)
  }

  return { key, publicUrl }
}

async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') {
    Alert.alert('Permissão necessária', 'Permita o acesso à galeria para enviar imagens.')
    return null
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: true,
    aspect: [1, 1],
  })
  if (result.canceled) return null
  return result.assets[0].uri
}

export default function ProfileScreen() {
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const loadProfile = useCallback(async () => {
    const u = await getStoredUser()
    setStoredUser(u)
    try {
      const p = await getMe()
      setProfile(p)
      setName(p.name)
      setPhone(p.phone ?? '')
    } catch {
      setName(u?.name ?? '')
    }
  }, [])

  useEffect(() => { loadProfile() }, [loadProfile])

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await updateMe({ name: name.trim(), phone: phone.trim() || undefined })
      setProfile(updated)
      setEditing(false)
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleUploadProfileImage() {
    const uri = await pickImage()
    if (!uri) return
    setUploadingAvatar(true)
    try {
      const { publicUrl } = await uploadToS3(uri, 'profile')
      const updated = await updateMe({ profileImage: publicUrl })
      setProfile(updated)
    } catch (err: any) {
      Alert.alert('Erro no upload', err.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleLogout() {
    await clearAuth()
    router.replace('/login')
  }

  const profileImageUrl = profile?.profileImage ?? null
  console.log('[profile] profileImageUrl:', profileImageUrl)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
        {!editing ? (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Ionicons name="pencil-outline" size={20} color={C.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => { setEditing(false); setName(profile?.name ?? ''); setPhone(profile?.phone ?? '') }}>
            <Ionicons name="close-outline" size={22} color={C.fgMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handleUploadProfileImage} activeOpacity={0.8} style={styles.avatarWrapper}>
            {uploadingAvatar ? (
              <View style={styles.avatarSpinner}>
                <ActivityIndicator color={C.primary} />
              </View>
            ) : profileImageUrl ? (
              <Image
                source={{ uri: profileImageUrl }}
                style={styles.avatarImg}
                onError={(e) => console.error('[profile] Image onError:', e.nativeEvent.error, '| url:', profileImageUrl)}
                onLoad={() => console.log('[profile] Image carregou com sucesso')}
              />
            ) : (
              <View style={styles.avatar}>
                <Ionicons name="person" size={44} color={C.primary} />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>PASSAGEIRO</Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Dados pessoais</Text>

          {editing ? (
            <>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nome</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  placeholderTextColor={C.fgMuted}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Telefone</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="+55 11 99999-9999"
                  placeholderTextColor={C.fgMuted}
                />
              </View>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Salvar alterações</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <InfoRow icon="person-outline" label="Nome" value={profile?.name ?? storedUser?.name ?? '—'} />
              <View style={styles.divider} />
              <InfoRow icon="mail-outline" label="E-mail" value={profile?.email ?? storedUser?.email ?? '—'} />
              <View style={styles.divider} />
              <InfoRow icon="call-outline" label="Telefone" value={profile?.phone ?? '—'} />
            </>
          )}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={C.error} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={17} color="#374151" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: { color: C.fg, fontSize: 20, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingVertical: 24, gap: 16 },
  avatarSection: { alignItems: 'center', gap: 10 },
  avatarWrapper: { position: 'relative' },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: C.primaryBg,
    borderWidth: 2,
    borderColor: C.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: C.primaryDark,
  },
  avatarSpinner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.border,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.bg,
  },
  badge: {
    backgroundColor: C.primaryBg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.primaryDark,
  },
  badgeText: { color: C.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 4,
  },
  sectionTitle: { color: C.fgMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  infoLabel: { color: C.fgMuted, fontSize: 13, width: 64 },
  infoValue: { color: C.fgSub, fontSize: 13, flex: 1 },
  divider: { height: 1, backgroundColor: C.border },
  field: { gap: 6, marginBottom: 4 },
  fieldLabel: { color: C.fgMuted, fontSize: 12, fontWeight: '600' },
  fieldInput: {
    backgroundColor: '#1a2236',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: C.fg,
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.errorBg,
    borderWidth: 1,
    borderColor: C.errorBorder,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  logoutText: { color: C.error, fontSize: 14, fontWeight: '600' },
})
