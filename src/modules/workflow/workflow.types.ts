export type ActionType = 'NOTIFICATION' | 'API_CALL' | 'DB_UPDATE' | 'EVENT_EMIT';

export interface IWorkflowAction {
  type: ActionType;
  target: string; // e.g., 'KDS_SYSTEM', 'SMS_GATEWAY'
  payload?: Record<string, any>;
}

export interface ITransition {
  to: string;             // Target State Code
  label?: string;         // Button Label (e.g., "Call Customer")
  actions?: IWorkflowAction[]; // Actions executed during transition
  requiredRole?: string[]; // RBAC: Only 'NURSE' can transition to 'TRIAGE'
}

export interface IStateDefinition {
  code: string;           // State Code (Unique in Flow)
  label: string;          // Display Name
  color?: string;         // UI Color
  type: 'INITIAL' | 'NORMAL' | 'FINAL';
  transitions: ITransition[]; // Allowed next steps
  onEntry?: IWorkflowAction[]; // Actions when entering state
  onExit?: IWorkflowAction[];  // Actions when leaving state
}

export interface IServiceGroup {
  code: string;
  name: string;
  description?: string;
  priority?: 'Urgent' | 'High' | 'Standard' | 'Low';
}

export interface IWorkflowDefinition {
  flowCode: string;       // Unique Flow ID
  industry: string;       // Grouping
  version: string;
  initialState: string;
  serviceGroups?: IServiceGroup[]; // Added to match frontend
  states: Record<string, IStateDefinition>;
}

export interface IProfileWorkflowDefinition {
  profileId: string;
  profileCode?: string;
  profileName?: string;
  description?: string;
  agnCode?: string;
  serviceGroups: any[];
  servicePoints: any[];
  kiosks: any[];
  displayBoards: any[];
}
