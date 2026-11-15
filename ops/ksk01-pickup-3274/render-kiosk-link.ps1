[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Original,
    [Parameter(Mandatory)][string]$Output
)
$ErrorActionPreference = 'Stop'
if (Test-Path -LiteralPath $Output) { throw 'Output must be a new file' }
$source = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $Original).Path)
$newline = if ($source.Contains("`r`n")) { "`r`n" } else { "`n" }
$anchor = '    $start=[Diagnostics.ProcessStartInfo]::new()'
$end = '      $link.Dispose()' + $newline + '    }' + $newline + '    break'
$oldDestination = '127.0.0.1:3274:127.0.0.1:''+$socket.LocalPort+'' '
foreach ($part in @($anchor, $end, $oldDestination)) {
    if ([regex]::Matches($source,[regex]::Escape($part)).Count -ne 1) {
        throw 'Pickup link script has a different structure'
    }
}

$launch = @'
    $node=Join-Path $env:LOCALAPPDATA 'CroissantTaiyakiKiosk\node.exe'
    $origin=Join-Path $dir 'https-3274\https-origin.cjs'
    $tls=Start-Process -FilePath $node -ArgumentList @(('"' + $origin + '"'),[string]$socket.LocalPort) -WindowStyle Hidden -PassThru
    try {
      for($i=0;$i -lt 15;$i++){
        if($tls.HasExited){break}
        if(Get-NetTCPConnection -OwningProcess $tls.Id -LocalAddress 127.0.0.1 -LocalPort 3274 -State Listen -ErrorAction SilentlyContinue){break}
        Start-Sleep -Milliseconds 250
      }
      if($i -ge 15 -or $tls.HasExited){continue}
    $start=[Diagnostics.ProcessStartInfo]::new()
'@
$finish = @'
      $link.Dispose()
    }
    } finally {
      if(!$tls.HasExited){$tls.Kill();$tls.WaitForExit()}
      $tls.Dispose()
    }
    break
'@
$updated = $source.Replace($anchor, ($launch -replace '\r?\n', $newline)).Replace($end, ($finish -replace '\r?\n', $newline))
$updated = $updated.Replace($oldDestination, '127.0.0.1:3274:127.0.0.1:3274 ')
$tokens = $null
$parseErrors = $null
[void][System.Management.Automation.Language.Parser]::ParseInput($updated, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw 'Generated pickup link script is invalid' }
$target = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Output)
[IO.File]::WriteAllText($target, $updated, [Text.UTF8Encoding]::new($true))
