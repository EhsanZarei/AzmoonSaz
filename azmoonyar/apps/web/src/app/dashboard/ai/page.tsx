'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send, Zap, Bot, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { aiApi } from '@/lib/api';
import { v4 as uuidv4 } from 'uuid';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const QUICK_SUGGESTIONS = [
  'یه آزمون ۱۰ سوالی از ریاضی پایه نهم بساز',
  'یه آزمون ۱۵ سوالی از تاریخ انقلاب اسلامی بساز',
  'یه آزمون زبان انگلیسی سطح متوسط بساز',
  'یه آزمون برنامه‌نویسی پایتون مقدماتی بساز',
];

export default function AiPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'سلام! من دستیار هوش مصنوعی آزمون‌یار هستم. می‌تونم برات آزمون بسازم، سوال تولید کنم یا تنظیمات آزمون رو تغییر بدم. چطور می‌تونم کمک کنم؟',
    },
  ]);
  const [input, setInput] = useState('');
  const [sessionId] = useState(() => uuidv4());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      aiApi.chat({
        message,
        sessionId,
        history: messages,
      }).then((r) => r.data),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply },
      ]);
    },
    onError: () => {
      toast.error('خطا در ارتباط با هوش مصنوعی');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'متأسفم، مشکلی پیش آمد. لطفاً دوباره امتحان کنید.' },
      ]);
    },
  });

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMessage = text.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    chatMutation.mutate(userMessage);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* هدر */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">دستیار هوش مصنوعی</h1>
          <p className="text-sm text-gray-500">آزمون بساز، سوال تولید کن، تنظیمات تغییر بده</p>
        </div>
      </div>

      {/* پیشنهادهای سریع */}
      {messages.length === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {QUICK_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-right text-sm bg-white border border-border rounded-xl px-4 py-3 hover:border-primary hover:text-primary transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* پیام‌ها */}
      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-border p-4 space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-primary text-white' : 'bg-gray-100'}`}>
              {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'assistant'
                  ? 'bg-gray-50 text-gray-800'
                  : 'bg-primary text-white'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ورودی */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
          placeholder="پیام خود را بنویسید..."
          className="flex-1 rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={chatMutation.isPending}
        />
        <Button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || chatMutation.isPending}
          size="icon"
          className="h-12 w-12"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
