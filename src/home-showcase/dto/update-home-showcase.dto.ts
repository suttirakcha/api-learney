import { PartialType } from '@nestjs/mapped-types';
import { CreateHomeShowcaseDto } from './create-home-showcase.dto';

export class UpdateHomeShowcaseDto extends PartialType(CreateHomeShowcaseDto) {}
