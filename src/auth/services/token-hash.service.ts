import { createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Env } from '../../config/env.keys';

@Injectable()
export class TokenHashService {
  private readonly saltRounds: number;

  constructor(config: ConfigService) {
    this.saltRounds = config.getOrThrow<number>(Env.BCRYPT_SALT_ROUNDS);
  }

  generatePlainToken(): string {
    return randomBytes(32).toString('hex');
  }

  /** Deterministic hash for DB lookup of opaque tokens (refresh / set-password). */
  sha256(plain: string): string {
    return createHash('sha256').update(plain).digest('hex');
  }

  hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds);
  }

  comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
