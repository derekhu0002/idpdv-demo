# Build the IDPDV Todo HarmonyOS HAP using the DevEco-bundled hvigor, fully offline.
# Recreates the local `node_modules/@ohos` junctions that the hvigor engine needs to
# resolve @ohos/hvigor-ohos-plugin, then runs `assembleHap`.
$ErrorActionPreference = 'Stop'

$deveco = 'C:\Program Files\Huawei\DevEco Studio'
$env:NODE_HOME = Join-Path $deveco 'tools\node'
$env:DEVECO_SDK_HOME = Join-Path $deveco 'sdk'

$root = $PSScriptRoot
$nodeModules = Join-Path $root 'node_modules\@ohos'
New-Item -ItemType Directory -Force -Path $nodeModules | Out-Null

foreach ($pkg in @('hvigor', 'hvigor-ohos-plugin')) {
  $link = Join-Path $nodeModules $pkg
  $target = Join-Path $deveco "tools\hvigor\$pkg"
  if (Test-Path $link) { Remove-Item $link -Recurse -Force -ErrorAction SilentlyContinue }
  cmd /c mklink /J "$link" "$target" | Out-Null
}

$env:NODE_PATH = Join-Path $root 'node_modules'
$engine = Join-Path $nodeModules 'hvigor\bin\hvigor.js'

& (Join-Path $deveco 'tools\node\node.exe') $engine assembleHap `
  --mode module -p product=default -p module=entry@default -p buildMode=debug --no-daemon
exit $LASTEXITCODE
