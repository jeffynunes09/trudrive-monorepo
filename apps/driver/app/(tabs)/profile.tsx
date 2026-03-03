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
  bg: '#0f0f0f',
  card: '#111',
  border: '#1c1c1c',
  fg: '#fff',
  fgMuted: '#555',
  fgSub: '#ccc',
  primary: '#22c55e',
  primaryDark: '#166534',
  primaryBg: '#0d2a1a',
  error: '#ef4444',
  errorBg: '#2a0a0a',
  errorBorder: '#7f1d1d',
  pending: '#f59e0b',
  pendingBg: '#1c1200',
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

async function pickDocument(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') {
    Alert.alert('Permissão necessária', 'Permita o acesso à galeria para enviar documentos.')
    return null
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.9,
    allowsEditing: false,
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
  const [uploadingField, setUploadingField] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    const u = await getStoredUser()
    setStoredUser(u)
    try {
      const p = await getMe()
      setProfile(p)
      setName(p.name)
      setPhone(p.phone ?? '')
    } catch {
      // offline fallback
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
    setUploadingField('profileImage')
    try {
      const { publicUrl } = await uploadToS3(uri, 'profile')
      const updated = await updateMe({ profileImage: publicUrl })
      setProfile(updated)
    } catch (err: any) {
      Alert.alert('Erro no upload', err.message)
    } finally {
      setUploadingField(null)
    }
  }

  async function handleUploadDriverLicense() {
    const uri = await pickDocument()
    if (!uri) return
    setUploadingField('driverLicenseImage')
    try {
      const { publicUrl } = await uploadToS3(uri, 'driver_license')
      const updated = await updateMe({ driverLicenseImage: publicUrl })
      setProfile(updated)
      Alert.alert('Enviado!', 'CNH enviada. Aguarde aprovação do administrador.')
    } catch (err: any) {
      Alert.alert('Erro no upload', err.message)
    } finally {
      setUploadingField(null)
    }
  }

  async function handleUploadVehicleDoc() {
    const uri = await pickDocument()
    if (!uri) return
    setUploadingField('vehicleDocImage')
    try {
      const { publicUrl } = await uploadToS3(uri, 'vehicle_doc')
      const updated = await updateMe({ vehicleDocImage: publicUrl })
      setProfile(updated)
      Alert.alert('Enviado!', 'Documento do veículo enviado. Aguarde aprovação do administrador.')
    } catch (err: any) {
      Alert.alert('Erro no upload', err.message)
    } finally {
      setUploadingField(null)
    }
  }

  async function handleLogout() {
    await clearAuth()
    router.replace('/')
  }

  const profileImageUrl = profile?.profileImage ?? null
  console.log(`profile`, profileImageUrl)
  const isApproved = profile?.isApproved ?? false

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
            {uploadingField === 'profileImage' ? (
              <View style={styles.avatarSpinner}>
                <ActivityIndicator color={C.primary} />
              </View>
            ) : profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Ionicons name="person" size={44} color={C.primary} />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Approval status */}
          {isApproved ? (
            <View style={[styles.statusBadge, styles.statusApproved]}>
              <Ionicons name="checkmark-circle" size={13} color={C.primary} />
              <Text style={[styles.statusText, { color: C.primary }]}>Aprovado</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, styles.statusPending]}>
              <Ionicons name="time-outline" size={13} color={C.pending} />
              <Text style={[styles.statusText, { color: C.pending }]}>Pendente de aprovação</Text>
            </View>
          )}
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
                  <ActivityIndicator color="#0d1221" size="small" />
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

        {/* Vehicle card */}
        {profile && (profile.licensePlate || profile.vehicleModel) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Veículo</Text>
            {profile.licensePlate && (
              <>
                <InfoRow icon="car-outline" label="Placa" value={profile.licensePlate} />
                <View style={styles.divider} />
              </>
            )}
            {profile.vehicleModel && (
              <>
                <InfoRow icon="car-sport-outline" label="Modelo" value={profile.vehicleModel} />
                <View style={styles.divider} />
              </>
            )}
            {profile.vehicleYear && (
              <>
                <InfoRow icon="calendar-outline" label="Ano" value={String(profile.vehicleYear)} />
                <View style={styles.divider} />
              </>
            )}
            {profile.vehicleColor && (
              <InfoRow icon="color-palette-outline" label="Cor" value={profile.vehicleColor} />
            )}
          </View>
        )}

        {/* Documents card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Documentos</Text>
          {!isApproved && (
            <View style={styles.pendingAlert}>
              <Ionicons name="information-circle-outline" size={16} color={C.pending} />
              <Text style={styles.pendingAlertText}>
                Envie seus documentos para aprovação. Após aprovado, você poderá receber corridas.
              </Text>
            </View>
          )}

          <DocUploadRow
            label="CNH (Carteira de motorista)"
            icon="id-card-outline"
            hasDoc={!!profile?.driverLicenseImage}
            uploading={uploadingField === 'driverLicenseImage'}
            onPress={handleUploadDriverLicense}
          />
          <View style={styles.divider} />
          <DocUploadRow
            label="Documento do veículo (CRLV)"
            icon="document-text-outline"
            hasDoc={!!profile?.vehicleDocImage}
            uploading={uploadingField === 'vehicleDocImage'}
            onPress={handleUploadVehicleDoc}
          />
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
      <Ionicons name={icon} size={17} color="#555" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  )
}

function DocUploadRow({
  label,
  icon,
  hasDoc,
  uploading,
  onPress,
}: {
  label: string
  icon: any
  hasDoc: boolean
  uploading: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.docRow} onPress={onPress} activeOpacity={0.7} disabled={uploading}>
      <Ionicons name={icon} size={20} color={hasDoc ? '#22c55e' : '#555'} />
      <View style={styles.docInfo}>
        <Text style={styles.docLabel}>{label}</Text>
        <Text style={[styles.docStatus, hasDoc ? styles.docDone : styles.docMissing]}>
          {hasDoc ? 'Enviado' : 'Não enviado'}
        </Text>
      </View>
      {uploading ? (
        <ActivityIndicator size="small" color={C.primary} />
      ) : (
        <Ionicons name="cloud-upload-outline" size={20} color={hasDoc ? C.primary : C.fgMuted} />
      )}
    </TouchableOpacity>
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  statusApproved: { backgroundColor: C.primaryBg, borderColor: C.primaryDark },
  statusPending: { backgroundColor: C.pendingBg, borderColor: '#78350f' },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  pending: C.pending,
  pendingBg: '#1c1200',
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
    backgroundColor: '#1a1a1a',
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
  saveBtnText: { color: C.bg, fontWeight: '700', fontSize: 14 },
  pendingAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.pendingBg,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#78350f',
    marginBottom: 8,
  },
  pendingAlertText: { color: C.pending, fontSize: 12, flex: 1, lineHeight: 18 },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  docInfo: { flex: 1, gap: 2 },
  docLabel: { color: C.fgSub, fontSize: 13, fontWeight: '500' },
  docStatus: { fontSize: 11 },
  docDone: { color: C.primary },
  docMissing: { color: C.fgMuted },
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
