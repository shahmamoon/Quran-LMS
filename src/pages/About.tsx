import { Helmet } from 'react-helmet-async';
import { motion } from 'motion/react';
import { CheckCircle2, Award, BookOpen, Lightbulb, Linkedin } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <>
    <Helmet>
      <title>About Us | Our Quran Teachers | Online Quran Academy</title>
      <meta name="description" content="Meet the team behind Online Quran Academy — certified Quran teachers dedicated to teaching authentic Tajweed and recitation to students worldwide." />
      <link rel="canonical" href="https://qurankidslearning.com/about" />
      <meta property="og:url" content="https://qurankidslearning.com/about" />
      <meta property="og:title" content="About Us | Our Quran Teachers | Online Quran Academy" />
      <meta property="og:description" content="Meet the team behind Online Quran Academy — certified Quran teachers dedicated to teaching authentic Tajweed and recitation to students worldwide." />
    </Helmet>
    <div className="pt-20 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Founder intro — photo + bio */}
        <div className="max-w-7xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
          >
            {/* Photo */}
            <div className="flex justify-center lg:justify-start">
              <div className="relative">
                <img
                  src="/founder.jpg"
                  alt="Founder of Online Quran Academy"
                  className="w-full object-contain rounded-3xl shadow-2xl"
                />
                <div className="absolute -bottom-4 -right-4 bg-brand-600 text-white rounded-2xl px-5 py-3 shadow-lg">
                  <p className="text-sm font-bold">15+ Years</p>
                  <p className="text-xs opacity-80">Industry Experience</p>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div>
              <span className="text-brand-600 font-bold uppercase tracking-wider text-sm">About Us</span>
              <h1 className="text-4xl md:text-5xl font-display font-bold mt-4 mb-6">Certified Quran teachers, <span className="text-brand-600">dedicated to authentic recitation.</span></h1>
              <p className="text-lg text-slate-600 mb-5 leading-relaxed">
                Our teachers are certified in Tajweed and have years of experience guiding students of all ages — from complete beginners who don't know a single Arabic letter, to advanced learners refining the beauty of their recitation.
              </p>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                We believe every Muslim deserves to recite the Quran correctly. <strong>Online Quran Academy</strong> was created to make authentic, qualified Quran education accessible to students anywhere in the world — through live 1:1 classes that fit any schedule.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Award className="w-5 h-5 text-brand-600 shrink-0" />
                  <span className="font-semibold">Certified Teachers</span>
                </div>
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-5 h-5 text-brand-600 shrink-0" />
                  <span className="font-semibold">100+ Students</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0" />
                  <span className="font-semibold">Authentic Tajweed</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Lightbulb className="w-5 h-5 text-brand-600 shrink-0" />
                  <span className="font-semibold">Quran Specialists</span>
                </div>
              </div>
              <a
                href="https://linkedin.com/in/muddsariqbal"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-8 px-5 py-2.5 bg-[#0A66C2] text-white rounded-full font-semibold text-sm hover:bg-[#004182] transition-colors"
              >
                <Linkedin className="w-4 h-4" /> Connect on LinkedIn
              </a>
            </div>
          </motion.div>
        </div>

        {/* Microsoft certification badges */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-20 flex items-center gap-8"
        >
          <img src="/badge-associate.png" alt="Microsoft Certified: Azure AI Engineer Associate" className="w-48 h-48 object-contain" />
          <img src="/badge-fundamentals.png" alt="Microsoft Certified: Azure AI Fundamentals" className="w-48 h-48 object-contain" />
        </motion.div>

        <div className="bg-slate-900 rounded-3xl p-12 text-white">
          <h2 className="text-3xl font-display font-bold mb-12 text-center">Our Teaching Philosophy</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: "Correct from the Start",
                desc: "We don't allow bad habits to form. Every student learns correct Makharij (letter articulation) from lesson one — fixing mistakes early avoids years of re-learning."
              },
              {
                title: "Personalised Pace",
                desc: "Every student is different. We never rush a child to the next lesson until they have truly mastered the current one — confidence comes from solid foundations."
              },
              {
                title: "Long-term Relationship",
                desc: "We're not just teachers for a term. We're guides for the journey — from the first letter to fluent recitation, supporting students and families every step of the way."
              }
            ].map((item, i) => (
              <div key={i}>
                <h3 className="text-xl font-bold text-brand-400 mb-4">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-slate-500 text-lg mb-6">Ready to begin? Start with a free trial class — no commitment required.</p>
          <Link
            to="/book"
            className="inline-flex items-center bg-brand-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-brand-700 transition-all shadow-lg"
          >
            Book a Free Trial Class
          </Link>
        </div>

      </div>
    </div>
    </>
  );
}
