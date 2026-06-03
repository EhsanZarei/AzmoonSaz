import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Index {
  tablename: string;
  indexname: string;
  indexdef: string;
}

const EXPECTED_INDEXES = {
  users: [
    'users_email_idx',
    'users_phone_idx',
    'users_orgId_idx',
    'users_status_idx',
    'users_role_idx',
    'users_createdAt_idx',
  ],
  organizations: [
    'organizations_slug_idx',
    'organizations_status_idx',
    'organizations_createdAt_idx',
    'organizations_name_idx',
  ],
  exams: [
    'exams_ownerId_idx',
    'exams_orgId_idx',
    'exams_status_idx',
    'exams_title_idx',
    'exams_tags_idx',
    'exams_publishedAt_idx',
    'exams_expiresAt_idx',
    'exams_createdAt_idx',
    'exams_category_idx',
    'exams_status_publishedAt_idx',
    'exams_orgId_status_idx',
    'exams_ownerId_status_idx',
  ],
  questions: [
    'questions_examId_idx',
    'questions_bankId_idx',
    'questions_type_idx',
    'questions_tags_idx',
    'questions_difficulty_idx',
    'questions_createdAt_idx',
    'questions_examId_orderIndex_idx',
    'questions_bankId_type_idx',
    'questions_type_difficulty_idx',
  ],
  question_banks: [
    'question_banks_ownerId_idx',
    'question_banks_orgId_idx',
    'question_banks_visibility_idx',
    'question_banks_createdAt_idx',
    'question_banks_name_idx',
    'question_banks_ownerId_visibility_idx',
    'question_banks_orgId_visibility_idx',
  ],
  submissions: [
    'submissions_examId_idx',
    'submissions_userId_idx',
    'submissions_status_idx',
    'submissions_startedAt_idx',
    'submissions_completedAt_idx',
    'submissions_createdAt_idx',
    'submissions_examId_status_idx',
    'submissions_userId_status_idx',
    'submissions_examId_completedAt_idx',
    'submissions_passed_idx',
  ],
  answers: [
    'answers_submissionId_idx',
    'answers_questionId_idx',
    'answers_isCorrect_idx',
    'answers_gradedById_idx',
    'answers_submissionId_questionId_idx',
    'answers_questionId_isCorrect_idx',
  ],
  certificates: [
    'certificates_userId_idx',
    'certificates_uniqueCode_idx',
    'certificates_examId_idx',
    'certificates_issuedAt_idx',
    'certificates_expiresAt_idx',
    'certificates_revokedAt_idx',
    'certificates_userId_issuedAt_idx',
  ],
  srs_cards: ['srs_cards_userId_nextReview_idx'],
};

async function testIndexes() {
  console.log('🔍 Verifying Database Indexes...\n');

  try {
    // Query all indexes from the database
    const indexes = await prisma.$queryRaw<Index[]>`
      SELECT 
        tablename, 
        indexname, 
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN (
          'users', 'organizations', 'exams', 'questions', 
          'question_banks', 'submissions', 'answers', 
          'certificates', 'srs_cards'
        )
      ORDER BY tablename, indexname;
    `;

    let totalExpected = 0;
    let totalFound = 0;
    let missingIndexes = 0;

    // Check each table's indexes
    for (const [tableName, expectedIndexNames] of Object.entries(
      EXPECTED_INDEXES,
    )) {
      totalExpected += expectedIndexNames.length;

      const tableIndexes = indexes.filter((idx) => idx.tablename === tableName);

      console.log(`\n📊 Table: ${tableName}`);
      console.log(`   Expected: ${expectedIndexNames.length} indexes`);
      console.log(`   Found: ${tableIndexes.length} indexes`);

      // Check for missing indexes
      const existingIndexNames = tableIndexes.map((idx) => idx.indexname);
      const missing = expectedIndexNames.filter(
        (name) => !existingIndexNames.includes(name),
      );

      if (missing.length > 0) {
        console.log(`   ❌ Missing indexes:`);
        missing.forEach((name) => console.log(`      - ${name}`));
        missingIndexes += missing.length;
      } else {
        console.log(`   ✅ All expected indexes found`);
        totalFound += expectedIndexNames.length;
      }

      // Show index definitions
      if (process.env.VERBOSE === 'true') {
        console.log(`   Indexes:`);
        tableIndexes.forEach((idx) => {
          const isExpected = expectedIndexNames.includes(idx.indexname);
          const symbol = isExpected ? '✓' : '⚠';
          console.log(`      ${symbol} ${idx.indexname}`);
          if (process.env.SHOW_DEF === 'true') {
            console.log(`        ${idx.indexdef}`);
          }
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 Summary:');
    console.log(`   Total expected indexes: ${totalExpected}`);
    console.log(`   Total found: ${totalFound}`);
    console.log(`   Missing: ${missingIndexes}`);

    if (missingIndexes === 0) {
      console.log('\n✅ All database indexes are properly configured!');
      process.exit(0);
    } else {
      console.log(
        `\n⚠️  ${missingIndexes} indexes are missing. Run 'npx prisma migrate dev' to create them.`,
      );
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error checking indexes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testIndexes();
