import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('TCNMUser')
export class User {
  @PrimaryColumn({ name: 'FTUsrCode', type: 'varchar', length: 20 })
  FTUsrCode: string;

  @Column({ name: 'FTUsrName', type: 'varchar', length: 100 })
  FTUsrName: string;

  @Column({ name: 'FTUsrPin', type: 'varchar', length: 10 })
  FTUsrPin: string;

  @Column({ name: 'FTUsrRole', type: 'varchar', length: 20, nullable: true })
  FTUsrRole: string;

  @Column({ name: 'FDLastLogin', type: 'datetime', nullable: true })
  FDLastLogin: Date;
}
