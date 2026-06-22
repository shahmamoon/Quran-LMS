export interface Program {
  slug: 'beginner' | 'intermediate' | 'advanced';
  title: string;
  age: string;
  level: string;
  tagline: string;
  description: string;
  intro: string;
  whoFor: string;
  skills: string[];
  projects: string[];
  outcomes: string;
  metaTitle: string;
  metaDescription: string;
}

export const programs: Program[] = [
  {
    slug: 'beginner',
    title: 'Noorani Qaida & Basics',
    age: '5–10',
    level: 'Beginner',
    tagline: 'A gentle, joyful introduction to reading the Quran.',
    description: 'Learn the Arabic alphabet, correct letter sounds, and begin reading simple Quranic words with confidence.',
    intro: 'The Beginner program is designed for young learners aged 5–10 who are starting their Quran journey. Using the Noorani Qaida method, students learn every Arabic letter, its correct pronunciation from the correct place of articulation (Makharij), and progress to joining letters into words and short Ayahs. Sessions are patient, encouraging, and fully 1:1 — every child learns at their own pace.',
    whoFor: 'Perfect for children aged 5–10 who are brand new to Arabic letters and Quran recitation. No prior knowledge required.',
    skills: ['Arabic Alphabet', 'Makharij (Letter Articulation)', 'Short Vowels & Sukoon', 'Joining Letters', 'Simple Word Reading'],
    projects: ['Read 10 Arabic letters correctly', 'Complete Noorani Qaida Part 1', 'Recite Surah Al-Fatiha'],
    outcomes: 'Students can confidently recognise all Arabic letters, produce correct sounds, and read simple Quranic words — ready to progress to Tajweed and full Surah reading.',
    metaTitle: 'Beginner Quran Recitation for Kids Ages 5–10 | Online Quran Academy',
    metaDescription: 'Beginner Quran classes for children aged 5–10. Learn the Arabic alphabet, Makharij, and start reading the Quran with a certified teacher. Free trial class available.',
  },
  {
    slug: 'intermediate',
    title: 'Tajweed & Fluency',
    age: '10–16',
    level: 'Intermediate',
    tagline: 'Master the rules of Tajweed and read with beautiful fluency.',
    description: 'Build on reading basics with proper Tajweed rules — Madd, Ghunna, Idghaam, Ikhfa, and more.',
    intro: 'The Tajweed & Fluency program takes students who can read Arabic and transforms their recitation with proper Tajweed rules. Through 1:1 sessions, students learn Madd (elongation), Ghunna (nasalisation), Idghaam (merging), Ikhfa (concealment), Waqf (stopping rules), and develop smooth, flowing Tarteel. By the end, students recite with the confidence and correctness required for Salah and Quran circles.',
    whoFor: 'Ideal for students aged 10–16 who can read Arabic letters and short words but want to improve their Tajweed and recitation quality.',
    skills: ['Madd (Elongation) Rules', 'Ghunna & Idghaam', 'Ikhfa & Iqlab', 'Waqf (Stopping) Rules', 'Tarteel & Fluency'],
    projects: ['Recite Juz Amma with full Tajweed', 'Master all Madd rules', 'Recite 5 Surahs from memory'],
    outcomes: 'Students recite the Quran with correct Tajweed, smooth fluency, and proper stopping points — ready to progress to advanced recitation or begin Hifz.',
    metaTitle: 'Tajweed & Quran Fluency Classes Ages 10–16 | Online Quran Academy',
    metaDescription: 'Tajweed classes for students aged 10–16. Master Madd, Ghunna, Idghaam and all Tajweed rules with a certified Quran teacher. Book a free trial class.',
  },
  {
    slug: 'advanced',
    title: 'Advanced Recitation',
    age: '16+',
    level: 'Advanced',
    tagline: 'Refine your recitation to the highest standard.',
    description: 'Advanced Tajweed mastery, beautiful recitation style, and Hifz (memorisation) support for serious students.',
    intro: 'The Advanced Recitation program is for students aged 16+ who already have a solid foundation and want to take their recitation to the highest level. Students refine every aspect of their recitation — perfecting every rule of Tajweed, developing a beautiful, measured style (Tarteel), working through the full Quran, and beginning or continuing Hifz (memorisation). This level is also suitable for adults who want to recite in Salah, lead Tarawih, or achieve Ijazah-level quality.',
    whoFor: 'Built for students aged 16+ and adults who can read the Quran with basic Tajweed and want to reach an advanced or Qari-level standard.',
    skills: ['Complete Tajweed Mastery', 'Beautiful Tarteel Style', 'Hifz (Memorisation) Support', 'Full Quran Recitation', 'Ijazah-Level Preparation'],
    projects: ['Complete Juz Amma with perfect Tajweed', 'Memorise 10+ Surahs', 'Recite selected pages with Qari-level quality'],
    outcomes: 'Students achieve a high standard of Quran recitation, with mastery of all Tajweed rules, a beautiful recitation style, and strong memorisation — suitable for leading prayers and Quran circles.',
    metaTitle: 'Advanced Quran Recitation & Hifz for Ages 16+ | Online Quran Academy',
    metaDescription: 'Advanced Quran recitation classes for students aged 16+. Perfect your Tajweed, develop a beautiful style, and receive Hifz support with a certified teacher.',
  },
];

export function getProgram(slug: string): Program | undefined {
  return programs.find((p) => p.slug === slug);
}
