import { MilestoneStatus } from '../../database/enums';

export interface MilestoneRiskInput {
  status: MilestoneStatus;
  dueDate: string;
}

/** Any incomplete milestone past its due date (NOT_STARTED or IN_PROGRESS). */
export function isMilestoneOverdue(
  milestone: MilestoneRiskInput,
  today: string,
): boolean {
  return milestone.status !== MilestoneStatus.DONE && milestone.dueDate < today;
}

export function isMilestoneDueSoon(
  milestone: MilestoneRiskInput,
  today: string,
  inSevenDays: string,
): boolean {
  return (
    milestone.status === MilestoneStatus.NOT_STARTED &&
    milestone.dueDate >= today &&
    milestone.dueDate <= inSevenDays
  );
}
