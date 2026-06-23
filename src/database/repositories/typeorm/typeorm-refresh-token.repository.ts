import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { IRefreshTokenRepository } from '../interfaces/refresh-token.repository.interface';

@Injectable()
export class TypeOrmRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
  ) {}

  create(input: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return this.repo.save(this.repo.create(input));
  }

  findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repo.findOne({ where: { tokenHash } });
  }

  deleteById(id: number): Promise<void> {
    return this.repo.delete(id).then(() => undefined);
  }

  deleteAllForUser(userId: number): Promise<void> {
    return this.repo.delete({ userId }).then(() => undefined);
  }
}
