import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SchedulerService } from '../src/scheduler/scheduler.service';
import { Project } from '../src/database/entities/project.entity';
import { Milestone } from '../src/database/entities/milestone.entity';
import { ProjectHealth, MilestoneStatus } from '../src/database/enums';
import { DataSource } from 'typeorm';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const scheduler = app.get(SchedulerService);
  const ds = app.get(DataSource);

  try {
    const projectRepo = ds.getRepository(Project);
    const milestoneRepo = ds.getRepository(Milestone);

    // Find Project 1
    const project = await projectRepo.findOne({
      where: { id: 1 },
      relations: ['milestones'],
    });

    if (!project) {
      console.log('Project 1 not found');
      return;
    }

    console.log(`Current health of Project 1: ${project.health}`);
    
    // Reset project health to ON_TRACK so we have a clean transition
    project.health = ProjectHealth.ON_TRACK;
    await projectRepo.save(project);
    console.log('Reset Project 1 health to ON_TRACK');

    // Remove any existing milestones for Project 1 first to be clean
    if (project.milestones && project.milestones.length > 0) {
      await milestoneRepo.remove(project.milestones);
      console.log('Removed existing milestones for Project 1');
    }

    // Add an overdue milestone to Project 1
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
    const overdueMilestone = milestoneRepo.create({
      projectId: project.id,
      title: 'Test Overdue Milestone',
      dueDate: yesterday,
      status: MilestoneStatus.NOT_STARTED,
    });
    await milestoneRepo.save(overdueMilestone);
    console.log(`Created overdue milestone for Project 1: due date was ${yesterday}`);

    console.log('Running scheduler...');
    const result = await scheduler.run();
    console.log('Scheduler finished successfully:', result);

    // Verify Project 1 health
    const updatedProject = await projectRepo.findOne({ where: { id: 1 } });
    console.log(`Updated health of Project 1: ${updatedProject?.health}`);

  } catch (err) {
    console.error(err);
  } finally {
    await app.close();
  }
}

run();
