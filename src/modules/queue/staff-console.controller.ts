import { Controller, Get, Post, Query, Body, UseGuards, Request } from '@nestjs/common';
import { QueueService } from './queue.service';
import { WorkflowEngine } from '../workflow/workflow.engine';
import { WorkflowConfigService } from '../workflow/workflow-config.service';

@Controller('staff/console')
export class StaffConsoleController {
  constructor(
    private readonly queueService: QueueService,
    private readonly workflowEngine: WorkflowEngine,
    private readonly workflowConfig: WorkflowConfigService
  ) {}

  @Get('actions')
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
  async executeAction(@Body() body: { docNo: string, action: string, industry: string }) {
      return await this.queueService.changeState(body.docNo, body.action, body.industry);
  }
}
