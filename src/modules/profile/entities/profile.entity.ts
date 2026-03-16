import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('TQUMProfile')
export class Profile {
  @PrimaryColumn({ name: 'FTPrfCode' })
  code: string;

  @Column({ name: 'FTPrfName', nullable: true })
  name: string;

  @Column({ name: 'FTPrfDataJson', nullable: true })
  dataJson: string;

  @Column({ name: 'FTAgnCode', nullable: true })
  agnCode: string;

  @Column({ name: 'FTPrfBusinessType', nullable: true })
  businessType: string;
}
