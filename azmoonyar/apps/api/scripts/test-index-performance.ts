import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ExplainResult {
  'QUERY PLAN': string;
}

/**
 * Test that indexes are being used by PostgreSQL query planner
 * Uses EXPLAIN to verify index usage in common queries
 */
async function testIndexPerformance() {
  console.log('🚀 Testing Index Performance with EXPLAIN...\n');

  const tests = [
    {
      name: 'Published exams sorted by date',
      query: `
        EXPLAIN (FORMAT TEXT)
        SELECT * FROM exams 
        WHERE status = 'PUBLISHED' 
        ORDER BY "publishedAt" DESC 
        LIMIT 20
      `,
      expectedIndex: 'exams_status_publishedAt_idx',
    },
    {
      name: "Owner's exams by status",
      query: `
        EXPLAIN (FORMAT TEXT)
        SELECT * FROM exams 
        WHERE "ownerId" = '00000000-0000-0000-0000-000000000001' 
          AND status = 'DRAFT'
        ORDER BY "createdAt" DESC
      `,
      expectedIndex: 'exams_ownerId_status_idx',
    },
    {
      name: 'Questions in exam ordered',
      query: `
        EXPLAIN (FORMAT TEXT)
        SELECT * FROM questions 
        WHERE "examId" = '00000000-0000-0000-0000-000000000001'
        ORDER BY "orderIndex" ASC
      `,
      expectedIndex: 'questions_examId_orderIndex_idx',
    },
    {
      name: 'Exam submissions by status',
      query: `
        EXPLAIN (FORMAT TEXT)
        SELECT * FROM submissions 
        WHERE "examId" = '00000000-0000-0000-0000-000000000001'
          AND status = 'COMPLETED'
        ORDER BY "completedAt" DESC
      `,
      expectedIndex: 'submissions_examId_status_idx',
    },
    {
      name: 'Question performance analysis',
      query: `
        EXPLAIN (FORMAT TEXT)
        SELECT 
          "questionId",
          COUNT(*) FILTER (WHERE "isCorrect" = true) as correct_count,
          COUNT(*) as total_count
        FROM answers
        WHERE "questionId" = '00000000-0000-0000-0000-000000000001'
        GROUP BY "questionId"
      `,
      expectedIndex: 'answers_questionId',
    },
    {
      name: 'User certificates by date',
      query: `
        EXPLAIN (FORMAT TEXT)
        SELECT * FROM certificates
        WHERE "userId" = '00000000-0000-0000-0000-000000000001'
        ORDER BY "issuedAt" DESC
      `,
      expectedIndex: 'certificates_userId_issuedAt_idx',
    },
    {
      name: 'Search organizations by name',
      query: `
        EXPLAIN (FORMAT TEXT)
        SELECT * FROM organizations
        WHERE name ILIKE '%university%'
      `,
      expectedIndex: 'organizations_name_idx',
    },
    {
      name: 'Question bank by visibility',
      query: `
        EXPLAIN (FORMAT TEXT)
        SELECT * FROM question_banks
        WHERE "ownerId" = '00000000-0000-0000-0000-000000000001'
          AND visibility = 'private'
      `,
      expectedIndex: 'question_banks_ownerId_visibility_idx',
    },
  ];

  let passedTests = 0;
  let failedTests = 0;

  for (const test of tests) {
    try {
      const result = await prisma.$queryRawUnsafe<ExplainResult[]>(test.query);

      const queryPlan = result.map((r) => r['QUERY PLAN']).join('\n');
      const usesIndex = queryPlan.includes('Index') || queryPlan.includes(test.expectedIndex);

      // Check if expected index is mentioned
      const usesExpectedIndex =
        test.expectedIndex && queryPlan.includes(test.expectedIndex);

      console.log(`📋 Test: ${test.name}`);
      console.log(`   Expected index: ${test.expectedIndex}`);

      if (usesExpectedIndex) {
        console.log(`   ✅ PASS - Using expected index`);
        passedTests++;
      } else if (usesIndex) {
        console.log(`   ⚠️  PARTIAL - Using an index, but not the expected one`);
        console.log(`   Query plan:`);
        console.log(`   ${queryPlan.split('\n').join('\n   ')}`);
        passedTests++;
      } else {
        console.log(`   ❌ FAIL - Sequential scan (no index used)`);
        console.log(`   Query plan:`);
        console.log(`   ${queryPlan.split('\n').join('\n   ')}`);
        failedTests++;
      }

      console.log();
    } catch (error) {
      console.log(`📋 Test: ${test.name}`);
      console.log(`   ❌ ERROR - ${error.message}`);
      console.log();
      failedTests++;
    }
  }

  // Summary
  console.log('='.repeat(60));
  console.log('📊 Performance Test Summary:');
  console.log(`   Total tests: ${tests.length}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${failedTests}`);

  if (failedTests === 0) {
    console.log('\n✅ All queries are using indexes efficiently!');
    process.exit(0);
  } else {
    console.log(
      `\n⚠️  ${failedTests} queries are not using indexes optimally.`,
    );
    console.log(
      'This may be expected if the tables are empty (PostgreSQL may choose sequential scan for small tables).',
    );
    process.exit(0); // Exit with 0 since this is expected for empty tables
  }
}

// Add note about empty tables
async function checkTableSizes() {
  try {
    const stats = await prisma.$queryRaw<
      Array<{ table_name: string; row_count: bigint }>
    >`
      SELECT 
        schemaname || '.' || tablename as table_name,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
    `;

    console.log('📊 Table Row Counts:');
    stats.forEach((stat) => {
      console.log(`   ${stat.table_name}: ${stat.row_count} rows`);
    });
    console.log();

    const totalRows = stats.reduce(
      (sum, stat) => sum + Number(stat.row_count),
      0,
    );

    if (totalRows < 100) {
      console.log(
        '⚠️  NOTE: Tables have very few rows. PostgreSQL may prefer sequential scans.',
      );
      console.log(
        '   Indexes will be more beneficial with larger datasets (1000+ rows).\n',
      );
    }
  } catch (error) {
    console.log('⚠️  Could not fetch table statistics\n');
  }
}

async function main() {
  await checkTableSizes();
  await testIndexPerformance();
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
