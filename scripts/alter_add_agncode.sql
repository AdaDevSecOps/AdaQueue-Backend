-- Script to add FTAgnCode (Agency/Company Code) to Queue and Workflow tables
-- Date: 2026-01-24
-- Purpose: Support Multi-tenant / Agency Code. Nullable for On-premise/Single tenant.

-- 1. TQUTQueueTxn
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TQUTQueueTxn]') AND name = 'FTAgnCode')
BEGIN
    ALTER TABLE [dbo].[TQUTQueueTxn] ADD [FTAgnCode] VARCHAR(20) NULL;
END
GO

-- 2. TQUTQueueLog
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TQUTQueueLog]') AND type in (N'U'))
AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TQUTQueueLog]') AND name = 'FTAgnCode')
BEGIN
    ALTER TABLE [dbo].[TQUTQueueLog] ADD [FTAgnCode] VARCHAR(20) NULL;
END
GO

-- 3. TQUMQueueState
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TQUMQueueState]') AND type in (N'U'))
AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TQUMQueueState]') AND name = 'FTAgnCode')
BEGIN
    ALTER TABLE [dbo].[TQUMQueueState] ADD [FTAgnCode] VARCHAR(20) NULL;
END
GO




-- 5. TQUMProfile
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TQUMProfile]') AND name = 'FTAgnCode')
BEGIN
    ALTER TABLE [dbo].[TQUMProfile] ADD [FTAgnCode] VARCHAR(20) NULL;
END
GO
