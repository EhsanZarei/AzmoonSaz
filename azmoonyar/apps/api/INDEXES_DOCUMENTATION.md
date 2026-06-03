# Database Indexes Documentation

## Overview

This document describes all database indexes created for the Azmoonyar (آزمونیار) Online Quiz Platform to optimize query performance. Indexes have been strategically placed on frequently searched fields, foreign keys used in joins, and fields commonly used in WHERE clauses and ORDER BY statements.

## Index Strategy

The indexing strategy focuses on:

1. **Title and Name Searches**: Full indexes on text fields that users search frequently
2. **Foreign Key Optimization**: Indexes on foreign key columns used in JOINs
3. **Status Filtering**: Indexes on status enums for filtering active/published records
4. **Date Range Queries**: Indexes on timestamp fields for time-based filtering
5. **Composite Indexes**: Multi-column indexes for common query patterns
6. **Tag and Category Searches**: GIN indexes on array fields for efficient tag searches

## Table: users

### Single-Column Indexes

| Index Name | Column | Purpose |
|------------|--------|---------|
| `users_email_idx` | `email` | Fast user lookup by email for authentication |
| `users_phone_idx` | `phone` | Fast user lookup by phone for OTP authentication |
| `users_orgId_idx` | `orgId` | Filter users by organization |
| `users_status_idx` | `status` | Filter active/suspended users |
| `users_role_idx` | `role` | Filter users by role (TEACHER, STUDENT, etc.) |
| `users_createdAt_idx` | `createdAt` | Sort users by registration date |

### Common Queries Optimized
- Login by email/phone
- List users by organization
- Filter users by role and status
- Recent user registrations

---

## Table: organizations

### Single-Column Indexes

| Index Name | Column | Purpose |
|------------|--------|---------|
| `organizations_slug_idx` | `slug` | Fast organization lookup by slug (URL-friendly ID) |
| `organizations_status_idx` | `status` | Filter active organizations |
| `organizations_createdAt_idx` | `createdAt` | Sort organizations by creation date |
| `organizations_name_idx` | `name` | **NEW** - Search organizations by name |

### Common Queries Optimized
- Organization profile lookup by slug
- List active organizations
- Search organizations by name
- Recent organization registrations

---

## Table: exams

### Single-Column Indexes

| Index Name | Column | Purpose |
|------------|--------|---------|
| `exams_ownerId_idx` | `ownerId` | List exams by owner (teacher) |
| `exams_orgId_idx` | `orgId` | List exams by organization |
| `exams_status_idx` | `status` | Filter exams by status (DRAFT, PUBLISHED, etc.) |
| `exams_title_idx` | `title` | Search exams by title |
| `exams_tags_idx` | `tags` | GIN index for tag searches |
| `exams_publishedAt_idx` | `publishedAt` | Sort published exams by date |
| `exams_expiresAt_idx` | `expiresAt` | Find expiring/expired exams |
| `exams_createdAt_idx` | `createdAt` | Sort exams by creation date |
| `exams_category_idx` | `category` | **NEW** - Filter exams by category |

### Composite Indexes

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `exams_status_publishedAt_idx` | `status`, `publishedAt` | **NEW** - List published exams sorted by date |
| `exams_orgId_status_idx` | `orgId`, `status` | **NEW** - Organization's exams filtered by status |
| `exams_ownerId_status_idx` | `ownerId`, `status` | **NEW** - Owner's exams filtered by status |

### Common Queries Optimized
- List published exams for public access
- Teacher's dashboard showing their exams by status
- Organization's exam library filtered by status
- Search exams by title, tags, or category
- Find exams expiring soon
- Recent exams in a category

---

## Table: questions

### Single-Column Indexes

| Index Name | Column | Purpose |
|------------|--------|---------|
| `questions_examId_idx` | `examId` | List questions in an exam |
| `questions_bankId_idx` | `bankId` | List questions in a question bank |
| `questions_type_idx` | `type` | Filter questions by type (MCQ, Essay, etc.) |
| `questions_tags_idx` | `tags` | GIN index for tag searches |
| `questions_difficulty_idx` | `difficulty` | Filter questions by difficulty level |
| `questions_createdAt_idx` | `createdAt` | Sort questions by creation date |

### Composite Indexes

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `questions_examId_orderIndex_idx` | `examId`, `orderIndex` | **NEW** - Ordered question list in exam (critical for display) |
| `questions_bankId_type_idx` | `bankId`, `type` | **NEW** - Filter question bank by type |
| `questions_type_difficulty_idx` | `type`, `difficulty` | **NEW** - Filter questions by type and difficulty |

### Common Queries Optimized
- Display questions in exam order
- Question bank filtered by type
- Find MCQ questions of medium difficulty
- Search questions by tags
- Question performance analysis

---

## Table: question_banks

### Single-Column Indexes

| Index Name | Column | Purpose |
|------------|--------|---------|
| `question_banks_ownerId_idx` | `ownerId` | List user's question banks |
| `question_banks_orgId_idx` | `orgId` | List organization's question banks |
| `question_banks_visibility_idx` | `visibility` | Filter by public/private |
| `question_banks_createdAt_idx` | `createdAt` | Sort by creation date |
| `question_banks_name_idx` | `name` | **NEW** - Search question banks by name |

### Composite Indexes

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `question_banks_ownerId_visibility_idx` | `ownerId`, `visibility` | **NEW** - Owner's banks filtered by visibility |
| `question_banks_orgId_visibility_idx` | `orgId`, `visibility` | **NEW** - Organization's public/private banks |

### Common Queries Optimized
- User's private question banks
- Organization's shared question banks
- Search question banks by name
- Public question marketplace

---

## Table: submissions

### Single-Column Indexes

| Index Name | Column | Purpose |
|------------|--------|---------|
| `submissions_examId_idx` | `examId` | List submissions for an exam |
| `submissions_userId_idx` | `userId` | List user's submissions |
| `submissions_status_idx` | `status` | Filter by completion status |
| `submissions_startedAt_idx` | `startedAt` | Sort by start time |
| `submissions_completedAt_idx` | `completedAt` | Sort by completion time |
| `submissions_createdAt_idx` | `createdAt` | Sort by creation date |
| `submissions_passed_idx` | `passed` | **NEW** - Filter passed/failed submissions |

### Composite Indexes

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `submissions_examId_status_idx` | `examId`, `status` | **NEW** - Exam submissions by status (in-progress, completed) |
| `submissions_userId_status_idx` | `userId`, `status` | **NEW** - User's submissions by status |
| `submissions_examId_completedAt_idx` | `examId`, `completedAt` | **NEW** - Completed submissions sorted by date |

### Common Queries Optimized
- Exam results dashboard
- User's exam history
- In-progress submissions
- Pass rate calculations
- Submissions within date range
- Leaderboard generation

---

## Table: answers

### Single-Column Indexes

| Index Name | Column | Purpose |
|------------|--------|---------|
| `answers_submissionId_idx` | `submissionId` | List answers in a submission |
| `answers_questionId_idx` | `questionId` | List answers for a question |
| `answers_isCorrect_idx` | `isCorrect` | Filter correct/incorrect answers |
| `answers_gradedById_idx` | `gradedById` | List answers graded by a teacher |

### Composite Indexes

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `answers_submissionId_questionId_idx` | `submissionId`, `questionId` | **NEW** - Fast lookup of specific answer |
| `answers_questionId_isCorrect_idx` | `questionId`, `isCorrect` | **NEW** - Question performance analysis (% correct) |

### Common Queries Optimized
- Display submission results
- Question difficulty analysis
- Item analysis (discrimination index)
- Manual grading queue
- Answer statistics per question

---

## Table: certificates

### Single-Column Indexes

| Index Name | Column | Purpose |
|------------|--------|---------|
| `certificates_userId_idx` | `userId` | List user's certificates |
| `certificates_uniqueCode_idx` | `uniqueCode` | Verify certificate by code (UNIQUE) |
| `certificates_examId_idx` | `examId` | List certificates for an exam |
| `certificates_issuedAt_idx` | `issuedAt` | Sort by issue date |
| `certificates_expiresAt_idx` | `expiresAt` | **NEW** - Find expiring certificates |
| `certificates_revokedAt_idx` | `revokedAt` | **NEW** - Filter revoked certificates |

### Composite Indexes

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `certificates_userId_issuedAt_idx` | `userId`, `issuedAt` | **NEW** - User's certificates sorted by date |

### Common Queries Optimized
- User certificate portfolio
- Certificate verification
- Revoked certificates list
- Certificates expiring soon
- Certificate issuance reports

---

## Table: srs_cards

### Composite Indexes

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `srs_cards_userId_nextReview_idx` | `userId`, `nextReview` | Spaced repetition: cards due for review |
| `srs_cards_userId_questionId_key` | `userId`, `questionId` | UNIQUE constraint: one card per user-question |

### Common Queries Optimized
- Daily review queue
- Spaced repetition scheduler
- User's learning progress

---

## Performance Considerations

### When Indexes Help

1. **SELECT with WHERE clause**: Indexes speed up filtering
   ```sql
   SELECT * FROM exams WHERE status = 'PUBLISHED' AND orgId = '...';
   -- Uses: exams_orgId_status_idx
   ```

2. **JOIN operations**: Foreign key indexes improve join performance
   ```sql
   SELECT e.*, u.name FROM exams e JOIN users u ON e.ownerId = u.id;
   -- Uses: exams_ownerId_idx
   ```

3. **ORDER BY**: Indexes avoid sorting
   ```sql
   SELECT * FROM submissions WHERE examId = '...' ORDER BY completedAt DESC;
   -- Uses: submissions_examId_completedAt_idx
   ```

4. **Aggregations**: Indexes speed up COUNT, MIN, MAX
   ```sql
   SELECT COUNT(*) FROM submissions WHERE examId = '...' AND passed = true;
   -- Uses: submissions_examId_status_idx + submissions_passed_idx
   ```

### When Indexes Don't Help

1. **Full table scans**: No WHERE clause
2. **OR conditions**: Multiple separate indexes, may not be used efficiently
3. **LIKE with leading wildcard**: `LIKE '%term'` cannot use index
4. **Functions on indexed column**: `WHERE LOWER(title) = 'test'` won't use index

### Index Maintenance

- **Automatic**: PostgreSQL automatically maintains indexes
- **VACUUM**: Run periodically to clean up dead tuples
- **REINDEX**: Rebuild corrupted indexes (rarely needed)
- **Monitoring**: Use `pg_stat_user_indexes` to check index usage

---

## Verification Script

A verification script is available to check all indexes are created correctly:

```bash
npm run verify:indexes
# or
node scripts/test-indexes.ts
```

This script queries `pg_indexes` to ensure all expected indexes exist.

---

## Migration History

| Date | Migration | Description |
|------|-----------|-------------|
| 2026-06-02 | `20260602080459_azmoonsaz` | Initial schema with basic indexes |
| 2026-06-02 | `20260602231041_add_search_indexes` | Added comprehensive search and composite indexes |

---

## Next Steps

1. **Monitor Query Performance**: Use PostgreSQL's `pg_stat_statements` extension
2. **Analyze Slow Queries**: `EXPLAIN ANALYZE` on slow queries
3. **Add Indexes as Needed**: Based on production query patterns
4. **Full-Text Search**: Consider adding PostgreSQL full-text search for exam/question titles
5. **Partial Indexes**: For specific query patterns (e.g., only active users)

---

## References

- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Prisma Indexes Documentation](https://www.prisma.io/docs/concepts/components/prisma-schema/indexes)
- [Database Performance Best Practices](https://www.postgresql.org/docs/current/performance-tips.html)

---

**Last Updated**: June 2, 2026  
**Version**: 1.0  
**Maintained By**: Azmoonyar Development Team
