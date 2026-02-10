import { Entity, Column, PrimaryColumn } from 'typeorm';
import { IWorkflowDefinition, IStateDefinition } from '../../workflow/workflow.types';

@Entity('TQUMQueueConfig')
export class WorkflowEntity {
  @PrimaryColumn({ name: 'FTQcfCode', type: 'varchar', length: 50 })
  flowCode: string;

  @Column({ name: 'FTQcfName', type: 'varchar', length: 100, nullable: true })
  flowName: string;

  @Column({ name: 'FTAgnCode', type: 'varchar', length: 20, nullable: true })
  agnCode: string;

  @Column({ name: 'FTQcfType', type: 'varchar', length: 50 })
  industry: string;

  @Column({ name: 'FTQcfJsonConfig', type: 'nvarchar', length: 'max' })
  configJson: string;

  @Column({ name: 'FDQcfCreate', type: 'datetime', default: () => 'GETDATE()' })
  createdAt: Date;

  @Column({ name: 'FDQcfUpdate', type: 'datetime', default: () => 'GETDATE()', onUpdate: 'GETDATE()' })
  updatedAt: Date;

  get states(): Record<string, IStateDefinition> {
    try {
      const config = this.configJson ? JSON.parse(this.configJson) : {};
      return config.states || {};
    } catch {
      return {};
    }
  }

  set states(value: Record<string, IStateDefinition>) {
    // We store the full config structure if possible, but here we might just store what we have
    // If configJson is just states, that's fine, but let's try to keep the structure
    let currentConfig: any = {};
    try {
        currentConfig = this.configJson ? JSON.parse(this.configJson) : {};
    } catch {}
    
    currentConfig.states = value;
    // Also sync other fields to JSON if needed
    currentConfig.flowCode = this.flowCode;
    currentConfig.industry = this.industry;
    
    this.configJson = JSON.stringify(currentConfig);
  }

  toDefinition(): IWorkflowDefinition {
    const config = this.configJson ? JSON.parse(this.configJson) : {};
    return {
      flowCode: this.flowCode,
      industry: this.industry,
      version: config.version || '1.0',
      initialState: config.initialState || 'WAIT_TABLE',
      states: this.states
    };
  }
}
