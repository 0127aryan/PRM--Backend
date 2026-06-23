import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Allocation } from '../database/entities/allocation.entity';
import { ActivityTag } from '../database/entities/activity-tag.entity';
import { ResourceSkill } from '../database/entities/resource-skill.entity';
import { Resource } from '../database/entities/resource.entity';
import { User } from '../database/entities/user.entity';
import { Milestone } from '../database/entities/milestone.entity';
import { Project } from '../database/entities/project.entity';
import { Skill } from '../database/entities/skill.entity';
import { SystemConfig } from '../database/entities/system-config.entity';
import { DatabaseModule } from '../database/database.module';
import { AdminAllocationsController } from './allocations/admin-allocations.controller';
import { AdminAllocationsService } from './allocations/admin-allocations.service';
import { AdminEmployeesController } from './employees/admin-employees.controller';
import { AdminEmployeesService } from './employees/admin-employees.service';
import { AdminProjectsController } from './projects/admin-projects.controller';
import { AdminProjectsService } from './projects/admin-projects.service';
import { AdminSettingsController } from './settings/admin-settings.controller';
import { AdminSettingsService } from './settings/admin-settings.service';
import { AdminSkillsController } from './skills/admin-skills.controller';
import { AdminSkillsService } from './skills/admin-skills.service';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    TypeOrmModule.forFeature([
      User,
      Resource,
      ResourceSkill,
      Project,
      Milestone,
      Skill,
      Allocation,
      SystemConfig,
      ActivityTag,
    ]),
  ],
  controllers: [
    AdminUsersController,
    AdminEmployeesController,
    AdminProjectsController,
    AdminSkillsController,
    AdminSettingsController,
    AdminAllocationsController,
  ],
  providers: [
    AdminUsersService,
    AdminEmployeesService,
    AdminProjectsService,
    AdminSkillsService,
    AdminSettingsService,
    AdminAllocationsService,
  ],
})
export class AdminModule {}
