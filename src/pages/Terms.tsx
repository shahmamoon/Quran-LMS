import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Terms of Use | Online Quran Academy</title>
        <meta name="description" content="Read the Terms of Use for Online Quran Academy — acceptable use, sessions, payments, intellectual property, and governing law." />
        <link rel="canonical" href="https://qurankidslearning.com/terms" />
        <meta property="og:url" content="https://qurankidslearning.com/terms" />
        <meta property="og:title" content="Terms of Use | Online Quran Academy" />
      </Helmet>

      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Terms of Use</h1>
          <p className="text-slate-500 text-sm">Last updated: May 30, 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 space-y-10 text-slate-700 leading-relaxed">

          <section>
            <p className="text-slate-600">
              Please read these Terms of Use carefully before using the <strong>Online Quran Academy</strong> platform ("Platform", "Service"). By accessing or using our Service, you agree to be bound by these Terms. If you do not agree, please do not use the Platform.
            </p>
            <p className="text-slate-600 mt-4">
              For students under 18, a parent or guardian must review and accept these Terms on their behalf.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">1. About Our Service</h2>
            <p className="text-slate-600">
              Online Quran Academy provides an online learning management platform offering Quran recitation curriculum, live 1:1 sessions with certified Quran teachers, recitation quizzes, and progress tracking for students of all ages. The Platform is accessed at <strong>qurankidslearning.com</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">2. Accounts and Eligibility</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Student accounts are created by our administrative team or an assigned teacher — not directly by the student.</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>You must not share your account with anyone else.</li>
              <li>You must notify us immediately if you suspect unauthorised access to your account.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">3. Acceptable Use</h2>
            <p className="text-slate-600 mb-3">You agree to use the Platform only for lawful educational purposes. You must not:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Share, reproduce, or distribute any course content, quizzes, or curriculum materials without written permission</li>
              <li>Use the platform to harass, bully, or harm other users</li>
              <li>Attempt to access accounts, data, or systems you are not authorised to access</li>
              <li>Upload malicious files or attempt to disrupt the Platform's operation</li>
              <li>Use AI-generated quiz answers or other academic dishonesty during assessments</li>
              <li>Impersonate any person or entity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">4. Live Sessions</h2>
            <p className="text-slate-600">
              Quran recitation sessions are conducted via Zoom. By participating, you agree to Zoom's Terms of Service. Sessions may not be recorded by students without prior written consent from the teacher and parent/guardian. Online Quran Academy reserves the right to record sessions for quality assurance and safeguarding purposes with prior notice.
            </p>
            <p className="text-slate-600 mt-4">
              Students are expected to join sessions on time, maintain a respectful environment, and have a working camera and microphone unless otherwise agreed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">5. Payments and Refunds</h2>
            <p className="text-slate-600">
              Programme fees are agreed at the time of enrolment. Payments are due as specified in your enrolment agreement. Refund requests must be submitted in writing to <a href="mailto:contact@qurankidslearning.com" className="text-brand-600 hover:underline">contact@qurankidslearning.com</a> within 7 days of the session date in question. We review refund requests case by case.
            </p>
            <p className="text-slate-600 mt-4">
              Sessions cancelled by a teacher with less than 24 hours notice will be rescheduled at no additional cost.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">6. Intellectual Property</h2>
            <p className="text-slate-600">
              All curriculum content, lesson materials, quiz questions, and platform design are the intellectual property of Online Quran Academy. You may not copy, reproduce, modify, distribute, or create derivative works from any content on the Platform without prior written permission.
            </p>
            <p className="text-slate-600 mt-4">
              Content submitted by students (quiz answers, uploaded files) remains the student's own work. By submitting content, you grant us a limited licence to store and process it solely for the purpose of delivering educational feedback.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">7. Platform Features</h2>
            <p className="text-slate-600">
              Our platform provides quiz questions and progress tracking to support Quran recitation learning. Automated quiz feedback is provided for educational purposes. Teachers review student progress and provide personalised guidance in every session.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">8. Limitation of Liability</h2>
            <p className="text-slate-600">
              To the fullest extent permitted by law, Online Quran Academy shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform. Our total liability for any claim shall not exceed the fees paid by you in the three months preceding the claim.
            </p>
            <p className="text-slate-600 mt-4">
              We do not warrant that the Platform will be uninterrupted, error-free, or free of viruses. We are not responsible for any loss of data caused by factors outside our reasonable control.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">9. Termination</h2>
            <p className="text-slate-600">
              We may suspend or terminate your access to the Platform at any time if you violate these Terms, without prior notice. You may request account deletion at any time by contacting us. Upon termination, your right to use the Platform ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">10. Governing Law</h2>
            <p className="text-slate-600">
              These Terms are governed by the laws of Ontario, Canada, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Ontario.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">11. Changes to These Terms</h2>
            <p className="text-slate-600">
              We may update these Terms from time to time. We will notify registered users by email and update the "Last updated" date above. Continued use of the Platform after changes constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">12. Contact Us</h2>
            <p className="text-slate-600">
              For any questions about these Terms, please reach out:
            </p>
            <div className="mt-4 bg-slate-50 rounded-xl p-5 border border-slate-200 text-sm text-slate-700 space-y-1">
              <p className="font-semibold text-slate-900">Online Quran Academy</p>
              <p>Email: <a href="mailto:contact@qurankidslearning.com" className="text-brand-600 hover:underline">contact@qurankidslearning.com</a></p>
              <p>Website: <a href="https://qurankidslearning.com" className="text-brand-600 hover:underline">qurankidslearning.com</a></p>
            </div>
          </section>

        </div>

        {/* Back link */}
        <div className="text-center mt-10 space-x-6 text-sm text-slate-500">
          <Link to="/" className="hover:text-brand-600 transition-colors">← Back to Home</Link>
          <Link to="/privacy" className="hover:text-brand-600 transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
