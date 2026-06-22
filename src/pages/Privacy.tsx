import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Privacy Policy | Online Quran Academy</title>
        <meta name="description" content="Learn how Online Quran Academy collects, uses, and protects your information on our Quran recitation platform. We take children's privacy seriously." />
        <link rel="canonical" href="https://qurankidslearning.com/privacy" />
        <meta property="og:url" content="https://qurankidslearning.com/privacy" />
        <meta property="og:title" content="Privacy Policy | Online Quran Academy" />
      </Helmet>

      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Privacy Policy</h1>
          <p className="text-slate-500 text-sm">Last updated: May 30, 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 space-y-10 text-slate-700 leading-relaxed">

          <section>
            <p className="text-slate-600">
              At <strong>Online Quran Academy</strong> ("we", "us", or "our"), we are committed to protecting the privacy of our students, parents, and users. This Privacy Policy explains how we collect, use, and safeguard your information when you use our learning management platform at <strong>qurankidslearning.com</strong>.
            </p>
            <p className="text-slate-600 mt-4">
              Because our platform serves students under the age of 18, we take children's privacy especially seriously and comply with applicable privacy laws including COPPA (Children's Online Privacy Protection Act) where applicable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">1. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Account Information</h3>
                <p>When you register, we collect your first and last name, email address, and a password. For student accounts, we also collect the student's grade level to personalise their learning experience.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Usage Data</h3>
                <p>We collect information about how you interact with our platform — lessons viewed, quiz submissions, session attendance, and progress milestones — solely to deliver and improve our educational services.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Communications</h3>
                <p>Messages sent through our in-app chat feature are stored to enable communication between teachers and students and to ensure a safe learning environment.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Uploaded Files</h3>
                <p>Files submitted for quizzes or attached to lessons are stored securely and accessible only to the relevant teacher and student.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>To provide, operate, and maintain the learning platform</li>
              <li>To personalise curriculum, quizzes, and session recommendations</li>
              <li>To track and display student progress to the student and their assigned teacher</li>
              <li>To facilitate live Zoom sessions between teachers and students</li>
              <li>To send important account notifications (session reminders, graded assignments)</li>
              <li>To ensure platform security and prevent misuse</li>
            </ul>
            <p className="text-slate-600 mt-4">
              We do <strong>not</strong> sell, rent, or share your personal information with third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">3. Children's Privacy</h2>
            <p className="text-slate-600">
              Our platform is designed for students aged 10 and above. Student accounts are created by a parent, guardian, or our administrative staff — students do not self-register. We collect only the minimum information necessary to provide educational services.
            </p>
            <p className="text-slate-600 mt-4">
              Parents or guardians may request to review, update, or delete their child's personal information at any time by contacting us at <a href="mailto:privacy@qurankidslearning.com" className="text-brand-600 hover:underline">privacy@qurankidslearning.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">4. Third-Party Services</h2>
            <p className="text-slate-600">We use the following trusted third-party services to deliver our platform:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-600 mt-3">
              <li><strong>Zoom</strong> — for live tutoring sessions (subject to Zoom's Privacy Policy)</li>
              <li><strong>Zoom</strong> — for live recitation sessions (subject to Zoom's Privacy Policy)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">5. Data Security</h2>
            <p className="text-slate-600">
              We implement industry-standard security measures including encrypted connections (HTTPS/TLS), bcrypt-hashed passwords, short-lived authentication tokens, and role-based access controls. Access to student data is restricted to assigned teachers and administrators only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">6. Data Retention</h2>
            <p className="text-slate-600">
              We retain account and learning data for as long as the account is active. When an account is deactivated, personal data is soft-deleted and no longer accessible via the platform. Upon written request, we will permanently delete all associated personal data within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">7. Your Rights</h2>
            <p className="text-slate-600">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-600 mt-3">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your account and personal data</li>
              <li>Withdraw consent at any time (where processing is consent-based)</li>
            </ul>
            <p className="text-slate-600 mt-4">
              To exercise any of these rights, contact us at <a href="mailto:privacy@qurankidslearning.com" className="text-brand-600 hover:underline">privacy@qurankidslearning.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">8. Changes to This Policy</h2>
            <p className="text-slate-600">
              We may update this Privacy Policy from time to time. We will notify registered users by email and post the updated policy on this page with a revised "Last updated" date. Continued use of the platform after changes take effect constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">9. Contact Us</h2>
            <p className="text-slate-600">
              If you have any questions or concerns about this Privacy Policy, please contact us:
            </p>
            <div className="mt-4 bg-slate-50 rounded-xl p-5 border border-slate-200 text-sm text-slate-700 space-y-1">
              <p className="font-semibold text-slate-900">Online Quran Academy</p>
              <p>Email: <a href="mailto:privacy@qurankidslearning.com" className="text-brand-600 hover:underline">privacy@qurankidslearning.com</a></p>
              <p>Website: <a href="https://qurankidslearning.com" className="text-brand-600 hover:underline">qurankidslearning.com</a></p>
            </div>
          </section>

        </div>

        {/* Back link */}
        <div className="text-center mt-10 space-x-6 text-sm text-slate-500">
          <Link to="/" className="hover:text-brand-600 transition-colors">← Back to Home</Link>
          <Link to="/terms" className="hover:text-brand-600 transition-colors">Terms of Use</Link>
        </div>
      </div>
    </div>
  );
}
