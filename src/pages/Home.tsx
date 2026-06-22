import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'motion/react';
import {
  ArrowRight, Mail, Crown, Check, Plus, Minus, Play,
  BookOpen, Star, Heart, Users, Music, Mic, Sparkles,
  Brain, Award, GraduationCap, TrendingUp,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Home — revamped landing page.
   Sections: Hero · What You'll Build · Learn·Build·Excel ·
   Pricing (Beginner/Intermediate toggle) · FAQs · Contact · CTA
   Brand stays blue (brand-*); layout inspired by a modern course page.
   Pricing numbers are PLACEHOLDERS — edit the PRICING object below.
   ───────────────────────────────────────────────────────────── */

// ── What students achieve (pastel achievement cards) ──────────────
const PROJECTS = [
  { icon: BookOpen,      title: 'Correct Makharij',            sub: 'precise articulation of every letter',  bg: 'bg-blue-50',    fg: 'text-blue-500' },
  { icon: Music,         title: 'Beautiful Tajweed',           sub: 'rules of elongation, stops & flow',     bg: 'bg-orange-50',  fg: 'text-orange-500' },
  { icon: Star,          title: 'Fluent Recitation',           sub: 'smooth, confident reading from memory', bg: 'bg-emerald-50', fg: 'text-emerald-500' },
  { icon: Heart,         title: 'Connection to the Quran',     sub: 'love and reverence for the words',      bg: 'bg-rose-50',    fg: 'text-rose-500' },
  { icon: Mic,           title: 'Proper Pronunciation',        sub: 'authentic Arabic sound production',     bg: 'bg-violet-50',  fg: 'text-violet-500' },
  { icon: Users,         title: 'Surahs Memorised',            sub: 'key chapters retained for life',        bg: 'bg-amber-50',   fg: 'text-amber-600' },
  { icon: Sparkles,      title: 'Quranic Confidence',          sub: 'recite with clarity in any setting',    bg: 'bg-pink-50',    fg: 'text-pink-500' },
];

// ── Learn · Recite · Excel (progression cards) ───────────────────
const TRACKS = [
  {
    icon: Brain, top: 'border-t-emerald-400', badge: 'bg-emerald-500', accent: 'text-emerald-600',
    level: 'Beginner', tagline: 'Arabic letters & sounds', title: 'Learn the Alphabet',
    bullets: ['Recognise all Arabic letters', 'Correct letter pronunciation', 'Short vowels & sukoon', 'Read simple words'],
    tools: ['Noorani Qaida', 'Basic Tajweed'], pill: 'bg-emerald-50 text-emerald-700',
  },
  {
    icon: Award, top: 'border-t-sky-400', badge: 'bg-sky-500', accent: 'text-sky-600',
    level: 'Elementary', tagline: 'Words to sentences', title: 'Read Full Ayahs',
    bullets: ['Tanween & long vowels', 'Joining letters smoothly', 'Read Juz Amma surahs', 'Introduction to Tajweed rules'],
    tools: ['Juz Amma', 'Tajweed Basics'], pill: 'bg-sky-50 text-sky-700',
  },
  {
    icon: GraduationCap, top: 'border-t-violet-400', badge: 'bg-violet-500', accent: 'text-violet-600',
    level: 'Intermediate', tagline: 'Rules & fluency', title: 'Master Tajweed Rules',
    bullets: ['Madd (elongation) rules', 'Ghunna & idghaam', 'Waqf (stopping) rules', 'Fluent continuous recitation'],
    tools: ['Full Tajweed', 'Selected Surahs'], pill: 'bg-violet-50 text-violet-700',
  },
  {
    icon: TrendingUp, top: 'border-t-orange-400', badge: 'bg-orange-500', accent: 'text-orange-600',
    level: 'Advanced', tagline: 'Recite like a Qari', title: 'Beautiful Recitation',
    bullets: ['Complete Tajweed mastery', 'Tarteel & proper rhythm', 'Memorise key surahs', 'Recite with confidence'],
    tools: ['Advanced Tajweed', 'Hifz Support'], pill: 'bg-orange-50 text-orange-700',
  },
];

// ── Pricing ─────────────────────────────────────────────────────
// All prices in USD, shown to every visitor (no conversion — see fmtUsd above).
//   1:1   = $40 per session
//   Group = $150 per month
type Plan = {
  key: '1:1' | 'Group';
  name: string;
  usdPrice: number;
  unit: string;      // shown after the price, e.g. "/ session" or "/ month"
  note: string;
  includes: string[];
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    key: '1:1',
    name: '1-on-1 Classes',
    usdPrice: 40,
    unit: 'USD / session',
    note: 'Private, one-on-one',
    includes: [
      'Format: private 1:1 sessions via Zoom',
      'Dedicated personal Quran teacher',
      'Pay as you go — book any number of sessions',
      'Fully personalised pace & curriculum',
      'Live sessions + progress tracking via LMS',
    ],
    featured: true,
  },
  {
    key: 'Group',
    name: 'Group Classes',
    usdPrice: 150,
    unit: 'USD / month',
    note: 'Small group (minimum 5 students)',
    includes: [
      'Format: small group (minimum 5 students)',
      'Shared expert Quran teacher',
      '8 live sessions per month',
      'Peer learning & group recitation practice',
      'Live sessions + progress tracking via LMS',
    ],
  },
];

// ── FAQs ────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'What devices are required for online Quran classes?',
    a: 'A tablet with a keyboard or a laptop works best. Classes are conducted via Zoom — students need a working camera, microphone, and a stable internet connection. A phone can be used for viewing but a larger screen is recommended.',
  },
  {
    q: 'What happens when my course is finished?',
    a: 'On completion you receive a certificate confirming your Tajweed level. We also guide you on next steps — continuing to higher Tajweed levels, starting Hifz (memorisation), or joining a group recitation circle.',
  },
  {
    q: 'How do I track my child\'s progress?',
    a: 'Every student has a personal progress dashboard in the LMS showing completed lessons, quiz scores, and recitation milestones. Your teacher shares feedback after every session.',
  },
  {
    q: 'Can I contact the teacher directly?',
    a: 'Yes. All 1:1 sessions are with your dedicated Quran teacher, and you can reach them between sessions through the in-app chat for questions and recitation practice guidance.',
  },
];

/* ── Pricing display ──────────────────────────────────────────
   Prices are shown in USD for everyone — one stable price worldwide,
   no FX drift and no ambiguous "$" (a Canadian seeing $40 USD as $56 CAD).
   ───────────────────────────────────────────────────────────── */
function fmtUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}

/* ── Hero media ───────────────────────────────────────────────
   Drop your footage at:  public/hero.mp4  (and optionally public/hero.webm)
   And a poster still at:  public/hero-poster.jpg
   Behaviour:
   - Desktop + reduced-motion off + video present → autoplay muted loop video.
   - Mobile / reduced-motion / video error → poster image.
   - Neither asset present → branded gradient placeholder (never broken).
   Recommendation: keep hero.mp4 ≤ ~3 MB, 1280×960-ish, 10–20s loop.
   ───────────────────────────────────────────────────────────── */
function HeroMedia() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [needsTap, setNeedsTap] = useState(false); // true when autoplay was blocked

  function tryPlay() {
    const v = videoRef.current;
    if (!v) return;
    v.play()
      .then(() => setNeedsTap(false))
      .catch(() => setNeedsTap(true)); // blocked → show play overlay
  }

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return; // honor accessibility preference — leave poster showing
    // Safari quirk: React's `muted` JSX prop isn't reliably reflected to the DOM,
    // so Safari treats the video as unmuted and refuses to autoplay. Force it here.
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute('muted', '');
    tryPlay();
    // Safari often isn't ready at mount — retry once metadata is loaded.
    v.addEventListener('loadeddata', tryPlay, { once: true });
    return () => v.removeEventListener('loadeddata', tryPlay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Branded fallback only if the video itself errors AND the poster image is missing.
  if (videoFailed && posterFailed) {
    return (
      <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
        <span className="text-brand-500/70 font-display font-semibold text-lg px-6 text-center">
          Add hero footage<br />
          <span className="text-sm font-normal">public/hero.mp4 + hero-poster.jpg</span>
        </span>
      </div>
    );
  }

  return (
    <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-xl bg-gradient-to-br from-brand-100 to-brand-200 relative">
      {!videoFailed ? (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/hero-poster.jpg"
            onError={() => setVideoFailed(true)}
          >
            <source src="/hero.mp4" type="video/mp4" />
          </video>
          {needsTap && (
            <button
              type="button"
              onClick={tryPlay}
              aria-label="Play video"
              className="absolute inset-0 flex items-center justify-center bg-black/15 hover:bg-black/25 transition-colors group"
            >
              <span className="w-16 h-16 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Play className="w-7 h-7 text-brand-600 fill-brand-600 ml-0.5" />
              </span>
            </button>
          )}
        </>
      ) : (
        <img
          src="/hero-poster.jpg"
          alt="Students building AI projects"
          className="w-full h-full object-cover"
          onError={() => setPosterFailed(true)}
        />
      )}
    </div>
  );
}

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="overflow-hidden">
      <Helmet>
        <title>Online Quran Academy | Learn Quran Recitation &amp; Tajweed</title>
        <meta name="description" content="1:1 online Quran recitation classes for children and adults. Learn Tajweed, proper pronunciation, and beautiful recitation with expert Quran teachers." />
        <link rel="canonical" href="https://qurankidslearning.com/" />
        <meta property="og:url" content="https://qurankidslearning.com/" />
        <meta property="og:title" content="Online Quran Academy | Learn Quran Recitation & Tajweed" />
        <meta property="og:description" content="1:1 online Quran recitation classes for children and adults. Learn Tajweed, proper pronunciation, and beautiful recitation with expert Quran teachers." />
      </Helmet>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-brand-50 via-white to-brand-50/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide text-brand-700 uppercase bg-brand-100 rounded-full">
                Premium 1:1 Quran Recitation Classes
              </span>
              <h1 className="text-4xl lg:text-6xl font-display font-bold text-slate-900 leading-[1.1] mb-6">
                Learn Quran recitation <span className="text-brand-600">the right way</span>.
              </h1>
              <p className="text-lg lg:text-xl text-slate-600 mb-8 leading-relaxed max-w-xl">
                Give your child the gift of beautiful Quran recitation. Our expert teachers guide every student
                <em> 1:1 </em> — from recognising Arabic letters all the way to
                <strong className="text-slate-800 font-semibold"> fluent Tajweed recitation</strong>.
                Every lesson is personalised, live, and taught by a
                <strong className="text-slate-800 font-semibold"> certified Quran teacher</strong> who
                ensures correct pronunciation from day one.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                <Link
                  to="/book"
                  className="bg-brand-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-brand-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center group"
                >
                  Book a free trial class
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <p className="text-slate-500">
                <span className="line-through mr-2">{fmtUsd(40)}</span>
                <span className="text-2xl font-bold text-slate-900 mr-2">{fmtUsd(0)}</span>
                for the first class
                <span className="ml-2 font-semibold text-emerald-600">100% free</span>
              </p>
            </motion.div>

            {/* Hero media — autoplay video, gracefully degrades to poster → placeholder */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative"
            >
              <HeroMedia />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── What We Teach ────────────────────────────────────── */}
      <section className="py-12 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-10">What students learn in our program</p>
          <div className="flex flex-wrap items-center justify-center gap-10 lg:gap-14">
            {[
              { label: 'Noorani Qaida' },
              { label: 'Arabic Alphabet' },
              { label: 'Makharij' },
              { label: 'Basic Tajweed' },
              { label: 'Juz Amma' },
              { label: 'Advanced Tajweed' },
              { label: 'Tarteel' },
              { label: 'Hifz Support' },
            ].map(({ label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-xl bg-brand-50 flex items-center justify-center">
                  <span className="text-brand-600 text-2xl">☪</span>
                </div>
                <span className="text-xs font-medium text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What Will Your Child Build? ───────────────────────── */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-3">What Will Your Child Achieve?</h2>
            <p className="text-slate-500">Real milestones — skills and recitation quality that last a lifetime.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {PROJECTS.map(({ icon: Icon, title, sub, bg, fg }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className={`${bg} rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[180px]`}
              >
                <Icon className={`w-10 h-10 mb-4 ${fg}`} strokeWidth={1.75} />
                <h3 className="font-bold text-slate-800 leading-snug mb-1">{title}</h3>
                <p className="text-sm text-slate-500 leading-snug">{sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Learn · Build · Excel ─────────────────────────────── */}
      <section className="py-20 lg:py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-3">
              Learn <span className="text-slate-300">·</span> Recite <span className="text-slate-300">·</span> Excel
            </h2>
            <p className="text-slate-500">A clear progression from Arabic letters to beautiful, rule-perfect recitation.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TRACKS.map(({ icon: Icon, top, badge, accent, level, tagline, title, bullets, tools, pill }) => (
              <div key={level} className={`bg-white rounded-2xl border border-slate-100 border-t-4 ${top} shadow-sm p-6 flex flex-col`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-11 h-11 rounded-xl ${badge} flex items-center justify-center text-white shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 leading-tight">{level}</p>
                    <p className="text-sm text-slate-400">{tagline}</p>
                  </div>
                </div>
                <h3 className={`text-lg font-bold mb-4 ${accent}`}>{title}</h3>
                <ul className="space-y-2 mb-6 flex-1">
                  {bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-sm text-slate-600">
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${badge} shrink-0`} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-bold text-slate-700 mb-2">Tools Used</p>
                <div className="flex flex-wrap gap-2">
                  {tools.map((t) => (
                    <span key={t} className={`text-xs font-medium px-3 py-1 rounded-full ${pill}`}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────── */}
      <section className="py-20 lg:py-24 bg-gradient-to-br from-brand-50/60 via-white to-brand-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-3">Simple, transparent pricing</h2>
            <p className="text-slate-500">Choose private 1:1 classes or a small group. Cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto items-stretch">
            {PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`relative bg-white rounded-3xl p-7 flex flex-col shadow-sm ${
                  plan.featured ? 'ring-2 ring-brand-500 md:-translate-y-3 shadow-xl' : 'border border-slate-100'
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold uppercase tracking-wide bg-gradient-to-r from-brand-500 to-brand-600 text-white px-3 py-1 rounded-full shadow">
                    Most popular
                  </span>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-5 h-5 text-slate-800" />
                  <span className="font-bold text-lg text-slate-900">{plan.name}</span>
                </div>
                <p className="text-brand-600 font-semibold mb-4">{plan.note}</p>
                <div className="flex items-baseline gap-1.5 mb-6">
                  <span className="text-4xl font-display font-bold text-slate-900">
                    {fmtUsd(plan.usdPrice)}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">{plan.unit}</span>
                </div>
                <div className="border-t border-slate-100 pt-5 mb-6">
                  <p className="font-bold text-slate-900 mb-3">What's included:</p>
                  <ul className="space-y-3">
                    {plan.includes.map((f) => (
                      <li key={f} className="flex gap-2 text-sm text-slate-600">
                        <Check className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  to="/book"
                  className={`mt-auto block text-center py-3.5 rounded-full font-bold transition-all ${
                    plan.featured
                      ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg hover:shadow-xl'
                      : 'bg-brand-100 text-brand-700 hover:bg-brand-200'
                  }`}
                >
                  Enroll now
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-400 mt-6">
            All prices in US dollars (USD). Your first class is free — no card required.
          </p>
        </div>
      </section>

      {/* ── FAQs ──────────────────────────────────────────────── */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-10">FAQs</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={i}
                  className={`rounded-2xl transition-colors ${open ? 'bg-slate-50' : ''}`}
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-start justify-between gap-4 text-left px-6 py-5"
                    aria-expanded={open}
                  >
                    <span className="flex-1">
                      <span className="font-bold text-slate-900 text-lg">Q. {faq.q}</span>
                      {open && <span className="block mt-2 text-slate-500 leading-relaxed">A. {faq.a}</span>}
                    </span>
                    <span className="shrink-0 w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center text-slate-600">
                      {open ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Contact ───────────────────────────────────────────── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">Get in Touch</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Have questions about our programs? We'd love to hear from you. Reach out via email or chat with us instantly on WhatsApp.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <a
              href="mailto:contact@qurankidslearning.com"
              className="group flex flex-col items-center gap-5 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md hover:border-brand-200 transition-all duration-200 text-center"
            >
              <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                <Mail className="w-7 h-7 text-brand-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">Email Us</h3>
                <p className="text-slate-500 text-sm mb-3">We reply within 24 hours</p>
                <span className="text-brand-600 font-semibold text-sm group-hover:underline">contact@qurankidslearning.com</span>
              </div>
            </a>

            <a
              href={`https://wa.me/16474681114?text=${encodeURIComponent("Hello! I'm interested in Quran recitation classes at Online Quran Academy. Can you tell me more?")}`}
              target="_blank"
              rel="noreferrer"
              className="group flex flex-col items-center gap-5 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md hover:border-[#25D366]/40 transition-all duration-200 text-center"
            >
              <div className="w-14 h-14 bg-[#25D366]/10 rounded-2xl flex items-center justify-center group-hover:bg-[#25D366]/20 transition-colors">
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#25D366]">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">WhatsApp</h3>
                <p className="text-slate-500 text-sm mb-3">Chat with us instantly</p>
                <span className="text-[#25D366] font-semibold text-sm group-hover:underline">+1 (647) 468-1114</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="py-24 bg-brand-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-8">Ready to start your Quran journey?</h2>
          <p className="text-brand-100 text-xl mb-10">Start with a free 30-minute trial class. We'll assess your child's level and create a personalised recitation plan.</p>
          <Link to="/book" className="inline-block bg-white text-brand-600 px-10 py-5 rounded-full font-bold text-xl hover:bg-brand-50 transition-all shadow-xl">
            Book Free Trial Class Now
          </Link>
        </div>
      </section>
    </div>
  );
}
