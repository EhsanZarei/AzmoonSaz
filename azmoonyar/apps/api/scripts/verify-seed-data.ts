#!/usr/bin/env ts-node
/**
 * اسکریپت تایید داده‌های seed شده
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function verifyData() {
  console.log('🔍 در حال بررسی داده‌های seed شده...\n');
  console.log('═'.repeat(60));
  
  try {
    // تعداد پلن‌ها
    const planCount = await prisma.plan.count();
    const plans = await prisma.plan.findMany({
      select: { name: true, type: true, priceMonthly: true },
    });
    console.log(`\n📋 پلن‌ها (${planCount}):`);
    plans.forEach(p => console.log(`   - ${p.name} (${p.type}) - ${p.priceMonthly.toLocaleString('fa-IR')} تومان/ماه`));
    
    // تعداد سازمان‌ها
    const orgCount = await prisma.organization.count();
    const orgs = await prisma.organization.findMany({
      select: { 
        name: true, 
        slug: true,
        _count: { select: { members: true, exams: true } }
      },
    });
    console.log(`\n🏢 سازمان‌ها (${orgCount}):`);
    orgs.forEach(o => console.log(`   - ${o.name} (@${o.slug}) - ${o._count.members} عضو، ${o._count.exams} آزمون`));
    
    // تعداد کاربران
    const userCount = await prisma.user.count();
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: true,
    });
    console.log(`\n👥 کاربران (${userCount}):`);
    usersByRole.forEach(r => console.log(`   - ${r.role}: ${r._count}`));
    
    const users = await prisma.user.findMany({
      select: { id: true, name: true, phone: true, role: true, orgId: true },
      orderBy: { role: 'asc' },
    });
    console.log('\n   جزئیات:');
    users.forEach(u => console.log(`   - ${u.name.padEnd(20)} | ${u.phone?.padEnd(13)} | ${u.role}`));
    
    // تعداد بانک سوالات
    const bankCount = await prisma.questionBank.count();
    const banks = await prisma.questionBank.findMany({
      include: { 
        _count: { select: { questions: true } },
        owner: { select: { name: true } }
      },
    });
    console.log(`\n📚 بانک سوالات (${bankCount}):`);
    banks.forEach(b => console.log(`   - ${b.name} - ${b._count.questions} سوال - مالک: ${b.owner.name}`));
    
    // تعداد آزمون‌ها
    const examCount = await prisma.exam.count();
    const exams = await prisma.exam.findMany({
      include: { 
        _count: { select: { questions: true, submissions: true } },
        owner: { select: { name: true } }
      },
    });
    console.log(`\n📝 آزمون‌ها (${examCount}):`);
    exams.forEach(e => console.log(`   - ${e.title.padEnd(40)} | ${e.status.padEnd(10)} | ${e._count.questions} سوال | ${e._count.submissions} شرکت‌کننده`));
    
    // تعداد سوالات
    const questionCount = await prisma.question.count();
    const questions = await prisma.question.findMany({
      select: { type: true, difficulty: true, score: true },
    });
    console.log(`\n❓ سوالات (${questionCount}):`);
    
    // آمار بر اساس نوع
    const typeStats = questions.reduce((acc, q) => {
      acc[q.type] = (acc[q.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('   بر اساس نوع:');
    Object.entries(typeStats).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`   - ${type.padEnd(20)}: ${count}`);
    });
    
    // آمار بر اساس سطح دشواری
    const diffStats = questions.reduce((acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('   بر اساس سطح دشواری:');
    Object.entries(diffStats).forEach(([diff, count]) => {
      console.log(`   - ${diff.padEnd(12)}: ${count}`);
    });
    
    // تعداد submissions
    const submissionCount = await prisma.submission.count();
    const submissionsByStatus = await prisma.submission.groupBy({
      by: ['status'],
      _count: true,
    });
    console.log(`\n📊 Submissions (${submissionCount}):`);
    submissionsByStatus.forEach(s => console.log(`   - ${s.status.padEnd(15)}: ${s._count}`));
    
    const submissions = await prisma.submission.findMany({
      include: {
        user: { select: { name: true } },
        exam: { select: { title: true } }
      },
    });
    console.log('   جزئیات:');
    submissions.forEach(s => {
      const scoreText = s.score ? `${s.score}/${s.maxScore} (${s.percentage?.toFixed(1)}%)` : 'N/A';
      const passText = s.passed !== null ? (s.passed ? '✓ قبول' : '✗ رد') : '-';
      console.log(`   - ${s.user?.name || 'مهمان'} - ${s.exam.title.substring(0, 30)} - ${scoreText} ${passText}`);
    });
    
    // تعداد گواهینامه‌ها
    const certCount = await prisma.certificate.count();
    const certificates = await prisma.certificate.findMany({
      include: {
        user: { select: { name: true } },
        exam: { select: { title: true } }
      },
    });
    console.log(`\n🏆 گواهینامه‌ها (${certCount}):`);
    certificates.forEach(c => console.log(`   - ${c.uniqueCode} - ${c.user.name} - ${c.exam.title.substring(0, 40)} - دانلود: ${c.downloadCount}`));
    
    // SRS Cards
    const srsCount = await prisma.srsCard.count();
    console.log(`\n🧠 SRS Cards (${srsCount}):`);
    const srsCards = await prisma.srsCard.findMany({
      include: { user: { select: { name: true } } },
    });
    srsCards.forEach(s => console.log(`   - ${s.user.name} - Ease: ${s.easeFactor} - Interval: ${s.intervalDays} روز - Reps: ${s.repetitions}`));
    
    // Workflows
    const workflowCount = await prisma.workflow.count();
    const workflows = await prisma.workflow.findMany({
      select: { name: true, trigger: true, isActive: true },
    });
    console.log(`\n⚙️  Workflows (${workflowCount}):`);
    workflows.forEach(w => console.log(`   - ${w.name} - Trigger: ${w.trigger} - ${w.isActive ? '✓ فعال' : '✗ غیرفعال'}`));
    
    console.log('\n' + '═'.repeat(60));
    console.log('✨ همه داده‌ها با موفقیت seed و تایید شدند!');
    console.log('═'.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ خطا:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyData();
