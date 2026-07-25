import { RefreshToken } from '../../entities/refresh-token.entity';

export interface IRefreshTokenRepository {
  create(input: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshToken>;
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  deleteById(id: number): Promise<void>;
  deleteAllForUser(userId: number): Promise<void>;
}
