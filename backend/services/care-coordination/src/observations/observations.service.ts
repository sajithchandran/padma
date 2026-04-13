import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ObservationSource, Prisma } from '.prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateObservationItemDto } from './dto/create-observation-item.dto';
import { UpdateObservationItemDto } from './dto/update-observation-item.dto';
import {
  CreatePatientObservationByCodeDto,
  CreatePatientObservationDto,
} from './dto/create-patient-observation.dto';
import { UpdatePatientObservationDto } from './dto/update-patient-observation.dto';
import {
  ObservationItemQueryDto,
  PatientObservationQueryDto,
} from './dto/observation-query.dto';

const VALUE_FIELDS = [
  'valueNumeric',
  'valueText',
  'valueBoolean',
  'valueCoded',
  'valueJson',
  'valueDate',
  'valueDateTime',
] as const;

type ValueField = (typeof VALUE_FIELDS)[number];
type ObservationValueInput = Pick<CreatePatientObservationDto, ValueField>;
type ObservationValueData = Partial<Record<ValueField, unknown>>;

@Injectable()
export class ObservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listItems(tenantId: string, filters: ObservationItemQueryDto) {
    const where: Prisma.ObservationItemMasterWhereInput = { tenantId };

    if (filters.activeOnly !== false) {
      where.isActive = true;
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.dataType) {
      where.dataType = filters.dataType;
    }
    if (filters.q?.trim()) {
      const q = filters.q.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.observationItemMaster.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createItem(tenantId: string, dto: CreateObservationItemDto) {
    try {
      return await this.prisma.observationItemMaster.create({
        data: {
          ...this.normalizeItemDto(dto),
          tenantId,
        } as Prisma.ObservationItemMasterUncheckedCreateInput,
      });
    } catch (error) {
      this.handleKnownWriteError(error, 'Observation item code already exists for this tenant');
    }
  }

  async getItem(tenantId: string, id: string) {
    const item = await this.prisma.observationItemMaster.findFirst({
      where: { id, tenantId },
    });

    if (!item) {
      throw new NotFoundException(`Observation item ${id} not found`);
    }

    return item;
  }

  async updateItem(tenantId: string, id: string, dto: UpdateObservationItemDto) {
    await this.getItem(tenantId, id);

    try {
      return await this.prisma.observationItemMaster.update({
        where: { id },
        data: this.normalizeItemDto(dto) as Prisma.ObservationItemMasterUncheckedUpdateInput,
      });
    } catch (error) {
      this.handleKnownWriteError(error, 'Observation item code already exists for this tenant');
    }
  }

  async deactivateItem(tenantId: string, id: string) {
    await this.getItem(tenantId, id);

    return this.prisma.observationItemMaster.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async listForPatient(
    tenantId: string,
    patientId: string,
    filters: PatientObservationQueryDto,
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where: Prisma.PatientObservationWhereInput = {
      tenantId,
      patientId,
    };

    if (filters.itemId) {
      where.itemId = filters.itemId;
    }
    if (filters.itemCode || filters.category) {
      where.item = {
        ...(filters.itemCode ? { code: this.normalizeCode(filters.itemCode) } : {}),
        ...(filters.category ? { category: filters.category } : {}),
      };
    }
    if (filters.source) {
      where.source = filters.source;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.observedFrom || filters.observedTo) {
      where.observedAt = {
        ...(filters.observedFrom ? { gte: new Date(filters.observedFrom) } : {}),
        ...(filters.observedTo ? { lte: new Date(filters.observedTo) } : {}),
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.patientObservation.findMany({
        where,
        include: { item: true, enteredByUser: this.userSummarySelect() },
        orderBy: [{ observedAt: 'desc' }, { recordedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.patientObservation.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listLatestForPatient(tenantId: string, patientId: string, category?: string) {
    return this.prisma.patientObservation.findMany({
      where: {
        tenantId,
        patientId,
        ...(category ? { item: { category } } : {}),
      },
      include: { item: true, enteredByUser: this.userSummarySelect() },
      distinct: ['itemId'],
      orderBy: [{ itemId: 'asc' }, { observedAt: 'desc' }, { recordedAt: 'desc' }],
    });
  }

  async createForPatient(
    tenantId: string,
    patientId: string,
    userId: string,
    dto: CreatePatientObservationDto,
  ) {
    const item = await this.ensureItem(tenantId, dto.itemId);
    const valueData = this.buildValueData(dto, true);

    return this.prisma.patientObservation.create({
      data: {
        tenantId,
        patientId,
        itemId: item.id,
        observedAt: new Date(dto.observedAt),
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : undefined,
        source: dto.source,
        sourceSystem: dto.sourceSystem,
        sourceReferenceId: dto.sourceReferenceId,
        ...valueData,
        unit: dto.unit ?? item.unit,
        status: dto.status ?? 'final',
        isAbnormal: dto.isAbnormal ?? this.isAbnormal(item, valueData.valueNumeric),
        isCritical: dto.isCritical ?? this.isCritical(item, valueData.valueNumeric),
        enteredByUserId: userId,
        enteredByRole: dto.enteredByRole,
        deviceId: dto.deviceId,
        notes: dto.notes,
      } as Prisma.PatientObservationUncheckedCreateInput,
      include: { item: true, enteredByUser: this.userSummarySelect() },
    });
  }

  async createForPatientByCode(
    tenantId: string,
    patientId: string,
    userId: string,
    dto: CreatePatientObservationByCodeDto,
  ) {
    const item = await this.ensureItemByCode(tenantId, dto.itemCode);
    return this.createForPatient(tenantId, patientId, userId, {
      ...dto,
      itemId: item.id,
    });
  }

  async getObservation(tenantId: string, id: string) {
    const observation = await this.prisma.patientObservation.findFirst({
      where: { id, tenantId },
      include: { item: true, enteredByUser: this.userSummarySelect() },
    });

    if (!observation) {
      throw new NotFoundException(`Patient observation ${id} not found`);
    }

    return observation;
  }

  async updateObservation(
    tenantId: string,
    id: string,
    userId: string,
    dto: UpdatePatientObservationDto,
  ) {
    const existing = await this.getObservation(tenantId, id);
    const item = dto.itemId ? await this.ensureItem(tenantId, dto.itemId) : existing.item;
    const valueData = this.buildValueData(dto, false);

    return this.prisma.patientObservation.update({
      where: { id },
      data: {
        ...(dto.itemId ? { itemId: item.id } : {}),
        ...(dto.observedAt ? { observedAt: new Date(dto.observedAt) } : {}),
        ...(dto.recordedAt ? { recordedAt: new Date(dto.recordedAt) } : {}),
        ...(dto.source ? { source: dto.source } : {}),
        sourceSystem: dto.sourceSystem,
        sourceReferenceId: dto.sourceReferenceId,
        ...valueData,
        unit: dto.unit,
        status: dto.status,
        isAbnormal:
          dto.isAbnormal ??
          (valueData.valueNumeric !== undefined ? this.isAbnormal(item, valueData.valueNumeric) : undefined),
        isCritical:
          dto.isCritical ??
          (valueData.valueNumeric !== undefined ? this.isCritical(item, valueData.valueNumeric) : undefined),
        enteredByUserId: userId,
        enteredByRole: dto.enteredByRole,
        deviceId: dto.deviceId,
        notes: dto.notes,
      } as Prisma.PatientObservationUncheckedUpdateInput,
      include: { item: true, enteredByUser: this.userSummarySelect() },
    });
  }

  private async ensureItem(tenantId: string, itemId: string) {
    const item = await this.prisma.observationItemMaster.findFirst({
      where: { id: itemId, tenantId },
    });

    if (!item) {
      throw new NotFoundException(`Observation item ${itemId} not found`);
    }

    return item;
  }

  private async ensureItemByCode(tenantId: string, code: string) {
    const item = await this.prisma.observationItemMaster.findFirst({
      where: { tenantId, code: this.normalizeCode(code), isActive: true },
    });

    if (!item) {
      throw new NotFoundException(`Observation item ${code} not found`);
    }

    return item;
  }

  private normalizeItemDto(dto: CreateObservationItemDto | UpdateObservationItemDto) {
    return {
      ...dto,
      code: dto.code === undefined ? undefined : this.normalizeCode(dto.code),
      name: dto.name?.trim(),
      category: dto.category?.trim(),
      dataType: dto.dataType?.trim(),
      unit: dto.unit?.trim(),
      allowedValues:
        dto.allowedValues === undefined
          ? undefined
          : (dto.allowedValues as Prisma.InputJsonValue),
    };
  }

  private normalizeCode(code: string) {
    return code.trim().toUpperCase();
  }

  private buildValueData(
    dto: Partial<ObservationValueInput>,
    requireValue: boolean,
  ): ObservationValueData {
    const providedFields = VALUE_FIELDS.filter((field) => dto[field] !== undefined && dto[field] !== null);

    if (requireValue && providedFields.length !== 1) {
      throw new BadRequestException('Exactly one observation value field must be supplied');
    }
    if (!requireValue && providedFields.length > 1) {
      throw new BadRequestException('Only one observation value field can be supplied');
    }
    if (!requireValue && providedFields.length === 0) {
      return {};
    }

    const activeField = providedFields[0];
    const data: Record<ValueField, unknown> = {
      valueNumeric: null,
      valueText: null,
      valueBoolean: null,
      valueCoded: null,
      valueJson: null,
      valueDate: null,
      valueDateTime: null,
    };

    data[activeField] = this.normalizeObservationValue(activeField, dto[activeField]);
    return data;
  }

  private normalizeObservationValue(field: ValueField, value: unknown) {
    if (field === 'valueDate' || field === 'valueDateTime') {
      return new Date(value as string);
    }
    if (field === 'valueNumeric' && value !== undefined && value !== null) {
      return value.toString();
    }
    if (field === 'valueJson' && value !== undefined && value !== null) {
      return value as Prisma.InputJsonValue;
    }
    return value;
  }

  private isAbnormal(
    item: { normalRangeMin: Prisma.Decimal | null; normalRangeMax: Prisma.Decimal | null },
    valueNumeric: unknown,
  ) {
    if (valueNumeric === undefined || valueNumeric === null) {
      return undefined;
    }

    const value = Number(valueNumeric);
    const min = item.normalRangeMin === null ? undefined : Number(item.normalRangeMin);
    const max = item.normalRangeMax === null ? undefined : Number(item.normalRangeMax);

    return (min !== undefined && value < min) || (max !== undefined && value > max);
  }

  private isCritical(
    item: { criticalLow: Prisma.Decimal | null; criticalHigh: Prisma.Decimal | null },
    valueNumeric: unknown,
  ) {
    if (valueNumeric === undefined || valueNumeric === null) {
      return undefined;
    }

    const value = Number(valueNumeric);
    const low = item.criticalLow === null ? undefined : Number(item.criticalLow);
    const high = item.criticalHigh === null ? undefined : Number(item.criticalHigh);

    return (low !== undefined && value <= low) || (high !== undefined && value >= high);
  }

  private userSummarySelect() {
    return {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
      },
    } satisfies Prisma.UserDefaultArgs;
  }

  private handleKnownWriteError(error: unknown, conflictMessage: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(conflictMessage);
    }

    throw error;
  }
}
