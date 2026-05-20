# Run from HMEL-TESTS project root in PowerShell

# Install dependencies
npm install dotenv
npm install @axe-core/playwright --save-dev

# Create folder structure
New-Item -ItemType Directory -Force -Path auth
New-Item -ItemType Directory -Force -Path pages
New-Item -ItemType Directory -Force -Path tests\smoke
New-Item -ItemType Directory -Force -Path tests\security

# Remove default example spec
Remove-Item tests\example.spec.ts -ErrorAction SilentlyContinue

# Create .env
@"
BASE_URL=https://kaizen.sphinxworldbiz.net
"@ | Out-File -FilePath .env -Encoding utf8

# Create .gitignore
@"
node_modules/
playwright-report/
test-results/
auth/
.env
"@ | Out-File -FilePath .gitignore -Encoding utf8

Write-Host ""
Write-Host "Done! Next steps:"
Write-Host "1. Copy global-setup.ts and playwright.config.ts into the project root"
Write-Host "2. Run: npx playwright test"
Write-Host "3. Log in with your Azure account in the browser that opens"
Write-Host "4. Session will be saved — all future runs skip login"