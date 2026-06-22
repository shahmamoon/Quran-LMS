import { useParams, Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { getProgram } from '../data/programs';

export default function ProgramDetail() {
  const { slug } = useParams<{ slug: string }>();
  const program = slug ? getProgram(slug) : undefined;

  if (!program) return <Navigate to="/programs" replace />;

  const courseSchema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: `${program.title} — ${program.level} Quran Recitation`,
    description: program.metaDescription,
    provider: { '@type': 'Organization', name: 'Online Quran Academy', url: 'https://qurankidslearning.com' },
    audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: `Ages ${program.age}` },
    teaches: program.skills,
    url: `https://qurankidslearning.com/programs/${program.slug}`,
  };

  return (
    <div className="pt-20 pb-24">
      <Helmet>
        <title>{program.metaTitle}</title>
        <meta name="description" content={program.metaDescription} />
        <link rel="canonical" href={`https://qurankidslearning.com/programs/${program.slug}`} />
        <meta property="og:url" content={`https://qurankidslearning.com/programs/${program.slug}`} />
        <meta property="og:title" content={program.metaTitle} />
        <meta property="og:description" content={program.metaDescription} />
        <script type="application/ld+json">{JSON.stringify(courseSchema)}</script>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/programs" className="inline-flex items-center text-sm text-slate-500 hover:text-brand-600 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> All Programs
        </Link>

        {/* Header */}
        <span className="px-4 py-1 bg-brand-100 text-brand-700 rounded-full text-sm font-bold uppercase tracking-wider">
          {program.level} · Age {program.age}
        </span>
        <h1 className="text-4xl md:text-5xl font-display font-bold mt-5 mb-4">{program.title}</h1>
        <p className="text-xl text-slate-600 mb-8">{program.tagline}</p>

        {/* Intro */}
        <p className="text-lg text-slate-600 leading-relaxed mb-6">{program.intro}</p>

        <div className="bg-brand-50 border border-brand-100 rounded-2xl p-6 mb-12">
          <h2 className="font-bold text-slate-900 mb-2">Who it's for</h2>
          <p className="text-slate-600">{program.whoFor}</p>
        </div>

        {/* Skills + Projects */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
              <span className="w-1.5 h-6 bg-brand-600 rounded-full mr-2" />
              Skills You'll Learn
            </h2>
            <ul className="space-y-3">
              {program.skills.map((skill) => (
                <li key={skill} className="flex items-center text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-brand-500 mr-2 shrink-0" />
                  {skill}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
              <span className="w-1.5 h-6 bg-blue-600 rounded-full mr-2" />
              Projects You'll Build
            </h2>
            <ul className="space-y-3">
              {program.projects.map((project) => (
                <li key={project} className="flex items-center text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 mr-2 shrink-0" />
                  {project}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Outcome */}
        <div className="border-t border-slate-100 pt-8 mb-12">
          <h2 className="font-bold text-slate-900 mb-2">Outcomes</h2>
          <p className="text-slate-600">{program.outcomes}</p>
        </div>

        {/* CTA */}
        <div className="bg-slate-900 rounded-3xl p-10 text-center">
          <h2 className="text-2xl font-display font-bold text-white mb-3">Ready to start the {program.title} track?</h2>
          <p className="text-slate-400 mb-6">Book a free assessment and we'll build a custom roadmap for your child.</p>
          <Link
            to="/book"
            className="inline-flex items-center bg-brand-600 text-white px-8 py-4 rounded-full font-bold hover:bg-brand-700 transition-all group"
          >
            Book Free Assessment
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
