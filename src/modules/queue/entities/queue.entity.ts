import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('TQUTQueueTxn')
export class QueueEntity {
  @PrimaryColumn({ name: 'FTQtxDocNo', type: 'varchar', length: 50 })
  docNo: string;

  @Column({ name: 'FDQtxDate', type: 'datetime' })
  date: Date;

  @Column({ name: 'FTAgnCode', type: 'varchar', length: 20, nullable: true })
  agnCode: string;

  // Removed FTPrfCode column to avoid insert into non-existent column in some DBs
  @Column({ name: 'FTPrfCode', type: 'varchar', length: 50, nullable: true })
  profileCode: string;

  // @Column({ name: 'FTQcfCode', type: 'varchar', length: 20, nullable: true })
  // configCode: string;

  @Column({ name: 'FNQtxQueueNo', type: 'int' })
  queueNo: number;

  @Column({ name: 'FTQtxCstName', type: 'varchar', length: 255, nullable: true })
  customerName: string;

  @Column({ name: 'FTQtxTel', type: 'varchar', length: 50, nullable: true })
  tel: string;

  @Column({ name: 'FTQtxStatus', type: 'varchar', length: 20 })
  status: string;

  @Column({ name: 'FTQtxQueueType', type: 'varchar', length: 50, nullable: true })
  queueType: string;

  // Reference Support
  @Column({ name: 'FTQtxRefID', type: 'varchar', length: 50, nullable: true })
  refId?: string;

  @Column({ name: 'FTQtxRefType', type: 'varchar', length: 20, nullable: true })
  refType?: string;

  // Dynamic Attributes
  @Column({ name: 'FTQtxDataJson', type: 'nvarchar', length: 'max', nullable: true })
  dataString?: string; // TypeORM handles JSON better as string in MSSQL sometimes, or use simple-json if supported

  get data(): Record<string, any> {
    try {
      return this.dataString ? JSON.parse(this.dataString) : {};
    } catch {
      return {};
    }
  }

  set data(value: Record<string, any>) {
    this.dataString = JSON.stringify(value);
  }

  @Column({ name: 'FDQtxCheckIn', type: 'datetime', nullable: true })
  checkInTime: Date;

  @Column({ name: 'FDQtxStart', type: 'datetime', nullable: true })
  startTime?: Date;

  @Column({ name: 'FDQtxFinish', type: 'datetime', nullable: true })
  finishTime?: Date;

  @Column({ name: 'FTQtxTicketNo', type: 'varchar', length: 10, nullable: true })
  ticketNo?: string;

  constructor(partial: Partial<QueueEntity>) {
    Object.assign(this, partial);
  }
}
