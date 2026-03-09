import { Controller, Get, Post, Body, Param, Put, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { WorkflowEngine } from './workflow.engine';
import { WorkflowConfigService } from './workflow-config.service';
import { IWorkflowDefinition, IProfileWorkflowDefinition } from './workflow.types';

@ApiTags('Workflow Designer')
@Controller('workflow-designer')
export class WorkflowDesignerController {
  constructor(
    private readonly workflowEngine: WorkflowEngine,
    private readonly workflowConfig: WorkflowConfigService
  ) { }

  @ApiOperation({ summary: 'Validate Workflow Definition' })
  @ApiBody({
    description: 'Workflow Definition to validate',
    schema: {
      example: {
        flowCode: "TEST_WF",
        initialState: "START",
        states: {
          "START": { code: "START", type: "INITIAL", transitions: [{ to: "END" }] },
          "END": { code: "END", type: "FINAL", transitions: [] }
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Workflow is valid' })
  @ApiResponse({ status: 400, description: 'Workflow validation failed' })
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

  @ApiOperation({ summary: 'Save Workflow or Profile Configuration' })
  @ApiBody({
    description: 'Requires either a Standard Workflow payload or a Profile Configuration payload',
    schema: {
      examples: {
        workflowExample: {
          summary: 'Standard Workflow Payload',
          value: {
            flowCode: "CLINIC_WF_01",
            industry: "HEALTHCARE",
            version: "1.0",
            initialState: "NEW",
            serviceGroups: [
              { code: "GRP_01", name: "General Checkup", priority: "Standard" }
            ],
            states: {
              "NEW": {
                code: "NEW",
                label: "New Patient",
                type: "INITIAL",
                transitions: [{ to: "DONE", label: "Complete" }]
              },
              "DONE": {
                code: "DONE",
                label: "Finished",
                type: "FINAL",
                transitions: []
              }
            }
          }
        },
        profileExample: {
          summary: 'Profile Configuration Payload',
          value: {
            profileId: "PR_001",
            profileCode: "DEF_CLINIC",
            profileName: "Default Clinic Profile",
            description: "Main routing configuration for Default Clinic",
            agnCode: "AGN01",
            serviceGroups: [
              { code: "SG_01", name: "General" }
            ],
            servicePoints: [
              { code: "SP_01", name: "Service Point A", kitchenCode: "KT_MAIN" }
            ],
            kiosks: [],
            displayBoards: []
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully saved',
    schema: {
      examples: {
        workflowSuccess: {
          summary: 'Workflow Save Success Response',
          value: { success: true, flowCode: "CLINIC_WF_01" }
        },
        profileSuccess: {
          summary: 'Profile Save Success Response',
          value: { success: true, profileId: "PR_001" }
        }
      }
    }
  })
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

  @ApiOperation({ summary: 'Get all profiles' })
  @ApiResponse({ status: 200, description: 'List of all profiles returned successfully' })
  @Get('profiles')
  async getProfiles() {
    const profiles = await this.workflowConfig.getAllProfiles();
    return profiles.map(p => ({
      id: p.code,
      name: p.name,
      description: p.config?.description || ''
    }));
  }

  @ApiOperation({ summary: 'Get profile or workflow configuration by code' })
  @ApiResponse({ status: 200, description: 'Workflow or Profile configuration returned' })
  @ApiResponse({ status: 404, description: 'Workflow or Profile not found' })
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
    } catch (e) { }

    try {
      return await this.workflowConfig.getWorkflowByCode(code);
    } catch (e) {
      throw new NotFoundException(`Workflow or Profile ${code} not found`);
    }
  }
}
