import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Send, ChevronDown, ChevronUp, CheckCircle2,
  FileQuestion, ClipboardList, Users, Clock, BookOpen, WandSparkles,
  Eye, EyeOff, AlertCircle, BarChart2, X, RefreshCw, Printer
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import {
  Button, Card, CardBody, CardHeader, Badge, Modal, Input, Textarea, Select, Spinner, EmptyState, Avatar
} from '../../components/ui';
import { fullName, formatDate } from '../../lib/utils';
import type { Quiz, QuizQuestion, QuizAssignment, QuizSubmission, Subject, Group, User } from '../../types';
import { toast } from 'sonner';

// ─── Print helper ─────────────────────────────────────────────
function printQuiz(quiz: Quiz) {
  const questions: QuizQuestion[] = quiz.questions ?? [];
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const questionHtml = questions.map((q, i) => {
    let answerArea = '';
    if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
      const opts = (q.options ?? []).map((opt, oi) =>
        `<div class="option"><span class="circle"></span><span class="opt-label">${String.fromCharCode(65 + oi)}.</span> ${opt}</div>`
      ).join('');
      answerArea = `<div class="options">${opts}</div>`;
    } else if (q.type === 'SHORT_ANSWER') {
      answerArea = `<div class="answer-lines">${'<div class="answer-line"></div>'.repeat(4)}</div>`;
    } else {
      answerArea = `<div class="answer-lines">${'<div class="answer-line"></div>'.repeat(10)}</div>`;
    }
    const typeLabel = q.type === 'MCQ' ? 'Multiple Choice' : q.type === 'TRUE_FALSE' ? 'True / False' : q.type === 'SHORT_ANSWER' ? 'Short Answer' : 'Essay';
    return `
      <div class="question">
        <div class="q-header">
          <span class="q-num">Q${i + 1}</span>
          <span class="q-type">${typeLabel}</span>
          <span class="q-marks">[${q.marks} mark${q.marks !== 1 ? 's' : ''}]</span>
        </div>
        <p class="q-text">${q.question}</p>
        ${answerArea}
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>${quiz.title}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:28px 36px}
  .header{border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:16px}
  .quiz-title{font-size:20px;font-weight:700}
  .quiz-meta{font-size:12px;color:#555;margin-top:4px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-top:12px}
  .info-field{display:flex;gap:6px;align-items:flex-end;font-size:12px}
  .info-label{white-space:nowrap;font-weight:600}
  .info-line{flex:1;border-bottom:1px solid #aaa;min-width:80px;height:18px}
  .instructions{background:#f0f7ff;border:1px solid #bce;border-radius:6px;padding:8px 12px;margin-bottom:16px;font-size:12px;color:#234}
  .instructions strong{display:block;margin-bottom:3px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#456}
  .question{margin-bottom:22px;page-break-inside:avoid}
  .q-header{display:flex;align-items:center;gap:8px;margin-bottom:5px}
  .q-num{font-weight:700;font-size:13px}
  .q-type{font-size:10px;background:#eee;color:#555;padding:1px 6px;border-radius:10px}
  .q-marks{font-size:11px;color:#777;margin-left:auto}
  .q-text{font-size:13px;font-weight:500;margin-bottom:8px;line-height:1.5}
  .options{padding-left:4px}
  .option{display:flex;align-items:center;gap:8px;margin-bottom:5px;font-size:12px}
  .circle{display:inline-block;width:14px;height:14px;border:1.5px solid #555;border-radius:50%;flex-shrink:0}
  .opt-label{font-weight:600;min-width:18px}
  .answer-lines{margin-top:4px}
  .answer-line{border-bottom:1px solid #bbb;margin-bottom:12px;height:10px}
  .footer{margin-top:24px;border-top:1px solid #ccc;padding-top:8px;font-size:11px;color:#888;display:flex;justify-content:space-between}
  @media print{body{padding:14px 20px}@page{margin:1.2cm 1.5cm}}
</style></head>
<body>
  <div class="header">
    <div class="quiz-title">${quiz.title}</div>
    <div class="quiz-meta">${quiz.subject.title}${quiz.subject.grade ? ' &middot; ' + quiz.subject.grade : ''} &middot; ${questions.length} question${questions.length !== 1 ? 's' : ''} &middot; ${quiz.totalMarks} marks${quiz.durationMin ? ' &middot; ' + quiz.durationMin + ' minutes' : ''}</div>
    <div class="info-grid">
      <div class="info-field"><span class="info-label">Student Name:</span><span class="info-line"></span></div>
      <div class="info-field"><span class="info-label">Date:</span><span class="info-line">&nbsp;${today}</span></div>
      <div class="info-field"><span class="info-label">Grade / Class:</span><span class="info-line"></span></div>
      <div class="info-field"><span class="info-label">Score:</span><span class="info-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/ ${quiz.totalMarks}</span></div>
    </div>
  </div>
  ${quiz.instructions ? `<div class="instructions"><strong>Instructions</strong>${quiz.instructions}</div>` : ''}
  ${questionHtml}
  <div class="footer"><span>${quiz.title} — Printed ${today}</span><span>Attach completed sheet when submitting online</span></div>
</body></html>`;

  const win = window.open('', '_blank', 'width=820,height=950');
  if (!win) { alert('Pop-up blocked — please allow pop-ups and try again.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

// ─── Helpers ──────────────────────────────────────────────────
const TYPE_COLOR: Record<string, string> = {
  QUIZ: 'bg-blue-50 text-blue-700 border-blue-200',
  EXAM: 'bg-purple-50 text-purple-700 border-purple-200',
};
const STATUS_VARIANT: Record<string, 'warning' | 'success'> = {
  DRAFT: 'warning', PUBLISHED: 'success',
};
const Q_TYPE_LABEL: Record<string, string> = {
  MCQ: 'MCQ', SHORT_ANSWER: 'Short Answer', ESSAY: 'Essay', TRUE_FALSE: 'True / False',
};

function ScorePill({ score, max }: { score: number | null; max: number | null }) {
  if (score == null || max == null) return <span className="text-slate-400 text-xs">—</span>;
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  const color = pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600';
  return <span className={`text-sm font-bold ${color}`}>{score}/{max} <span className="text-xs font-normal">({pct}%)</span></span>;
}

// ─── Question Card (editable in wizard) ───────────────────────
function QuestionCard({
  q, index, onChange, onDelete,
}: {
  q: QuizQuestion; index: number;
  onChange: (updated: QuizQuestion) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(index < 3);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-slate-400 shrink-0">Q{q.questionNumber}</span>
          <span className="text-sm font-medium text-slate-700 truncate">{q.question || 'Untitled question'}</span>
          <span className="shrink-0 text-[11px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">{Q_TYPE_LABEL[q.type]}</span>
          <span className="shrink-0 text-[11px] text-slate-500">{q.marks} mk{q.marks !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
            <X size={13} />
          </button>
          {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 py-4 space-y-3">
          <Textarea
            label="Question"
            value={q.question}
            onChange={(e) => onChange({ ...q, question: e.target.value })}
            rows={2}
          />

          {(q.type === 'MCQ' || q.type === 'TRUE_FALSE') && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Options</label>
              {(q.options ?? []).map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-4 shrink-0">{String.fromCharCode(65 + oi)}.</span>
                  <input
                    value={opt}
                    onChange={(e) => {
                      const opts = [...(q.options ?? [])];
                      opts[oi] = e.target.value;
                      onChange({ ...q, options: opts });
                    }}
                    className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-brand-300 focus:border-brand-500"
                    placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                    disabled={q.type === 'TRUE_FALSE'}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Marks</label>
              <input
                type="number" min={0.5} step={0.5}
                value={q.marks}
                onChange={(e) => onChange({ ...q, marks: Number(e.target.value) })}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <Input
              label="Expected Answer (grading reference)"
              value={q.expectedAnswer ?? ''}
              onChange={(e) => onChange({ ...q, expectedAnswer: e.target.value })}
              placeholder="Model answer…"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Submission detail modal ───────────────────────────────────
function SubmissionModal({
  submission, quiz, open, onClose, onRegrade,
}: {
  submission: QuizSubmission | null;
  quiz: Quiz | null;
  open: boolean;
  onClose: () => void;
  onRegrade: () => void;
}) {
  if (!submission || !quiz) return null;
  const answerMap = new Map((submission.answers ?? []).map((a) => [a.questionId, a]));

  return (
    <Modal open={open} onClose={onClose} title={`Submission — ${fullName(submission.student)}`} className="max-w-2xl">
      <div className="space-y-4">
        {/* Score summary */}
        <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Score</p>
            <ScorePill score={submission.score} max={submission.maxScore} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Status</p>
            <Badge variant={submission.status === 'GRADED' ? 'success' : submission.status === 'GRADING' ? 'info' : 'warning'}>
              {submission.status}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Submitted</p>
            <p className="text-sm text-slate-700">{formatDate(submission.submittedAt)}</p>
          </div>
          {submission.status !== 'GRADED' && (
            <Button size="sm" variant="outline" icon={<RefreshCw size={13} />} onClick={onRegrade}>
              Regrade
            </Button>
          )}
        </div>

        {/* AI feedback */}
        {submission.aiFeedback && (
          <div className="bg-brand-50 border border-brand-200 rounded-lg px-4 py-3 text-sm text-brand-700">
            <p className="font-medium text-xs text-brand-500 uppercase tracking-wide mb-1">AI Overall Feedback</p>
            {submission.aiFeedback}
          </div>
        )}

        {/* Attachment — downloaded via authenticated API (uploads require auth) */}
        {submission.attachmentUrl && (
          <div className="flex items-center gap-2 text-sm">
            <ClipboardList size={14} className="text-slate-400" />
            <button
              type="button"
              className="text-brand-600 hover:underline"
              onClick={async () => {
                try {
                  const resp = await api.get(submission.attachmentUrl!, { responseType: 'blob' });
                  const url = URL.createObjectURL(resp.data as Blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = submission.attachmentUrl!.split('/').pop() ?? 'attachment';
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  toast.error('Failed to download attachment');
                }
              }}
            >
              View attached document
            </button>
          </div>
        )}

        {/* Per-question answers */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {(quiz.questions ?? []).map((q) => {
            const ans = answerMap.get(q.id);
            return (
              <div key={q.id} className="border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-400">Q{q.questionNumber} · {Q_TYPE_LABEL[q.type]} · {q.marks} mk{q.marks !== 1 ? 's' : ''}</p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">{q.question}</p>
                  </div>
                  {ans?.score != null && (
                    <span className={`text-sm font-bold shrink-0 ${ans.score === q.marks ? 'text-emerald-600' : ans.score > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                      {ans.score}/{q.marks}
                    </span>
                  )}
                </div>
                <div className="bg-slate-50 rounded px-3 py-2 text-sm text-slate-700">
                  {ans?.answer || <span className="text-slate-400 italic">No answer</span>}
                </div>
                {ans?.feedback && (
                  <p className="text-xs text-slate-500 italic">{ans.feedback}</p>
                )}
                <p className="text-xs text-slate-400">Expected: {q.expectedAnswer}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

// ─── Student: take-quiz modal ─────────────────────────────────
function StudentAttemptModal({
  quiz, open, onClose, onSubmitted,
}: {
  quiz: Quiz | null;
  open: boolean;
  onClose: () => void;
  onSubmitted: (submission: QuizSubmission) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Reset state whenever this quiz opens
  useEffect(() => {
    if (!open || !quiz) return;
    setAnswers({});
    setFile(null);
    setTimeLeft(quiz.durationMin ? quiz.durationMin * 60 : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz?.id, open]);

  // Countdown timer — auto-submits at 0
  useEffect(() => {
    if (timeLeft == null || timeLeft <= 0) {
      if (timeLeft === 0) doSubmit();
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => (t ?? 1) - 1), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  async function doSubmit() {
    if (!quiz || submitting) return;
    setSubmitting(true);
    try {
      const answersArray = (quiz.questions ?? []).map((q) => ({
        questionId: q.id,
        answer: answers[q.id] ?? '',
      }));
      const formData = new FormData();
      formData.append('answers', JSON.stringify(answersArray));
      if (file) formData.append('attachment', file);

      const resp = await api.post<{ data: QuizSubmission }>(
        `/quiz/${quiz.id}/submit`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      toast.success('Quiz submitted! Grading in progress…');
      onSubmitted(resp.data.data);
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to submit quiz';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!quiz) return null;

  const questions = quiz.questions ?? [];
  const answeredCount = questions.filter((q) => (answers[q.id] ?? '').trim()).length;
  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <Modal open={open} onClose={onClose} title={quiz.title} className="max-w-2xl">
      <div className="space-y-5">
        {/* Print button row */}
        <div className="flex items-center justify-between -mt-1">
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><FileQuestion size={12} />{quiz.questions?.length ?? 0} questions</span>
            <span className="flex items-center gap-1"><BarChart2 size={12} />{quiz.totalMarks} marks</span>
            {quiz.durationMin && <span className="flex items-center gap-1"><Clock size={12} />{quiz.durationMin} min</span>}
          </div>
          <button
            type="button"
            onClick={() => printQuiz(quiz)}
            title="Print quiz"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 text-xs font-medium transition-colors"
          >
            <Printer size={13} />
            Print Quiz
          </button>
        </div>

        {/* Instructions + timer */}
        {(quiz.instructions || timeLeft != null) && (
          <div className="flex items-start justify-between gap-4">
            {quiz.instructions && (
              <p className="text-sm text-slate-600 bg-brand-50 border border-brand-200 rounded-lg px-4 py-2 flex-1">
                {quiz.instructions}
              </p>
            )}
            {timeLeft != null && (
              <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-mono font-semibold shrink-0 border ${
                timeLeft < 60 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}>
                <Clock size={14} />
                {fmtTime(timeLeft)}
              </div>
            )}
          </div>
        )}

        {/* Progress indicator */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{answeredCount} of {questions.length} answered</span>
          <span>{quiz.totalMarks} total marks</span>
        </div>

        {/* Questions */}
        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          {questions.map((q, idx) => (
            <div key={q.id} className="border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-xs font-semibold text-slate-400 shrink-0 mt-0.5">Q{idx + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                      {Q_TYPE_LABEL[q.type]}
                    </span>
                    <span className="text-[11px] text-slate-400">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800">{q.question}</p>
                </div>
              </div>

              {/* MCQ / True-False */}
              {(q.type === 'MCQ' || q.type === 'TRUE_FALSE') && (
                <div className="space-y-2">
                  {(q.options ?? []).map((opt, oi) => (
                    <label
                      key={oi}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                        answers[q.id] === opt
                          ? 'bg-brand-50 border-brand-300'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                        className="text-brand-600"
                      />
                      <span className="text-sm text-slate-700">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Short answer */}
              {q.type === 'SHORT_ANSWER' && (
                <input
                  type="text"
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  placeholder="Your answer…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              )}

              {/* Essay */}
              {q.type === 'ESSAY' && (
                <textarea
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  placeholder="Write your answer here…"
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
                />
              )}
            </div>
          ))}
        </div>

        {/* Optional PDF attachment */}
        <label className="flex items-center gap-2 cursor-pointer border border-dashed border-slate-200 rounded-lg px-4 py-3 hover:border-brand-300 transition-colors">
          <ClipboardList size={15} className="text-slate-400 shrink-0" />
          {file
            ? <span className="text-sm text-brand-600 font-medium truncate">{file.name}</span>
            : <span className="text-sm text-slate-400">Attach a PDF (optional)</span>
          }
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {/* Actions */}
        <div className="flex gap-3 pt-1 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={doSubmit} loading={submitting} icon={<Send size={14} />} className="flex-1">
            {answeredCount < questions.length
              ? `Submit (${questions.length - answeredCount} unanswered)`
              : 'Submit Quiz'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Student: result modal ─────────────────────────────────────
function StudentResultModal({
  quiz, submission, open, onClose,
}: {
  quiz: Quiz | null;
  submission: QuizSubmission | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!quiz || !submission) return null;
  const answerMap = new Map((submission.answers ?? []).map((a) => [a.questionId, a]));
  const pct = submission.maxScore && submission.maxScore > 0
    ? Math.round(((submission.score ?? 0) / submission.maxScore) * 100)
    : 0;
  const color = pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <Modal open={open} onClose={onClose} title={`Your Result — ${quiz.title}`} className="max-w-2xl">
      <div className="space-y-4">
        {/* Score banner */}
        <div className="flex items-center justify-between bg-slate-50 rounded-xl px-5 py-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Your Score</p>
            <p className={`text-2xl font-bold ${color}`}>
              {submission.score ?? '—'}/{submission.maxScore ?? '—'}
              <span className="text-base font-normal text-slate-500 ml-1">({pct}%)</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Status</p>
            <Badge variant={submission.status === 'GRADED' ? 'success' : submission.status === 'GRADING' ? 'info' : 'warning'}>
              {submission.status}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Submitted</p>
            <p className="text-sm text-slate-700">{formatDate(submission.submittedAt)}</p>
          </div>
        </div>

        {/* AI overall feedback */}
        {submission.aiFeedback && (
          <div className="bg-brand-50 border border-brand-200 rounded-lg px-4 py-3 text-sm text-brand-700">
            <p className="font-medium text-xs text-brand-500 uppercase tracking-wide mb-1">AI Feedback</p>
            {submission.aiFeedback}
          </div>
        )}

        {/* Per-question breakdown */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {(quiz.questions ?? []).map((q, idx) => {
            const ans = answerMap.get(q.id);
            const qPct = q.marks > 0 && ans?.score != null ? ans.score / q.marks : null;
            const qColor = qPct == null ? '' : qPct === 1 ? 'text-emerald-600' : qPct > 0 ? 'text-amber-600' : 'text-red-500';
            return (
              <div key={q.id} className="border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-400">Q{idx + 1} · {Q_TYPE_LABEL[q.type]} · {q.marks} mark{q.marks !== 1 ? 's' : ''}</p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">{q.question}</p>
                  </div>
                  {ans?.score != null && (
                    <span className={`text-sm font-bold shrink-0 ${qColor}`}>{ans.score}/{q.marks}</span>
                  )}
                </div>
                <div className="bg-slate-50 rounded px-3 py-2 text-sm text-slate-700">
                  {ans?.answer || <span className="text-slate-400 italic">No answer given</span>}
                </div>
                {ans?.feedback && (
                  <p className="text-xs text-slate-500 italic">{ans.feedback}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-1">
          <Button variant="secondary" onClick={onClose} className="w-full">Close</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function QuizPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isTeacher = user?.role === 'TEACHER';
  const isAdmin = user?.role === 'ADMIN';
  const isStaff = isTeacher || isAdmin;

  // ── Wizard state ──────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  // Step 1
  const [selSubjectId, setSelSubjectId] = useState('');
  const [selWeekIds, setSelWeekIds] = useState<string[]>([]);
  const [selLessonIds, setSelLessonIds] = useState<string[]>([]);
  // Step 2
  const [quizTitle, setQuizTitle] = useState('');
  const [quizType, setQuizType] = useState<'QUIZ' | 'EXAM'>('QUIZ');
  const [questionCount, setQuestionCount] = useState(10);
  const [durationMin, setDurationMin] = useState('');
  const [instructions, setInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [totalMarks, setTotalMarks] = useState(0);
  // Step 3 — assign
  const [selGroupIds, setSelGroupIds] = useState<string[]>([]);
  const [selStudentIds, setSelStudentIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [savedQuizId, setSavedQuizId] = useState<string | null>(null);

  // ── Detail / submissions state (staff) ────────────────────
  const [detailQuiz, setDetailQuiz] = useState<Quiz | null>(null);
  const [detailTab, setDetailTab] = useState<'questions' | 'assignments' | 'submissions'>('submissions');
  const [selectedSub, setSelectedSub] = useState<QuizSubmission | null>(null);

  // ── Student attempt / result state ────────────────────────
  const [studentAttemptQuiz, setStudentAttemptQuiz] = useState<Quiz | null>(null);
  const [studentResult, setStudentResult] = useState<{ quiz: Quiz; submission: QuizSubmission } | null>(null);

  // ── Data queries ──────────────────────────────────────────
  const { data: quizzes = [], isLoading } = useQuery<Quiz[]>({
    queryKey: ['quizzes'],
    queryFn: () => api.get<{ data: Quiz[] }>('/quiz').then((r) => r.data.data),
  });

  const { data: mySubjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: () => api.get<{ data: Subject[] }>('/subjects').then((r) => r.data.data),
    enabled: isStaff,
  });

  // Weeks for selected subject
  const { data: weeks = [] } = useQuery({
    queryKey: ['weeks', selSubjectId],
    queryFn: () => api.get<{ data: { id: string; title: string; order: number; lessons: { id: string; title: string }[] }[] }>(`/curriculum/${selSubjectId}/weeks`).then((r) => r.data.data),
    enabled: !!selSubjectId,
  });

  // Groups for assignment
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => api.get<{ data: Group[] }>('/groups').then((r) => r.data.data),
    enabled: isStaff,
  });

  // Students for direct assignment
  const { data: students = [] } = useQuery<User[]>({
    queryKey: ['users', 'STUDENT', ''],
    queryFn: () => api.get<{ data: User[] }>('/users?role=STUDENT&limit=200').then((r) => r.data.data),
    enabled: isStaff,
  });

  // Submissions for a quiz
  const { data: submissions = [], refetch: refetchSubs } = useQuery<QuizSubmission[]>({
    queryKey: ['quiz-submissions', detailQuiz?.id],
    queryFn: () => api.get<{ data: QuizSubmission[] }>(`/quiz/${detailQuiz!.id}/submissions`).then((r) => r.data.data),
    enabled: !!detailQuiz,
  });

  // Derived
  const selectedWeekLessons = weeks
    .filter((w) => selWeekIds.includes(w.id))
    .flatMap((w) => w.lessons ?? []);

  useEffect(() => {
    setTotalMarks(questions.reduce((s, q) => s + q.marks, 0));
  }, [questions]);

  // ── Mutations ─────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/quiz/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quizzes'] }); toast.success('Quiz deleted'); },
    onError: () => toast.error('Failed to delete quiz'),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.put(`/quiz/${id}`, { status: 'PUBLISHED' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quizzes'] }); toast.success('Quiz published'); },
    onError: () => toast.error('Failed to publish quiz'),
  });

  const regradeMutation = useMutation({
    mutationFn: (sid: string) => api.post(`/quiz/${detailQuiz!.id}/submissions/${sid}/regrade`),
    onSuccess: () => { refetchSubs(); toast.success('Regraded successfully'); },
    onError: () => toast.error('Regrade failed'),
  });

  // ── Wizard handlers ──────────────────────────────────────
  function resetWizard() {
    setWizardStep(1); setSelSubjectId(''); setSelWeekIds([]); setSelLessonIds([]);
    setQuizTitle(''); setQuizType('QUIZ'); setQuestionCount(10); setDurationMin(''); setInstructions('');
    setGenerating(false); setQuestions([]); setTotalMarks(0);
    setSelGroupIds([]); setSelStudentIds([]); setDueDate(''); setSavingQuiz(false); setSavedQuizId(null);
    setShowCreate(false);
  }

  async function handleGenerate() {
    if (!selSubjectId || selLessonIds.length === 0) {
      toast.error('Select a subject and at least one lesson'); return;
    }
    setGenerating(true);
    try {
      const res = await api.post<{ data: { questions: QuizQuestion[]; totalMarks: number } }>('/quiz/generate', {
        subjectId: selSubjectId, lessonIds: selLessonIds, questionCount, type: quizType,
      });
      setQuestions(res.data.data.questions);
      setTotalMarks(res.data.data.totalMarks);
      const sub = mySubjects.find((s) => s.id === selSubjectId);
      if (!quizTitle) setQuizTitle(`${sub?.title ?? ''} ${quizType === 'EXAM' ? 'Exam' : 'Quiz'}`);
      setWizardStep(2);
    } catch {
      toast.error('Failed to generate questions. Check AI configuration.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveAndAssign(publishNow: boolean) {
    if (!quizTitle.trim() || questions.length === 0) {
      toast.error('Quiz title and at least one question are required'); return;
    }
    setSavingQuiz(true);
    try {
      const { data: { data: created } } = await api.post<{ data: Quiz }>('/quiz', {
        title: quizTitle.trim(), type: quizType, subjectId: selSubjectId,
        instructions: instructions.trim() || undefined, questions, totalMarks,
        durationMin: durationMin ? Number(durationMin) : undefined,
        status: publishNow ? 'PUBLISHED' : 'DRAFT',
      });
      setSavedQuizId(created.id);
      qc.invalidateQueries({ queryKey: ['quizzes'] });

      if (publishNow && (selGroupIds.length > 0 || selStudentIds.length > 0)) {
        await api.post(`/quiz/${created.id}/assign`, {
          groupIds: selGroupIds, studentIds: selStudentIds,
          dueDate: dueDate || undefined,
        });
      }
      toast.success(publishNow ? 'Quiz published and assigned!' : 'Quiz saved as draft');
      qc.invalidateQueries({ queryKey: ['quizzes'] });
      resetWizard();
    } catch {
      toast.error('Failed to save quiz');
    } finally {
      setSavingQuiz(false);
    }
  }

  async function handleAssignExisting(quizId: string) {
    if (selGroupIds.length === 0 && selStudentIds.length === 0) {
      toast.error('Select at least one group or student'); return;
    }
    try {
      await api.post(`/quiz/${quizId}/assign`, { groupIds: selGroupIds, studentIds: selStudentIds, dueDate: dueDate || undefined });
      qc.invalidateQueries({ queryKey: ['quizzes'] });
      if (detailQuiz) {
        const updated = await api.get<{ data: Quiz }>(`/quiz/${quizId}`);
        setDetailQuiz(updated.data.data);
      }
      toast.success('Assigned successfully');
      setSelGroupIds([]); setSelStudentIds([]); setDueDate('');
    } catch {
      toast.error('Failed to assign');
    }
  }

  async function removeAssignment(quizId: string, assignmentId: string) {
    try {
      await api.delete(`/quiz/${quizId}/assign/${assignmentId}`);
      const updated = await api.get<{ data: Quiz }>(`/quiz/${quizId}`);
      setDetailQuiz(updated.data.data);
      toast.success('Assignment removed');
    } catch {
      toast.error('Failed to remove assignment');
    }
  }

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quizzes &amp; Exams</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isStaff ? `${quizzes.length} quiz${quizzes.length !== 1 ? 'zes' : ''} created` : `${quizzes.length} assigned`}
          </p>
        </div>
        {isStaff && (
          <Button onClick={() => setShowCreate(true)} icon={<Plus size={16} />}>
            Create Quiz / Exam
          </Button>
        )}
      </div>

      {/* Quiz cards */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="w-10 h-10" /></div>
      ) : quizzes.length === 0 ? (
        <EmptyState
          icon={<FileQuestion size={40} />}
          title="No quizzes yet"
          description={isStaff ? "Create your first quiz to get started." : "No quizzes assigned to you yet."}
          action={isStaff ? <Button onClick={() => setShowCreate(true)} icon={<Plus size={16} />}>Create Quiz</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((q) => (
            <Card key={q.id} className="flex flex-col">
              <CardBody className="flex flex-col gap-3 flex-1">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${TYPE_COLOR[q.type]}`}>{q.type}</span>
                      {isStaff && <Badge variant={STATUS_VARIANT[q.status]}>{q.status}</Badge>}
                    </div>
                    <p className="font-semibold text-slate-800 mt-1 leading-tight">{q.title}</p>
                  </div>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: q.subject.color }} />
                    {q.subject.title}
                    {q.subject.grade && <span className="text-slate-400">· {q.subject.grade}</span>}
                  </span>
                  <span className="flex items-center gap-1"><FileQuestion size={12} />{q.questions?.length ?? 0} questions</span>
                  <span className="flex items-center gap-1"><BarChart2 size={12} />{q.totalMarks} marks</span>
                  {q.durationMin && <span className="flex items-center gap-1"><Clock size={12} />{q.durationMin} min</span>}
                </div>

                {/* Assignment + submission stats (staff) */}
                {isStaff && (
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Users size={12} />{q._count?.assignments ?? 0} assigned</span>
                    <span className="flex items-center gap-1"><ClipboardList size={12} />{q._count?.submissions ?? 0} submitted</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100">
                  {isStaff ? (
                    <Button
                      size="sm" variant="outline"
                      icon={<Eye size={13} />}
                      onClick={() => { setDetailQuiz(q); setDetailTab('submissions'); }}
                      className="flex-1"
                    >
                      Manage
                    </Button>
                  ) : q.submission ? (
                    <Button
                      size="sm" variant="outline"
                      icon={<CheckCircle2 size={13} />}
                      onClick={async () => {
                        // Load full submission to show per-question feedback
                        try {
                          const res = await api.get<{ data: QuizSubmission[] }>(`/quiz/${q.id}/submissions`);
                          const sub = res.data.data[0];
                          if (sub) setStudentResult({ quiz: q, submission: sub });
                        } catch {
                          toast.error('Failed to load your submission');
                        }
                      }}
                      className="flex-1"
                    >
                      View Result
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      icon={<Send size={13} />}
                      onClick={() => setStudentAttemptQuiz(q)}
                      className="flex-1"
                    >
                      Take Quiz
                    </Button>
                  )}
                  {isStaff && q.status === 'DRAFT' && (
                    <Button
                      size="sm" variant="ghost"
                      icon={<Send size={13} />}
                      onClick={() => publishMutation.mutate(q.id)}
                      loading={publishMutation.isPending}
                    >
                      Publish
                    </Button>
                  )}
                  {isStaff && (
                    <button
                      onClick={() => { if (confirm(`Delete "${q.title}"?`)) deleteMutation.mutate(q.id); }}
                      className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* ── Detail modal (staff) ──────────────────────────────── */}
      <Modal
        open={!!detailQuiz && isStaff}
        onClose={() => setDetailQuiz(null)}
        title={detailQuiz?.title ?? ''}
        className="max-w-3xl"
      >
        {detailQuiz && (
          <div className="space-y-4">
            {/* Tab bar */}
            <div className="flex border-b border-slate-200">
              {([
                { key: 'questions', label: 'Questions', icon: <FileQuestion size={14} /> },
                { key: 'assignments', label: 'Assignments', icon: <Users size={14} /> },
                { key: 'submissions', label: `Submissions (${submissions.length})`, icon: <ClipboardList size={14} /> },
              ] as const).map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setDetailTab(key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    detailTab === key ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {icon}{label}
                </button>
              ))}
            </div>

            {/* Questions tab */}
            {detailTab === 'questions' && (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {(detailQuiz.questions ?? []).map((q, i) => (
                  <div key={q.id} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-slate-400">Q{i + 1} · {Q_TYPE_LABEL[q.type]} · {q.marks} mk{q.marks !== 1 ? 's' : ''}</p>
                        <p className="text-sm font-medium text-slate-800 mt-0.5">{q.question}</p>
                        {q.options && <p className="text-xs text-slate-500 mt-1">Options: {q.options.join(' / ')}</p>}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Expected: <span className="text-slate-600">{q.expectedAnswer}</span></p>
                  </div>
                ))}
              </div>
            )}

            {/* Assignments tab */}
            {detailTab === 'assignments' && (
              <div className="space-y-4">
                {/* Existing assignments */}
                {(detailQuiz.assignments ?? []).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Currently Assigned To</p>
                    {(detailQuiz.assignments ?? []).map((a) => (
                      <div key={a.id} className="flex items-center justify-between bg-slate-50 rounded px-3 py-2 text-sm">
                        <span className="flex items-center gap-2">
                          {a.group ? <><Users size={13} className="text-slate-400" />{a.group.name} (group)</> : <><BookOpen size={13} className="text-slate-400" />{a.student ? fullName(a.student) : '—'} (individual)</>}
                          {a.dueDate && <span className="text-xs text-slate-400">due {new Date(a.dueDate).toLocaleDateString()}</span>}
                        </span>
                        <button onClick={() => removeAssignment(detailQuiz.id, a.id)} className="text-slate-300 hover:text-red-500"><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new assignment */}
                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add Assignment</p>
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1.5">Groups</p>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {groups.map((g) => (
                        <label key={g.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={selGroupIds.includes(g.id)} onChange={() => setSelGroupIds((ids) => ids.includes(g.id) ? ids.filter((x) => x !== g.id) : [...ids, g.id])} />
                          {g.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1.5">Individual Students</p>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {students.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={selStudentIds.includes(s.id)} onChange={() => setSelStudentIds((ids) => ids.includes(s.id) ? ids.filter((x) => x !== s.id) : [...ids, s.id])} />
                          {fullName(s)}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Input label="Due Date (optional)" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  <Button icon={<Send size={14} />} onClick={() => handleAssignExisting(detailQuiz.id)} disabled={selGroupIds.length === 0 && selStudentIds.length === 0}>
                    Assign
                  </Button>
                </div>
              </div>
            )}

            {/* Submissions tab */}
            {detailTab === 'submissions' && (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {submissions.length === 0 ? (
                  <EmptyState icon={<ClipboardList size={32} />} title="No submissions yet" description="Students will appear here once they submit." />
                ) : (
                  submissions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={sub.student.avatarUrl} name={fullName(sub.student)} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{fullName(sub.student)}</p>
                          <p className="text-xs text-slate-400">{formatDate(sub.submittedAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <ScorePill score={sub.score} max={sub.maxScore} />
                        <Badge variant={sub.status === 'GRADED' ? 'success' : sub.status === 'GRADING' ? 'info' : 'warning'}>
                          {sub.status}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => setSelectedSub(sub)}>Review</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Submission detail modal (staff reviewing a student) ── */}
      <SubmissionModal
        submission={selectedSub}
        quiz={detailQuiz}
        open={!!selectedSub}
        onClose={() => setSelectedSub(null)}
        onRegrade={() => selectedSub && regradeMutation.mutate(selectedSub.id)}
      />

      {/* ── Student: take quiz ──────────────────────────────────── */}
      <StudentAttemptModal
        quiz={studentAttemptQuiz}
        open={!!studentAttemptQuiz}
        onClose={() => setStudentAttemptQuiz(null)}
        onSubmitted={(sub) => {
          setStudentAttemptQuiz(null);
          // Refresh the quiz list so the card switches to "View Result"
          qc.invalidateQueries({ queryKey: ['quizzes'] });
          // Show the result immediately
          if (studentAttemptQuiz) setStudentResult({ quiz: studentAttemptQuiz, submission: sub });
        }}
      />

      {/* ── Student: view result ────────────────────────────────── */}
      <StudentResultModal
        quiz={studentResult?.quiz ?? null}
        submission={studentResult?.submission ?? null}
        open={!!studentResult}
        onClose={() => setStudentResult(null)}
      />

      {/* ── Create Quiz Wizard ────────────────────────────────── */}
      <Modal
        open={showCreate}
        onClose={resetWizard}
        title={`Create ${quizType === 'EXAM' ? 'Exam' : 'Quiz'} — Step ${wizardStep} of 3`}
        className="max-w-2xl"
      >
        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-5">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                s < wizardStep ? 'bg-emerald-500 text-white' : s === wizardStep ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {s < wizardStep ? <CheckCircle2 size={14} /> : s}
              </div>
              <span className={`text-sm ${s === wizardStep ? 'font-medium text-slate-800' : 'text-slate-400'}`}>
                {s === 1 ? 'Select Topics' : s === 2 ? 'Review Questions' : 'Assign & Publish'}
              </span>
              {s < 3 && <div className="w-8 h-px bg-slate-200" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Select topics ── */}
        {wizardStep === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Quiz or Exam"
                value={quizType}
                onChange={(e) => setQuizType(e.target.value as 'QUIZ' | 'EXAM')}
                options={[{ value: 'QUIZ', label: 'Quiz (short)' }, { value: 'EXAM', label: 'Exam (comprehensive)' }]}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Number of Questions</label>
                <input
                  type="number" min={3} max={30} value={questionCount}
                  onChange={(e) => setQuestionCount(Math.max(3, Math.min(30, Number(e.target.value))))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
            </div>

            <Select
              label="Course"
              value={selSubjectId}
              onChange={(e) => { setSelSubjectId(e.target.value); setSelWeekIds([]); setSelLessonIds([]); }}
              options={[{ value: '', label: 'Choose a course…' }, ...mySubjects.map((s) => ({ value: s.id, label: s.title }))]}
            />

            {selSubjectId && weeks.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Select Weeks</p>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                  {weeks.map((w) => (
                    <div key={w.id}>
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={selWeekIds.includes(w.id)}
                          onChange={() => {
                            const isChecked = selWeekIds.includes(w.id);
                            setSelWeekIds((ids) => isChecked ? ids.filter((x) => x !== w.id) : [...ids, w.id]);
                            // Also select/deselect all lessons in this week
                            const lessonIds = (w.lessons ?? []).map((l) => l.id);
                            setSelLessonIds((ids) =>
                              isChecked ? ids.filter((x) => !lessonIds.includes(x)) : [...new Set([...ids, ...lessonIds])]
                            );
                          }}
                        />
                        Week {w.order}: {w.title}
                      </label>
                      {selWeekIds.includes(w.id) && (
                        <div className="ml-6 mt-1 space-y-1">
                          {(w.lessons ?? []).map((l) => (
                            <label key={l.id} className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                              <input
                                type="checkbox"
                                checked={selLessonIds.includes(l.id)}
                                onChange={() => setSelLessonIds((ids) => ids.includes(l.id) ? ids.filter((x) => x !== l.id) : [...ids, l.id])}
                              />
                              {l.title}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">{selLessonIds.length} lesson{selLessonIds.length !== 1 ? 's' : ''} selected</p>
              </div>
            )}

            {selSubjectId && weeks.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertCircle size={14} /> This subject has no curriculum yet. Add weeks and lessons first.
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={resetWizard} className="flex-1">Cancel</Button>
              <Button
                onClick={handleGenerate}
                loading={generating}
                icon={<WandSparkles size={15} />}
                disabled={!selSubjectId || selLessonIds.length === 0}
                className="flex-1"
              >
                {generating ? 'Generating…' : `Generate ${questionCount} Questions`}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Review & edit questions ── */}
        {wizardStep === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Quiz Title" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} required />
              <Input label="Time Limit (minutes, optional)" type="number" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} placeholder="No limit" />
            </div>
            <Textarea label="Instructions (optional)" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} placeholder="Any instructions for students…" />

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">{questions.length} Questions · {totalMarks} total marks</p>
              <Button size="sm" variant="outline" icon={<RefreshCw size={13} />} onClick={() => setWizardStep(1)}>Regenerate</Button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {questions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  q={q}
                  index={i}
                  onChange={(updated) => setQuestions((qs) => qs.map((x) => x.id === updated.id ? updated : x))}
                  onDelete={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id).map((x, idx) => ({ ...x, questionNumber: idx + 1 })))}
                />
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setWizardStep(1)} className="flex-1">Back</Button>
              <Button onClick={() => setWizardStep(3)} disabled={questions.length === 0 || !quizTitle.trim()} className="flex-1">Next: Assign →</Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Assign & publish ── */}
        {wizardStep === 3 && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm">
              <p className="font-medium text-slate-700">{quizTitle}</p>
              <p className="text-slate-500 text-xs mt-0.5">{questions.length} questions · {totalMarks} marks{durationMin ? ` · ${durationMin} min` : ''}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Users size={14} />Assign to Groups</p>
              {groups.length === 0 ? <p className="text-xs text-slate-400">No groups available</p> : (
                <div className="grid grid-cols-2 gap-2 border border-slate-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {groups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={selGroupIds.includes(g.id)} onChange={() => setSelGroupIds((ids) => ids.includes(g.id) ? ids.filter((x) => x !== g.id) : [...ids, g.id])} />
                      {g.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><BookOpen size={14} />Assign to Individual Students</p>
              {students.length === 0 ? <p className="text-xs text-slate-400">No students available</p> : (
                <div className="grid grid-cols-2 gap-2 border border-slate-200 rounded-lg p-3 max-h-36 overflow-y-auto">
                  {students.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={selStudentIds.includes(s.id)} onChange={() => setSelStudentIds((ids) => ids.includes(s.id) ? ids.filter((x) => x !== s.id) : [...ids, s.id])} />
                      {fullName(s)}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <Input label="Due Date (optional)" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />

            {selGroupIds.length === 0 && selStudentIds.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertCircle size={13} /> No assignment selected — quiz will be saved as draft only.
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setWizardStep(2)} className="flex-1">Back</Button>
              <Button variant="outline" loading={savingQuiz} onClick={() => handleSaveAndAssign(false)} className="flex-1">
                <EyeOff size={14} /> Save as Draft
              </Button>
              <Button loading={savingQuiz} onClick={() => handleSaveAndAssign(true)} className="flex-1" icon={<Send size={14} />}>
                Publish &amp; Assign
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
