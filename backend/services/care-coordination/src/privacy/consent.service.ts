import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Grant (or re-grant) a consent for a patient.
   * Creates a new consent record with status='granted'.
   */
  async grant(
    tenantId: string,
    patientId: string,
    consentType: string,
    method: string,
    version?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.logger.log(
      `ConsentService.grant: tenantId=${tenantId} patientId=${patientId} type=${consentType} method=${method}`,
    );

    return this.prisma.patientConsent.create({
      data: {
        tenantId,
        patientId,
        consentType,
        status: 'granted',
        grantedAt: new Date(),
        collectionMethod: method,
        consentVersion: version ?? null,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });
  }

  /**
   * Withdraw all active consents of a given type for a patient.
   * Sets status='withdrawn' and stamps withdrawnAt.
   */
  async withdraw(
    tenantId: string,
    patientId: string,
    consentType: string,
  ): Promise<void> {
    this.logger.log(
      `ConsentService.withdraw: tenantId=${tenantId} patientId=${patientId} type=${consentType}`,
    );

    const now = new Date();

    await this.prisma.patientConsent.updateMany({
      where: {
        tenantId,
        patientId,
        consentType,
        status: 'granted',
      },
      data: {
        status: 'withdrawn',
        withdrawnAt: now,
      },
    });
  }

  /**
   * Returns true if a granted, non-expired consent of the given type exists.
   */
  async hasConsent(
    tenantId: string,
    patientId: string,
    consentType: string,
  ): Promise<boolean> {
    const now = new Date();

    const record = await this.prisma.patientConsent.findFirst({
      where: {
        tenantId,
        patientId,
        consentType,
        status: 'granted',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    return record !== null;
  }

  /**
   * Return all consent records for a patient across all types.
   */
  async getAll(tenantId: string, patientId: string) {
    return this.prisma.patientConsent.findMany({
      where: { tenantId, patientId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
