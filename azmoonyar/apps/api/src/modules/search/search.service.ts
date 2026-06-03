import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private esUrl: string;
  private enabled: boolean;

  constructor(private config: ConfigService) {
    this.esUrl = config.get('ELASTICSEARCH_URL', 'http://localhost:9200');
    this.enabled = config.get('ELASTICSEARCH_ENABLED', 'false') === 'true';
  }

  async onModuleInit() {
    if (!this.enabled) return;
    try {
      await axios.get(`${this.esUrl}/_cluster/health`);
      this.logger.log('Elasticsearch connected');
    } catch {
      this.logger.warn('Elasticsearch not available — search disabled');
      this.enabled = false;
    }
  }

  // ─── ایندکس کردن سوال ───────────────────────────────────
  async indexQuestion(question: {
    id: string;
    examId?: string;
    bankId?: string;
    orgId?: string;
    ownerId?: string;
    type: string;
    difficulty: string;
    tags: string[];
    score: number;
    content: { text?: string; options?: any[]; explanation?: string };
    createdAt: Date;
  }): Promise<void> {
    if (!this.enabled) return;
    try {
      const doc = {
        id: question.id,
        examId: question.examId,
        bankId: question.bankId,
        orgId: question.orgId,
        ownerId: question.ownerId,
        type: question.type,
        difficulty: question.difficulty,
        tags: question.tags,
        score: question.score,
        text: question.content.text || '',
        options_text: (question.content.options || []).map((o: any) => o.text).join(' '),
        explanation: question.content.explanation || '',
        createdAt: question.createdAt,
      };
      await axios.put(`${this.esUrl}/questions/_doc/${question.id}`, doc);
    } catch (err) {
      this.logger.warn(`Failed to index question ${question.id}: ${err.message}`);
    }
  }

  // ─── جستجوی سوالات ──────────────────────────────────────
  async searchQuestions(params: {
    query: string;
    orgId?: string;
    type?: string;
    difficulty?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }): Promise<{ hits: any[]; total: number }> {
    if (!this.enabled) return { hits: [], total: 0 };

    const { query, orgId, type, difficulty, tags, page = 1, limit = 20 } = params;

    const must: any[] = [];
    const filter: any[] = [];

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['text^3', 'options_text', 'explanation'],
          analyzer: 'persian_search_analyzer',
          fuzziness: 'AUTO',
        },
      });
    }

    if (orgId) filter.push({ term: { orgId } });
    if (type) filter.push({ term: { type } });
    if (difficulty) filter.push({ term: { difficulty } });
    if (tags?.length) filter.push({ terms: { tags } });

    try {
      const res = await axios.post(`${this.esUrl}/questions/_search`, {
        from: (page - 1) * limit,
        size: limit,
        query: {
          bool: {
            must: must.length ? must : [{ match_all: {} }],
            filter,
          },
        },
        sort: [{ _score: 'desc' }, { createdAt: 'desc' }],
      });

      return {
        hits: res.data.hits.hits.map((h: any) => ({ id: h._id, ...h._source })),
        total: res.data.hits.total.value,
      };
    } catch (err) {
      this.logger.warn(`Search failed: ${err.message}`);
      return { hits: [], total: 0 };
    }
  }

  // ─── حذف سوال از ایندکس ─────────────────────────────────
  async deleteQuestion(id: string): Promise<void> {
    if (!this.enabled) return;
    try {
      await axios.delete(`${this.esUrl}/questions/_doc/${id}`);
    } catch (err) {
      this.logger.warn(`Failed to delete question from index: ${err.message}`);
    }
  }

  // ─── ایندکس کردن آزمون ──────────────────────────────────
  async indexExam(exam: {
    id: string;
    ownerId: string;
    orgId?: string;
    status: string;
    title: string;
    description?: string;
    category?: string;
    tags: string[];
    language: string;
    createdAt: Date;
    publishedAt?: Date;
  }): Promise<void> {
    if (!this.enabled) return;
    try {
      await axios.put(`${this.esUrl}/exams/_doc/${exam.id}`, exam);
    } catch (err) {
      this.logger.warn(`Failed to index exam ${exam.id}: ${err.message}`);
    }
  }
}
