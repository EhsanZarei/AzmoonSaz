# اسکریپت راه‌اندازی Prisma ORM با PostgreSQL
# این اسکریپت پس از نصب Docker اجرا شود

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   راه‌اندازی Prisma ORM با PostgreSQL" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# بررسی نصب Docker
Write-Host "[1/6] بررسی نصب Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker نصب شده است: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker نصب نیست! لطفاً ابتدا Docker را نصب کنید." -ForegroundColor Red
    Write-Host "راهنما: DOCKER_SETUP_GUIDE.md" -ForegroundColor Yellow
    exit 1
}

# راه‌اندازی PostgreSQL با Docker Compose
Write-Host ""
Write-Host "[2/6] راه‌اندازی PostgreSQL..." -ForegroundColor Yellow
docker-compose up -d postgres redis minio

# انتظار برای آماده شدن PostgreSQL
Write-Host ""
Write-Host "[3/6] انتظار برای آماده شدن PostgreSQL..." -ForegroundColor Yellow
$maxRetries = 30
$retryCount = 0
$isReady = $false

while (-not $isReady -and $retryCount -lt $maxRetries) {
    $retryCount++
    Write-Host "تلاش $retryCount از $maxRetries..." -NoNewline
    
    try {
        $result = docker-compose exec -T postgres pg_isready -U azmoonyar -d azmoonyar_dev 2>&1
        if ($LASTEXITCODE -eq 0) {
            $isReady = $true
            Write-Host " ✓" -ForegroundColor Green
        } else {
            Write-Host " ..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    } catch {
        Write-Host " ..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if (-not $isReady) {
    Write-Host "✗ PostgreSQL آماده نشد. لطفاً لاگ‌ها را بررسی کنید:" -ForegroundColor Red
    Write-Host "docker-compose logs postgres" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ PostgreSQL آماده است" -ForegroundColor Green

# تولید Prisma Client
Write-Host ""
Write-Host "[4/6] تولید Prisma Client..." -ForegroundColor Yellow
Set-Location -Path "apps\api"
npm run db:generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ خطا در تولید Prisma Client" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Prisma Client تولید شد" -ForegroundColor Green

# اجرای Migration
Write-Host ""
Write-Host "[5/6] اجرای Migration دیتابیس..." -ForegroundColor Yellow
npm run db:migrate

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ خطا در اجرای Migration" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Migration با موفقیت اجرا شد" -ForegroundColor Green

# تست اتصال
Write-Host ""
Write-Host "[6/6] تست اتصال به دیتابیس..." -ForegroundColor Yellow
npm run db:test

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ خطا در اتصال به دیتابیس" -ForegroundColor Red
    exit 1
}
Write-Host "✓ اتصال به دیتابیس موفقیت‌آمیز بود" -ForegroundColor Green

# خلاصه
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   تنظیم Prisma با موفقیت کامل شد! ✓" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "دستورات مفید:" -ForegroundColor Yellow
Write-Host "  • مشاهده دیتابیس:  npm run db:studio" -ForegroundColor White
Write-Host "  • اجرای Seed:       npm run db:seed" -ForegroundColor White
Write-Host "  • ریست دیتابیس:    npm run db:reset" -ForegroundColor White
Write-Host "  • مشاهده لاگ‌ها:    docker-compose logs -f postgres" -ForegroundColor White
Write-Host ""

Set-Location -Path "..\..\"
