# راهنمای حل مشکل Docker Desktop

## مشکل فعلی
Docker Desktop نمی‌تواند استارت شود به دلیل غیرفعال بودن Virtualization.

## راه‌حل (مراحل به ترتیب)

### مرحله ۱: فعال‌سازی Virtualization در BIOS

1. **کامپیوتر را Restart کنید**
2. **هنگام بوت شدن، کلید BIOS را فشار دهید** (معمولاً یکی از این کلیدها: F2, F10, F12, Del, Esc)
3. **به بخش Advanced یا CPU Configuration بروید**
4. **گزینه‌های زیر را پیدا کنید و فعال کنید:**
   - Intel: `Intel Virtualization Technology (VT-x)` یا `Intel VT-d`
   - AMD: `AMD-V` یا `SVM Mode`
5. **تنظیمات را Save کنید** (معمولاً F10) و از BIOS خارج شوید
6. **Windows را بوت کنید**

### مرحله ۲: فعال‌سازی Hyper-V و Virtual Machine Platform

**PowerShell را به عنوان Administrator باز کنید** و دستورات زیر را اجرا کنید:

```powershell
# فعال‌سازی Hyper-V
DISM /Online /Enable-Feature /All /FeatureName:Microsoft-Hyper-V

# فعال‌سازی Virtual Machine Platform
DISM /Online /Enable-Feature /All /FeatureName:VirtualMachinePlatform

# فعال‌سازی Windows Subsystem for Linux
DISM /Online /Enable-Feature /All /FeatureName:Microsoft-Windows-Subsystem-Linux

# تنظیم Hypervisor برای استارت خودکار
bcdedit /set hypervisorlaunchtype auto
```

### مرحله ۳: Restart سیستم

**سیستم را Restart کنید** تا تغییرات اعمال شوند.

### مرحله ۴: نصب Ubuntu برای WSL 2

بعد از Restart، PowerShell را باز کنید و اجرا کنید:

```powershell
# نصب Ubuntu
wsl --install Ubuntu-24.04

# تنظیم WSL 2 به عنوان نسخه پیش‌فرض
wsl --set-default-version 2
```

### مرحله ۵: راه‌اندازی Docker Desktop

1. **Docker Desktop را باز کنید**
2. **صبر کنید تا Docker Engine استارت شود** (آیکون Docker در system tray باید سبز شود)
3. **تست کنید:**

```powershell
docker --version
docker run hello-world
```

## بررسی وضعیت

برای بررسی اینکه Virtualization فعال است:

```powershell
# بررسی Hypervisor
Get-CimInstance -ClassName Win32_ComputerSystem | Select-Object HypervisorPresent

# باید نتیجه True باشد
```

## اگر مشکل حل نشد

اگر بعد از انجام تمام مراحل بالا، Docker باز هم کار نکرد:

### گزینه ۱: استفاده از Docker Toolbox (قدیمی)
- Docker Toolbox از VirtualBox استفاده می‌کند و نیازی به Hyper-V ندارد
- اما توصیه نمی‌شود چون قدیمی است

### گزینه ۲: نصب مستقیم PostgreSQL
- PostgreSQL را به صورت مستقیم روی Windows نصب کنید
- Redis، MinIO و Elasticsearch را هم به صورت مستقیم نصب کنید
- این روش ساده‌تر است اما کمتر قابل حمل

## پشتیبانی

اگر در هر مرحله‌ای به مشکل خوردید، به من اطلاع دهید تا کمک کنم.

---

**نکته مهم:** اگر سیستم شما در یک محیط مجازی (Virtual Machine) اجرا می‌شود، ممکن است نتوانید Nested Virtualization را فعال کنید. در این صورت باید از گزینه ۲ استفاده کنید.
