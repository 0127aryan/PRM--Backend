import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Env } from '../config/env.keys';
import { SchedulerService } from './scheduler.service';

@Injectable()
export class SchedulerBootstrap implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerBootstrap.name);
  private readonly jobName = 'prm-maintenance';

  constructor(
    private readonly config: ConfigService,
    private readonly registry: SchedulerRegistry,
    private readonly scheduler: SchedulerService,
  ) {}

  onModuleInit(): void {
    const enabled = this.config.getOrThrow<boolean>(Env.SCHEDULER_ENABLED);
    if (!enabled) {
      this.logger.log('Scheduler disabled (SCHEDULER_ENABLED=false)');
      return;
    }

    const cronExpression = this.config.getOrThrow<string>(Env.SCHEDULER_CRON);
    const job = new CronJob(cronExpression, () => {
      void this.scheduler.run().catch((err) => {
        this.logger.error(
          'Scheduled run failed',
          err instanceof Error ? err.stack : err,
        );
      });
    });

    this.registry.addCronJob(this.jobName, job);
    job.start();
    this.logger.log(`Scheduler registered: ${cronExpression}`);
  }

  onModuleDestroy(): void {
    if (this.registry.doesExist('cron', this.jobName)) {
      this.registry.deleteCronJob(this.jobName);
    }
  }
}
