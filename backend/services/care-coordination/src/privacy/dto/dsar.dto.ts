import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DsarEnrollmentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  pathwayId: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  stagesHistory: object[];

  @ApiPropertyOptional({ type: 'number', nullable: true })
  adherencePercent: number | null;

  @ApiPropertyOptional({ nullable: true })
  enrolledAt: string | null;

  @ApiPropertyOptional({ nullable: true })
  graduatedAt: string | null;

  @ApiPropertyOptional({ nullable: true })
  dischargedAt: string | null;
}

export class DsarTaskDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  interventionType: string;

  @ApiPropertyOptional({ nullable: true })
  dueDate: string | null;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ nullable: true })
  completedAt: string | null;
}

export class DsarMessageDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  channel: string;

  @ApiProperty()
  purpose: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: string;
}

export class DsarConsentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  consentType: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  grantedAt: string;

  @ApiPropertyOptional({ nullable: true })
  withdrawnAt: string | null;

  @ApiPropertyOptional({ nullable: true })
  expiresAt: string | null;

  @ApiProperty()
  collectionMethod: string;

  @ApiPropertyOptional({ nullable: true })
  consentVersion: string | null;
}

export class DsarResponseDto {
  @ApiProperty()
  patient_id: string;

  @ApiProperty()
  generated_at: string;

  @ApiProperty({ type: [DsarEnrollmentDto] })
  enrollments: DsarEnrollmentDto[];

  @ApiProperty({ type: [DsarTaskDto] })
  tasks: DsarTaskDto[];

  @ApiProperty({ type: [DsarMessageDto], description: 'Message metadata only — body is excluded for privacy' })
  messages: DsarMessageDto[];

  @ApiProperty({ type: [DsarConsentDto] })
  consents: DsarConsentDto[];
}
