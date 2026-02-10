import { Controller, Get, Post, Query, Body, BadRequestException } from '@nestjs/common';
import { SequenceService } from './sequence.service';

interface EnsureDto {
  agnCode: string;
  profileCode: string;
  displayCode: string;
  name: string;
  options?: { start?: number; increment?: number; min?: number; max?: number; cycle?: boolean; cache?: number };
}

interface NextDto {
  agnCode: string;
  profileCode: string;
  displayCode: string;
  name: string;
}

@Controller('queue-sequence')
export class SequenceController {
  constructor(private readonly seq: SequenceService) {}

  @Post('ensure')
  async ensure(@Body() dto: EnsureDto) {
    const seqName = this.seq.buildName(dto.agnCode, dto.profileCode, dto.displayCode, dto.name);
    await this.seq.ensure(seqName, dto.options);
    return { sequenceName: seqName };
  }

  @Get('preview')
  async preview(@Query() q: NextDto) {
    if (!q.agnCode || !q.profileCode || !q.name) throw new BadRequestException('missing params');
    const seqName = this.seq.buildName(q.agnCode, q.profileCode, q.displayCode || '', q.name);
    await this.seq.ensure(seqName);
    const r = await this.seq.preview(seqName);
    const padded = String(r.next).padStart(3, '0');
    return { sequenceName: seqName, number: r.next, padded, label: `${seqName}-${padded}` };
  }

  @Post('next')
  async next(@Body() dto: NextDto) {
    if (!dto.agnCode || !dto.profileCode || !dto.name) throw new BadRequestException('missing params');
    const seqName = this.seq.buildName(dto.agnCode, dto.profileCode, dto.displayCode || '', dto.name);
    await this.seq.ensure(seqName);
    const n = await this.seq.next(seqName);
    const padded = String(n).padStart(3, '0');
    return { sequenceName: seqName, number: n, padded, label: `${seqName}-${padded}` };
  }
}
