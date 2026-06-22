import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Clock, Upload, CheckCircle2, AlertCircle, ChevronLeft,
  FileText, HelpCircle, ClipboardList, BookOpen, Printer
} from 'lucide-react';
import { api } from '../../lib/api';
import { Button, Card, CardBody, CardHeader, Spinner, Badge } from '../../components/ui';
import type { Quiz, QuizQuestion, QuizAnswer, QuizSubmission } from '../../types';
import { toast } from 'sonner';

const Q_TYPE_LABEL: Record<string, string> = {
  MCQ: 'Multiple Choice', SHORT_ANSWER: 'Short Answer', ESSAY: 'Essay', TRUE_FALSE: 'True / False',
};
const Q_TYPE_ICON: Record<string, React.ReactNode> = {
  MCQ: <HelpCircle size={13} />, SHORT_ANSWER: <FileText size={13} />,
  ESSAY: <ClipboardList size={13} />, TRUE_FALSE: <BookOpen size={13} />,
};

function formatSeconds(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function ScoreBand({ pct }: { pct: number }) {
  if (pct >= 80) return <span className="text-emerald-600 font-bold">Excellent 🎉</span>;
  if (pct >= 60) return <span className="text-blue-600 font-bold">Good 👍</span>;
  if (pct >= 40) return <span className="text-amber-600 font-bold">Fair — keep practising</span>;
  return <span className="text-red-600 font-bold">Needs improvement</span>;
}

// ── Print helper ──────────────────────────────────────────────
function generatePrintHtml(quiz: Quiz): string {
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
      // ESSAY
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${quiz.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 28px 36px; }
    /* Header */
    .header { border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 16px; }
    .quiz-title { font-size: 20px; font-weight: 700; }
    .quiz-meta { font-size: 12px; color: #555; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-top: 12px; }
    .info-field { display: flex; gap: 6px; align-items: flex-end; font-size: 12px; }
    .info-label { white-space: nowrap; font-weight: 600; }
    .info-line { flex: 1; border-bottom: 1px solid #aaa; min-width: 80px; height: 18px; }
    /* Instructions */
    .instructions { background: #f0f7ff; border: 1px solid #bce; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 12px; color: #234; }
    .instructions strong { display: block; margin-bottom: 3px; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #456; }
    /* Questions */
    .question { margin-bottom: 22px; page-break-inside: avoid; }
    .q-header { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
    .q-num { font-weight: 700; font-size: 13px; }
    .q-type { font-size: 10px; background: #eee; color: #555; padding: 1px 6px; border-radius: 10px; }
    .q-marks { font-size: 11px; color: #777; margin-left: auto; }
    .q-text { font-size: 13px; font-weight: 500; margin-bottom: 8px; line-height: 1.5; }
    /* MCQ options */
    .options { padding-left: 4px; }
    .option { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; font-size: 12px; }
    .circle { display: inline-block; width: 14px; height: 14px; border: 1.5px solid #555; border-radius: 50%; flex-shrink: 0; }
    .opt-label { font-weight: 600; min-width: 18px; }
    /* Answer lines */
    .answer-lines { margin-top: 4px; }
    .answer-line { border-bottom: 1px solid #bbb; margin-bottom: 12px; height: 10px; }
    /* Footer */
    .footer { margin-top: 24px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 11px; color: #888; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 14px 20px; }
      @page { margin: 1.2cm 1.5cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="quiz-title">${quiz.title}</div>
    <div class="quiz-meta">
      ${quiz.subject.title}${quiz.subject.grade ? ' &middot; ' + quiz.subject.grade : ''}
      &nbsp;&middot;&nbsp; ${questions.length} question${questions.length !== 1 ? 's' : ''}
      &nbsp;&middot;&nbsp; ${quiz.totalMarks} marks
      ${quiz.durationMin ? ' &middot; ' + quiz.durationMin + ' minutes' : ''}
    </div>
    <div class="info-grid">
      <div class="info-field"><span class="info-label">Student Name:</span><span class="info-line"></span></div>
      <div class="info-field"><span class="info-label">Date:</span><span class="info-line">&nbsp;${today}</span></div>
      <div class="info-field"><span class="info-label">Grade / Class:</span><span class="info-line"></span></div>
      <div class="info-field"><span class="info-label">Score:</span><span class="info-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/ ${quiz.totalMarks}</span></div>
    </div>
  </div>

  ${quiz.instructions ? `<div class="instructions"><strong>Instructions</strong>${quiz.instructions}</div>` : ''}

  ${questionHtml}

  <div class="footer">
    <span>${quiz.title} — Printed ${today}</span>
    <span>Attach completed sheet when submitting online</span>
  </div>
</body>
</html>`;
}

function printQuiz(quiz: Quiz) {
  const html = generatePrintHtml(quiz);
  const win = window.open('', '_blank', 'width=820,height=950');
  if (!win) { alert('Pop-up blocked — please allow pop-ups and try again.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  // Give the browser a moment to render before opening the print dialog
  setTimeout(() => win.print(), 400);
}

export default function QuizAttempt() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: quiz, isLoading } = useQuery<Quiz>({
    queryKey: ['quiz', id],
    queryFn: () => api.get<{ data: Quiz }>(`/quiz/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

  // Check if already submitted
  const { data: submissions = [] } = useQuery<QuizSubmission[]>({
    queryKey: ['quiz-submissions', id],
    queryFn: () => api.get<{ data: QuizSubmission[] }>(`/quiz/${id}/submissions`).then((r) => r.data.data),
    enabled: !!id,
  });

  const existing = submissions[0] ?? null;

  // Answers state: map questionId → answer string
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (quiz?.durationMin && !existing) {
      setTimeLeft(quiz.durationMin * 60);
    }
  }, [quiz, existing]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    timerRef.current = setInterval(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft]);

  if (isLoading) return <div className="flex justify-center py-32"><Spinner className="w-12 h-12" /></div>;
  if (!quiz) return <div className="flex justify-center py-32 text-slate-400">Quiz not found.</div>;

  const questions: QuizQuestion[] = quiz.questions ?? [];
  const answeredCount = questions.filter((q) => (answers[q.id] ?? '').trim().length > 0).length;

  async function handleSubmit() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (submitting) return;

    const answerArray: QuizAnswer[] = questions.map((q) => ({
      questionId: q.id,
      answer: (answers[q.id] ?? '').trim(),
    }));

    const unanswered = answerArray.filter((a) => !a.answer && !attachment).length;
    if (unanswered > 0 && !attachment) {
      const ok = confirm(`${unanswered} question${unanswered > 1 ? 's are' : ' is'} unanswered. Submit anyway?`);
      if (!ok) return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('answers', JSON.stringify(answerArray));
      if (attachment) formData.append('attachment', attachment);

      const res = await api.post<{ data: QuizSubmission }>(`/quiz/${id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Submitted! AI is reviewing your answers…');
      // Reload page to show results
      window.location.reload();
      void res;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Show results if already submitted ──
  if (existing) {
    const pct = existing.score != null && existing.maxScore != null && existing.maxScore > 0
      ? Math.round((existing.score / existing.maxScore) * 100) : null;
    const answerMap = new Map((existing.answers ?? []).map((a) => [a.questionId, a]));

    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Back */}
        <button onClick={() => navigate('/lms/quiz')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ChevronLeft size={16} /> Back to Quizzes
        </button>

        {/* Result card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 size={22} className="text-emerald-500 shrink-0" />
              <div>
                <h2 className="font-bold text-slate-800">{quiz.title}</h2>
                <p className="text-sm text-slate-500">{quiz.subject.title}{quiz.subject.grade ? ` · ${quiz.subject.grade}` : ''}</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {existing.status === 'GRADED' && pct !== null ? (
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-slate-800">{existing.score}<span className="text-xl text-slate-400">/{existing.maxScore}</span></p>
                  <p className="text-sm text-slate-500 mt-0.5">{pct}% · <ScoreBand pct={pct} /></p>
                </div>
                {existing.aiFeedback && (
                  <div className="flex-1 min-w-0 bg-brand-50 border border-brand-200 rounded-lg px-4 py-3 text-sm text-brand-700">
                    <p className="font-medium text-xs text-brand-500 uppercase tracking-wide mb-1">AI Feedback</p>
                    {existing.aiFeedback}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
                <AlertCircle size={15} /> Your submission is being reviewed. Check back shortly.
              </div>
            )}

            {/* Attachment */}
            {existing.attachmentUrl && (
              <div className="flex items-center gap-2 text-sm">
                <Upload size={13} className="text-slate-400" />
                <a href={existing.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                  View your submitted document
                </a>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Per-question results */}
        {existing.status === 'GRADED' && (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800">Answer Review</h3>
            {questions.map((q) => {
              const ans = answerMap.get(q.id);
              const correct = ans?.score === q.marks;
              const partial = ans?.score != null && ans.score > 0 && ans.score < q.marks;
              return (
                <Card key={q.id}>
                  <CardBody className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                          {Q_TYPE_ICON[q.type]}{Q_TYPE_LABEL[q.type]}
                        </div>
                        <p className="text-sm font-medium text-slate-800">{q.question}</p>
                        {q.options && (
                          <div className="mt-1 space-y-0.5">
                            {q.options.map((opt, oi) => (
                              <p key={oi} className={`text-xs px-2 py-0.5 rounded ${ans?.answer === opt ? 'bg-brand-100 text-brand-700 font-medium' : 'text-slate-500'}`}>
                                {String.fromCharCode(65 + oi)}. {opt}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={`text-sm font-bold shrink-0 px-2 py-0.5 rounded ${
                        correct ? 'bg-emerald-50 text-emerald-600' : partial ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'
                      }`}>
                        {ans?.score ?? 0}/{q.marks}
                      </div>
                    </div>

                    {q.type !== 'MCQ' && q.type !== 'TRUE_FALSE' && (
                      <div className="bg-slate-50 rounded px-3 py-2 text-sm text-slate-700">
                        <p className="text-xs text-slate-400 mb-0.5">Your answer:</p>
                        {ans?.answer || <span className="italic text-slate-400">No answer</span>}
                      </div>
                    )}

                    {ans?.feedback && (
                      <p className="text-xs text-slate-500 italic border-l-2 border-brand-200 pl-2">{ans.feedback}</p>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Attempt form ──
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Back */}
      <button onClick={() => navigate('/lms/quiz')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ChevronLeft size={16} /> Back to Quizzes
      </button>

      {/* Quiz header */}
      <Card>
        <CardBody>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${quiz.type === 'EXAM' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{quiz.type}</span>
                <span className="text-xs text-slate-500">{quiz.subject.title}</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">{quiz.title}</h1>
              <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5">
                <span>{questions.length} questions</span>
                <span>{quiz.totalMarks} total marks</span>
                {quiz.durationMin && <span className="flex items-center gap-1"><Clock size={12} />{quiz.durationMin} minutes</span>}
              </div>
            </div>

            <div className="flex items-start gap-3">
              {/* Print button */}
              <button
                onClick={() => printQuiz(quiz)}
                title="Print quiz"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 text-sm font-medium transition-colors"
              >
                <Printer size={15} />
                Print
              </button>

              {/* Timer */}
              {timeLeft !== null && (
                <div className={`text-center px-4 py-2 rounded-xl border ${timeLeft < 300 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                  <p className="text-xs font-medium uppercase tracking-wide">Time Left</p>
                  <p className="text-2xl font-bold font-mono">{formatSeconds(timeLeft)}</p>
                </div>
              )}
            </div>
          </div>

          {quiz.instructions && (
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
              <p className="font-medium text-xs text-blue-500 uppercase tracking-wide mb-1">Instructions</p>
              {quiz.instructions}
            </div>
          )}

          {/* Progress */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 bg-slate-100 rounded-full h-1.5">
              <div className="bg-brand-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.round((answeredCount / questions.length) * 100)}%` }} />
            </div>
            <p className="text-xs text-slate-500 shrink-0">{answeredCount}/{questions.length} answered</p>
          </div>
        </CardBody>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, i) => {
          const answered = (answers[q.id] ?? '').trim().length > 0;
          return (
            <Card key={q.id} className={answered ? 'border-brand-200' : ''}>
              <CardBody className="space-y-3">
                {/* Question header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <span className="font-semibold text-slate-600">Q{i + 1}</span>
                      {Q_TYPE_ICON[q.type]}
                      <span>{Q_TYPE_LABEL[q.type]}</span>
                      <span className="text-slate-300">·</span>
                      <span>{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-base font-medium text-slate-800">{q.question}</p>
                  </div>
                  {answered && <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-1" />}
                </div>

                {/* MCQ / TRUE_FALSE — radio buttons */}
                {(q.type === 'MCQ' || q.type === 'TRUE_FALSE') && (
                  <div className="space-y-2">
                    {(q.options ?? []).map((opt, oi) => (
                      <label
                        key={oi}
                        className={`flex items-center gap-3 cursor-pointer px-4 py-2.5 rounded-lg border transition-colors ${
                          answers[q.id] === opt
                            ? 'border-brand-500 bg-brand-50'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                          className="accent-brand-500"
                        />
                        <span className="text-sm text-slate-700">
                          <span className="font-medium text-slate-400 mr-2">{String.fromCharCode(65 + oi)}.</span>
                          {opt}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {/* SHORT_ANSWER — single textarea */}
                {q.type === 'SHORT_ANSWER' && (
                  <textarea
                    rows={3}
                    placeholder="Write your answer here…"
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-500 resize-none transition-colors"
                  />
                )}

                {/* ESSAY — large textarea */}
                {q.type === 'ESSAY' && (
                  <textarea
                    rows={6}
                    placeholder="Write your detailed answer here…"
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-500 resize-none transition-colors"
                  />
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Document upload */}
      <Card>
        <CardBody className="space-y-3">
          <div>
            <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Upload size={14} />Attach Document (optional)</p>
            <p className="text-xs text-slate-500 mt-0.5">You can upload your answers as a PDF, Word document, or image (max 10 MB). PDFs are automatically processed by AI for grading.</p>
          </div>
          <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-6 cursor-pointer transition-colors ${
            attachment ? 'border-brand-400 bg-brand-50' : 'border-slate-300 hover:border-brand-300 hover:bg-slate-50'
          }`}>
            <Upload size={20} className={attachment ? 'text-brand-500' : 'text-slate-400'} />
            {attachment ? (
              <div className="text-center">
                <p className="text-sm font-medium text-brand-700">{attachment.name}</p>
                <p className="text-xs text-brand-500">{(attachment.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Click to upload or drag and drop</p>
            )}
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="sr-only"
              onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
            />
          </label>
          {attachment && (
            <button onClick={() => setAttachment(null)} className="text-xs text-red-500 hover:underline">Remove file</button>
          )}
        </CardBody>
      </Card>

      {/* Submit */}
      <div className="sticky bottom-4">
        <Card className="shadow-lg border-brand-100">
          <CardBody className="flex items-center justify-between gap-4 py-3">
            <div className="text-sm text-slate-600">
              <span className="font-medium">{answeredCount}/{questions.length}</span> questions answered
              {attachment && <span className="ml-2 text-brand-600">· 1 file attached</span>}
            </div>
            <Button
              size="lg"
              onClick={handleSubmit}
              loading={submitting}
              icon={<CheckCircle2 size={16} />}
              disabled={submitting}
            >
              {submitting ? 'Submitting & Grading…' : 'Submit Quiz'}
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
