import { UserRole } from '../../database/enums';

export interface JwtAccessPayload {
  sub: number;
  email: string;
  role: UserRole;
  forcePasswordChange: boolean;
}
