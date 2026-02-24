import { Controller, Get, Post, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { WorkflowEngine } from '../workflow/workflow.engine';
import { WorkflowConfigService } from '../workflow/workflow-config.service';
import { CallNextQueueDto, CallNextQueueResponseDto } from './dto/call-next.dto';

@ApiTags('Staff Console')
@Controller('staff/console')
export class StaffConsoleController {
  constructor(
    private readonly queueService: QueueService,
    private readonly workflowEngine: WorkflowEngine,
    private readonly workflowConfig: WorkflowConfigService
  ) {}

  @Get('actions')
  @ApiOperation({
    summary: 'Get Allowed Actions',
    description: 'Get list of allowed actions for a queue based on workflow and user role'
  })
  @ApiQuery({
    name: 'docNo',
    description: 'Document number of the queue',
    example: 'Q1739702400000'
  })
  @ApiQuery({
    name: 'industry',
    description: 'Industry type for workflow configuration',
    example: 'BANK'
  })
  @ApiResponse({
    status: 200,
    description: 'List of allowed actions returned successfully',
    schema: {
      type: 'object',
      properties: {
        docNo: { type: 'string', example: 'Q1739702400000' },
        currentState: { type: 'string', example: 'WAITING' },
        actions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', example: 'เรียกคิว' },
              targetState: { type: 'string', example: 'CALLING' },
              actionType: { type: 'string', example: 'TRANSITION' },
              color: { type: 'string', example: 'primary' }
            }
          }
        }
      }
    }
  })
  async getAllowedActions(
    @Query('docNo') docNo: string,
    @Query('industry') industry: string, // In real app, derived from User Profile
    @Request() req
  ) {
    // 1. Get Current Queue State
    const queue = await this.queueService.getQueue(docNo);
    
    // 2. Get Workflow Config
    const config = await this.workflowConfig.getWorkflowByIndustry(industry);

    // 3. Get Next Options from Engine
    const transitions = this.workflowEngine.getNextOptions(config, queue.status);

    // 4. Filter by Role (Mock Role: 'NURSE')
    const userRole = 'NURSE'; // req.user.role
    
    const allowedActions = transitions.filter(t => {
        if (!t.requiredRole) return true;
        return t.requiredRole.includes(userRole);
    }).map(t => ({
        label: t.label,
        targetState: t.to,
        actionType: 'TRANSITION',
        color: 'primary' // Could come from State config
    }));

    return {
        docNo,
        currentState: queue.status,
        actions: allowedActions
    };
  }

  @Post('execute')
  @ApiOperation({
    summary: 'Execute Action',
    description: 'Execute a workflow action to change queue state'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['docNo', 'action', 'industry'],
      properties: {
        docNo: { type: 'string', example: 'Q1739702400000', description: 'Document number' },
        action: { type: 'string', example: 'CALLING', description: 'Target state/action' },
        industry: { type: 'string', example: 'BANK', description: 'Industry type' }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Action executed successfully',
    schema: {
      type: 'object',
      properties: {
        docNo: { type: 'string', example: 'Q1739702400000' },
        oldState: { type: 'string', example: 'WAITING' },
        newState: { type: 'string', example: 'CALLING' },
        message: { type: 'string', example: 'State updated successfully' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid transition or queue not found'
  })
  async executeAction(@Body() body: { docNo: string, action: string, industry: string }) {
      return await this.queueService.changeState(body.docNo, body.action, body.industry);
  }

  // Start Process - Advance STATE_2 -> STATE_3 -> FINAL
  @Post('start-process')
  @ApiOperation({
    summary: 'Start/Advance Process',
    description: 'Advance queue state: STATE_2 → STATE_3 → FINAL (STATE_4/COMPLETED/FINISH)'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['docNo'],
      properties: {
        docNo: { type: 'string', example: 'Q1739702400000' },
        industry: { type: 'string', example: 'BANK' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Process advanced' })
  async startProcess(@Body() body: { docNo: string, industry?: string }) {
    return await this.queueService.startProcess(body.docNo, body.industry);
  }

  // Call Next Queue - เรียกคิวถัดไปที่รออยู่
  @Post('call-next')
  @ApiOperation({
    summary: 'Call Next Queue',
    description: 'เรียกคิวถัดไปที่รออยู่ (null, WAITING, WAIT, WAIT_TABLE, PENDING) และเปลี่ยนสถานะตามที่ระบุ (default: CALLING). สามารถส่ง docNo เพื่อข้ามคิวไปยังคิวเฉพาะได้'
  })
  @ApiBody({
    type: CallNextQueueDto,
    description: 'Optional filters for queue selection or specific docNo for queue skipping',
    examples: {
      'Skip to Specific Queue (docNo)': {
        value: {
          docNo: 'Q1739702400000',
          targetStatus: 'CALLING'
        }
      },
      'With All Parameters': {
        value: {
          profileId: 'TEST-PROFILE-001',
          serviceGroup: 'Q-TEST-001',
          targetStatus: 'CALLING'
        }
      },
      'With Filters Only': {
        value: {
          profileId: 'TEST-PROFILE-001',
          serviceGroup: 'Q-TEST-001'
        }
      },
      'Without Filters': {
        value: {}
      },
      'Custom Status': {
        value: {
          targetStatus: 'SERVING'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully called next queue or no queue available',
    type: CallNextQueueResponseDto,
    content: {
      'application/json': {
        examples: {
          'Success - Next Queue (Auto)': {
            value: {
              success: true,
              message: 'เรียกคิวสำเร็จ',
              queue: {
                docNo: 'Q1739702400000',
                queueNo: 1,
                customerName: 'คุณสมชาย ใจดี',
                tel: '081-111-1111',
                status: 'CALLING',
                queueType: 'Q-TEST-001',
                data: {
                  serviceGroup: 'Q-TEST-001',
                  profileId: 'TEST-PROFILE-001',
                  category: 'GENERAL'
                }
              }
            },
            description: 'เรียกคิวถัดไปอัตโนมัติ (ไม่ระบุ docNo)'
          },
          'Success - Skip to Specific Queue': {
            value: {
              success: true,
              message: 'เรียกคิวสำเร็จ',
              queue: {
                docNo: 'Q1739702400999',
                queueNo: 15,
                customerName: 'คุณมานี VIP',
                tel: '082-222-2222',
                status: 'SERVING',
                queueType: 'Q-VIP-001',
                data: {
                  serviceGroup: 'Q-VIP-001',
                  profileId: 'TEST-PROFILE-001',
                  category: 'VIP',
                  priority: 'HIGH'
                }
              }
            },
            description: 'ข้ามไปยังคิวเฉพาะด้วย docNo'
          },
          'Success - Queue with null status': {
            value: {
              success: true,
              message: 'เรียกคิวสำเร็จ',
              queue: {
                docNo: 'Q1739702400123',
                queueNo: 8,
                customerName: 'คุณสมหญิง ยิ้มแย้ม',
                tel: '083-333-3333',
                status: 'CALLING',
                queueType: 'Q-TEST-001',
                data: {
                  serviceGroup: 'Q-TEST-001',
                  profileId: 'TEST-PROFILE-001'
                }
              }
            },
            description: 'เรียกคิวที่มี status = null สำเร็จ'
          },
          'No Queue Available': {
            value: {
              success: false,
              message: 'ไม่มีคิวที่รออยู่',
              queue: null
            },
            description: 'ไม่พบคิวที่รออยู่ในระบบ'
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid parameters or failed to call queue',
    content: {
      'application/json': {
        examples: {
          'Queue Not Found': {
            value: {
              statusCode: 400,
              message: 'Queue with docNo Q9999999999 not found',
              error: 'Bad Request'
            },
            description: 'ไม่พบคิวที่ระบุ docNo'
          },
          'Invalid Queue Status': {
            value: {
              statusCode: 400,
              message: 'Cannot call queue with status: COMPLETED. Allowed statuses: WAITING, WAIT, WAIT_TABLE, PENDING, or null',
              error: 'Bad Request'
            },
            description: 'คิวมีสถานะที่ไม่สามารถเรียกได้'
          },
          'General Error': {
            value: {
              statusCode: 400,
              message: 'Failed to call next queue',
              error: 'Bad Request'
            },
            description: 'ข้อผิดพลาดทั่วไป'
          }
        }
      }
    }
  })
  async callNextQueue(
    @Body() body: CallNextQueueDto
  ) {
    const nextQueue = await this.queueService.callNextQueue(
      body.docNo,
      body.profileId, 
      body.serviceGroup,
      body.targetStatus,
      body.refId,
      body.refType
    );
    
    if (!nextQueue) {
      return {
        success: false,
        message: 'ไม่มีคิวที่รออยู่',
        queue: null
      };
    }
    
    return {
      success: true,
      message: 'เรียกคิวสำเร็จ',
      queue: {
        docNo: nextQueue.docNo,
        queueNo: nextQueue.queueNo,
        customerName: nextQueue.customerName,
        tel: nextQueue.tel,
        status: nextQueue.status,
        queueType: nextQueue.queueType,
        data: nextQueue.data,
        ticketNo: nextQueue.ticketNo,
      }
    };
  }

  @Post('skip')
  @ApiOperation({
    summary: 'Skip Active Queue',
    description: 'ข้ามคิวที่กำลังเรียกอยู่ กลับไปสถานะ WAITING และปรับเวลาให้ไปต่อท้ายแถว'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['docNo'],
      properties: {
        docNo: { type: 'string', example: 'Q1739702400000' }
      }
    }
  })
  async skipQueue(@Body() body: { docNo: string }) {
    return await this.queueService.skipQueue(body.docNo);
  }
}
