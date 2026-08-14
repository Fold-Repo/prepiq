import { db, User } from '@exam-ai/database';

export class AuthRepository {
  async findByEmail(email: string): Promise<User | null> {
    return db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return db.user.findUnique({
      where: { id },
    });
  }

  async create(data: { email: string; name: string; passwordHash: string }): Promise<User> {
    return db.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        passwordHash: data.passwordHash,
      },
    });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return db.user.update({
      where: { id },
      data,
    });
  }
}
