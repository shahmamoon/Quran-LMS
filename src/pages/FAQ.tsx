import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronDown, ChevronUp } from 'lucide-react';

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What is Online Quran Academy?', acceptedAnswer: { '@type': 'Answer', text: 'Online Quran Academy is a premium 1:1 Quran recitation platform for students of all ages. We teach correct Tajweed, proper Arabic pronunciation, and beautiful recitation through live Zoom sessions with certified Quran teachers.' } },
    { '@type': 'Question', name: 'Who is this programme for?', acceptedAnswer: { '@type': 'Answer', text: 'Our programmes are designed for learners of all ages — from young children (ages 5+) just learning the Arabic alphabet, to adults wishing to improve their recitation or Tajweed.' } },
    { '@type': 'Question', name: 'What will my child actually learn?', acceptedAnswer: { '@type': 'Answer', text: 'Students learn correct Arabic letter pronunciation (Makharij), the rules of Tajweed, fluent recitation, and selected Surahs. The curriculum is practical — students recite aloud every lesson with immediate teacher feedback.' } },
    { '@type': 'Question', name: 'How are sessions conducted?', acceptedAnswer: { '@type': 'Answer', text: 'All live sessions are conducted via Zoom. Sessions are interactive — students recite aloud, receive real-time correction, and get immediate feedback on their pronunciation and Tajweed.' } },
    { '@type': 'Question', name: 'Is there a free trial?', acceptedAnswer: { '@type': 'Answer', text: 'Yes! Every new student starts with a free trial class. This 30-minute session helps us assess your child\'s current level and place them in the right programme track.' } },
    { '@type': 'Question', name: 'How much does it cost?', acceptedAnswer: { '@type': 'Answer', text: 'Pricing depends on the programme track and session frequency. We offer flexible packages. Contact us or book a free trial class to discuss the right plan for your child.' } },
    { '@type': 'Question', name: 'Is the platform safe for children?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Student accounts are created by our administrative team — students cannot self-register. All chat and session activity is supervised. We collect only the minimum personal information necessary.' } },
    { '@type': 'Question', name: 'What equipment does my child need?', acceptedAnswer: { '@type': 'Answer', text: 'A tablet with keyboard or laptop with a working camera and microphone, a stable internet connection, and a modern browser (Chrome, Firefox, or Safari).' } },
  ],
};

const faqs = [
  {
    category: 'About the Programme',
    items: [
      {
        q: 'What is Online Quran Academy?',
        a: 'Online Quran Academy is a premium 1:1 Quran recitation platform for students of all ages. We teach correct Arabic pronunciation, Tajweed rules, and beautiful recitation through live Zoom sessions with certified Quran teachers.',
      },
      {
        q: 'Who is this programme for?',
        a: 'Our programmes are designed for learners of all ages — from young children (ages 5+) just learning the Arabic alphabet, to adults seeking to improve their Tajweed or recitation quality. We have tracks for complete beginners through to advanced students.',
      },
      {
        q: 'What will my child actually learn?',
        a: 'Students learn correct Arabic letter pronunciation (Makharij), the rules of Tajweed, smooth and fluent recitation (Tarteel), and key Surahs. The curriculum is fully practical — students recite aloud every lesson with real-time teacher correction.',
      },
      {
        q: 'How is this different from other Quran classes?',
        a: 'Most online Quran classes are one teacher to many students. Every student with us gets 1:1 attention from a certified teacher, meaning mistakes are caught and corrected immediately. Sessions are live — not pre-recorded videos — with a dedicated teacher who knows your child\'s exact level and needs.',
      },
    ],
  },
  {
    category: 'Sessions & Scheduling',
    items: [
      {
        q: 'How are sessions conducted?',
        a: 'All live sessions are conducted via Zoom. Students receive a Zoom link before each session. Sessions are fully interactive — students recite aloud while the teacher listens, corrects pronunciation, and guides Tajweed rules in real time.',
      },
      {
        q: 'How long is each session?',
        a: 'Sessions are typically 30 to 60 minutes depending on the student\'s age and programme. Younger children (ages 5–8) usually start with 30-minute sessions. Your schedule and session length are agreed upon during the free trial class.',
      },
      {
        q: 'How do I book a session?',
        a: 'New students start with a free trial class. Click "Book a Free Trial" on our website to choose a time that works for you. Once enrolled, your regular session schedule is set up through the LMS portal.',
      },
      {
        q: 'What happens if I need to cancel or reschedule?',
        a: 'Please give at least 24 hours notice to cancel or reschedule. Sessions cancelled with less than 24 hours notice may be charged. Sessions cancelled by the teacher with less than 24 hours notice will be rescheduled at no cost to you.',
      },
      {
        q: 'Are sessions recorded?',
        a: 'Sessions are not routinely recorded. If you would like a recording for review purposes, please discuss this with your teacher before the session. Any recording requires consent from all participants.',
      },
    ],
  },
  {
    category: 'The LMS Platform',
    items: [
      {
        q: 'What is the LMS portal?',
        a: 'The Learning Management System (LMS) at qurankidslearning.com/lms is where students access their curriculum, complete recitation quizzes, track progress, chat with their teacher, and join Zoom sessions. It works on any modern browser — no downloads required.',
      },
      {
        q: 'How do students get access to the LMS?',
        a: 'Once enrolled, we create your account and send login credentials to the parent\'s email. Students log in with their email and password. Parents can request account access to monitor their child\'s progress.',
      },
      {
        q: 'How is progress tracked?',
        a: 'Every student has a personal progress dashboard showing completed lessons, quiz scores, and recitation milestones. Teachers update progress after each session so parents always know how their child is advancing.',
      },
      {
        q: 'How are quizzes graded?',
        a: 'Quizzes on Tajweed rules and Arabic letters are graded automatically with instant scores and per-question feedback. Teachers review results and add personal feedback for each student.',
      },
    ],
  },
  {
    category: 'Pricing & Payments',
    items: [
      {
        q: 'How much does it cost?',
        a: 'Pricing depends on the programme track and session frequency. We offer flexible packages starting from individual sessions to monthly and term-based plans. Contact us or book a free trial class to discuss the right plan for your child.',
      },
      {
        q: 'Is there a free trial?',
        a: 'Yes! Every new student starts with a free trial class. This 30-minute session helps us assess your child\'s current recitation level, place them in the right track, and set clear learning goals.',
      },
      {
        q: 'What is your refund policy?',
        a: 'Refund requests must be submitted within 7 days of the session date in question. We review each request individually. Unused sessions in a package can be transferred to a future period with at least 72 hours notice. Please see our Terms of Use for full details.',
      },
    ],
  },
  {
    category: 'Safety & Privacy',
    items: [
      {
        q: 'Is the platform safe for children?',
        a: 'Yes. Student accounts are created by our administrative team — students cannot self-register. All chat and session activity is supervised. We collect only the minimum personal information necessary to deliver the education service.',
      },
      {
        q: 'Who can see my child\'s data and progress?',
        a: 'Only the assigned teacher, the student, and our administrators can access a student\'s profile, progress, and submissions. We do not share personal data with third parties for marketing purposes.',
      },
      {
        q: 'Do you comply with children\'s privacy laws?',
        a: 'Yes. We follow applicable privacy regulations including COPPA principles for students under 13. Parents can request to view, update, or delete their child\'s data at any time by emailing privacy@qurankidslearning.com.',
      },
    ],
  },
  {
    category: 'Technical Requirements',
    items: [
      {
        q: 'What equipment does my child need?',
        a: 'A tablet with keyboard or laptop (Mac or Windows) with a working camera and microphone, a stable internet connection, and a modern browser (Chrome, Firefox, or Safari). A phone can be used for viewing but a larger screen is recommended for following the Quran text.',
      },
      {
        q: 'Do I need to install anything?',
        a: 'The LMS runs entirely in the browser — no installation needed. For live sessions, Zoom can be used in the browser or via the free Zoom desktop app. No other software is required.',
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-brand-300 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-300"
    >
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        <span className="font-semibold text-slate-800 text-sm">{q}</span>
        {open
          ? <ChevronUp size={18} className="text-brand-500 shrink-0" />
          : <ChevronDown size={18} className="text-slate-400 shrink-0" />
        }
      </div>
      {open && (
        <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
          {a}
        </div>
      )}
    </button>
  );
}

export default function FAQ() {
  const [search, setSearch] = useState('');

  const filtered = faqs.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        !search ||
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>FAQ | Quran Recitation Classes | Online Quran Academy</title>
        <meta name="description" content="Answers to common questions about our 1:1 Quran recitation programmes — sessions, pricing, Tajweed, platform access, children's safety, and technical requirements." />
        <link rel="canonical" href="https://qurankidslearning.com/faq" />
        <meta property="og:url" content="https://qurankidslearning.com/faq" />
        <meta property="og:title" content="FAQ | Quran Recitation Classes | Online Quran Academy" />
        <meta property="og:description" content="Answers to common questions about our 1:1 Quran recitation programmes — sessions, pricing, Tajweed, platform access, children's safety, and technical requirements." />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Frequently Asked Questions</h1>
          <p className="text-slate-500 text-sm mb-8">Everything you need to know about our Quran recitation programmes and platform.</p>

          {/* Search */}
          <div className="max-w-md mx-auto relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions…"
              className="w-full px-4 py-3 pl-11 border border-slate-300 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-brand-300 focus:border-brand-500 bg-white shadow-sm"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* FAQ content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium">No results for "{search}"</p>
            <p className="text-sm mt-2">Try different keywords or <button onClick={() => setSearch('')} className="text-brand-600 hover:underline">clear the search</button>.</p>
          </div>
        ) : (
          filtered.map((cat) => (
            <div key={cat.category}>
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="inline-block w-1 h-5 bg-brand-500 rounded-full" />
                {cat.category}
              </h2>
              <div className="space-y-2">
                {cat.items.map((item) => (
                  <FAQItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))
        )}

        {/* Still have questions */}
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-8 text-center">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Still have questions?</h3>
          <p className="text-slate-600 text-sm mb-6">We're happy to help. Reach out and we'll get back to you within one business day.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:contact@qurankidslearning.com"
              className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
            >
              Email Us
            </a>
            <Link
              to="/book"
              className="inline-flex items-center justify-center gap-2 bg-white border border-brand-300 text-brand-600 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-50 transition-colors"
            >
              Book Free Assessment
            </Link>
          </div>
        </div>

        {/* Footer links */}
        <div className="text-center space-x-6 text-sm text-slate-500">
          <Link to="/" className="hover:text-brand-600 transition-colors">← Back to Home</Link>
          <Link to="/privacy" className="hover:text-brand-600 transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-brand-600 transition-colors">Terms of Use</Link>
        </div>
      </div>
    </div>
  );
}
