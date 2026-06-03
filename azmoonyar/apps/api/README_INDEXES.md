# Database Indexes - Quick Reference

## Quick Start

### Verify Indexes

```bash
npm run db:verify-indexes
```

Expected output: ✅ All database indexes are properly configured!

### Test Performance

```bash
npm run db:test-performance
```

Note: Sequential scans are expected for small tables (< 1000 rows)

---

## What Was Done

**Task**: 0.5.5 - ایجاد ایندکس‌های لازم روی فیلدهای پرجستجو

### Summary

- ✅ **22 new indexes** added to 8 tables
- ✅ **13 composite indexes** for multi-column queries
- ✅ **9 single-column indexes** for searches
- ✅ Migration: `20260602231041_add_search_indexes`
- ✅ All indexes verified and tested

### Tables Modified

1. **organizations** (+1 index) - Name search
2. **exams** (+4 indexes) - Category, status, published date
3. **questions** (+3 indexes) - Ordered questions, type filtering
4. **question_banks** (+3 indexes) - Name search, visibility
5. **submissions** (+4 indexes) - Status, completion, pass/fail
6. **answers** (+2 indexes) - Performance analysis
7. **certificates** (+3 indexes) - Expiration, revocation
8. **srs_cards** (already optimal)

---

## Key Indexes Added

### Critical for Performance

1. **`questions_examId_orderIndex_idx`** - Displays questions in order (most used query)
2. **`exams_status_publishedAt_idx`** - Published exams sorted by date
3. **`submissions_examId_completedAt_idx`** - Leaderboards and results

### Important for UX

4. **`exams_ownerId_status_idx`** - Teacher dashboard
5. **`answers_questionId_isCorrect_idx`** - Question analytics
6. **`certificates_userId_issuedAt_idx`** - User certificate portfolio

---

## Performance Impact

| Query Type | Expected Improvement |
|------------|---------------------|
| Exam listing (filtered) | 70-85% faster |
| Question display (ordered) | 80-95% faster |
| Submission queries | 60-80% faster |
| Search operations | 70-85% faster |
| Analytics queries | 50-70% faster |

**Note**: Benefits are significant only with 1000+ rows per table

---

## Documentation Files

| File | Purpose |
|------|---------|
| `INDEXES_DOCUMENTATION.md` | Complete reference guide (3500+ words) |
| `INDEXES_SUMMARY.md` | Detailed implementation summary |
| `INDEX_PERFORMANCE_NOTES.md` | Performance test results and notes |
| `README_INDEXES.md` | This quick reference |

---

## Scripts Available

| Command | Purpose |
|---------|---------|
| `npm run db:verify-indexes` | Check all 62 indexes exist |
| `npm run db:test-performance` | Test query performance with EXPLAIN |
| `npm run db:migrate` | Apply migrations (includes indexes) |
| `npm run db:studio` | Visual database browser |

---

## Index Naming Convention

Format: `{table}_{column1}_{column2}_idx`

Examples:
- `users_email_idx` - Single column
- `exams_status_publishedAt_idx` - Composite (2 columns)
- `submissions_examId_status_idx` - Composite (2 columns)

---

## Common Queries Optimized

### 1. Published Exams

```sql
SELECT * FROM exams 
WHERE status = 'PUBLISHED' 
ORDER BY "publishedAt" DESC;
-- Uses: exams_status_publishedAt_idx
```

### 2. Questions in Order

```sql
SELECT * FROM questions 
WHERE "examId" = '...' 
ORDER BY "orderIndex";
-- Uses: questions_examId_orderIndex_idx
```

### 3. Exam Results

```sql
SELECT * FROM submissions 
WHERE "examId" = '...' 
  AND status = 'COMPLETED'
ORDER BY score DESC;
-- Uses: submissions_examId_status_idx
```

### 4. Question Performance

```sql
SELECT 
  COUNT(*) FILTER (WHERE "isCorrect") as correct,
  COUNT(*) as total
FROM answers 
WHERE "questionId" = '...';
-- Uses: answers_questionId_isCorrect_idx
```

---

## Monitoring in Production

### Check Index Usage

```sql
SELECT 
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as reads
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Find Slow Queries

```sql
-- Enable pg_stat_statements extension first
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## When to Add More Indexes

Consider adding indexes when:

1. ✅ Query takes > 100ms consistently
2. ✅ EXPLAIN shows Sequential Scan on large table (10K+ rows)
3. ✅ Query is run frequently (> 100 times/minute)
4. ✅ Index size is acceptable (< 20% of table size)

**Don't over-index!** Each index:
- Slows down INSERT/UPDATE/DELETE
- Takes up disk space
- Requires maintenance

---

## Index Types Used

### B-tree (Default)
Used for: `=`, `<`, `>`, `<=`, `>=`, `BETWEEN`, `IN`, `ORDER BY`

Most of our indexes are B-tree (PostgreSQL default)

### GIN (Generalized Inverted Index)
Used for: Array contains, full-text search

Examples:
- `exams_tags_idx` - Array search
- `questions_tags_idx` - Array search

---

## Migration History

| Date | Migration | Indexes Added |
|------|-----------|---------------|
| 2026-06-02 | Initial schema | 40 indexes (basic FK, unique) |
| 2026-06-02 | Search indexes | 22 indexes (performance) |
| **Total** | | **62 indexes** |

---

## Troubleshooting

### Index Not Being Used

**Cause**: Table too small (< 1000 rows)  
**Solution**: Wait for more data. PostgreSQL will use it automatically.

**Cause**: Query doesn't match index columns  
**Solution**: Check EXPLAIN output, adjust query or add specific index

### Slow Queries After Adding Data

**Cause**: Statistics out of date  
**Solution**: Run `ANALYZE` or enable auto-vacuum

```sql
ANALYZE exams;
-- or
VACUUM ANALYZE;
```

### Index Bloat

**Cause**: Many updates/deletes  
**Solution**: Reindex periodically

```sql
REINDEX INDEX exams_status_publishedAt_idx;
-- or
REINDEX TABLE exams;
```

---

## Best Practices

✅ **DO**:
- Let PostgreSQL choose when to use indexes
- Monitor index usage with `pg_stat_user_indexes`
- Run ANALYZE after bulk data changes
- Test queries with EXPLAIN ANALYZE

❌ **DON'T**:
- Force index usage with hints (PostgreSQL has no hints)
- Create indexes on every column
- Disable `enable_seqscan` in production
- Ignore unused indexes (they waste space)

---

## Next Steps

1. ✅ Indexes created and verified
2. ⏳ Launch Beta with real users (Phase 1)
3. 📊 Monitor index usage in production
4. 🔧 Add more indexes based on actual patterns
5. 📈 Optimize further in Phase 2

---

## Resources

- [Full Documentation](./INDEXES_DOCUMENTATION.md)
- [Implementation Summary](./INDEXES_SUMMARY.md)
- [Performance Notes](./INDEX_PERFORMANCE_NOTES.md)
- [PostgreSQL Index Docs](https://www.postgresql.org/docs/current/indexes.html)
- [Prisma Index Docs](https://www.prisma.io/docs/concepts/components/prisma-schema/indexes)

---

**Status**: ✅ Complete  
**Last Updated**: June 2, 2026  
**Maintained By**: Azmoonyar Development Team

Need help? Check the full documentation or run `npm run db:verify-indexes`
