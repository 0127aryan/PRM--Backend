import { AccountStatus, UserRole } from '../../database/enums';

export interface AuthUserResponse {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  accountStatus: AccountStatus;
  forcePasswordChange: boolean;
  employeeId: number | null;
}
