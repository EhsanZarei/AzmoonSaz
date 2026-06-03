'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight, Plus, Trash2, GripVertical, Settings,
  Sparkles, Eye, Send, Save, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { examsApi, questionsApi, aiApi } from '@/lib/api';
import { toPersianNumber } from '@/lib/utils';

// انواع سوال
const QUESTION_TYPES = [
  { value: 'MCQ_SINGLE', label: 'چهارگزینه‌ای', emoji: '🔘' },
  { value: 'MCQ_MULTIPLE', label: 'چندگزینه‌ای', emoji: '☑️' },
  { value: 'TRUE_FALSE', label: 'درست/غلط', emoji: '✅' },
  { value: 'SHORT_ANSWER', label: 'پاسخ کوتاه', emoji: '✏️' },
  { value: 'ESSAY', label: 'تشریحی', emoji: '📝' },
  { value: 'FILL_BLANK', label: 'جای خالی', emoji: '___' },
  { value: 'MATCHING', label: 'جور کردن', emoji: '🔗' },
];

type Question = {
  id: string;
  type: string;
  content: any;
  score: number;
  difficulty: string;
  orderIndex: number;
};

export default function ExamEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const isAiMode = searchParams.get('ai') === 'true';
  const aiPrompt = searchParams.get('prompt') || '';

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // دریافت آزمون
  const { data: exam, isLoading } = useQuery({
    queryKey: ['exam', id],
    queryFn: () => examsApi.get(id).then((r) => r.data),
  });

  // دریافت سوالات
  const { data: questionsData } = useQuery({
    queryKey: ['questions', id],
    queryFn: () => questionsApi.list(id).then((r) => r.data),
  });

  const questions: Question[] = questionsData?.data || questionsData || [];

  // اگر AI mode بود، سوالات رو تولید کن
  useEffect(() => {
    if (isAiMode && aiPrompt && questions.length === 0 && !isAiGenerating) {
      generateWithAi();
    }
  }, [isAiMode, aiPrompt, questions.length]);

  const generateWithAi = async () => {
    setIsAiGenerating(true);
    try {
      const res = await aiApi.generateFromText({
        source_type: 'text',
        content: aiPrompt,
        count: 10,
        difficulty: 'medium',
        question_types: ['MCQ_SINGLE', 'TRUE_FALSE'],
        language: 'fa',
      });

      // اضافه کردن سوالات تولیدشده
      const generatedQuestions = res.data.questions || [];
      for (const q of generatedQuestions) {
        await questionsApi.create(id, {
          type: q.type,
          content: {
            text: q.text,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
          },
          score: 1,
          difficulty: q.difficulty || 'MEDIUM',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['questions', id] });
      toast.success(`${toPersianNumber(generatedQuestions.length)} سوال با AI ساخته شد`);
    } catch (err) {
      toast.error('خطا در تولید سوالات با AI');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // افزودن سوال
  const addQuestionMutation = useMutation({
    mutationFn: (type: string) =>
      questionsApi.create(id, {
        type,
        content: getDefaultContent(type),
        score: 1,
        difficulty: 'MEDIUM',
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['questions', id] });
      setSelectedQuestionId(res.data.id);
      setShowAddMenu(false);
      toast.success('سوال اضافه شد');
    },
  });

  // حذف سوال
  const deleteQuestionMutation = useMutation({
    mutationFn: (qId: string) => questionsApi.delete(id, qId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', id] });
      setSelectedQuestionId(null);
      toast.success('سوال حذف شد');
    },
  });

  // ذخیره سوال
  const updateQuestionMutation = useMutation({
    mutationFn: ({ qId, data }: { qId: string; data: object }) =>
      questionsApi.update(id, qId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', id] });
    },
  });

  // انتشار آزمون
  const publishMutation = useMutation({
    mutationFn: () => examsApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam', id] });
      toast.success('آزمون منتشر شد');
      router.push(`/dashboard/exams/${id}`);
    },
  });

  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-8 overflow-hidden">
      {/* پنل چپ — لیست سوالات */}
      <div className="w-72 bg-white border-l border-border flex flex-col">
        {/* هدر */}
        <div className="p-4 border-b border-border">
          <button
            onClick={() => router.push(`/dashboard/exams/${id}`)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-3"
          >
            <ArrowRight className="w-4 h-4" />
            بازگشت
          </button>
          <h2 className="font-bold truncate">{exam?.title}</h2>
          <p className="text-xs text-gray-400 mt-1">
            {toPersianNumber(questions.length)} سوال
          </p>
        </div>

        {/* لیست سوالات */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isAiGenerating && (
            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl text-sm text-primary">
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
              در حال تولید سوالات با AI...
            </div>
          )}

          {questions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => setSelectedQuestionId(q.id)}
              className={`w-full text-right p-3 rounded-xl border transition-all ${
                selectedQuestionId === q.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                <span className="text-xs text-gray-400 shrink-0">
                  {toPersianNumber(index + 1)}
                </span>
                <span className="text-xs truncate flex-1">
                  {q.content?.text?.slice(0, 40) || 'سوال بدون متن'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 mr-6">
                <span className="text-xs text-gray-400">
                  {QUESTION_TYPES.find((t) => t.value === q.type)?.label}
                </span>
                <span className="text-xs text-gray-400">
                  {toPersianNumber(q.score)} نمره
                </span>
              </div>
            </button>
          ))}

          {questions.length === 0 && !isAiGenerating && (
            <div className="text-center py-8 text-gray-400 text-sm">
              <p>سوالی ندارید</p>
              <p className="mt-1">از دکمه + اضافه کنید</p>
            </div>
          )}
        </div>

        {/* دکمه افزودن سوال */}
        <div className="p-3 border-t border-border">
          <div className="relative">
            <Button
              onClick={() => setShowAddMenu(!showAddMenu)}
              variant="outline"
              className="w-full"
            >
              <Plus className="w-4 h-4 ml-1" />
              افزودن سوال
              {showAddMenu ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            </Button>
            {showAddMenu && (
              <div className="absolute bottom-full mb-2 right-0 left-0 bg-white border border-border rounded-xl shadow-lg py-1 z-10">
                {QUESTION_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => addQuestionMutation.mutate(type.value)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <span>{type.emoji}</span>
                    {type.label}
                  </button>
                ))}
                <div className="border-t border-border my-1" />
                <button
                  onClick={generateWithAi}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-primary/5 text-primary"
                >
                  <Sparkles className="w-4 h-4" />
                  تولید با AI
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* پنل وسط — ویرایشگر سوال */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {selectedQuestion ? (
          <QuestionEditor
            question={selectedQuestion}
            onSave={(data) =>
              updateQuestionMutation.mutate({ qId: selectedQuestion.id, data })
            }
            onDelete={() => {
              if (confirm('سوال حذف شود؟')) {
                deleteQuestionMutation.mutate(selectedQuestion.id);
              }
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">سوالی انتخاب نشده</p>
              <p className="text-sm">از لیست سمت راست یک سوال انتخاب کنید</p>
            </div>
          </div>
        )}
      </div>

      {/* پنل راست — تنظیمات آزمون */}
      <div className="w-64 bg-white border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-bold">تنظیمات آزمون</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <ExamSettings exam={exam} examId={id} />
        </div>
        <div className="p-4 border-t border-border space-y-2">
          <a
            href={`/exam/${id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="w-full" size="sm">
              <Eye className="w-4 h-4 ml-1" />
              پیش‌نمایش
            </Button>
          </a>
          <Button
            onClick={() => publishMutation.mutate()}
            className="w-full"
            size="sm"
            loading={publishMutation.isPending}
            disabled={questions.length === 0}
          >
            <Send className="w-4 h-4 ml-1" />
            انتشار آزمون
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── ویرایشگر سوال ───────────────────────────────────────
function QuestionEditor({
  question,
  onSave,
  onDelete,
}: {
  question: Question;
  onSave: (data: object) => void;
  onDelete: () => void;
}) {
  const [content, setContent] = useState(question.content);
  const [score, setScore] = useState(question.score);
  const [difficulty, setDifficulty] = useState(question.difficulty);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setContent(question.content);
    setScore(question.score);
    setDifficulty(question.difficulty);
    setIsDirty(false);
  }, [question.id]);

  const handleSave = () => {
    onSave({ content, score, difficulty });
    setIsDirty(false);
    toast.success('ذخیره شد');
  };

  const updateContent = (updates: object) => {
    setContent((prev: any) => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  const updateOption = (index: number, text: string) => {
    const options = [...(content.options || [])];
    options[index] = { ...options[index], text };
    updateContent({ options });
  };

  const addOption = () => {
    const options = [...(content.options || [])];
    const id = String.fromCharCode(97 + options.length); // a, b, c, ...
    options.push({ id, text: '' });
    updateContent({ options });
  };

  const removeOption = (index: number) => {
    const options = content.options.filter((_: any, i: number) => i !== index);
    updateContent({ options });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* هدر */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">
          {QUESTION_TYPES.find((t) => t.value === question.type)?.label}
        </span>
        <div className="flex gap-2">
          <Button
            variant="danger"
            size="sm"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty}
          >
            <Save className="w-4 h-4 ml-1" />
            ذخیره
          </Button>
        </div>
      </div>

      {/* متن سوال */}
      <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">متن سوال</label>
          <textarea
            value={content.text || ''}
            onChange={(e) => updateContent({ text: e.target.value })}
            placeholder="متن سوال را بنویسید..."
            rows={3}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* گزینه‌ها برای MCQ */}
        {(question.type === 'MCQ_SINGLE' || question.type === 'MCQ_MULTIPLE') && (
          <div className="space-y-2">
            <label className="text-sm font-medium">گزینه‌ها</label>
            {(content.options || []).map((opt: any, i: number) => (
              <div key={opt.id} className="flex items-center gap-2">
                <button
                  onClick={() => updateContent({ correct_answer: opt.id })}
                  className={`w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${
                    content.correct_answer === opt.id
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300'
                  }`}
                />
                <input
                  value={opt.text}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`گزینه ${String.fromCharCode(1575 + i)}`}
                  className="flex-1 rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => removeOption(i)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {(content.options || []).length < 6 && (
              <button
                onClick={addOption}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                افزودن گزینه
              </button>
            )}
          </div>
        )}

        {/* توضیح پاسخ */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">توضیح پاسخ (اختیاری)</label>
          <textarea
            value={content.explanation || ''}
            onChange={(e) => updateContent({ explanation: e.target.value })}
            placeholder="توضیح پاسخ صحیح..."
            rows={2}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>
      </div>

      {/* تنظیمات سوال */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <h3 className="font-medium mb-4">تنظیمات سوال</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">نمره</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={score}
              onChange={(e) => { setScore(Number(e.target.value)); setIsDirty(true); }}
              className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">سطح دشواری</label>
            <select
              value={difficulty}
              onChange={(e) => { setDifficulty(e.target.value); setIsDirty(true); }}
              className="w-full h-10 px-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="EASY">آسان</option>
              <option value="MEDIUM">متوسط</option>
              <option value="HARD">سخت</option>
              <option value="VERY_HARD">خیلی سخت</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── تنظیمات آزمون ───────────────────────────────────────
function ExamSettings({ exam, examId }: { exam: any; examId: string }) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(exam?.settings || {});

  const updateMutation = useMutation({
    mutationFn: (data: object) => examsApi.update(examId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam', examId] });
      toast.success('تنظیمات ذخیره شد');
    },
  });

  const handleChange = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateMutation.mutate({ settings: newSettings });
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-1.5">
        <label className="font-medium">تایمر (دقیقه)</label>
        <input
          type="number"
          min="0"
          placeholder="بدون محدودیت"
          value={settings.timer ? Math.floor(settings.timer / 60) : ''}
          onChange={(e) => handleChange('timer', e.target.value ? Number(e.target.value) * 60 : null)}
          className="w-full h-9 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="space-y-1.5">
        <label className="font-medium">نمره قبولی (٪)</label>
        <input
          type="number"
          min="0"
          max="100"
          value={settings.passing_score ?? 60}
          onChange={(e) => handleChange('passing_score', Number(e.target.value))}
          className="w-full h-9 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="space-y-1.5">
        <label className="font-medium">نمایش نتیجه</label>
        <select
          value={settings.show_result ?? 'immediately'}
          onChange={(e) => handleChange('show_result', e.target.value)}
          className="w-full h-9 px-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="immediately">بلافاصله</option>
          <option value="after_deadline">پس از پایان مهلت</option>
          <option value="manual">دستی</option>
        </select>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.shuffle_questions ?? false}
          onChange={(e) => handleChange('shuffle_questions', e.target.checked)}
          className="rounded"
        />
        <span>ترتیب تصادفی سوالات</span>
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.shuffle_options ?? false}
          onChange={(e) => handleChange('shuffle_options', e.target.checked)}
          className="rounded"
        />
        <span>ترتیب تصادفی گزینه‌ها</span>
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.allow_back ?? true}
          onChange={(e) => handleChange('allow_back', e.target.checked)}
          className="rounded"
        />
        <span>بازگشت به سوال قبلی</span>
      </label>
    </div>
  );
}

// ─── محتوای پیش‌فرض سوال ─────────────────────────────────
function getDefaultContent(type: string): object {
  switch (type) {
    case 'MCQ_SINGLE':
    case 'MCQ_MULTIPLE':
      return {
        text: '',
        options: [
          { id: 'a', text: '' },
          { id: 'b', text: '' },
          { id: 'c', text: '' },
          { id: 'd', text: '' },
        ],
        correct_answer: 'a',
        explanation: '',
      };
    case 'TRUE_FALSE':
      return { text: '', correct_answer: 'true', explanation: '' };
    case 'SHORT_ANSWER':
      return { text: '', acceptable_answers: [], explanation: '' };
    case 'ESSAY':
      return { text: '', sample_answer: '', word_limit: null };
    case 'FILL_BLANK':
      return { text: '', blanks: [], explanation: '' };
    case 'MATCHING':
      return {
        text: '',
        left_items: [{ id: '1', text: '' }],
        right_items: [{ id: 'a', text: '' }],
        correct_pairs: {},
      };
    default:
      return { text: '', explanation: '' };
  }
}
