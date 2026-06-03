#!/bin/bash
# ===================================================
# اسکریپت راه‌اندازی Elasticsearch با mapping فارسی
# ===================================================
set -e

ES_URL="${ELASTICSEARCH_URL:-http://localhost:9200}"

echo "🔍 راه‌اندازی Elasticsearch..."
echo "URL: $ES_URL"

# انتظار برای آماده شدن Elasticsearch
echo "⏳ انتظار برای Elasticsearch..."
until curl -s "$ES_URL/_cluster/health" > /dev/null 2>&1; do
  sleep 2
done
echo "✅ Elasticsearch آماده است"

# ─── ایجاد index template برای سوالات ───────────────────────
echo "📋 ایجاد index: questions..."
curl -s -X PUT "$ES_URL/questions" \
  -H 'Content-Type: application/json' \
  -d '{
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0,
      "analysis": {
        "analyzer": {
          "persian_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": [
              "lowercase",
              "persian_normalization",
              "arabic_normalization",
              "stop"
            ]
          },
          "persian_search_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": [
              "lowercase",
              "persian_normalization",
              "arabic_normalization"
            ]
          }
        },
        "filter": {
          "persian_normalization": {
            "type": "persian_normalization"
          },
          "arabic_normalization": {
            "type": "arabic_normalization"
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "id": { "type": "keyword" },
        "examId": { "type": "keyword" },
        "bankId": { "type": "keyword" },
        "orgId": { "type": "keyword" },
        "ownerId": { "type": "keyword" },
        "type": { "type": "keyword" },
        "difficulty": { "type": "keyword" },
        "tags": { "type": "keyword" },
        "score": { "type": "float" },
        "text": {
          "type": "text",
          "analyzer": "persian_analyzer",
          "search_analyzer": "persian_search_analyzer",
          "fields": {
            "keyword": { "type": "keyword", "ignore_above": 256 }
          }
        },
        "options_text": {
          "type": "text",
          "analyzer": "persian_analyzer",
          "search_analyzer": "persian_search_analyzer"
        },
        "explanation": {
          "type": "text",
          "analyzer": "persian_analyzer",
          "search_analyzer": "persian_search_analyzer"
        },
        "createdAt": { "type": "date" },
        "updatedAt": { "type": "date" }
      }
    }
  }' | python3 -m json.tool 2>/dev/null || echo "(JSON parse skipped)"

echo "  ✅ index questions ایجاد شد"

# ─── ایجاد index برای آزمون‌ها ──────────────────────────────
echo "📋 ایجاد index: exams..."
curl -s -X PUT "$ES_URL/exams" \
  -H 'Content-Type: application/json' \
  -d '{
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0,
      "analysis": {
        "analyzer": {
          "persian_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "persian_normalization", "arabic_normalization"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "id": { "type": "keyword" },
        "ownerId": { "type": "keyword" },
        "orgId": { "type": "keyword" },
        "status": { "type": "keyword" },
        "category": { "type": "keyword" },
        "tags": { "type": "keyword" },
        "language": { "type": "keyword" },
        "title": {
          "type": "text",
          "analyzer": "persian_analyzer",
          "fields": {
            "keyword": { "type": "keyword", "ignore_above": 256 }
          }
        },
        "description": {
          "type": "text",
          "analyzer": "persian_analyzer"
        },
        "createdAt": { "type": "date" },
        "publishedAt": { "type": "date" }
      }
    }
  }' | python3 -m json.tool 2>/dev/null || echo "(JSON parse skipped)"

echo "  ✅ index exams ایجاد شد"

echo ""
echo "✅ Elasticsearch با موفقیت راه‌اندازی شد!"
curl -s "$ES_URL/_cat/indices?v"
