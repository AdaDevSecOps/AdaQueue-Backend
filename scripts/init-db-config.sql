



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
