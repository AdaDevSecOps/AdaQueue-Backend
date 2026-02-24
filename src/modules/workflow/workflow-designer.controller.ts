import { Controller, Get, Post, Body, Param, Put, BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkflowEngine } from './workflow.engine';
import { WorkflowConfigService } from './workflow-config.service';
import { IWorkflowDefinition, IProfileWorkflowDefinition } from './workflow.types';

@Controller('workflow-designer')
export class WorkflowDesignerController {
  constructor(
    private readonly workflowEngine: WorkflowEngine,
    private readonly workflowConfig: WorkflowConfigService
  ) {}

  @Post('validate')
  validateWorkflow(@Body() workflow: IWorkflowDefinition) {
    // Skip validation for Profile Workflow for now, or implement specific validation
    if (!workflow.states) return { valid: true }; 

    const errors = [];

    // 1. Check Initial State Existence
    if (!workflow.states[workflow.initialState]) {
      errors.push(`Initial state '${workflow.initialState}' is not defined.`);
    }

    // 2. Validate All Transitions
    Object.values(workflow.states).forEach(state => {
      state.transitions.forEach(trans => {
        if (!workflow.states[trans.to]) {
          errors.push(`State '${state.code}' transitions to undefined state '${trans.to}'.`);
        }
      });
    });

    // 3. Check for Dead Ends (Non-Final states with no transitions)
    Object.values(workflow.states).forEach(state => {
      if (state.type !== 'FINAL' && state.transitions.length === 0) {
        errors.push(`State '${state.code}' is not FINAL but has no outgoing transitions.`);
      }
    });

    if (errors.length > 0) {
      throw new BadRequestException({ message: 'Workflow Validation Failed', errors });
    }

    return { valid: true, message: 'Workflow is valid.' };
  }

  @Post('save')
  async saveWorkflow(@Body() workflow: IWorkflowDefinition | IProfileWorkflowDefinition) {
    if ('profileId' in workflow) {
        // Handle Profile Save
        const profileDef = workflow as IProfileWorkflowDefinition;
        await this.workflowConfig.saveProfile(
            profileDef.profileId || profileDef.profileCode, 
            profileDef.profileName || 'Unnamed Profile', 
            profileDef,
            profileDef.agnCode
        );
        return { success: true, profileId: profileDef.profileId };
    } else {
        // Handle Standard Workflow Save
        this.validateWorkflow(workflow as IWorkflowDefinition);
        await this.workflowConfig.saveWorkflow(workflow as IWorkflowDefinition);
        return { success: true, flowCode: (workflow as IWorkflowDefinition).flowCode };
    }
  }

  @Get('profiles')
  async getProfiles() {
    const profiles = await this.workflowConfig.getAllProfiles();
    return profiles.map(p => ({
      id: p.code,
      name: p.name,
      description: p.config?.description || ''
    }));
  }

  @Get(':code')
  async getWorkflow(@Param('code') code: string) {
    // Try to get Profile first
    try {
      const profile = await this.workflowConfig.getProfileByCode(code);
      let config = profile.config || {};

      if (config) {
        // Include businessType from the profile entity (separate DB column)
        return { ...config, businessType: profile.businessType || '1' };
      }
    } catch (e) {}

    try {
      return await this.workflowConfig.getWorkflowByCode(code);
    } catch (e) {
      throw new NotFoundException(`Workflow or Profile ${code} not found`);
    }
  }
}
