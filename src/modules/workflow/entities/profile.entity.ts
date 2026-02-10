import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'TQUMProfile', schema: 'dbo' })
export class ProfileEntity {
  @PrimaryColumn({ name: 'FTPrfCode', type: 'varchar', length: 50 })
  code: string;

  @Column({ name: 'FTPrfName', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'FTAgnCode', type: 'varchar', length: 20, nullable: true })
  agnCode: string;

  @Column({ name: 'FTPrfDataJson', type: 'nvarchar', length: 'max', nullable: true })
  configJson: string; // Service Points, Counters, etc.

  get config(): any {
    try {
      return this.configJson ? JSON.parse(this.configJson) : {};
    } catch {
      return {};
    }
  }

  set config(value: any) {
    this.configJson = JSON.stringify(value);
  }
}
