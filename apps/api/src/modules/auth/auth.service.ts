import bcrypt from 'bcryptjs';
import { AuthRepository } from './auth.repository';
import { RegisterInput, LoginInput } from '@exam-ai/validation';

export class AuthService {
  private repository: AuthRepository;

  constructor() {
    this.repository = new AuthRepository();
  }

  async register(input: RegisterInput) {
    const existing = await this.repository.findByEmail(input.email);
    if (existing) {
      const error: any = new Error('User with this email already exists');
      error.statusCode = 409;
      error.code = 'EMAIL_ALREADY_EXISTS';
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await this.repository.create({
      email: input.email,
      name: input.name,
      passwordHash,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  async login(input: LoginInput) {
    const user = await this.repository.findByEmail(input.email);
    if (!user) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  async getUserProfile(userId: string) {
    const user = await this.repository.findById(userId);
    if (!user) {
      const error: any = new Error('User not found');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      preferredAI: (user as any).preferredAI || 'OPENAI',
      createdAt: user.createdAt,
    };
  }

  async updateSettings(userId: string, settings: { preferredAI?: string }) {
    const updated = await this.repository.update(userId, settings);
    return {
      id: updated.id,
      preferredAI: (updated as any).preferredAI || 'OPENAI',
    };
  }
}
