import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { programs } from '../data/programs';

const courseSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Quran Recitation Programs',
  itemListElement: programs.map((p, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'Course',
      name: p.title,
      description: p.metaDescription,
      url: `https://qurankidslearning.com/programs/${p.slug}`,
      provider: { '@type': 'Organization', name: 'Online Quran Academy', url: 'https://qurankidslearning.com' },
      audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: `Ages ${p.age}` },
      teaches: p.skills,
    },
  })),
};

export default function Programs() {
  return (
    <div className="pt-20 pb-24">
      <Helmet>
        <title>Quran Recitation Programs | Online Quran Academy</title>
        <meta name="description" content="Three Quran recitation tracks: Beginner (Ages 5–10), Tajweed & Fluency (Ages 10–16), and Advanced Recitation (16+). Learn correct Tajweed with certified teachers." />
        <link rel="canonical" href="https://qurankidslearning.com/programs" />
        <meta property="og:url" content="https://qurankidslearning.com/programs" />
        <meta property="og:title" content="Quran Recitation Programs | Online Quran Academy" />
        <meta property="og:description" content="Three Quran recitation tracks: Beginner (Ages 5–10), Tajweed & Fluency (Ages 10–16), and Advanced Recitation (16+). Learn correct Tajweed with certified teachers." />
        <script type="application/ld+json">{JSON.stringify(courseSchema)}</script>
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-6">Our Quran Recitation Programs</h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Each program is tailored to the student's age and current recitation level. We don't rush; we follow the student's pace and ensure mastery at every step.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {programs.map((prog) => (
            <div key={prog.slug} className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                <div>
                  <span className="px-4 py-1 bg-brand-100 text-brand-700 rounded-full text-sm font-bold uppercase tracking-wider">
                    {prog.level}
                  </span>
                  <h2 className="text-3xl font-display font-bold mt-4">
                    <Link to={`/programs/${prog.slug}`} className="hover:text-brand-600 transition-colors">
                      {prog.title}
                    </Link>
                  </h2>
                </div>
                <span className="text-slate-500 font-semibold mt-2 md:mt-0">Age {prog.age}</span>
              </div>

              <p className="text-slate-600 text-lg mb-8 max-w-3xl">{prog.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-10">
                <div>
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center">
                    <span className="w-1.5 h-6 bg-brand-600 rounded-full mr-2" />
                    Skills Taught
                  </h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {prog.skills.map((skill, j) => (
                      <li key={j} className="flex items-center text-slate-600 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-brand-500 mr-2 shrink-0" />
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center">
                    <span className="w-1.5 h-6 bg-blue-600 rounded-full mr-2" />
                    Sample Projects
                  </h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {prog.projects.map((project, j) => (
                      <li key={j} className="flex items-center text-slate-600 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-blue-500 mr-2 shrink-0" />
                        {project}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <p className="text-sm font-medium text-slate-500 italic max-w-xl">
                  <span className="text-slate-900 not-italic font-bold">Outcome:</span> {prog.outcomes}
                </p>
                <Link to={`/programs/${prog.slug}`} className="inline-flex items-center bg-brand-600 text-white px-8 py-4 rounded-full font-bold hover:bg-brand-700 transition-all group shrink-0">
                  Learn More
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
