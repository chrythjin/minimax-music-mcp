#!/usr/bin/env pwsh
# MiniMax Music MCP Server - Setup Script
# ======================================
# This script installs the MiniMax Music MCP server locally.
# Run this once to set up, then configure OpenCode to use the server.
#
# Usage:
#   .\setup.ps1                    # Interactive (will prompt for confirmation)
#   .\setup.ps1 -TargetDir "C:\tools\minimax-music-mcp"

param(
    [string]$TargetDir = "$env:USERPROFILE\minimax-music-mcp",
    [switch]$SkipConfirmation
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Color($Message, $Color = "White") {
    $colors = @{
        "Green"  = "`e[32m"
        "Yellow" = "`e[33m"
        "Red"    = "`e[31m"
        "Cyan"   = "`e[36m"
        "White"  = "`e[37m"
    }
    $c = if ($colors[$Color]) { $colors[$Color] } else { "`e[37m" }
    Write-Host "${c}${Message}`e[0m"
}

Write-Color "========================================" "Cyan"
Write-Color " MiniMax Music MCP Server - Setup" "Cyan"
Write-Color "========================================" "Cyan"
Write-Host ""

# Check prerequisites
Write-Color "Checking prerequisites..." "Yellow"
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Color "ERROR: Node.js is not installed or not in PATH" "Red"
    Write-Host "Please install Node.js 20+ from https://nodejs.org"
    exit 1
}
Write-Color "  Node.js: $nodeVersion" "Green"

$gitVersion = git --version 2>$null
if (-not $gitVersion) {
    Write-Color "WARNING: git is not installed. You will need to clone manually." "Yellow"
} else {
    Write-Color "  Git: $gitVersion" "Green"
}

# Check if directory already exists
if (Test-Path $TargetDir) {
    Write-Color "Found existing installation at: $TargetDir" "Yellow"
    if (-not $SkipConfirmation) {
        $response = Read-Host "Reinstall? This will overwrite existing files (y/N)"
        if ($response -ne "y" -and $response -ne "Y") {
            Write-Color "Setup cancelled." "Yellow"
            exit 0
        }
    }
    Write-Color "  Proceeding with reinstall..." "Yellow"
} else {
    Write-Host ""
    Write-Color "Installing to: $TargetDir" "Cyan"
    Write-Host ""
}

# Create directory
$parentDir = Split-Path $TargetDir -Parent
if (-not (Test-Path $parentDir)) {
    New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
}
if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

# Clone or update repo
Write-Host ""
Write-Color "Cloning repository..." "Yellow"
Push-Location $TargetDir
try {
    if (Test-Path ".git") {
        Write-Color "  Updating existing repository..." "Yellow"
        git pull origin main 2>$null
    } else {
        Write-Color "  Cloning from GitHub..." "Yellow"
        git clone --depth 1 https://github.com/chrythjin/minimax-music-mcp.git . 2>$null
    }
} catch {
    Write-Color "  Using existing files (git not available or clone failed)" "Yellow"
}
Pop-Location

# Install dependencies
Write-Host ""
Write-Color "Installing dependencies..." "Yellow"
Push-Location $TargetDir
try {
    npm install --silent 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
    Write-Color "  Dependencies installed" "Green"
} catch {
    Write-Color "  ERROR: npm install failed: $_" "Red"
    Pop-Location
    exit 1
}

# Build
Write-Host ""
Write-Color "Building TypeScript..." "Yellow"
try {
    npm run build 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed"
    }
    Write-Color "  Build complete" "Green"
} catch {
    Write-Color "  ERROR: Build failed: $_" "Red"
    Pop-Location
    exit 1
}

# Verify dist exists
if (-not (Test-Path "$TargetDir\dist\index.js")) {
    Write-Color "ERROR: Build did not produce dist/index.js" "Red"
    Pop-Location
    exit 1
}

Pop-Location

# Show result
Write-Host ""
Write-Color "========================================" "Green"
Write-Color " Setup Complete!" "Green"
Write-Color "========================================" "Green"
Write-Host ""
Write-Color "Server location: $TargetDir" "White"
Write-Color "Executable: $TargetDir\dist\index.js" "White"
Write-Host ""
Write-Host "To register with OpenCode, add this to your opencode.json:"
Write-Host ""
Write-Host '  "mcp": {' "Cyan"
Write-Host '    "minimax-music": {' "Cyan"
Write-Host '      "type": "local",' "Cyan"
Write-Host '      "command": ["node", "' + $TargetDir.Replace('\', '\\') + '\\dist\\index.js"],' "Cyan"
Write-Host '      "environment": {' "Cyan"
Write-Host '        "MINIMAX_API_KEY": "your-api-key-here"' "Cyan"
Write-Host "      }," "Cyan"
Write-Host '      "enabled": true,' "Cyan"
Write-Host '      "timeout": 300000' "Cyan"
Write-Host "    }" "Cyan"
Write-Host "  }" "Cyan"
Write-Host ""
Write-Host "Or use this shorthand in opencode.json:"
Write-Host ""
Write-Host '  "mcp": {' "Cyan"
Write-Host '    "minimax-music": {' "Cyan"
Write-Host '      "type": "local",' "Cyan"
Write-Host '      "command": ["node", "' + $TargetDir + '\\dist\\index.js"],' "Cyan"
Write-Host '      "environment": { "MINIMAX_API_KEY": "your-api-key-here" },' "Cyan"
Write-Host '      "timeout": 300000' "Cyan"
Write-Host "    }" "Cyan"
Write-Host "  }" "Cyan"
Write-Host ""