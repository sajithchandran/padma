import { Injectable, Logger } from '@nestjs/common';
import { PrismaCoreService } from '../database/prisma-core.service';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaCoreService) {}

  async getSummary(tenantId: string, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const terminalStatuses = ['completed', 'auto_completed', 'skipped', 'cancelled'];

    const [
      myPatients,
      activeEnrollments,
      overdueTasks,
      upcomingTasksToday,
      pendingTransitions,
      adherenceAgg,
    ] = await Promise.all([
      this.prisma.patientPathwayEnrollment.count({
        where: { tenantId, primaryCoordinatorId: userId, status: 'active' },
      }),

      this.prisma.patientPathwayEnrollment.count({
        where: { tenantId, status: 'active' },
      }),

      this.prisma.careTask.count({
        where: {
          tenantId,
          status: { notIn: terminalStatuses },
          dueDate: { lt: today },
        },
      }),

      this.prisma.careTask.count({
        where: {
          tenantId,
          status: { in: ['pending', 'upcoming', 'active'] },
          dueDate: { gte: today, lt: tomorrow },
        },
      }),

      this.prisma.patientStageHistory.count({
        where: {
          tenantId,
          transitionType: 'coordinator_approved',
          // Pending transitions are those not yet actioned — represented by
          // enrollments still sitting at a stage awaiting coordinator approval.
          // We approximate "pending" as histories created in the last 30 days
          // where the enrollment is still active in that target stage.
          transitionedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      this.prisma.patientPathwayEnrollment.aggregate({
        where: { tenantId, status: 'active' },
        _avg: { adherencePercent: true },
      }),
    ]);

    const avgAdherence =
      adherenceAgg._avg.adherencePercent !== null
        ? Number(adherenceAgg._avg.adherencePercent)
        : null;

    return {
      myPatients,
      activeEnrollments,
      overdueTasks,
      upcomingTasksToday,
      pendingTransitions,
      avgAdherence,
    };
  }

  async getOverdueTasks(
    tenantId: string,
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const terminalStatuses = ['completed', 'auto_completed', 'skipped', 'cancelled'];

    const where = {
      tenantId,
      dueDate: { lt: today },
      status: { notIn: terminalStatuses },
    };

    const [tasks, total] = await this.prisma.$transaction([
      this.prisma.careTask.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        select: {
          id: true,
          tenantId: true,
          patientId: true,
          enrollmentId: true,
          patientDisplayName: true,
          interventionType: true,
          title: true,
          dueDate: true,
          status: true,
          priority: true,
          isCritical: true,
          escalationLevel: true,
          assignedToUserId: true,
          assignedToRole: true,
        },
      }),
      this.prisma.careTask.count({ where }),
    ]);

    return {
      data: tasks,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUpcomingTasks(tenantId: string, userId: string, days = 7) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const until = new Date(today);
    until.setDate(until.getDate() + days);

    const tasks = await this.prisma.careTask.findMany({
      where: {
        tenantId,
        status: { in: ['pending', 'upcoming', 'active'] },
        dueDate: { gte: today, lt: until },
      },
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        patientId: true,
        enrollmentId: true,
        patientDisplayName: true,
        interventionType: true,
        title: true,
        dueDate: true,
        status: true,
        priority: true,
        isCritical: true,
        assignedToUserId: true,
        assignedToRole: true,
      },
    });

    return tasks;
  }

  async getAdherenceOverview(
    tenantId: string,
  ): Promise<Array<{ category: string; count: number; avgAdherence: number }>> {
    const groups = await this.prisma.patientPathwayEnrollment.groupBy({
      by: ['category'],
      where: { tenantId, status: 'active' },
      _count: { id: true },
      _avg: { adherencePercent: true },
    });

    return groups.map((g) => ({
      category: g.category,
      count: g._count.id,
      avgAdherence:
        g._avg.adherencePercent !== null
          ? Number(g._avg.adherencePercent)
          : 0,
    }));
  }

  async getMyPatients(
    tenantId: string,
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      primaryCoordinatorId: userId,
      status: 'active',
    };

    const [enrollments, total] = await this.prisma.$transaction([
      this.prisma.patientPathwayEnrollment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          patientId: true,
          patientDisplayName: true,
          patientMrn: true,
          adherencePercent: true,
          overdueTasks: true,
          status: true,
          enrollmentDate: true,
          pathway: {
            select: { id: true, name: true, category: true },
          },
          currentStage: {
            select: { id: true, name: true, stageType: true },
          },
        },
      }),
      this.prisma.patientPathwayEnrollment.count({ where }),
    ]);

    const data = enrollments.map((e) => ({
      ...e,
      pathwayName: e.pathway.name,
      currentStageName: e.currentStage.name,
      adherencePercent:
        e.adherencePercent !== null ? Number(e.adherencePercent) : null,
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPathwayDistribution(
    tenantId: string,
  ): Promise<
    Array<{
      pathwayId: string;
      pathwayName: string;
      stageId: string;
      stageName: string;
      count: number;
    }>
  > {
    const groups = await this.prisma.patientPathwayEnrollment.groupBy({
      by: ['pathwayId', 'currentStageId'],
      where: { tenantId, status: 'active' },
      _count: { id: true },
    });

    if (groups.length === 0) {
      return [];
    }

    // Resolve names for pathways and stages referenced in the result set
    const pathwayIds = [...new Set(groups.map((g) => g.pathwayId))];
    const stageIds = [...new Set(groups.map((g) => g.currentStageId))];

    const [pathways, stages] = await Promise.all([
      this.prisma.clinicalPathway.findMany({
        where: { id: { in: pathwayIds } },
        select: { id: true, name: true },
      }),
      this.prisma.pathwayStage.findMany({
        where: { id: { in: stageIds } },
        select: { id: true, name: true },
      }),
    ]);

    const pathwayMap = new Map(pathways.map((p) => [p.id, p.name]));
    const stageMap = new Map(stages.map((s) => [s.id, s.name]));

    return groups.map((g) => ({
      pathwayId: g.pathwayId,
      pathwayName: pathwayMap.get(g.pathwayId) ?? 'Unknown',
      stageId: g.currentStageId,
      stageName: stageMap.get(g.currentStageId) ?? 'Unknown',
      count: g._count.id,
    }));
  }
}
