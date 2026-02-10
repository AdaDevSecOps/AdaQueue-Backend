
-- Create Table TQUTQueueTxn
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TQUTQueueTxn]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[TQUTQueueTxn](
	[FTQtxDocNo] [varchar](50) NOT NULL,
	[FDQtxDate] [datetime] NOT NULL,
	[FTQcfCode] [varchar](20) NULL,
	[FNQtxQueueNo] [int] NOT NULL,
	[FTQtxCstName] [varchar](255) NULL,
	[FTQtxTel] [varchar](50) NULL,
	[FTQtxStatus] [varchar](20) NOT NULL,
	[FTQtxRefID] [varchar](50) NULL,
	[FTQtxRefType] [varchar](20) NULL,
	[FTQtxDataJson] [nvarchar](max) NULL,
	[FDQtxCheckIn] [datetime] NULL,
	[FDQtxStart] [datetime] NULL,
	[FDQtxFinish] [datetime] NULL,
 CONSTRAINT [PK_TQUTQueueTxn] PRIMARY KEY CLUSTERED 
(
	[FTQtxDocNo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
END
GO

-- Insert Test Data
IF NOT EXISTS (SELECT * FROM [dbo].[TQUTQueueTxn] WHERE [FTQtxDocNo] = 'Q20231027001')
BEGIN
INSERT INTO [dbo].[TQUTQueueTxn] 
([FTQtxDocNo], [FDQtxDate], [FTQcfCode], [FNQtxQueueNo], [FTQtxCstName], [FTQtxTel], [FTQtxStatus], [FDQtxCheckIn])
VALUES 
('Q20231027001', GETDATE(), 'RESTAURANT', 101, 'Khun Somchai', '0812345678', 'WAITING', GETDATE()),
('Q20231027002', GETDATE(), 'RESTAURANT', 102, 'Khun Manee', '0898765432', 'CALLING', GETDATE()),
('Q20231027003', GETDATE(), 'RESTAURANT', 103, 'Khun Piti', '0811112222', 'COMPLETED', GETDATE());
END
GO



-- Create Table TQUMProfile
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TQUMProfile]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[TQUMProfile](
	[FTPnfCode] [varchar](50) NOT NULL,
	[FTPnfName] [varchar](255) NOT NULL,
	[FTQcfCode] [varchar](50) NULL,
	[FTPnfDataJson] [nvarchar](max) NULL,
 CONSTRAINT [PK_TQUMProfile] PRIMARY KEY CLUSTERED 
(
	[FTPnfCode] ASC
)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
END
GO
