import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../user/user.schema'

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production'
const JWT_EXPIRES_IN = '30d'

export interface RegisterDto {
  name: string
  email: string
  password: string
  role: 'driver' | 'rider'
  phone?: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface AuthResult {
  token: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

export class AuthService {
  async register(data: RegisterDto): Promise<AuthResult> {
    const existing = await User.findOne({ email: data.email.toLowerCase() })
    if (existing) {
      throw new Error('E-mail já cadastrado')
    }

    const passwordHash = await bcrypt.hash(data.password, 10)

    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      phone: data.phone || undefined,
      role: data.role,
    })

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }
  }

  async login(data: LoginDto): Promise<AuthResult> {
    const user = await User.findOne({ email: data.email.toLowerCase() }).select('+passwordHash')
    if (!user || !user.passwordHash) {
      throw new Error('Credenciais inválidas')
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash)
    if (!valid) {
      throw new Error('Credenciais inválidas')
    }

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }
  }
}
