import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('TCNMUserProfile')
export class UserProfile {
  @PrimaryColumn({ name: 'FTUsrPrfCode' })
  code: string;

  @Column({ name: 'FTUsrCode' })
  userCode: string;

  @Column({ name: 'FTPrfCode' })
  profileCode: string;

  @Column({ name: 'FDCreateOn', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createOn: Date;

  @Column({ name: 'FTCreateBy', nullable: true })
  createBy: string;

  @Column({ name: 'FDLastUpdOn', type: 'datetime', nullable: true })
  lastUpdOn: Date;

  @Column({ name: 'FTLastUpdBy', nullable: true })
  lastUpdBy: string;
}
