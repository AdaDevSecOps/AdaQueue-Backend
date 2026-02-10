import { Injectable, Logger } from '@nestjs/common';
import { IWorkflowDefinition, IStateDefinition, ITransition, IWorkflowAction } from './workflow.types';

@Injectable()
export class WorkflowEngine {
  private readonly logger = new Logger(WorkflowEngine.name);

  /**
   * Validate Transition
   * Checks if moving from currentState to targetState is allowed in the definition.
   */
  validateTransition(
    workflow: IWorkflowDefinition,
    currentStateCode: string,
    targetStateCode: string,
    userRole?: string
  ): { valid: boolean; transition?: ITransition; error?: string } {
    
    const currentState = workflow.states[currentStateCode];
    if (!currentState) {
      return { valid: false, error: `Current state '${currentStateCode}' not found in workflow.` };
    }

    // Find the specific transition rule
    const transition = currentState.transitions.find(t => t.to === targetStateCode);
    
    if (!transition) {
      return { valid: false, error: `Transition from '${currentStateCode}' to '${targetStateCode}' is not defined.` };
    }

    // RBAC Check
    if (transition.requiredRole && userRole) {
      if (!transition.requiredRole.includes(userRole)) {
        return { valid: false, error: `User role '${userRole}' not authorized for this transition.` };
      }
    }

    return { valid: true, transition };
  }

  /**
   * Execute Actions (Simulation)
   */
  async executeStateActions(
    workflow: IWorkflowDefinition,
    currentStateCode: string,
    targetStateCode: string,
    docNo: string
  ): Promise<void> {
    const actions = this.getTransitionActions(workflow, currentStateCode, targetStateCode);
    
    if (actions.length > 0) {
      this.logger.log(`[EXECUTE] Queue ${docNo} transitioning from ${currentStateCode} to ${targetStateCode}`);
      for (const action of actions) {
        this.logger.log(`   - Action: ${action.type} -> ${action.target} (Payload: ${JSON.stringify(action.payload)})`);
        // In real implementation, use EventEmitter or specialized services here
      }
    }
  }

  /**
   * Get Actions to Execute
   * Collects actions from:
   * 1. Current State onExit
   * 2. Transition actions
   * 3. Target State onEntry
   */
  getTransitionActions(
    workflow: IWorkflowDefinition,
    currentStateCode: string,
    targetStateCode: string
  ): IWorkflowAction[] {
    const actions: IWorkflowAction[] = [];
    
    const currentState = workflow.states[currentStateCode];
    const targetState = workflow.states[targetStateCode];
    const transition = currentState?.transitions.find(t => t.to === targetStateCode);

    if (!currentState || !targetState || !transition) return [];

    // 1. Exit Actions
    if (currentState.onExit) actions.push(...currentState.onExit);

    // 2. Transition Actions
    if (transition.actions) actions.push(...transition.actions);

    // 3. Entry Actions
    if (targetState.onEntry) actions.push(...targetState.onEntry);

    return actions;
  }

  /**
   * Get Next Possible States (For UI)
   */
  getNextOptions(workflow: IWorkflowDefinition, currentStateCode: string): ITransition[] {
    const state = workflow.states[currentStateCode];
    return state ? state.transitions : [];
  }
}
