import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

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
