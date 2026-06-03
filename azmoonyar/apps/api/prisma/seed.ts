import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ===== Plans =====
  const plans = await Promise.all([
    prisma.plan.upsert({
      where: { id: 'plan-free' },
      update: {},
      create: {
        id: 'plan-free',
        name: 'رایگان',
        type: 'FREE',
        priceMonthly: 0,
        priceYearly: 0,
        features: {
          ai_questions: true,
          live_quiz: false,
          certificates: false,
          custom_domain: false,
        },
        limits: {
          exams: 3,
          responses_per_month: 100,
          ai_questions_per_month: 50,
          storage_mb: 100,
        },
      },
    }),
    prisma.plan.upsert({
      where: { id: 'plan-basic' },
      update: {},
      create: {
        id: 'plan-basic',
        name: 'پایه',
        type: 'BASIC',
        priceMonthly: 199000,
        priceYearly: 1790000,
        features: {
          ai_questions: true,
          live_quiz: true,
          certificates: true,
          custom_domain: false,
          ocr: true,
        },
        limits: {
          exams: 20,
          responses_per_month: 500,
          ai_questions_per_month: 500,
          storage_mb: 1024,
        },
      },
    }),
    prisma.plan.upsert({
      where: { id: 'plan-pro' },
      update: {},
      create: {
        id: 'plan-pro',
        name: 'حرفه‌ای',
        type: 'PRO',
        priceMonthly: 499000,
        priceYearly: 4490000,
        features: {
          ai_questions: true,
          live_quiz: true,
          certificates: true,
          custom_domain: false,
          ocr: true,
          video_ai: true,
          advanced_reports: true,
        },
        limits: {
          exams: -1,
          responses_per_month: 5000,
          ai_questions_per_month: 5000,
          storage_mb: 10240,
        },
      },
    }),
    prisma.plan.upsert({
      where: { id: 'plan-enterprise' },
      update: {},
      create: {
        id: 'plan-enterprise',
        name: 'سازمانی',
        type: 'ENTERPRISE',
        priceMonthly: 2000000,
        priceYearly: 18000000,
        features: {
          ai_questions: true,
          live_quiz: true,
          certificates: true,
          custom_domain: true,
          ocr: true,
          video_ai: true,
          advanced_reports: true,
          white_label: true,
          sso: true,
          api_access: true,
        },
        limits: {
          exams: -1,
          responses_per_month: -1,
          ai_questions_per_month: -1,
          storage_mb: -1,
        },
      },
    }),
  ]);
  console.log(`✅ ${plans.length} plans seeded`);

  // ===== Organizations =====
  const org1 = await prisma.organization.upsert({
    where: { slug: 'دانشگاه-تهران' },
    update: {},
    create: {
      slug: 'دانشگاه-تهران',
      name: 'دانشگاه تهران',
      domain: 'ut.ac.ir',
      planId: plans[2].id, // Pro
      settings: {
        timezone: 'Asia/Tehran',
        language: 'fa',
        brandColor: '#003366',
      },
    },
  });

  const org2 = await prisma.organization.upsert({
    where: { slug: 'موسسه-آموزشی-شریف' },
    update: {},
    create: {
      slug: 'موسسه-آموزشی-شریف',
      name: 'موسسه آموزشی شریف',
      planId: plans[1].id, // Basic
      settings: {
        timezone: 'Asia/Tehran',
        language: 'fa',
        brandColor: '#FF6B35',
      },
    },
  });

  const org3 = await prisma.organization.upsert({
    where: { slug: 'شرکت-فناوری-آریا' },
    update: {},
    create: {
      slug: 'شرکت-فناوری-آریا',
      name: 'شرکت فناوری آریا',
      planId: plans[3].id, // Enterprise
      settings: {
        timezone: 'Asia/Tehran',
        language: 'fa',
        brandColor: '#8E44AD',
      },
    },
  });
  console.log(`✅ 3 organizations seeded`);

  // ===== Users =====
  const admin = await prisma.user.upsert({
    where: { phone: '09000000000' },
    update: {},
    create: {
      phone: '09000000000',
      email: 'admin@azmoonyar.ir',
      name: 'مدیر سیستم',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  // Org Admins
  const orgAdmin1 = await prisma.user.upsert({
    where: { phone: '09111111111' },
    update: {},
    create: {
      phone: '09111111111',
      email: 'admin.ut@azmoonyar.ir',
      name: 'دکتر رضایی',
      role: 'ORG_ADMIN',
      status: 'ACTIVE',
      orgId: org1.id,
    },
  });

  const orgAdmin2 = await prisma.user.upsert({
    where: { phone: '09122222222' },
    update: {},
    create: {
      phone: '09122222222',
      email: 'admin@sharif-edu.ir',
      name: 'مهندس احمدی',
      role: 'ORG_ADMIN',
      status: 'ACTIVE',
      orgId: org2.id,
    },
  });

  // Teachers
  const teacher1 = await prisma.user.upsert({
    where: { phone: '09133333333' },
    update: {},
    create: {
      phone: '09133333333',
      email: 'teacher1@ut.ac.ir',
      name: 'استاد کریمی',
      role: 'TEACHER',
      status: 'ACTIVE',
      orgId: org1.id,
    },
  });

  const teacher2 = await prisma.user.upsert({
    where: { phone: '09144444444' },
    update: {},
    create: {
      phone: '09144444444',
      email: 'teacher2@sharif-edu.ir',
      name: 'دکتر محمدی',
      role: 'TEACHER',
      status: 'ACTIVE',
      orgId: org2.id,
    },
  });

  const teacher3 = await prisma.user.upsert({
    where: { phone: '09155555555' },
    update: {},
    create: {
      phone: '09155555555',
      email: 'teacher3@azmoonyar.ir',
      name: 'استاد نوری',
      role: 'TEACHER',
      status: 'ACTIVE',
      orgId: org1.id,
    },
  });

  // Students
  const students = [];
  const studentPhones = [
    { phone: '09166666666', name: 'علی احمدزاده', email: 'ali@student.ir', orgId: org1.id },
    { phone: '09177777777', name: 'فاطمه رضایی', email: 'fateme@student.ir', orgId: org1.id },
    { phone: '09188888888', name: 'محمد کریمی', email: 'mohammad@student.ir', orgId: org2.id },
    { phone: '09199999999', name: 'سارا حسینی', email: 'sara@student.ir', orgId: org2.id },
    { phone: '09101010101', name: 'رضا محمودی', email: 'reza@student.ir', orgId: org1.id },
    { phone: '09102020202', name: 'زهرا اکبری', email: 'zahra@student.ir', orgId: org2.id },
  ];

  for (const st of studentPhones) {
    const student = await prisma.user.upsert({
      where: { phone: st.phone },
      update: {},
      create: {
        phone: st.phone,
        email: st.email,
        name: st.name,
        role: 'STUDENT',
        status: 'ACTIVE',
        orgId: st.orgId,
      },
    });
    students.push(student);
  }
  console.log(`✅ ${3 + students.length + 3} users seeded (1 admin, 2 org admins, 3 teachers, ${students.length} students)`);

  // ===== Question Banks =====
  const bank1 = await prisma.questionBank.create({
    data: {
      name: 'بانک سوالات ریاضی',
      ownerId: teacher1.id,
      orgId: org1.id,
      visibility: 'org',
      description: 'سوالات آماده برای دروس ریاضی',
    },
  });

  const bank2 = await prisma.questionBank.create({
    data: {
      name: 'بانک سوالات فیزیک',
      ownerId: teacher2.id,
      orgId: org2.id,
      visibility: 'private',
      description: 'سوالات فیزیک دبیرستان',
    },
  });
  console.log(`✅ 2 question banks seeded`);

  // ===== Exams با سوالات متنوع =====
  // آزمون 1: شیمی
  const exam1 = await prisma.exam.create({
    data: {
      title: 'آزمون جامع شیمی — فصل ۱ تا ۳',
      description: 'آزمون جامع شیمی دهم با سوالات متنوع',
      ownerId: teacher1.id,
      orgId: org1.id,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      tags: ['شیمی', 'دهم', 'فصل ۱', 'فصل ۲', 'فصل ۳'],
      category: 'علوم تجربی',
      settings: {
        timer: 3600,
        passingScore: 60,
        shuffleQuestions: true,
        shuffleOptions: true,
        showResult: 'immediately',
        allowReview: true,
        showExplanation: true,
      },
    },
  });

  await prisma.question.createMany({
    data: [
      {
        examId: exam1.id,
        type: 'MCQ_SINGLE',
        content: {
          text: 'فرمول شیمیایی آب کدام است؟',
          options: [
            { id: 'a', text: 'CO₂' },
            { id: 'b', text: 'H₂O' },
            { id: 'c', text: 'NaCl' },
            { id: 'd', text: 'O₂' },
          ],
          correct_answer: 'b',
          explanation: 'آب از دو اتم هیدروژن و یک اتم اکسیژن تشکیل شده است.',
        },
        score: 2,
        difficulty: 'EASY',
        orderIndex: 0,
        tags: ['آب', 'فرمول'],
      },
      {
        examId: exam1.id,
        type: 'TRUE_FALSE',
        content: {
          text: 'اکسیژن یک عنصر فلزی است.',
          correct_answer: false,
          explanation: 'اکسیژن یک عنصر غیرفلزی است.',
        },
        score: 1,
        difficulty: 'EASY',
        orderIndex: 1,
        tags: ['اکسیژن'],
      },
      {
        examId: exam1.id,
        type: 'MCQ_MULTIPLE',
        content: {
          text: 'کدام‌یک از موارد زیر گاز نجیب هستند؟ (چند گزینه)',
          options: [
            { id: 'a', text: 'هلیوم (He)' },
            { id: 'b', text: 'اکسیژن (O)' },
            { id: 'c', text: 'آرگون (Ar)' },
            { id: 'd', text: 'نئون (Ne)' },
          ],
          correct_answer: ['a', 'c', 'd'],
          explanation: 'هلیوم، آرگون و نئون از گازهای نجیب هستند.',
        },
        score: 3,
        difficulty: 'HARD',
        orderIndex: 2,
        tags: ['گازهای نجیب'],
      },
      {
        examId: exam1.id,
        type: 'SHORT_ANSWER',
        content: {
          text: 'نماد شیمیایی طلا را بنویسید.',
          accepted_answers: ['Au', 'au', 'AU'],
          explanation: 'نماد شیمیایی طلا Au است که از نام لاتین Aurum گرفته شده.',
        },
        score: 2,
        difficulty: 'MEDIUM',
        orderIndex: 3,
        tags: ['طلا', 'نماد'],
      },
      {
        examId: exam1.id,
        type: 'FILL_BLANK',
        content: {
          text: 'جرم اتمی کربن برابر با ____ است و عدد اتمی آن ____ می‌باشد.',
          blanks: [
            { id: '1', accepted_answers: ['12', '۱۲'] },
            { id: '2', accepted_answers: ['6', '۶'] },
          ],
          explanation: 'کربن دارای جرم اتمی ۱۲ و عدد اتمی ۶ است.',
        },
        score: 2,
        difficulty: 'MEDIUM',
        orderIndex: 4,
        tags: ['کربن'],
      },
      {
        examId: exam1.id,
        type: 'MATCHING',
        content: {
          text: 'عناصر زیر را با نماد شیمیایی آن‌ها تطبیق دهید:',
          left: [
            { id: '1', text: 'سدیم' },
            { id: '2', text: 'کلر' },
            { id: '3', text: 'آهن' },
            { id: '4', text: 'نقره' },
          ],
          right: [
            { id: 'a', text: 'Cl' },
            { id: 'b', text: 'Fe' },
            { id: 'c', text: 'Na' },
            { id: 'd', text: 'Ag' },
          ],
          correct_matches: {
            '1': 'c',
            '2': 'a',
            '3': 'b',
            '4': 'd',
          },
          explanation: 'سدیم=Na، کلر=Cl، آهن=Fe، نقره=Ag',
        },
        score: 4,
        difficulty: 'MEDIUM',
        orderIndex: 5,
        tags: ['نماد', 'تطبیق'],
      },
      {
        examId: exam1.id,
        type: 'ESSAY',
        content: {
          text: 'در مورد اهمیت آب در زندگی موجودات زنده توضیح دهید. (حداقل ۵۰ کلمه)',
          min_words: 50,
          max_words: 200,
          rubric: [
            { criteria: 'محتوا', points: 3 },
            { criteria: 'ساختار', points: 2 },
            { criteria: 'زبان', points: 2 },
          ],
        },
        score: 7,
        difficulty: 'HARD',
        orderIndex: 6,
        tags: ['تشریحی', 'آب'],
      },
      {
        examId: exam1.id,
        type: 'LIKERT',
        content: {
          text: 'تا چه حد با این جمله موافقید: "شیمی یک درس جذاب است."',
          scale: 5,
          labels: ['کاملاً مخالفم', 'مخالفم', 'بی‌نظر', 'موافقم', 'کاملاً موافقم'],
        },
        score: 0,
        difficulty: 'EASY',
        orderIndex: 7,
        tags: ['نظرسنجی'],
      },
    ],
  });

  // آزمون 2: ریاضی
  const exam2 = await prisma.exam.create({
    data: {
      title: 'آزمون ریاضی — معادلات درجه دوم',
      description: 'آزمون ریاضی یازدهم',
      ownerId: teacher2.id,
      orgId: org2.id,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      tags: ['ریاضی', 'یازدهم', 'معادلات'],
      category: 'ریاضی',
      settings: {
        timer: 2700,
        passingScore: 50,
        shuffleQuestions: false,
        showResult: 'after_deadline',
        negativeScoring: true,
      },
    },
  });

  await prisma.question.createMany({
    data: [
      {
        examId: exam2.id,
        type: 'MCQ_SINGLE',
        content: {
          text: 'ریشه‌های معادله x² - 5x + 6 = 0 کدامند؟',
          options: [
            { id: 'a', text: 'x = 2, x = 3' },
            { id: 'b', text: 'x = 1, x = 6' },
            { id: 'c', text: 'x = -2, x = -3' },
            { id: 'd', text: 'x = 0, x = 5' },
          ],
          correct_answer: 'a',
          explanation: 'با تجزیه: (x-2)(x-3) = 0، پس x=2 یا x=3',
        },
        score: 3,
        negativeScore: 0.5,
        difficulty: 'MEDIUM',
        orderIndex: 0,
        tags: ['معادله درجه دوم'],
      },
      {
        examId: exam2.id,
        type: 'SHORT_ANSWER',
        content: {
          text: 'حاصل ۵ × ۸ را محاسبه کنید.',
          accepted_answers: ['40', '۴۰'],
        },
        score: 1,
        difficulty: 'EASY',
        orderIndex: 1,
        tags: ['ضرب'],
      },
      {
        examId: exam2.id,
        type: 'ORDERING',
        content: {
          text: 'اعداد زیر را از کوچک به بزرگ مرتب کنید:',
          items: [
            { id: '1', text: '۱۵' },
            { id: '2', text: '۳' },
            { id: '3', text: '۲۰' },
            { id: '4', text: '۷' },
          ],
          correct_order: ['2', '4', '1', '3'],
        },
        score: 2,
        difficulty: 'EASY',
        orderIndex: 2,
        tags: ['مرتب‌سازی'],
      },
      {
        examId: exam2.id,
        type: 'YES_NO',
        content: {
          text: 'آیا عدد صفر یک عدد زوج است؟',
          correct_answer: true,
          explanation: 'بله، صفر یک عدد زوج است زیرا بر ۲ بخش‌پذیر است.',
        },
        score: 1,
        difficulty: 'EASY',
        orderIndex: 3,
        tags: ['اعداد'],
      },
      {
        examId: exam2.id,
        type: 'SLIDER',
        content: {
          text: 'احتمال اینکه در پرتاب یک سکه عدد بیاید چند درصد است؟',
          min: 0,
          max: 100,
          step: 5,
          correct_value: 50,
          tolerance: 5,
        },
        score: 2,
        difficulty: 'MEDIUM',
        orderIndex: 4,
        tags: ['احتمال'],
      },
    ],
  });

  // آزمون 3: زبان انگلیسی
  const exam3 = await prisma.exam.create({
    data: {
      title: 'English Vocabulary Test',
      description: 'Test your English vocabulary level',
      ownerId: teacher3.id,
      orgId: org1.id,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      tags: ['English', 'Vocabulary', 'Level A2'],
      category: 'زبان',
      language: 'en',
      settings: {
        timer: 1200,
        passingScore: 70,
        shuffleQuestions: true,
        showResult: 'immediately',
      },
    },
  });

  await prisma.question.createMany({
    data: [
      {
        examId: exam3.id,
        type: 'MCQ_SINGLE',
        content: {
          text: 'What is the opposite of "hot"?',
          options: [
            { id: 'a', text: 'warm' },
            { id: 'b', text: 'cold' },
            { id: 'c', text: 'cool' },
            { id: 'd', text: 'freezing' },
          ],
          correct_answer: 'b',
        },
        score: 1,
        difficulty: 'EASY',
        orderIndex: 0,
        tags: ['vocabulary', 'opposites'],
      },
      {
        examId: exam3.id,
        type: 'FILL_BLANK',
        content: {
          text: 'I ____ to school every day. (go)',
          blanks: [{ id: '1', accepted_answers: ['go', 'Go'] }],
        },
        score: 1,
        difficulty: 'EASY',
        orderIndex: 1,
        tags: ['grammar', 'present simple'],
      },
      {
        examId: exam3.id,
        type: 'MCQ_MULTIPLE',
        content: {
          text: 'Which of these are fruits? (Select all)',
          options: [
            { id: 'a', text: 'Apple' },
            { id: 'b', text: 'Carrot' },
            { id: 'c', text: 'Banana' },
            { id: 'd', text: 'Orange' },
          ],
          correct_answer: ['a', 'c', 'd'],
        },
        score: 2,
        difficulty: 'EASY',
        orderIndex: 2,
        tags: ['vocabulary', 'food'],
      },
    ],
  });

  // آزمون 4: Draft (در حال ویرایش)
  const exam4 = await prisma.exam.create({
    data: {
      title: 'آزمون فیزیک — نوسان و موج (Draft)',
      description: 'آزمون در حال آماده‌سازی',
      ownerId: teacher1.id,
      orgId: org1.id,
      status: 'DRAFT',
      tags: ['فیزیک', 'نوسان', 'موج'],
      category: 'علوم',
      settings: {
        timer: 3000,
        passingScore: 60,
      },
    },
  });

  await prisma.question.createMany({
    data: [
      {
        examId: exam4.id,
        type: 'MCQ_SINGLE',
        content: {
          text: 'واحد اندازه‌گیری فرکانس کدام است؟',
          options: [
            { id: 'a', text: 'هرتز' },
            { id: 'b', text: 'متر' },
            { id: 'c', text: 'ثانیه' },
            { id: 'd', text: 'نیوتن' },
          ],
          correct_answer: 'a',
        },
        score: 2,
        difficulty: 'EASY',
        orderIndex: 0,
        tags: ['فرکانس'],
      },
      {
        examId: exam4.id,
        type: 'DRAG_DROP',
        content: {
          text: 'اجزای موج را روی نمودار قرار دهید.',
          image: '/images/wave-diagram.png',
          items: [
            { id: '1', text: 'قله' },
            { id: '2', text: 'دره' },
            { id: '3', text: 'دامنه' },
          ],
          targets: [
            { id: 'a', x: 100, y: 50 },
            { id: 'b', x: 200, y: 150 },
            { id: 'c', x: 150, y: 100 },
          ],
          correct_mapping: {
            '1': 'a',
            '2': 'b',
            '3': 'c',
          },
        },
        score: 3,
        difficulty: 'MEDIUM',
        orderIndex: 1,
        tags: ['موج', 'اجزا'],
      },
    ],
  });

  // آزمون 5: کنکور
  const exam5 = await prisma.exam.create({
    data: {
      title: 'آزمون آزمایشی کنکور — ریاضی و فیزیک',
      description: 'شبیه‌سازی کنکور سراسری',
      ownerId: teacher2.id,
      orgId: org2.id,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      tags: ['کنکور', 'ریاضی', 'فیزیک', 'تجربی'],
      category: 'کنکور',
      settings: {
        timer: 7200,
        passingScore: 50,
        negativeScoring: true,
        shuffleQuestions: false,
        showResult: 'after_deadline',
        allowReview: false,
      },
    },
  });

  await prisma.question.createMany({
    data: [
      {
        examId: exam5.id,
        type: 'MCQ_SINGLE',
        content: {
          text: 'اگر f(x) = x² + 3x - 2 باشد، f(2) چقدر است؟',
          options: [
            { id: 'a', text: '8' },
            { id: 'b', text: '10' },
            { id: 'c', text: '6' },
            { id: 'd', text: '12' },
          ],
          correct_answer: 'a',
          explanation: 'f(2) = 2² + 3(2) - 2 = 4 + 6 - 2 = 8',
        },
        score: 2,
        negativeScore: 0.5,
        difficulty: 'MEDIUM',
        orderIndex: 0,
        timeLimit: 120,
        tags: ['تابع', 'محاسبه'],
      },
      {
        examId: exam5.id,
        type: 'MCQ_SINGLE',
        content: {
          text: 'شتاب گرانش زمین تقریباً چند متر بر مجذور ثانیه است؟',
          options: [
            { id: 'a', text: '9.8' },
            { id: 'b', text: '10.5' },
            { id: 'c', text: '8.9' },
            { id: 'd', text: '11.2' },
          ],
          correct_answer: 'a',
        },
        score: 2,
        negativeScore: 0.5,
        difficulty: 'EASY',
        orderIndex: 1,
        timeLimit: 90,
        tags: ['گرانش', 'شتاب'],
      },
      {
        examId: exam5.id,
        type: 'MATH_FORMULA',
        content: {
          text: 'حد زیر را محاسبه کنید:',
          formula: '\\lim_{x \\to 0} \\frac{\\sin x}{x}',
          accepted_answers: ['1', '۱'],
          explanation: 'این یکی از حدود معروف است که برابر ۱ است.',
        },
        score: 4,
        negativeScore: 1,
        difficulty: 'HARD',
        orderIndex: 2,
        timeLimit: 300,
        tags: ['حد', 'مثلثات'],
      },
    ],
  });

  console.log(`✅ 5 exams seeded with questions`);

  // ===== Submissions و Answers برای ایجاد تاریخچه =====
  // Submission 1: علی در آزمون شیمی (تکمیل شده)
  const submission1 = await prisma.submission.create({
    data: {
      examId: exam1.id,
      userId: students[0].id,
      status: 'COMPLETED',
      score: 18,
      maxScore: 21,
      percentage: 85.71,
      passed: true,
      startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3000000),
      timeSpent: 3000,
      ipAddress: '185.10.20.30',
      userAgent: 'Mozilla/5.0',
    },
  });

  // Submission 2: فاطمه در آزمون ریاضی (تکمیل شده)
  const submission2 = await prisma.submission.create({
    data: {
      examId: exam2.id,
      userId: students[1].id,
      status: 'COMPLETED',
      score: 7.5,
      maxScore: 9,
      percentage: 83.33,
      passed: true,
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2400000),
      timeSpent: 2400,
      ipAddress: '185.20.30.40',
      userAgent: 'Mozilla/5.0',
    },
  });

  // Submission 3: محمد در آزمون انگلیسی (در حال انجام)
  const submission3 = await prisma.submission.create({
    data: {
      examId: exam3.id,
      userId: students[2].id,
      status: 'IN_PROGRESS',
      startedAt: new Date(Date.now() - 600000), // 10 mins ago
      ipAddress: '185.30.40.50',
      userAgent: 'Mozilla/5.0',
    },
  });

  // Submission 4: سارا در آزمون کنکور (تکمیل شده)
  const submission4 = await prisma.submission.create({
    data: {
      examId: exam5.id,
      userId: students[3].id,
      status: 'COMPLETED',
      score: 6,
      maxScore: 8,
      percentage: 75,
      passed: true,
      startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 5000000),
      timeSpent: 5000,
      ipAddress: '185.40.50.60',
      userAgent: 'Mozilla/5.0',
    },
  });

  // Submission 5: رضا در آزمون شیمی (ردشده)
  const submission5 = await prisma.submission.create({
    data: {
      examId: exam1.id,
      userId: students[4].id,
      status: 'COMPLETED',
      score: 10,
      maxScore: 21,
      percentage: 47.62,
      passed: false,
      startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 2000000),
      timeSpent: 2000,
      ipAddress: '185.50.60.70',
      userAgent: 'Mozilla/5.0',
    },
  });

  console.log(`✅ 5 submissions seeded`);

  // ===== Certificates =====
  const cert1 = await prisma.certificate.create({
    data: {
      submissionId: submission1.id,
      userId: students[0].id,
      examId: exam1.id,
      uniqueCode: 'CERT-2026-001234',
      issuedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      downloadCount: 3,
    },
  });

  const cert2 = await prisma.certificate.create({
    data: {
      submissionId: submission2.id,
      userId: students[1].id,
      examId: exam2.id,
      uniqueCode: 'CERT-2026-001235',
      issuedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      downloadCount: 1,
    },
  });

  const cert3 = await prisma.certificate.create({
    data: {
      submissionId: submission4.id,
      userId: students[3].id,
      examId: exam5.id,
      uniqueCode: 'CERT-2026-001236',
      issuedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      downloadCount: 0,
    },
  });

  console.log(`✅ 3 certificates seeded`);

  // ===== سوالات بیشتر در بانک سوالات =====
  const bankQuestions = await prisma.question.createMany({
    data: [
      {
        bankId: bank1.id,
        type: 'MCQ_SINGLE',
        content: {
          text: 'مجموع زوایای یک مثلث چند درجه است؟',
          options: [
            { id: 'a', text: '90' },
            { id: 'b', text: '180' },
            { id: 'c', text: '270' },
            { id: 'd', text: '360' },
          ],
          correct_answer: 'b',
        },
        score: 1,
        difficulty: 'EASY',
        tags: ['هندسه', 'مثلث'],
      },
      {
        bankId: bank1.id,
        type: 'SHORT_ANSWER',
        content: {
          text: 'عدد π (پی) تقریباً برابر با چند است؟ (با دو رقم اعشار)',
          accepted_answers: ['3.14', '۳.۱۴', '3.١٤'],
        },
        score: 1,
        difficulty: 'EASY',
        tags: ['عدد پی'],
      },
      {
        bankId: bank1.id,
        type: 'TRUE_FALSE',
        content: {
          text: 'عدد ۱۳ یک عدد اول است.',
          correct_answer: true,
          explanation: 'بله، ۱۳ فقط بر ۱ و خودش بخش‌پذیر است.',
        },
        score: 1,
        difficulty: 'EASY',
        tags: ['اعداد اول'],
      },
      {
        bankId: bank2.id,
        type: 'MCQ_SINGLE',
        content: {
          text: 'سرعت نور در خلأ چند کیلومتر بر ثانیه است؟',
          options: [
            { id: 'a', text: '300,000' },
            { id: 'b', text: '150,000' },
            { id: 'c', text: '500,000' },
            { id: 'd', text: '200,000' },
          ],
          correct_answer: 'a',
        },
        score: 2,
        difficulty: 'MEDIUM',
        tags: ['نور', 'سرعت'],
      },
      {
        bankId: bank2.id,
        type: 'FILL_BLANK',
        content: {
          text: 'فرمول نیروی گرانشی: F = G × (m₁ × m₂) / ____',
          blanks: [{ id: '1', accepted_answers: ['r²', 'r^2', 'r۲'] }],
          explanation: 'فاصله به توان دو',
        },
        score: 2,
        difficulty: 'MEDIUM',
        tags: ['گرانش', 'فرمول'],
      },
      {
        bankId: bank2.id,
        type: 'MATCHING',
        content: {
          text: 'دانشمندان را با کشف آن‌ها تطبیق دهید:',
          left: [
            { id: '1', text: 'نیوتن' },
            { id: '2', text: 'انیشتین' },
            { id: '3', text: 'گالیله' },
          ],
          right: [
            { id: 'a', text: 'نسبیت' },
            { id: 'b', text: 'گرانش' },
            { id: 'c', text: 'تلسکوپ' },
          ],
          correct_matches: {
            '1': 'b',
            '2': 'a',
            '3': 'c',
          },
        },
        score: 3,
        difficulty: 'MEDIUM',
        tags: ['دانشمندان', 'تاریخ فیزیک'],
      },
    ],
  });

  console.log(`✅ ${bankQuestions.count} additional questions added to banks`);

  // ===== SRS Cards برای یادگیری هوشمند =====
  await prisma.srsCard.createMany({
    data: [
      {
        userId: students[0].id,
        questionId: (
          await prisma.question.findFirst({
            where: { examId: exam1.id, orderIndex: 0 },
          })
        )!.id,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      {
        userId: students[1].id,
        questionId: (
          await prisma.question.findFirst({
            where: { examId: exam2.id, orderIndex: 0 },
          })
        )!.id,
        easeFactor: 2.6,
        intervalDays: 3,
        repetitions: 2,
        nextReview: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        lastReview: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log(`✅ SRS cards seeded for spaced repetition`);

  // ===== Workflows =====
  await prisma.workflow.createMany({
    data: [
      {
        orgId: org1.id,
        ownerId: orgAdmin1.id,
        name: 'ارسال گواهینامه خودکار',
        trigger: 'exam.passed',
        conditions: [{ field: 'score', operator: '>=', value: 60 }],
        actions: [
          { type: 'issue_certificate', templateId: 'default' },
          { type: 'send_email', template: 'congratulations' },
        ],
        isActive: true,
      },
      {
        orgId: org2.id,
        ownerId: orgAdmin2.id,
        name: 'اعلان ردشدن',
        trigger: 'exam.failed',
        conditions: [{ field: 'score', operator: '<', value: 50 }],
        actions: [
          { type: 'send_email', template: 'retry_encouraged' },
          { type: 'send_sms', message: 'شما می‌توانید مجدداً آزمون دهید' },
        ],
        isActive: true,
      },
    ],
  });

  console.log(`✅ Workflows seeded`);

  console.log('');
  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log('  - 4 Plans (FREE, BASIC, PRO, ENTERPRISE)');
  console.log('  - 3 Organizations');
  console.log('  - 10+ Users (1 admin, 2 org admins, 3 teachers, 6 students)');
  console.log('  - 2 Question Banks');
  console.log('  - 5 Exams (3 published, 1 draft, 1 high-stakes)');
  console.log('  - 30+ Questions (diverse types)');
  console.log('  - 5 Submissions (various statuses)');
  console.log('  - 3 Certificates');
  console.log('  - 2 SRS Cards');
  console.log('  - 2 Workflows');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
