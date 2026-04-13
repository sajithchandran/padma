import { PartialType } from '@nestjs/swagger';
import { CreatePatientObservationDto } from './create-patient-observation.dto';

export class UpdatePatientObservationDto extends PartialType(CreatePatientObservationDto) {}
