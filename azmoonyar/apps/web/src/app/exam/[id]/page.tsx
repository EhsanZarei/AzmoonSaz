'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { submissionsApi } from '@/lib/api';
import { formatTime, toPersianNumber } from '@/lib/utils';
import { Clock, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';

type Question = {
  id: string;
  type: string;
  content: any;
  score: number;
  time_limit?: number;
};

type Answer = {
  value: any;
  confidence?: 'high' | 'medium' | 'low';
  timeSpent: number;
};

export default function ExamPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [examInfo, setExamInfo] = useState<any>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  // شروع آزمون
  const startExam = async () => {
    try {
      const res = await submissionsApi.start(id);
      const data = res.data;
      setSubmissionId(data.submission_id);
      setQuestions(data.questions);
      if (data.timer) setTimeLeft(data.timer);
      setIsStarted(true);
      setQuestionStartTime(Date.now());

      // ذخیره در localStorage برای offline mode
      localStorage.setItem(`exam_${data.submission_id}`, JSON.stringify({ answers: {} }));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'خطا در شروع آزمون');
    }
  };

  // تایمر
  useEffect(() => {
    if (!isStarted || timeLeft === null) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 0) {
          clearInterval(timerRef.current);
          handleComplete();
          return 0;
        }
        if (t === 300) toast.warning('۵ دقیقه تا پایان آزمون');
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isStarted]);

  // ذخیره پاسخ
  const saveAnswer = useCallback(
    async (questionId: string, value: any, confidence?: 'high' | 'medium' | 'low') => {
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
      const answer: Answer = { value, confidence, timeSpent };
      setAnswers((prev) => ({ ...prev, [questionId]: answer }));

      // ذخیره در localStorage
      if (submissionId) {
        const stored = JSON.parse(localStorage.getItem(`exam_${submissionId}`) || '{}');
        stored.answers = { ...stored.answers, [questionId]: answer };
        localStorage.setItem(`exam_${submissionId}`, JSON.stringify(stored));
      }

      // ارسال به سرور
      try {
        if (submissionId) {
          await submissionsApi.saveAnswer(submissionId, questionId, {
            response: { value, confidence_level: confidence },
            timeSpent,
          });
        }
      } catch {
        // در صورت خطا، پاسخ در localStorage ذخیره شده
      }
    },
    [submissionId, questionStartTime],
  );

  const goToNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setQuestionStartTime(Date.now());
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handleComplete = async () => {
    if (!submissionId) return;
    try {
      const res = await submissionsApi.complete(submissionId);
      setResult(res.data);
      setIsCompleted(true);
      localStorage.removeItem(`exam_${submissionId}`);
    } catch (err: any) {
      toast.error('خطا در ثبت نهایی آزمون');
    }
  };

  // صفحه نتیجه
  if (isCompleted && result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${result.passed ? 'bg-green-100' : 'bg-red-100'}`}>
            <span className="text-4xl">{result.passed ? '🎉' : '😔'}</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {result.passed ? 'تبریک! قبول شدید' : 'متأسفانه قبول نشدید'}
          </h2>
          <p className="text-5xl font-bold text-primary my-6">
            {toPersianNumber(Math.round(result.percentage))}٪
          </p>
          <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-500">نمره</p>
              <p className="font-bold">{toPersianNumber(Math.round(result.score ?? 0))}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-500">وضعیت</p>
              <p className={`font-bold ${result.passed ? 'text-green-600' : 'text-red-500'}`}>
                {result.passed ? 'قبول' : 'رد'}
              </p>
            </div>
          </div>
          <Button onClick={() => router.push('/')} className="w-full">
            بازگشت به خانه
          </Button>
        </div>
      </div>
    );
  }

  // صفحه شروع
  if (!isStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">آ</span>
          </div>
          <h1 className="text-xl font-bold mb-2">آماده شروع آزمون هستید؟</h1>
          <p className="text-gray-500 text-sm mb-8">
            پس از شروع، تایمر آزمون فعال می‌شود
          </p>
          <Button onClick={startExam} size="lg" className="w-full">
            شروع آزمون
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion?.id];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* هدر */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            سوال {toPersianNumber(currentIndex + 1)} از {toPersianNumber(questions.length)}
          </span>
          {timeLeft !== null && (
            <div className={`flex items-center gap-1.5 font-mono font-bold ${timeLeft < 300 ? 'text-red-500' : 'text-gray-700'}`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
        {/* نوار پیشرفت */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* محتوا */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            answer={currentAnswer}
            onAnswer={(value, confidence) => saveAnswer(currentQuestion.id, value, confidence)}
          />
        )}
      </main>

      {/* ناوبری */}
      <footer className="bg-white border-t border-border sticky bottom-0">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goToPrev}
            disabled={currentIndex === 0}
          >
            <ChevronRight className="w-4 h-4 ml-1" />
            قبلی
          </Button>

          <div className="flex gap-1">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrentIndex(i); setQuestionStartTime(Date.now()); }}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                  i === currentIndex
                    ? 'bg-primary text-white'
                    : answers[questions[i]?.id]
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {toPersianNumber(i + 1)}
              </button>
            ))}
          </div>

          {currentIndex === questions.length - 1 ? (
            <Button onClick={handleComplete}>
              <CheckCircle className="w-4 h-4 ml-1" />
              پایان آزمون
            </Button>
          ) : (
            <Button onClick={goToNext}>
              بعدی
              <ChevronLeft className="w-4 h-4 mr-1" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

function QuestionCard({
  question,
  answer,
  onAnswer,
}: {
  question: Question;
  answer?: Answer;
  onAnswer: (value: any, confidence?: 'high' | 'medium' | 'low') => void;
}) {
  const { content, type } = question;

  return (
    <div className="bg-white rounded-2xl border border-border p-6 space-y-6">
      <p className="text-lg font-medium leading-relaxed">{content.text}</p>

      {/* MCQ */}
      {(type === 'MCQ_SINGLE' || type === 'TRUE_FALSE') && (
        <div className="space-y-2">
          {(type === 'TRUE_FALSE'
            ? [{ id: 'true', text: 'درست' }, { id: 'false', text: 'غلط' }]
            : content.options ?? []
          ).map((opt: any) => (
            <button
              key={opt.id}
              onClick={() => onAnswer(opt.id)}
              className={`w-full text-right px-4 py-3 rounded-xl border-2 transition-colors ${
                answer?.value === opt.id
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {opt.text}
            </button>
          ))}
        </div>
      )}

      {/* Short Answer */}
      {type === 'SHORT_ANSWER' && (
        <input
          type="text"
          placeholder="پاسخ خود را بنویسید..."
          value={answer?.value ?? ''}
          onChange={(e) => onAnswer(e.target.value)}
          className="w-full rounded-xl border border-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      )}

      {/* Essay */}
      {type === 'ESSAY' && (
        <textarea
          placeholder="پاسخ تشریحی خود را بنویسید..."
          rows={6}
          value={answer?.value ?? ''}
          onChange={(e) => onAnswer(e.target.value)}
          className="w-full rounded-xl border border-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      )}

      {/* Confidence Mode */}
      {answer?.value !== undefined && (
        <div className="border-t border-border pt-4">
          <p className="text-sm text-gray-500 mb-3">چقدر به پاسخ خود مطمئنید؟</p>
          <div className="flex gap-2">
            {[
              { value: 'high', label: 'خیلی مطمئنم', color: 'bg-green-100 text-green-700 border-green-200' },
              { value: 'medium', label: 'نسبتاً مطمئنم', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
              { value: 'low', label: 'حدس می‌زنم', color: 'bg-red-100 text-red-700 border-red-200' },
            ].map((c) => (
              <button
                key={c.value}
                onClick={() => onAnswer(answer.value, c.value as any)}
                className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${
                  answer.confidence === c.value
                    ? `${c.color} border-2`
                    : 'border-border hover:border-gray-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
