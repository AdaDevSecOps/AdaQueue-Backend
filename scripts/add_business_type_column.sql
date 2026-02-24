-- Add FTPrfBusinessType column to TQUMProfile table
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[TQUMProfile]') 
    AND name = 'FTPrfBusinessType'
)
BEGIN
    ALTER TABLE [dbo].[TQUMProfile]
    ADD [FTPrfBusinessType] [varchar](1) NULL;
END
GO
