<#
  check-java.ps1 (PATH-only check)
  Usage: powershell -NoProfile -ExecutionPolicy Bypass -File check-java.ps1 -RequiredMajor 23
  Output: single-line JSON on stdout, example:
    {"ok":true,"major":23,"full":"23.0.2","source":"path","path":"java on PATH","registry":"11.0.22"}
  Exit codes:
    0 -> ok (found on PATH and >= RequiredMajor)
    2 -> found on PATH but version too old (found major < RequiredMajor)
    1 -> java not found on PATH
#>

Param(
  [int]$RequiredMajor = 23
)

function Get-MajorFromVersionString {
  Param([string]$v)
  if (-not $v) { return $null }

  if ($v -match '"([^"]+)"') { $ver = $matches[1] } else { $ver = $v.Trim() }

  if ($ver -match '^1\.(\d+)') {
    return [int]$matches[1]
  }

  if ($ver -match '^(\d+)') {
    return [int]$matches[1]
  }

  return $null
}

function Query-RegistryForJava {
  $keys = @(
    # Oracle/legacy
    'HKLM:\SOFTWARE\JavaSoft\Java Runtime Environment',
    'HKLM:\SOFTWARE\Wow6432Node\JavaSoft\Java Runtime Environment',
    'HKLM:\SOFTWARE\JavaSoft\Java Development Kit',
    'HKLM:\SOFTWARE\Wow6432Node\JavaSoft\Java Development Kit',
    # Eclipse Adoptium (Temurin)
    'HKLM:\SOFTWARE\Eclipse Adoptium\JRE',
    'HKLM:\SOFTWARE\Eclipse Adoptium\JDK',
    'HKLM:\SOFTWARE\WOW6432Node\Eclipse Adoptium\JRE',
    'HKLM:\SOFTWARE\WOW6432Node\Eclipse Adoptium\JDK'
  )
  foreach ($k in $keys) {
    try {
      $cv = (Get-ItemProperty -Path $k -Name CurrentVersion -ErrorAction Stop).CurrentVersion
      if ($cv) { return $cv }
    } catch { }
  }
  return $null
}

function Query-JavaOnPath {
  try {
    $out = & java -version 2>&1 | Select-Object -First 1
    if ($out) {
      $major = Get-MajorFromVersionString $out
      return @{ Source = 'path'; Full = $out.Trim(); Major = $major; Path = 'java on PATH' }
    }
  } catch { }
  return $null
}

# Main: only trust PATH
$found = Query-JavaOnPath
$registryVersion = Query-RegistryForJava

if ($found -ne $null -and $found.Major -ne $null) {
  $ok = $found.Major -ge $RequiredMajor
  $result = @{
    ok = $ok
    major = $found.Major
    full = $found.Full
    source = $found.Source
    path = $found.Path
    registry = $registryVersion
  }
  $result | ConvertTo-Json -Compress
  if ($ok) { exit 0 } else { exit 2 }
}
elseif ($found -ne $null -and $found.Major -eq $null) {
  $result = @{
    ok = $false
    major = $null
    full = $found.Full
    source = $found.Source
    path = $found.Path
    registry = $registryVersion
  }
  $result | ConvertTo-Json -Compress
  exit 2
}
else {
  $result = @{
    ok = $false
    major = $null
    full = $null
    source = $null
    path = $null
    registry = $registryVersion
  }
  $result | ConvertTo-Json -Compress
  exit 1
}
