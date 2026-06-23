import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PasswordSetupToken } from '../../entities/password-setup-token.entity';
import { IPasswordSetupTokenRepository } from '../interfaces/password-setup-token.repository.interface';

@Injectable()
export class TypeOrmPasswordSetupTokenRepository implements IPasswordSetupTokenRepository {
  constructor(
    @InjectRepository(PasswordSetupToken)
    private readonly repo: Repository<PasswordSetupToken>,
  ) {}

  create(input: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordSetupToken> {
    return this.repo.save(this.repo.create(input));
  }

  findByTokenHash(tokenHash: string): Promise<PasswordSetupToken | null> {
    return this.repo.findOne({
      where: { tokenHash, usedAt: IsNull() },
      relations: { user: true },
    });
  }

  markUsed(id: number, usedAt: Date): Promise<void> {
    return this.repo.update(id, { usedAt }).then(() => undefined);
  }

  invalidateUnusedForUser(userId: number): Promise<void> {
    return this.repo
      .update({ userId, usedAt: IsNull() }, { usedAt: new Date() })
      .then(() => undefined);
  }
}
