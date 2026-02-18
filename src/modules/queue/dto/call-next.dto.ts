import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * DTO for Call Next Queue Request
 * 
 * This DTO supports two modes:
 * 1. Auto mode (no docNo): Automatically find the next waiting queue
 * 2. Skip mode (with docNo): Skip to a specific queue by document number
 * 
 * @example Auto mode - Call next queue
 * {
 *   profileId: 'TEST-PROFILE-001',
 *   serviceGroup: 'Q-TEST-001',
 *   targetStatus: 'CALLING'
 * }
 * 
 * @example Skip mode - Jump to specific queue
 * {
 *   docNo: 'Q1739702400000',
 *   targetStatus: 'SERVING'
 * }
 */
export class CallNextQueueDto {
  @ApiPropertyOptional({
    description: 'Document number for skipping to a specific queue. If provided, the system will skip to this queue directly instead of finding the next waiting queue. The queue must have an allowed status (null, WAITING, WAIT, WAIT_TABLE, or PENDING).',
    example: 'Q1739702400000',
    type: String
  })
  @IsOptional()
  @IsString()
  docNo?: string;

  @ApiPropertyOptional({
    description: 'Profile ID to filter queues (only used when docNo is not provided)',
    example: 'TEST-PROFILE-001',
    type: String
  })
  @IsOptional()
  @IsString()
  profileId?: string;

  @ApiPropertyOptional({
    description: 'Service Group to filter queues (only used when docNo is not provided)',
    example: 'Q-TEST-001',
    type: String
  })
  @IsOptional()
  @IsString()
  serviceGroup?: string;

  @ApiPropertyOptional({
    description: 'Target status to set for the called queue. If not provided, defaults to CALLING.',
    example: 'CALLING',
    default: 'CALLING',
    type: String,
    enum: ['CALLING', 'SERVING', 'IN_PROGRESS']
  })
  @IsOptional()
  @IsString()
  targetStatus?: string;
}

/**
 * Queue Data for Response
 * Contains detailed information about the called queue
 */
export class QueueResponseDto {
  @ApiProperty({
    description: 'Document number (unique queue identifier)',
    example: 'Q1739702400000'
  })
  docNo: string;

  @ApiProperty({
    description: 'Queue number',
    example: 1
  })
  queueNo: number;

  @ApiProperty({
    description: 'Customer name',
    example: 'คุณสมชาย ใจดี'
  })
  customerName: string;

  @ApiProperty({
    description: 'Customer telephone number',
    example: '081-111-1111'
  })
  tel: string;

  @ApiProperty({
    description: 'Queue status after calling. Common values: CALLING (being called), SERVING (being served), IN_PROGRESS (in progress)',
    example: 'CALLING',
    enum: ['WAITING', 'WAIT', 'WAIT_TABLE', 'PENDING', 'CALLING', 'SERVING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
  })
  status: string;

  @ApiProperty({
    description: 'Queue type or service group',
    example: 'Q-TEST-001'
  })
  queueType: string;

  @ApiPropertyOptional({
    description: 'Additional queue data',
    type: 'object',
    example: {
      serviceGroup: 'Q-TEST-001',
      profileId: 'TEST-PROFILE-001',
      category: 'GENERAL'
    }
  })
  data?: any;
}

/**
 * DTO for Call Next Queue Response
 * 
 * Success response includes:
 * - success: true
 * - message: Success message in Thai
 * - queue: Queue details (QueueResponseDto)
 * 
 * No queue available response:
 * - success: false
 * - message: "ไม่มีคิวที่รออยู่"
 * - queue: null
 * 
 * Error response (400):
 * - statusCode: 400
 * - message: Error description
 * - error: "Bad Request"
 */
export class CallNextQueueResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'เรียกคิวสำเร็จ'
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Queue data if found, null if no queue available',
    type: QueueResponseDto,
    nullable: true
  })
  queue: QueueResponseDto | null;
}
