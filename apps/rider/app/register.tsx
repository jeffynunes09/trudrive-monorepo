import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { register } from '../utils/api'
import { saveAuth } from '../utils/storage'

const C = {
  bg: '#0d1221',
  card: '#131c2e',
  input: '#1c2a44',
  border: '#1e2e48',
  fg: '#edf2f7',
  fgMuted: '#7b92a5',
  primary: '#1adad0',
  primaryFg: '#0d1221',
  error: '#ef4444',
}

export default function RegisterScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegister() {
    setError(null)

    if (!name.trim() || !email.trim() || !password) {
      setError('Preencha todos os campos obrigatórios')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)

    try {
      const result = await register({
        name: name.trim(),
        email: email.trim(),
        password,
      })
      await saveAuth(result.token, result.user)
      router.replace({ pathname: '/home', params: { userId: result.user.id } })
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    !loading

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>T</Text>
          </View>
          <Text style={styles.appName}>JnDrive</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>PASSAGEIRO</Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.title}>Criar conta</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nome completo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Seu nome"
              placeholderTextColor={C.fgMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>E-mail *</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor={C.fgMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Senha *</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={C.fgMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirmar senha *</Text>
            <TextInput
              style={[
                styles.input,
                confirmPassword.length > 0 && password !== confirmPassword && styles.inputError,
              ]}
              placeholder="Repita a senha"
              placeholderTextColor={C.fgMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, !canSubmit && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={C.primaryFg} size="small" />
            ) : (
              <Text style={styles.btnText}>Cadastrar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginHint}>Já tem conta? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.loginLink}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
    gap: 10,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  logoIcon: {
    fontSize: 28,
    fontWeight: '800',
    color: C.primaryFg,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: C.fg,
    letterSpacing: -0.5,
  },
  roleBadge: {
    backgroundColor: C.input,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: C.fgMuted,
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: C.fg,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: C.fgMuted,
  },
  input: {
    backgroundColor: C.input,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: C.fg,
    fontSize: 14,
  },
  inputError: {
    borderColor: C.error,
  },
  errorBox: {
    backgroundColor: '#2a0a0a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  errorText: {
    color: C.error,
    fontSize: 13,
  },
  btn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  btnDisabled: {
    backgroundColor: '#0d2a28',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    color: C.primaryFg,
    fontSize: 14,
    fontWeight: '700',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
  },
  loginHint: {
    color: C.fgMuted,
    fontSize: 13,
  },
  loginLink: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '600',
  },
})
