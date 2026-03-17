import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('TCNMUser')
export class User {
  @PrimaryColumn({ name: 'FTUsrCode' })
  code: string;

  @Column({ name: 'FTUsrName', nullable: true })
  name: string;

  @Column({ name: 'FTUsrPin', nullable: true })
  pin: string;

  @Column({ name: 'FTUsrRole' })
  role: string;

  @Column({ name: 'FTUsrStatus', default: '1' })
  status: string;

  @Column({ name: 'FDLastLogin', type: 'datetime', nullable: true })
  lastLogin: Date;
}
