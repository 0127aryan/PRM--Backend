import { MilestoneStatus } from '../../database/enums';
import {
  isMilestoneDueSoon,
  isMilestoneOverdue,
} from './milestone-risk.util';

describe('milestone-risk.util', () => {
  const today = '2026-06-11';
  const inSevenDays = '2026-06-18';

  describe('isMilestoneOverdue', () => {
    it('flags NOT_STARTED milestones past due', () => {
      expect(
        isMilestoneOverdue(
          { status: MilestoneStatus.NOT_STARTED, dueDate: '2026-06-05' },
          today,
        ),
      ).toBe(true);
    });

    it('flags IN_PROGRESS milestones past due', () => {
      expect(
        isMilestoneOverdue(
          { status: MilestoneStatus.IN_PROGRESS, dueDate: '2026-06-05' },
          today,
        ),
      ).toBe(true);
    });

    it('ignores DONE milestones past due', () => {
      expect(
        isMilestoneOverdue(
          { status: MilestoneStatus.DONE, dueDate: '2026-06-05' },
          today,
        ),
      ).toBe(false);
    });

    it('ignores future milestones', () => {
      expect(
        isMilestoneOverdue(
          { status: MilestoneStatus.NOT_STARTED, dueDate: '2026-06-15' },
          today,
        ),
      ).toBe(false);
    });
  });

  describe('isMilestoneDueSoon', () => {
    it('flags NOT_STARTED milestones due within seven days', () => {
      expect(
        isMilestoneDueSoon(
          { status: MilestoneStatus.NOT_STARTED, dueDate: '2026-06-15' },
          today,
          inSevenDays,
        ),
      ).toBe(true);
    });

    it('does not flag overdue NOT_STARTED milestones', () => {
      expect(
        isMilestoneDueSoon(
          { status: MilestoneStatus.NOT_STARTED, dueDate: '2026-06-05' },
          today,
          inSevenDays,
        ),
      ).toBe(false);
    });
  });
});
