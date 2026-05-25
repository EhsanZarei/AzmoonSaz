import { Injectable } from '@nestjs/common';

@Injectable()
export class ScoringService {
  // نمره‌دهی خودکار
  autoGrade(question: any, response: any): { score: number; isCorrect: boolean | null } {
    const content = question.content;
    const type = question.type;

    switch (type) {
      case 'MCQ_SINGLE':
      case 'TRUE_FALSE':
      case 'YES_NO':
        return this.gradeSingleChoice(question, response);

      case 'MCQ_MULTIPLE':
        return this.gradeMultipleChoice(question, response);

      case 'SHORT_ANSWER':
        return this.gradeShortAnswer(question, response);

      case 'FILL_BLANK':
        return this.gradeFillBlank(question, response);

      case 'MATCHING':
        return this.gradeMatching(question, response);

      case 'ORDERING':
        return this.gradeOrdering(question, response);

      case 'ESSAY':
      case 'FILE_UPLOAD':
        // نمره‌دهی دستی
        return { score: 0, isCorrect: null };

      default:
        return { score: 0, isCorrect: null };
    }
  }

  // تک‌گزینه‌ای
  private gradeSingleChoice(question: any, response: any) {
    const correct = question.content.correct_answer;
    const isCorrect = response?.value === correct;
    const score = isCorrect ? question.score : -question.negativeScore;
    return { score: Math.max(0, score), isCorrect };
  }

  // چندگزینه‌ای با نمره جزئی
  private gradeMultipleChoice(question: any, response: any) {
    const correct: string[] = question.content.correct_answer || [];
    const selected: string[] = response?.value || [];

    const correctSelected = selected.filter((s) => correct.includes(s)).length;
    const wrongSelected = selected.filter((s) => !correct.includes(s)).length;

    // روش نمره جزئی
    const partialScore = (correctSelected / correct.length) * question.score;
    const penalty = wrongSelected * (question.negativeScore / correct.length);
    const score = Math.max(0, partialScore - penalty);
    const isCorrect = correctSelected === correct.length && wrongSelected === 0;

    return { score, isCorrect };
  }

  // پاسخ کوتاه
  private gradeShortAnswer(question: any, response: any) {
    const acceptedAnswers: string[] = question.content.accepted_answers || [
      question.content.correct_answer,
    ];
    const userAnswer = (response?.value || '').trim().toLowerCase();

    const isCorrect = acceptedAnswers.some(
      (a) => a.trim().toLowerCase() === userAnswer
    );

    return {
      score: isCorrect ? question.score : -question.negativeScore,
      isCorrect,
    };
  }

  // جای خالی
  private gradeFillBlank(question: any, response: any) {
    const blanks = question.content.blanks || [];
    const userAnswers = response?.value || {};
    let correct = 0;

    for (const blank of blanks) {
      const userAns = (userAnswers[blank.id] || '').trim().toLowerCase();
      const accepted = blank.accepted_answers.map((a: string) => a.toLowerCase());
      if (accepted.includes(userAns)) correct++;
    }

    const score = (correct / blanks.length) * question.score;
    const isCorrect = correct === blanks.length;
    return { score, isCorrect };
  }

  // جور کردن
  private gradeMatching(question: any, response: any) {
    const pairs = question.content.pairs || [];
    const userPairs = response?.value || {};
    let correct = 0;

    for (const pair of pairs) {
      if (userPairs[pair.left] === pair.right) correct++;
    }

    const score = (correct / pairs.length) * question.score;
    const isCorrect = correct === pairs.length;
    return { score, isCorrect };
  }

  // مرتب‌سازی
  private gradeOrdering(question: any, response: any) {
    const correctOrder: string[] = question.content.correct_order || [];
    const userOrder: string[] = response?.value || [];

    const isCorrect =
      correctOrder.length === userOrder.length &&
      correctOrder.every((item, i) => item === userOrder[i]);

    return {
      score: isCorrect ? question.score : 0,
      isCorrect,
    };
  }

  // محاسبه Confidence Mode Score
  calculateConfidenceScore(
    baseScore: number,
    isCorrect: boolean,
    confidence: 'high' | 'medium' | 'low',
    timeBonus: number = 0,
  ): number {
    const multipliers = {
      correct: { high: 2.0, medium: 1.5, low: 1.0 },
      wrong: { high: -1.0, medium: -0.5, low: 0 },
    };

    const key = isCorrect ? 'correct' : 'wrong';
    const multiplier = multipliers[key][confidence];
    const score = baseScore * multiplier + (isCorrect ? timeBonus : 0);

    return Math.max(-baseScore, score);
  }
}
