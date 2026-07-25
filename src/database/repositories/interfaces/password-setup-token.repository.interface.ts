import { PasswordSetupToken } from '../../entities/password-setup-token.entity';

export interface IPasswordSetupTokenRepository {
  create(input: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordSetupToken>;
  findByTokenHash(tokenHash: string): Promise<PasswordSetupToken | null>;
  markUsed(id: number, usedAt: Date): Promise<void>;
  invalidateUnusedForUser(userId: number): Promise<void>;
}
