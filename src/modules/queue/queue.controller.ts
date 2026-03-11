import { Controller, Post, Body, Get, Param, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { CreateQueueDto } from './dto/create-queue.dto';
import { Query } from '@nestjs/common';

@ApiTags('Queue (การจัดการคิวหลัก)')
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) { }

  @Post()
  @ApiOperation({
    summary: 'สร้างคิวใหม่',
    description: 'ทำการรับข้อมูลเพื่อสร้างหมายเลขคิวใหม่ในระบบ'
  })
  @ApiResponse({ status: 201, description: 'สร้างคิวใหม่สำเร็จ' })
  async createQueue(@Body() dto: CreateQueueDto) {
    return this.queueService.createQueue(dto);
  }

  @Post('gen')
  @ApiOperation({
    summary: 'สร้างและระบุคิวรันนิ่งใหม่ (Gen Queue)',
    description: 'ทำการรับข้อมูลเพื่อสร้างหมายเลขคิวใหม่ (ใช้รันนิ่งตามที่ส่งเข้ามา)'
  })
  @ApiBody({
    description: 'ข้อมูลสำหรับการสร้างคิวใหม่',
    type: CreateQueueDto,
    examples: {
      fullPayload: {
        summary: 'แบบเต็ม (Full Payload)',
        value: {
          customerName: "สมชาย ใจดี",
          tel: "0891234567",
          industry: "BANK",
          profileId: "P_BRANCH_001",
          agnCode: "AGN_001",
          bchCode: "BCH_001",
          preFix: "A",
          serviceCode: "DEPOSIT_01",
          refId: "DOC-REF-00123",
          refType: "BOOKING",
          chanelCode: "CH_01",
          attributes: {
            queueType: "VIP",
            serviceGroup: "FINANCE",
            kioskCode: "KIOSK-01",
            notes: "ลูกค้าต้องการทำรายการฝาก-ถอนแบบรวม"
          }
        }
      },
      posPayload: {
        summary: 'แบบย่อ (สำหรับ POS)',
        value: {
          customerName: "สมชาย ใจดี",
          tel: "0891234567",
          agnCode: "AGN_001",
          bchCode: "BCH_001",
          kitchenCode: ["DEPOSIT_01"],
          chanelCode: "CH_01",
          refId: "DOC-REF-00123",
          refType: "BOOKING"
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'สร้างคิวสำเร็จ',
    schema: {
      example: {
        docNo: "Q1739702400000",
        date: "2026-03-07T08:49:00.000Z",
        profileCode: "P_BRANCH_001",
        agnCode: "AGN_001",
        queueNo: 3,
        customerName: "สมชาย ใจดี",
        tel: "0891234567",
        status: "WAITING",
        queueType: "VIP",
        refId: "DOC-REF-00123",
        refType: "BOOKING",
        ticketNo: "T0003",
        data: {
          queueType: "VIP",
          serviceGroup: "FINANCE",
          kioskCode: "KIOSK-01",
          kitchenCode: ["DEPOSIT_01"],
          chanelCode: "CH_01",
          notes: "ลูกค้าต้องการทำรายการฝาก-ถอนแบบรวม",
          profileId: "P_BRANCH_001",
          sequenceName: "SEQ:AGN_001:BCH_001:A:DEPOSIT_01",
          sequenceNo: 3,
          queueNo: 3
        },
        checkInTime: "2026-03-07T08:49:00.000Z"
      }
    }
  })
  async generateQueue(@Body() dto: CreateQueueDto) {
    return this.queueService.generateQueue(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'ข้อมูลคิวตาม ID',
    description: 'ดึงข้อมูลคิวตามรหัสอ้างอิงเอกสาร (ID/docNo)'
  })
  @ApiParam({ name: 'id', description: 'หมายเลขเอกสารอ้างอิงคิว', example: 'Q1739702400000' })
  @ApiResponse({ status: 200, description: 'พบข้อมูลคิว' })
  async getQueue(@Param('id') id: string) {
    return this.queueService.getQueue(id);
  }

  @Put(':id/state')
  @ApiOperation({
    summary: 'อัปเดตสถานะคิว',
    description: 'อัปเดตข้อมูลสถานะคิวปัจจุบัน เช่น เรียก, รอ, ทิ้ง'
  })
  @ApiParam({ name: 'id', description: 'หมายเลขเอกสารอ้างอิงคิว', example: 'Q1739702400000' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        targetState: { type: 'string', description: 'สถานะเป้าหมายที่จะเปลี่ยนไป', example: 'CALLING' },
        industry: { type: 'string', description: 'สายธุรกิจ', example: 'BANK' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'อัปเดตสถานะสำเร็จ' })
  async updateState(
    @Param('id') id: string,
    @Body() body: { targetState: string; industry: string }
  ) {
    // Current status is now fetched from DB inside service for better consistency
    return this.queueService.changeState(id, body.targetState, body.industry);
  }

  @Get(':industry/:status/next-actions')
  @ApiOperation({
    summary: 'สถานะถัดไปที่สามารถเปลี่ยนได้',
    description: 'รายการสถานะที่สามารถเปลี่ยนเป็นได้ จากข้อมูลสายธุรกิจและสถานะปัจจุบัน'
  })
  @ApiParam({ name: 'industry', description: 'สายธุรกิจ', example: 'BANK' })
  @ApiParam({ name: 'status', description: 'สถานะปัจจุบัน', example: 'WAITING' })
  @ApiResponse({ status: 200, description: 'คืนค่าเป็นชุดรายการ (array) ของสถานะถัดไป' })
  async getNextActions(
    @Param('industry') industry: string,
    @Param('status') status: string
  ) {
    return this.queueService.getNextActions(industry, status);
  }

  @Get('profile/:profileId')
  @ApiOperation({
    summary: 'รายการคิวของโปรไฟล์',
    description: 'ดึงรายการคิวทั้งหมดของ Profile ที่กำหนด'
  })
  @ApiParam({ name: 'profileId', description: 'รหัสโปรไฟล์', example: 'P001' })
  @ApiResponse({ status: 200, description: 'คืนค่ารายการคิวสำเร็จ' })
  async getQueuesByProfile(@Param('profileId') profileId: string) {
    try {
      console.log(`[QueueController] Fetching queues for profile: ${profileId}`);
      return await this.queueService.getQueuesByProfile(profileId);
    } catch (error) {
      console.error(`[QueueController] Error fetching queues for profile ${profileId}:`, error);
      throw error;
    }
  }

  @Get('next-number')
  @ApiOperation({
    summary: 'หมายเลขคิวถัดไป',
    description: 'ใช้สำหรับดูหรือคำนวณหมายเลขคิวที่จะเป็นคิวรันนิ่งลำดับถัดไป (Pre-fetch Number)'
  })
  @ApiQuery({ name: 'profileId', description: 'รหัสโปรไฟล์ (ถ้ามี)', required: false })
  @ApiQuery({ name: 'serviceGroup', description: 'กลุ่มบริการ (Service Group)', required: false })
  @ApiQuery({ name: 'queueType', description: 'ประเภทคิว (Queue Type)', required: false })
  @ApiResponse({ status: 200, description: 'คืนค่าหมายเลขคิวเป้าหมายถัดไปสำเร็จ' })
  async getNextNumber(
    @Query('profileId') profileId?: string,
    @Query('serviceGroup') serviceGroup?: string,
    @Query('queueType') queueType?: string
  ) {
    const type = queueType || serviceGroup;
    const n = await this.queueService.getNextNumber(profileId, type);
    return { next: n };
  }
}
