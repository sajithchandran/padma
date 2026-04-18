import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

type PatientListFilters = {
  q?: string;
  status?: string;
  filter?: string;
  userId?: string;
};

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filters: PatientListFilters = {}) {
    const normalizedQuery = filters.q?.trim();
    const normalizedStatus = filters.status?.trim().toLowerCase();
    const normalizedFilter = filters.filter?.trim().toLowerCase();
    const restrictToMyCareTeams = normalizedFilter === 'mine' && Boolean(filters.userId);

    const enrollments = await this.prisma.patientPathwayEnrollment.findMany({
      where: {
        tenantId,
        pathway: restrictToMyCareTeams
          ? {
              careTeam: {
                is: {
                  members: {
                    some: {
                      userId: filters.userId,
                    },
                  },
                },
              },
            }
          : undefined,
        OR: normalizedQuery
          ? [
              { patientDisplayName: { contains: normalizedQuery, mode: 'insensitive' } },
              { patientMrn: { contains: normalizedQuery, mode: 'insensitive' } },
              { planName: { contains: normalizedQuery, mode: 'insensitive' } },
            ]
          : undefined,
      },
      select: {
        id: true,
        patientId: true,
        patientDisplayName: true,
        patientMrn: true,
        patientDob: true,
        patientGender: true,
        pathwayId: true,
        planName: true,
        status: true,
        totalTasks: true,
        completedTasks: true,
        overdueTasks: true,
        primaryCoordinatorId: true,
        enrollmentDate: true,
        currentStageEnteredAt: true,
        updatedAt: true,
        currentStage: {
          select: {
            id: true,
            name: true,
            code: true,
            stageType: true,
            sortOrder: true,
          },
        },
        stageHistory: {
          where: { transitionType: 'start' },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: [
        { updatedAt: 'desc' },
        { patientDisplayName: 'asc' },
      ],
    });

    const coordinatorIds = Array.from(
      new Set(
        enrollments
          .map((enrollment) => enrollment.primaryCoordinatorId)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const coordinators = coordinatorIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: coordinatorIds } },
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        })
      : [];

    const coordinatorNameById = new Map(
      coordinators.map((user) => {
        const fallbackName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
        return [user.id, user.displayName?.trim() || fallbackName || user.email] as const;
      }),
    );

    const patients = Array.from(
      enrollments.reduce((acc, enrollment) => {
        const existing = acc.get(enrollment.patientId);
        const pathwayName = enrollment.planName?.trim();
        const storedStatus = enrollment.status?.toLowerCase() || 'active';
        const hasExplicitStart = enrollment.stageHistory.length > 0;
        const effectiveStatus = storedStatus === 'active' && !hasExplicitStart ? 'pending' : storedStatus;
        const openTasks = Math.max(enrollment.totalTasks - enrollment.completedTasks, 0);
        const lastActivityAt = [
          enrollment.updatedAt,
          enrollment.currentStageEnteredAt,
          enrollment.enrollmentDate,
        ]
          .filter((value): value is Date => Boolean(value))
          .sort((a, b) => b.getTime() - a.getTime())[0];

        if (!existing) {
          acc.set(enrollment.patientId, {
            id: enrollment.patientId,
            name: enrollment.patientDisplayName?.trim() || enrollment.patientId,
            mrn: enrollment.patientMrn,
            dob: enrollment.patientDob,
            gender: enrollment.patientGender,
            statuses: new Set<string>([effectiveStatus]),
            pathwayNames: pathwayName ? new Set<string>([pathwayName]) : new Set<string>(),
            enrolledPathways: 1,
            openTasks,
            overdueTasks: enrollment.overdueTasks,
            coordinatorIds: new Set<string>(
              enrollment.primaryCoordinatorId ? [enrollment.primaryCoordinatorId] : [],
            ),
            enrollments: [{
              enrollmentId: enrollment.id,
              pathwayId: enrollment.pathwayId,
              pathwayName: enrollment.planName,
              status: effectiveStatus,
              currentStage: enrollment.currentStage,
              totalTasks: enrollment.totalTasks,
              completedTasks: enrollment.completedTasks,
              openTasks,
              overdueTasks: enrollment.overdueTasks,
              canStart: effectiveStatus === 'pending',
              lastActivityAt,
            }],
            lastActivityAt,
          });
          return acc;
        }

        existing.statuses.add(effectiveStatus);
        if (pathwayName) existing.pathwayNames.add(pathwayName);
        existing.enrolledPathways += 1;
        existing.openTasks += openTasks;
        existing.overdueTasks += enrollment.overdueTasks;

        if (enrollment.primaryCoordinatorId) {
          existing.coordinatorIds.add(enrollment.primaryCoordinatorId);
        }

        existing.enrollments.push({
          enrollmentId: enrollment.id,
          pathwayId: enrollment.pathwayId,
          pathwayName: enrollment.planName,
          status: effectiveStatus,
          currentStage: enrollment.currentStage,
          totalTasks: enrollment.totalTasks,
          completedTasks: enrollment.completedTasks,
          openTasks,
          overdueTasks: enrollment.overdueTasks,
          canStart: effectiveStatus === 'pending',
          lastActivityAt,
        });

        if (
          lastActivityAt
          && (!existing.lastActivityAt || lastActivityAt.getTime() > existing.lastActivityAt.getTime())
        ) {
          existing.lastActivityAt = lastActivityAt;
        }

        return acc;
      }, new Map<string, {
        id: string;
        name: string;
        mrn?: string | null;
        dob?: Date | null;
        gender?: string | null;
        statuses: Set<string>;
        pathwayNames: Set<string>;
        enrolledPathways: number;
        openTasks: number;
        overdueTasks: number;
        coordinatorIds: Set<string>;
        enrollments: Array<{
          enrollmentId: string;
          pathwayId: string;
          pathwayName: string;
          status: string;
          currentStage: {
            id: string;
            name: string;
            code: string;
            stageType: string;
            sortOrder: number;
          };
          totalTasks: number;
          completedTasks: number;
          openTasks: number;
          overdueTasks: number;
          canStart: boolean;
          lastActivityAt?: Date | null;
        }>;
        lastActivityAt?: Date | null;
      }>()),
    ).map(([, patient]) => {
      const aggregatedStatus = patient.statuses.has('active')
        ? 'ACTIVE'
        : patient.statuses.has('paused')
          ? 'PAUSED'
          : patient.statuses.has('pending')
            ? 'PENDING'
            : patient.statuses.has('completed')
              ? 'COMPLETED'
              : patient.statuses.has('withdrawn')
                ? 'WITHDRAWN'
                : patient.statuses.has('cancelled')
                  ? 'CANCELLED'
                  : 'ACTIVE';

      const riskLevel = patient.overdueTasks >= 3
        ? 'CRITICAL'
        : patient.overdueTasks >= 1 || patient.openTasks >= 5
          ? 'HIGH'
          : patient.openTasks >= 2
            ? 'MEDIUM'
            : 'LOW';

      const coordinatorNames = Array.from(patient.coordinatorIds)
        .map((id) => coordinatorNameById.get(id))
        .filter((value): value is string => Boolean(value));

      return {
        id: patient.id,
        name: patient.name,
        mrn: patient.mrn,
        dob: patient.dob,
        gender: patient.gender,
        status: aggregatedStatus,
        riskLevel,
        currentPathways: Array.from(patient.pathwayNames),
        currentPathwaySummary: Array.from(patient.pathwayNames).slice(0, 2).join(', '),
        assignedCareCoordinator: coordinatorNames[0] ?? null,
        enrolledPathways: patient.enrolledPathways,
        enrollments: patient.enrollments
          .sort((a, b) => {
            const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
            const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
            return bTime - aTime || a.pathwayName.localeCompare(b.pathwayName);
          }),
        openTasks: patient.openTasks,
        overdueTasks: patient.overdueTasks,
        lastActivityAt: patient.lastActivityAt,
      };
    });

    return patients
      .filter((patient) => !normalizedStatus || patient.status.toLowerCase() === normalizedStatus)
      .sort((a, b) => {
        const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        return bTime - aTime || a.name.localeCompare(b.name);
      });
  }

  async search(
    tenantId: string,
    query?: string,
    limit = 20,
  ) {
    const normalizedQuery = query?.trim();

    const enrollments = await this.prisma.patientPathwayEnrollment.findMany({
      where: {
        tenantId,
        OR: normalizedQuery
          ? [
              { patientDisplayName: { contains: normalizedQuery, mode: 'insensitive' } },
              { patientMrn: { contains: normalizedQuery, mode: 'insensitive' } },
            ]
          : undefined,
      },
      select: {
        patientId: true,
        patientDisplayName: true,
        patientMrn: true,
        patientDob: true,
        patientGender: true,
        createdAt: true,
      },
      orderBy: [
        { createdAt: 'desc' },
        { patientDisplayName: 'asc' },
      ],
      take: Math.max(limit * 5, 50),
    });

    const uniquePatients = Array.from(
      enrollments.reduce((acc, enrollment) => {
        if (!acc.has(enrollment.patientId)) {
          acc.set(enrollment.patientId, {
            id: enrollment.patientId,
            name: enrollment.patientDisplayName?.trim() || enrollment.patientId,
            mrn: enrollment.patientMrn,
            dob: enrollment.patientDob,
            gender: enrollment.patientGender,
          });
        }
        return acc;
      }, new Map<string, {
        id: string;
        name: string;
        mrn?: string | null;
        dob?: Date | null;
        gender?: string | null;
      }>()),
    )
      .map(([, patient]) => patient)
      .slice(0, Math.max(1, Math.min(limit, 100)));

    return uniquePatients;
  }
}
