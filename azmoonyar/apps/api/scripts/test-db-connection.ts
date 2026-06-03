#!/usr/bin/env ts-node
/**
 * اسکریپت تست اتصال به دیتابیس PostgreSQL
 * 
 * این اسکریپت برای بررسی اتصال به دیتابیس و تست عملکرد Prisma Client استفاده می‌شود.
 * 
 * استفاده:
 * npm run test:db
 * یا
 * ts-node scripts/test-db-connection.ts
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// بارگذاری متغیرهای محیطی
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  console.log('🔍 در حال تست اتصال به دیتابیس...\n');
  
  try {
    // تست اتصال با یک query ساده
    await prisma.$connect();
    console.log('✅ اتصال به دیتابیس با موفقیت برقرار شد!');
    
    // نمایش اطلاعات اتصال
    console.log('\n📊 اطلاعات اتصال:');
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')}`);
    
    // تست query ساده
    console.log('\n🔍 در حال اجرای query تست...');
    const result = await prisma.$queryRaw`SELECT version() as version, current_database() as database, current_user as user`;
    console.log('✅ Query با موفقیت اجرا شد!');
    console.log('\n📋 نتیجه:');
    console.log(result);
    
    // بررسی جداول موجود
    console.log('\n🗂️  در حال بررسی جداول موجود...');
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    
    if (tables.length === 0) {
      console.log('⚠️  هیچ جدولی در دیتابیس یافت نشد.');
      console.log('💡 لطفاً migration را اجرا کنید: npm run db:migrate');
    } else {
      console.log(`✅ ${tables.length} جدول یافت شد:`);
      tables.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.tablename}`);
      });
    }
    
    // تست عملیات CRUD ساده (اگر جدول users وجود داشته باشد)
    try {
      const userCount = await prisma.user.count();
      console.log(`\n👥 تعداد کاربران موجود: ${userCount}`);
    } catch (error) {
      console.log('\n⚠️  جدول users هنوز ایجاد نشده است.');
    }
    
    console.log('\n✨ تست اتصال با موفقیت کامل شد!');
    
  } catch (error) {
    console.error('\n❌ خطا در اتصال به دیتابیس:');
    
    if (error instanceof Error) {
      console.error(`   پیام خطا: ${error.message}`);
      
      // راهنمایی‌های رفع خطا
      if (error.message.includes('ECONNREFUSED')) {
        console.error('\n💡 راهنمایی:');
        console.error('   - مطمئن شوید PostgreSQL در حال اجرا است');
        console.error('   - برای اجرای PostgreSQL با Docker:');
        console.error('     docker-compose up -d postgres');
        console.error('   - یا برای اجرای تمام سرویس‌ها:');
        console.error('     docker-compose up -d');
      } else if (error.message.includes('authentication failed')) {
        console.error('\n💡 راهنمایی:');
        console.error('   - نام کاربری یا رمز عبور اشتباه است');
        console.error('   - DATABASE_URL را در فایل .env بررسی کنید');
      } else if (error.message.includes('database') && error.message.includes('does not exist')) {
        console.error('\n💡 راهنمایی:');
        console.error('   - دیتابیس هنوز ایجاد نشده است');
        console.error('   - برای ایجاد دیتابیس:');
        console.error('     docker-compose up -d postgres');
      }
    } else {
      console.error(error);
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// اجرای تست
testConnection()
  .catch((error) => {
    console.error('خطای غیرمنتظره:', error);
    process.exit(1);
  });
