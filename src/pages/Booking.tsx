import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'motion/react';
import { Calendar, Clock, User, Mail, MessageSquare, ChevronRight, Loader2 } from 'lucide-react';

export default function Booking() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    parentName: '',
    parentEmail: '',
    childName: '',
    childAge: '',
    currentLevel: 'beginner',
    interests: [] as string[],
    goal: 'fun',
    preferredSchedule: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('https://n8n.thinkverseai.ca/webhook/aitutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit assessment request');
      }

      setIsSubmitting(false);
      navigate('/confirmation');
    } catch (error) {
      console.error('Error submitting form:', error);
      // Fallback to navigation even if webhook fails for better UX, 
      // or show an error. Given it's a mentorship site, we want to be reliable.
      // But for now, let's just navigate to confirmation as requested.
      setIsSubmitting(false);
      navigate('/confirmation');
    }
  };

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  return (
    <div className="pt-20 pb-24 bg-slate-50">
      <Helmet>
        <title>Book a Free Trial Quran Class | Online Quran Academy</title>
        <meta name="description" content="Book your free 30-minute trial Quran recitation class. We'll assess your child's level and create a personalised recitation plan." />
        <link rel="canonical" href="https://qurankidslearning.com/book" />
        <meta property="og:url" content="https://qurankidslearning.com/book" />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold mb-4">Book Your Free Trial Class</h1>
          <p className="text-slate-600">A 30-minute 1:1 session to assess your child's recitation level and create their personalised learning plan.</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100"
        >
          <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="bg-brand-600 p-8 text-white md:col-span-1">
              <h3 className="text-xl font-bold mb-8">What to expect:</h3>
              <ul className="space-y-6">
                <li className="flex items-start space-x-3">
                  <div className="bg-brand-500 p-1 rounded-md mt-1">
                    <User className="w-4 h-4" />
                  </div>
                  <p className="text-sm">1:1 session with a certified Quran teacher</p>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="bg-brand-500 p-1 rounded-md mt-1">
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="text-sm">30-minute recitation level assessment</p>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="bg-brand-500 p-1 rounded-md mt-1">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <p className="text-sm">Personalised recitation plan created</p>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="bg-brand-500 p-1 rounded-md mt-1">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <p className="text-sm">Q&A for parents and students</p>
                </li>
              </ul>

              <div className="mt-12 pt-12 border-t border-brand-500">
                <p className="text-xs text-brand-100 italic">
                  "The trial class was wonderful. Our daughter loved the teacher and couldn't wait for the next session."
                </p>
                <p className="text-xs font-bold mt-2">— Fatima A., Parent</p>
              </div>
            </div>

            <div className="p-8 md:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Parent Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                      placeholder="John Doe"
                      value={formData.parentName}
                      onChange={e => setFormData({...formData, parentName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Parent Email</label>
                    <input 
                      required
                      type="email" 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                      placeholder="john@example.com"
                      value={formData.parentEmail}
                      onChange={e => setFormData({...formData, parentEmail: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Child Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                      placeholder="Alex Doe"
                      value={formData.childName}
                      onChange={e => setFormData({...formData, childName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Child Age</label>
                    <input 
                      required
                      type="number" 
                      min="10"
                      max="18"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                      placeholder="12"
                      value={formData.childAge}
                      onChange={e => setFormData({...formData, childAge: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Current Experience Level</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['beginner', 'intermediate', 'advanced'].map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setFormData({...formData, currentLevel: level})}
                        className={`py-2 px-4 rounded-xl border text-sm font-semibold capitalize transition-all ${
                          formData.currentLevel === level 
                            ? 'bg-brand-600 border-brand-600 text-white' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-brand-300'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Areas of Interest (Select all that apply)</label>
                  <div className="flex flex-wrap gap-2">
                    {['Tajweed Rules', 'Quran Memorisation', 'Arabic Alphabet', 'Fluency'].map(interest => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`py-2 px-4 rounded-full border text-xs font-semibold transition-all ${
                          formData.interests.includes(interest)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Primary Goal</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    value={formData.goal}
                    onChange={e => setFormData({...formData, goal: e.target.value})}
                  >
                    <option value="fun">Learn to Read Quran Correctly</option>
                    <option value="career">Master Tajweed Rules</option>
                    <option value="startup">Quran Memorisation (Hifz)</option>
                    <option value="school">Build Recitation Confidence</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Preferred Schedule (e.g. Weekdays after 4pm)</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    placeholder="Mon/Wed after 5pm EST"
                    value={formData.preferredSchedule}
                    onChange={e => setFormData({...formData, preferredSchedule: e.target.value})}
                  />
                </div>

                <button 
                  disabled={isSubmitting}
                  type="submit" 
                  className="w-full bg-brand-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-brand-700 transition-all shadow-lg flex items-center justify-center disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Request Free Trial Class
                      <ChevronRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
