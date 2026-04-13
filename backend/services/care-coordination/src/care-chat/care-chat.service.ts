import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '.prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

type EnrollmentContext = {
  id: string;
  tenantId: string;
  patientId: string;
  pathwayId: string;
  currentStageId: string;
  patientDisplayName: string | null;
  patientMrn: string | null;
  planName: string;
};

@Injectable()
export class CareChatService {
  constructor(private readonly prisma: PrismaService) {}

  async listForEnrollment(
    tenantId: string,
    enrollmentId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    await this.getEnrollmentContext(tenantId, enrollmentId);

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 50;
    const skip = (page - 1) * limit;
    const where = { tenantId, enrollmentId, deletedAt: null };

    const [messages, total] = await this.prisma.$transaction([
      this.prisma.careChatMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.careChatMessage.count({ where }),
    ]);

    return {
      data: await this.attachAuthors(messages),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async listForPatient(
    tenantId: string,
    patientId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 50;
    const skip = (page - 1) * limit;
    const where = { tenantId, patientId, deletedAt: null };

    const [messages, total] = await this.prisma.$transaction([
      this.prisma.careChatMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.careChatMessage.count({ where }),
    ]);

    return {
      data: await this.attachAuthors(messages),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async postUserMessage(
    tenantId: string,
    enrollmentId: string,
    userId: string,
    body: string,
    metadata?: Record<string, unknown>,
  ) {
    const trimmed = body.trim();
    if (!trimmed) {
      throw new BadRequestException('Message body is required');
    }

    const enrollment = await this.getEnrollmentContext(tenantId, enrollmentId);

    const message = await this.prisma.careChatMessage.create({
      data: {
        tenantId,
        patientId: enrollment.patientId,
        enrollmentId: enrollment.id,
        pathwayId: enrollment.pathwayId,
        stageId: enrollment.currentStageId,
        messageType: 'user',
        body: trimmed,
        metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
        createdBy: userId,
      },
    });

    return (await this.attachAuthors([message]))[0];
  }

  async postSystemMessage(input: {
    tenantId: string;
    patientId: string;
    enrollmentId?: string | null;
    pathwayId?: string | null;
    stageId?: string | null;
    taskId?: string | null;
    eventType: string;
    body: string;
    metadata?: Record<string, unknown>;
    createdBy?: string | null;
  }) {
    if (!input.body.trim()) return null;

    return this.prisma.careChatMessage.create({
      data: {
        tenantId: input.tenantId,
        patientId: input.patientId,
        enrollmentId: input.enrollmentId ?? undefined,
        pathwayId: input.pathwayId ?? undefined,
        stageId: input.stageId ?? undefined,
        taskId: input.taskId ?? undefined,
        messageType: 'system',
        eventType: input.eventType,
        body: input.body.trim(),
        metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
        createdBy: input.createdBy ?? undefined,
      },
    });
  }

  private async getEnrollmentContext(tenantId: string, enrollmentId: string): Promise<EnrollmentContext> {
    const enrollment = await this.prisma.patientPathwayEnrollment.findFirst({
      where: { id: enrollmentId, tenantId },
      select: {
        id: true,
        tenantId: true,
        patientId: true,
        pathwayId: true,
        currentStageId: true,
        patientDisplayName: true,
        patientMrn: true,
        planName: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${enrollmentId} not found`);
    }

    return enrollment;
  }

  private async attachAuthors(messages: Array<{ createdBy: string | null } & Record<string, unknown>>) {
    const authorIds = [...new Set(messages.map((message) => message.createdBy).filter(Boolean) as string[])];
    if (authorIds.length === 0) {
      return messages.map((message) => ({ ...message, author: null }));
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: {
        id: true,
        displayName: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
      },
    });
    const userMap = new Map(users.map((user) => [user.id, user]));

    return messages.map((message) => {
      const author = message.createdBy ? userMap.get(message.createdBy) : null;
      const fallbackName = author
        ? [author.firstName, author.lastName].filter(Boolean).join(' ').trim()
        : '';

      return {
        ...message,
        author: author
          ? {
              id: author.id,
              name: author.displayName?.trim() || fallbackName || author.email,
              email: author.email,
              avatarUrl: author.avatarUrl,
            }
          : null,
      };
    });
  }
}
