/**
 * Idempotent seed — upserts Islamic Learning categories and content.
 * Safe to re-run. Does NOT wipe any student progress or bookmarks.
 *
 * Usage:  npx tsx scripts/seed-islamic-content.ts
 *         pnpm db:seed:islamic
 */

import { PrismaClient, IslamicContentType } from '@prisma/client';

const prisma = new PrismaClient();

// ── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  // Duas
  { slug: 'dua-washroom',        name: 'Washroom',          type: IslamicContentType.DUA,   icon: '🚿', order: 1 },
  { slug: 'dua-eating',          name: 'Eating',            type: IslamicContentType.DUA,   icon: '🍽️', order: 2 },
  { slug: 'dua-drinking',        name: 'Drinking Water',    type: IslamicContentType.DUA,   icon: '💧', order: 3 },
  { slug: 'dua-sleeping',        name: 'Sleeping',          type: IslamicContentType.DUA,   icon: '🌙', order: 4 },
  { slug: 'dua-waking-up',       name: 'Waking Up',         type: IslamicContentType.DUA,   icon: '☀️', order: 5 },
  { slug: 'dua-entering-masjid', name: 'Entering Masjid',   type: IslamicContentType.DUA,   icon: '🕌', order: 6 },
  { slug: 'dua-leaving-masjid',  name: 'Leaving Masjid',    type: IslamicContentType.DUA,   icon: '🕌', order: 7 },
  { slug: 'dua-travel',          name: 'Travel',            type: IslamicContentType.DUA,   icon: '✈️', order: 8 },
  { slug: 'dua-parents',         name: 'Parents',           type: IslamicContentType.DUA,   icon: '🤲', order: 9 },
  { slug: 'dua-protection',      name: 'Protection',        type: IslamicContentType.DUA,   icon: '🛡️', order: 10 },
  { slug: 'dua-morning-evening', name: 'Morning & Evening',  type: IslamicContentType.DUA,   icon: '🌅', order: 11 },
  // Salah
  { slug: 'salah-fajr',    name: 'Fajr',    type: IslamicContentType.SALAH, icon: '🌄', order: 1 },
  { slug: 'salah-zuhr',    name: 'Zuhr',    type: IslamicContentType.SALAH, icon: '☀️', order: 2 },
  { slug: 'salah-asr',     name: 'Asr',     type: IslamicContentType.SALAH, icon: '🌇', order: 3 },
  { slug: 'salah-maghrib', name: 'Maghrib', type: IslamicContentType.SALAH, icon: '🌆', order: 4 },
  { slug: 'salah-isha',    name: 'Isha',    type: IslamicContentType.SALAH, icon: '🌙', order: 5 },
  // Wudu
  { slug: 'wudu-steps', name: 'Wudu Steps', type: IslamicContentType.WUDU, icon: '💦', order: 1 },
  // Kalimas
  { slug: 'kalimas', name: 'The Six Kalimas', type: IslamicContentType.KALIMA, icon: '📖', order: 1 },
  // General (no type — appears under ALL tab only)
  { slug: 'daily-sunnah',    name: 'Daily Sunnah',    type: null, icon: '🌟', order: 1 },
  { slug: 'islamic-manners', name: 'Islamic Manners', type: null, icon: '🤝', order: 2 },
] as const;

// ── Content ──────────────────────────────────────────────────────────────────

type ItemSeed = {
  categorySlug:      string;
  type:              IslamicContentType;
  title:             string;
  arabicText?:       string;
  transliteration?:  string;
  englishTranslation?: string;
  urduTranslation?:  string;
  stepNumber?:       number;
  prayerName?:       string;
  rakatCount?:       number;
  rakatType?:        string;
  order:             number;
};

const ITEMS: ItemSeed[] = [
  // ── Duas: Washroom ─────────────────────────────────────────────────────────
  {
    categorySlug: 'dua-washroom', type: IslamicContentType.DUA, order: 1,
    title: 'Entering the Washroom',
    arabicText: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ',
    transliteration: 'Allahumma inni a\'udhu bika minal khubuthi wal khabaith',
    englishTranslation: 'O Allah, I seek Your protection from evil and evil ones (male and female shayateen).',
    urduTranslation: 'اے اللہ! میں خبیث جنوں اور خبیثہ جنیوں سے تیری پناہ مانگتا ہوں۔',
  },
  {
    categorySlug: 'dua-washroom', type: IslamicContentType.DUA, order: 2,
    title: 'Leaving the Washroom',
    arabicText: 'غُفْرَانَكَ',
    transliteration: 'Ghufranaka',
    englishTranslation: 'I seek Your forgiveness.',
    urduTranslation: 'اے اللہ! میں تیری بخشش مانگتا ہوں۔',
  },
  // ── Duas: Eating ───────────────────────────────────────────────────────────
  {
    categorySlug: 'dua-eating', type: IslamicContentType.DUA, order: 1,
    title: 'Before Eating',
    arabicText: 'بِسْمِ اللهِ وَعَلَى بَرَكَةِ اللهِ',
    transliteration: 'Bismillahi wa \'ala barakatillah',
    englishTranslation: 'In the name of Allah and with the blessings of Allah.',
    urduTranslation: 'اللہ کے نام سے اور اللہ کی برکت سے شروع کرتا ہوں۔',
  },
  {
    categorySlug: 'dua-eating', type: IslamicContentType.DUA, order: 2,
    title: 'After Eating',
    arabicText: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ',
    transliteration: 'Alhamdulillahil-ladhi at\'amana wa saqana wa ja\'alana muslimin',
    englishTranslation: 'All praise is for Allah who fed us, gave us drink, and made us Muslims.',
    urduTranslation: 'تمام تعریفیں اس اللہ کے لیے جس نے ہمیں کھانا کھلایا، پانی پلایا اور مسلمان بنایا۔',
  },
  {
    categorySlug: 'dua-eating', type: IslamicContentType.DUA, order: 3,
    title: 'If You Forget to Say Bismillah',
    arabicText: 'بِسْمِ اللهِ أَوَّلَهُ وَآخِرَهُ',
    transliteration: 'Bismillahi awwalahu wa akhirahu',
    englishTranslation: 'In the name of Allah, at its beginning and at its end.',
    urduTranslation: 'اللہ کے نام سے، اس کے شروع میں اور اس کے آخر میں۔',
  },
  // ── Duas: Drinking Water ───────────────────────────────────────────────────
  {
    categorySlug: 'dua-drinking', type: IslamicContentType.DUA, order: 1,
    title: 'Before Drinking Water',
    arabicText: 'بِسْمِ اللهِ',
    transliteration: 'Bismillah',
    englishTranslation: 'In the name of Allah.',
    urduTranslation: 'اللہ کے نام سے۔',
  },
  {
    categorySlug: 'dua-drinking', type: IslamicContentType.DUA, order: 2,
    title: 'After Drinking Water',
    arabicText: 'الْحَمْدُ لِلَّهِ الَّذِي سَقَانَا عَذْبًا فُرَاتًا بِرَحْمَتِهِ وَلَمْ يَجْعَلْهُ مِلْحًا أُجَاجًا بِذُنُوبِنَا',
    transliteration: 'Alhamdulillahil-ladhi saqana \'adhban furatan birahmatih wa lam yaj\'alhu milhan ujajan bidhunubina',
    englishTranslation: 'All praise is for Allah who, by His mercy, gave us sweet and pleasant water to drink and did not make it salty and bitter because of our sins.',
    urduTranslation: 'تمام تعریفیں اللہ کے لیے جس نے اپنی رحمت سے میٹھا پانی پلایا۔',
  },
  // ── Duas: Sleeping ─────────────────────────────────────────────────────────
  {
    categorySlug: 'dua-sleeping', type: IslamicContentType.DUA, order: 1,
    title: 'Before Sleeping',
    arabicText: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'Bismika Allahumma amutu wa ahya',
    englishTranslation: 'In Your name, O Allah, I die and I live.',
    urduTranslation: 'اے اللہ! میں تیرے نام پر مرتا اور جیتا ہوں۔',
  },
  {
    categorySlug: 'dua-sleeping', type: IslamicContentType.DUA, order: 2,
    title: 'Dua Before Sleeping (Surah Al-Ikhlas, Al-Falaq, An-Nas)',
    arabicText: 'قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
    transliteration: 'Qul huwa Allahu ahad. Allahus-samad. Lam yalid wa lam yulad. Wa lam yakun lahu kufuwan ahad.',
    englishTranslation: 'Say: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor was born. And there is none comparable to Him.',
    urduTranslation: 'کہو: وہ اللہ ایک ہے۔ اللہ بے نیاز ہے۔ نہ اس نے کسی کو جنا نہ وہ کسی سے جنا گیا۔ اور نہ اس کا کوئی ہمسر ہے۔',
  },
  // ── Duas: Waking Up ────────────────────────────────────────────────────────
  {
    categorySlug: 'dua-waking-up', type: IslamicContentType.DUA, order: 1,
    title: 'Upon Waking Up',
    arabicText: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    transliteration: 'Alhamdulillahil-ladhi ahyana ba\'da ma amatana wa ilayhin-nushur',
    englishTranslation: 'All praise is for Allah who gave us life after having taken it from us, and unto Him is the resurrection.',
    urduTranslation: 'تمام تعریفیں اللہ کے لیے جس نے مارنے کے بعد ہمیں زندہ کیا اور اسی کی طرف اٹھنا ہے۔',
  },
  // ── Duas: Entering Masjid ──────────────────────────────────────────────────
  {
    categorySlug: 'dua-entering-masjid', type: IslamicContentType.DUA, order: 1,
    title: 'Entering the Masjid',
    arabicText: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    transliteration: 'Allahumma iftah li abwaba rahmatik',
    englishTranslation: 'O Allah, open for me the doors of Your mercy.',
    urduTranslation: 'اے اللہ! میرے لیے اپنی رحمت کے دروازے کھول دے۔',
  },
  // ── Duas: Leaving Masjid ───────────────────────────────────────────────────
  {
    categorySlug: 'dua-leaving-masjid', type: IslamicContentType.DUA, order: 1,
    title: 'Leaving the Masjid',
    arabicText: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ',
    transliteration: 'Allahumma inni as\'aluka min fadlik',
    englishTranslation: 'O Allah, I ask You of Your bounty.',
    urduTranslation: 'اے اللہ! میں تجھ سے تیرا فضل مانگتا ہوں۔',
  },
  // ── Duas: Travel ───────────────────────────────────────────────────────────
  {
    categorySlug: 'dua-travel', type: IslamicContentType.DUA, order: 1,
    title: 'Dua for Travelling',
    arabicText: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنقَلِبُونَ',
    transliteration: 'Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin. Wa inna ila rabbina lamunqalibun.',
    englishTranslation: 'Glory be to Him who has subjected this to us, and we were not able to do it ourselves. And verily, to our Lord we are returning.',
    urduTranslation: 'پاک ہے وہ جس نے اسے ہمارے تابع کر دیا ورنہ ہم اسے قابو نہ کر سکتے تھے۔ اور ہم اپنے رب کی طرف لوٹنے والے ہیں۔',
  },
  // ── Duas: Parents ──────────────────────────────────────────────────────────
  {
    categorySlug: 'dua-parents', type: IslamicContentType.DUA, order: 1,
    title: 'Dua for Parents',
    arabicText: 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
    transliteration: 'Rabbir-hamhuma kama rabbayani saghira',
    englishTranslation: 'My Lord, have mercy upon them as they raised me when I was small.',
    urduTranslation: 'اے میرے رب! ان دونوں پر رحم فرما جیسا انہوں نے بچپن میں مجھے پالا۔',
  },
  {
    categorySlug: 'dua-parents', type: IslamicContentType.DUA, order: 2,
    title: 'Dua for Forgiveness of Parents',
    arabicText: 'رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِمَن دَخَلَ بَيْتِيَ مُؤْمِنًا',
    transliteration: 'Rabbigh-fir li wa liwalidayya wa liman dakhala baytiya mu\'mina',
    englishTranslation: 'My Lord, forgive me and my parents and whoever enters my house as a believer.',
    urduTranslation: 'اے میرے رب! مجھے، میرے والدین کو اور جو ایمان کے ساتھ میرے گھر میں داخل ہو، سب کو بخش دے۔',
  },
  // ── Duas: Protection ───────────────────────────────────────────────────────
  {
    categorySlug: 'dua-protection', type: IslamicContentType.DUA, order: 1,
    title: 'Protection from Evil',
    arabicText: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    transliteration: 'A\'udhu bikalimatillahit-tammati min sharri ma khalaq',
    englishTranslation: 'I seek refuge in the perfect words of Allah from the evil of what He has created.',
    urduTranslation: 'میں اللہ کے کامل کلمات کے ذریعے اس کی تمام مخلوق کے شر سے پناہ مانگتا ہوں۔',
  },
  {
    categorySlug: 'dua-protection', type: IslamicContentType.DUA, order: 2,
    title: 'Morning Protection (Ayat al-Kursi)',
    arabicText: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ',
    transliteration: 'Allahu la ilaha illa huwal-hayyul-qayyum. La ta\'khudhuhu sinatun wa la nawm.',
    englishTranslation: 'Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep.',
    urduTranslation: 'اللہ — اس کے سوا کوئی معبود نہیں، وہ زندہ ہے، سب کا تھامنے والا۔ اسے نہ اونگھ آتی ہے نہ نیند۔',
  },
  // ── Duas: Morning & Evening ────────────────────────────────────────────────
  {
    categorySlug: 'dua-morning-evening', type: IslamicContentType.DUA, order: 1,
    title: 'Morning Dhikr',
    arabicText: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ',
    transliteration: 'Asbahna wa asbahal-mulku lillah walhamdulillah',
    englishTranslation: 'We have entered the morning and the entire kingdom belongs to Allah, and all praise is for Allah.',
    urduTranslation: 'ہم نے صبح کی اور بادشاہت اللہ کی ہے، تمام تعریفیں اللہ کے لیے ہیں۔',
  },
  {
    categorySlug: 'dua-morning-evening', type: IslamicContentType.DUA, order: 2,
    title: 'Evening Dhikr',
    arabicText: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ',
    transliteration: 'Amsayna wa amsal-mulku lillah walhamdulillah',
    englishTranslation: 'We have entered the evening and the entire kingdom belongs to Allah, and all praise is for Allah.',
    urduTranslation: 'ہم نے شام کی اور بادشاہت اللہ کی ہے، تمام تعریفیں اللہ کے لیے ہیں۔',
  },

  // ── Wudu Steps ─────────────────────────────────────────────────────────────
  {
    categorySlug: 'wudu-steps', type: IslamicContentType.WUDU, order: 1,
    title: 'Niyyah (Intention)', stepNumber: 1,
    arabicText: 'نَوَيْتُ أَنْ أَتَوَضَّأَ لِرَفْعِ الْحَدَثِ وَاسْتِبَاحَةِ الصَّلَاةِ',
    transliteration: 'Nawaytu an atawadda\'a li raf\'il-hadathi wastibahatissalah',
    englishTranslation: 'I intend to perform wudu to remove impurity and to permit prayer.',
    urduTranslation: 'میں نے وضو کرنے کی نیت کی، ناپاکی دور کرنے اور نماز کی اجازت حاصل کرنے کے لیے۔',
  },
  {
    categorySlug: 'wudu-steps', type: IslamicContentType.WUDU, order: 2,
    title: 'Say Bismillah', stepNumber: 2,
    arabicText: 'بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ',
    transliteration: 'Bismillahir-rahmanir-rahim',
    englishTranslation: 'In the name of Allah, the Most Gracious, the Most Merciful.',
    urduTranslation: 'اللہ کے نام سے جو رحمان اور رحیم ہے۔',
  },
  {
    categorySlug: 'wudu-steps', type: IslamicContentType.WUDU, order: 3,
    title: 'Wash Both Hands (3 times)', stepNumber: 3,
    englishTranslation: 'Wash both hands up to the wrists three times, making sure water reaches between the fingers.',
    urduTranslation: 'دونوں ہاتھ کلائیوں تک تین مرتبہ دھوئیں، انگلیوں کے درمیان پانی پہنچائیں۔',
  },
  {
    categorySlug: 'wudu-steps', type: IslamicContentType.WUDU, order: 4,
    title: 'Rinse Mouth (3 times)', stepNumber: 4,
    englishTranslation: 'Take water into the mouth and rinse thoroughly three times.',
    urduTranslation: 'تین مرتبہ منہ میں پانی لے کر کلی کریں۔',
  },
  {
    categorySlug: 'wudu-steps', type: IslamicContentType.WUDU, order: 5,
    title: 'Clean the Nose (3 times)', stepNumber: 5,
    englishTranslation: 'Sniff water into the nose and blow it out three times.',
    urduTranslation: 'تین مرتبہ ناک میں پانی ڈالیں اور پھر صاف کریں۔',
  },
  {
    categorySlug: 'wudu-steps', type: IslamicContentType.WUDU, order: 6,
    title: 'Wash the Face (3 times)', stepNumber: 6,
    englishTranslation: 'Wash the entire face three times from the hairline to the chin and from ear to ear.',
    urduTranslation: 'تین مرتبہ پورا چہرہ دھوئیں، پیشانی سے ٹھوڑی تک اور ایک کان سے دوسرے کان تک۔',
  },
  {
    categorySlug: 'wudu-steps', type: IslamicContentType.WUDU, order: 7,
    title: 'Wash Right Arm (3 times)', stepNumber: 7,
    englishTranslation: 'Wash the right arm from fingertips to the elbow three times.',
    urduTranslation: 'دائیں ہاتھ کو انگلیوں کے سروں سے کہنی تک تین مرتبہ دھوئیں۔',
  },
  {
    categorySlug: 'wudu-steps', type: IslamicContentType.WUDU, order: 8,
    title: 'Wash Left Arm (3 times)', stepNumber: 8,
    englishTranslation: 'Wash the left arm from fingertips to the elbow three times.',
    urduTranslation: 'بائیں ہاتھ کو انگلیوں کے سروں سے کہنی تک تین مرتبہ دھوئیں۔',
  },
  {
    categorySlug: 'wudu-steps', type: IslamicContentType.WUDU, order: 9,
    title: 'Wipe the Head (Masah)', stepNumber: 9,
    englishTranslation: 'Wipe the entire head once with wet hands, from forehead to back.',
    urduTranslation: 'گیلے ہاتھوں سے پیشانی سے لے کر سر کے پیچھے تک ایک بار مسح کریں۔',
  },
  {
    categorySlug: 'wudu-steps', type: IslamicContentType.WUDU, order: 10,
    title: 'Wipe the Ears', stepNumber: 10,
    englishTranslation: 'Wipe inside and outside of both ears with wet fingers.',
    urduTranslation: 'گیلی انگلیوں سے دونوں کانوں کے اندر اور باہر مسح کریں۔',
  },
  {
    categorySlug: 'wudu-steps', type: IslamicContentType.WUDU, order: 11,
    title: 'Wash Right Foot (3 times)', stepNumber: 11,
    englishTranslation: 'Wash the right foot up to and including the ankle three times, rubbing between the toes.',
    urduTranslation: 'دائیں پیر کو ٹخنے سمیت تین مرتبہ دھوئیں اور انگلیوں کے درمیان ملیں۔',
  },
  {
    categorySlug: 'wudu-steps', type: IslamicContentType.WUDU, order: 12,
    title: 'Wash Left Foot (3 times)', stepNumber: 12,
    englishTranslation: 'Wash the left foot up to and including the ankle three times, rubbing between the toes.',
    urduTranslation: 'بائیں پیر کو ٹخنے سمیت تین مرتبہ دھوئیں اور انگلیوں کے درمیان ملیں۔',
  },
  {
    categorySlug: 'wudu-steps', type: IslamicContentType.WUDU, order: 13,
    title: 'Dua After Wudu', stepNumber: 13,
    arabicText: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
    transliteration: 'Ash-hadu an la ilaha illallahu wahdahu la sharika lahu wa ash-hadu anna Muhammadan \'abduhu wa rasuluh',
    englishTranslation: 'I testify that there is no deity worthy of worship except Allah alone, without partner, and I testify that Muhammad is His servant and Messenger.',
    urduTranslation: 'میں گواہی دیتا ہوں کہ اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں اور محمد (ﷺ) اس کے بندے اور رسول ہیں۔',
  },

  // ── Salah: Fajr ────────────────────────────────────────────────────────────
  {
    categorySlug: 'salah-fajr', type: IslamicContentType.SALAH, order: 1,
    title: 'Fajr — 2 Rakat Sunnah', prayerName: 'Fajr', rakatCount: 2, rakatType: 'Sunnah',
    englishTranslation: 'Pray 2 Rakat Sunnah Mu\'akkadah before the Fard prayer. Face the Qiblah, make niyyah, say Takbeer and begin.',
    urduTranslation: 'فرض نماز سے پہلے 2 رکعت سنت مؤکدہ ادا کریں۔ قبلے کی طرف منہ کریں، نیت کریں، تکبیر کہیں اور شروع کریں۔',
  },
  {
    categorySlug: 'salah-fajr', type: IslamicContentType.SALAH, order: 2,
    title: 'Fajr — 2 Rakat Fard', prayerName: 'Fajr', rakatCount: 2, rakatType: 'Fard',
    englishTranslation: 'Pray 2 Rakat Fard (obligatory). This is the main Fajr prayer. Recite Surah Al-Fatiha followed by any Surah in each rakat.',
    urduTranslation: 'فجر کی 2 رکعت فرض ادا کریں۔ ہر رکعت میں سورہ الفاتحہ کے بعد کوئی سورہ پڑھیں۔',
  },
  // ── Salah: Zuhr ────────────────────────────────────────────────────────────
  {
    categorySlug: 'salah-zuhr', type: IslamicContentType.SALAH, order: 1,
    title: 'Zuhr — 4 Rakat Sunnah (Before Fard)', prayerName: 'Zuhr', rakatCount: 4, rakatType: 'Sunnah',
    englishTranslation: 'Pray 4 Rakat Sunnah Mu\'akkadah before the Fard prayer.',
    urduTranslation: 'ظہر کی 4 رکعت سنت مؤکدہ فرض سے پہلے ادا کریں۔',
  },
  {
    categorySlug: 'salah-zuhr', type: IslamicContentType.SALAH, order: 2,
    title: 'Zuhr — 4 Rakat Fard', prayerName: 'Zuhr', rakatCount: 4, rakatType: 'Fard',
    englishTranslation: 'Pray 4 Rakat Fard (obligatory). In the first two rakats recite Surah Al-Fatiha and a Surah. In the last two recite only Al-Fatiha (silently).',
    urduTranslation: 'ظہر کی 4 رکعت فرض ادا کریں۔ پہلی دو رکعتوں میں الفاتحہ اور سورہ پڑھیں، آخری دو میں صرف الفاتحہ (آہستہ) پڑھیں۔',
  },
  {
    categorySlug: 'salah-zuhr', type: IslamicContentType.SALAH, order: 3,
    title: 'Zuhr — 2 Rakat Sunnah (After Fard)', prayerName: 'Zuhr', rakatCount: 2, rakatType: 'Sunnah',
    englishTranslation: 'Pray 2 Rakat Sunnah Mu\'akkadah after the Fard prayer.',
    urduTranslation: 'فرض کے بعد 2 رکعت سنت مؤکدہ ادا کریں۔',
  },
  {
    categorySlug: 'salah-zuhr', type: IslamicContentType.SALAH, order: 4,
    title: 'Zuhr — 2 Rakat Nafl (Optional)', prayerName: 'Zuhr', rakatCount: 2, rakatType: 'Nafl',
    englishTranslation: 'Optionally pray 2 Rakat Nafl after the Sunnah.',
    urduTranslation: 'سنت کے بعد 2 رکعت نفل اختیاری طور پر ادا کریں۔',
  },
  // ── Salah: Asr ─────────────────────────────────────────────────────────────
  {
    categorySlug: 'salah-asr', type: IslamicContentType.SALAH, order: 1,
    title: 'Asr — 4 Rakat Sunnah (Before Fard)', prayerName: 'Asr', rakatCount: 4, rakatType: 'Sunnah',
    englishTranslation: 'Pray 4 Rakat Sunnah Ghair Mu\'akkadah (non-emphasised) before the Fard.',
    urduTranslation: 'عصر کی 4 رکعت سنت غیر مؤکدہ فرض سے پہلے ادا کریں۔',
  },
  {
    categorySlug: 'salah-asr', type: IslamicContentType.SALAH, order: 2,
    title: 'Asr — 4 Rakat Fard', prayerName: 'Asr', rakatCount: 4, rakatType: 'Fard',
    englishTranslation: 'Pray 4 Rakat Fard (obligatory). Recite silently in all rakats.',
    urduTranslation: 'عصر کی 4 رکعت فرض ادا کریں۔ تمام رکعتوں میں آہستہ پڑھیں۔',
  },
  // ── Salah: Maghrib ─────────────────────────────────────────────────────────
  {
    categorySlug: 'salah-maghrib', type: IslamicContentType.SALAH, order: 1,
    title: 'Maghrib — 3 Rakat Fard', prayerName: 'Maghrib', rakatCount: 3, rakatType: 'Fard',
    englishTranslation: 'Pray 3 Rakat Fard. In the first two recite Al-Fatiha and a Surah aloud. The third rakat: Al-Fatiha only (silently).',
    urduTranslation: 'مغرب کی 3 رکعت فرض ادا کریں۔ پہلی دو میں الفاتحہ اور سورہ بلند آواز سے، تیسری میں صرف الفاتحہ آہستہ پڑھیں۔',
  },
  {
    categorySlug: 'salah-maghrib', type: IslamicContentType.SALAH, order: 2,
    title: 'Maghrib — 2 Rakat Sunnah', prayerName: 'Maghrib', rakatCount: 2, rakatType: 'Sunnah',
    englishTranslation: 'Pray 2 Rakat Sunnah Mu\'akkadah after the Fard.',
    urduTranslation: 'فرض کے بعد 2 رکعت سنت مؤکدہ ادا کریں۔',
  },
  {
    categorySlug: 'salah-maghrib', type: IslamicContentType.SALAH, order: 3,
    title: 'Maghrib — 2 Rakat Nafl (Optional)', prayerName: 'Maghrib', rakatCount: 2, rakatType: 'Nafl',
    englishTranslation: 'Optionally pray 2 Rakat Nafl after the Sunnah.',
    urduTranslation: 'سنت کے بعد 2 رکعت نفل اختیاری طور پر ادا کریں۔',
  },
  // ── Salah: Isha ────────────────────────────────────────────────────────────
  {
    categorySlug: 'salah-isha', type: IslamicContentType.SALAH, order: 1,
    title: 'Isha — 4 Rakat Sunnah (Before Fard)', prayerName: 'Isha', rakatCount: 4, rakatType: 'Sunnah',
    englishTranslation: 'Pray 4 Rakat Sunnah Ghair Mu\'akkadah before the Fard.',
    urduTranslation: 'عشاء کی 4 رکعت سنت غیر مؤکدہ فرض سے پہلے ادا کریں۔',
  },
  {
    categorySlug: 'salah-isha', type: IslamicContentType.SALAH, order: 2,
    title: 'Isha — 4 Rakat Fard', prayerName: 'Isha', rakatCount: 4, rakatType: 'Fard',
    englishTranslation: 'Pray 4 Rakat Fard. First two rakats: Al-Fatiha + Surah aloud. Last two: Al-Fatiha only (silently).',
    urduTranslation: 'عشاء کی 4 رکعت فرض ادا کریں۔ پہلی دو بلند آواز سے، آخری دو آہستہ پڑھیں۔',
  },
  {
    categorySlug: 'salah-isha', type: IslamicContentType.SALAH, order: 3,
    title: 'Isha — 2 Rakat Sunnah', prayerName: 'Isha', rakatCount: 2, rakatType: 'Sunnah',
    englishTranslation: 'Pray 2 Rakat Sunnah Mu\'akkadah after the Fard.',
    urduTranslation: 'فرض کے بعد 2 رکعت سنت مؤکدہ ادا کریں۔',
  },
  {
    categorySlug: 'salah-isha', type: IslamicContentType.SALAH, order: 4,
    title: 'Isha — 2 Rakat Nafl (Optional)', prayerName: 'Isha', rakatCount: 2, rakatType: 'Nafl',
    englishTranslation: 'Optionally pray 2 Rakat Nafl.',
    urduTranslation: '2 رکعت نفل اختیاری طور پر ادا کریں۔',
  },
  {
    categorySlug: 'salah-isha', type: IslamicContentType.SALAH, order: 5,
    title: 'Isha — 3 Rakat Witr', prayerName: 'Isha', rakatCount: 3, rakatType: 'Witr',
    arabicText: 'اللَّهُمَّ إِنَّا نَسْتَعِينُكَ وَنَسْتَغْفِرُكَ',
    transliteration: 'Allahumma inna nasta\'inuka wa nastaghfiruk',
    englishTranslation: 'Pray 3 Rakat Witr. In the third rakat, after Al-Fatiha and a Surah, raise hands and recite Dua al-Qunoot before ruku\'.',
    urduTranslation: 'وتر کی 3 رکعت ادا کریں۔ تیسری رکعت میں الفاتحہ اور سورہ کے بعد رکوع سے پہلے دعائے قنوت پڑھیں۔',
  },

  // ── Kalimas ────────────────────────────────────────────────────────────────
  {
    categorySlug: 'kalimas', type: IslamicContentType.KALIMA, order: 1,
    title: 'First Kalima — Tayyibah (The Pure Word)',
    arabicText: 'لَا إِلٰهَ إِلَّا اللهُ مُحَمَّدٌ رَّسُولُ اللهِ',
    transliteration: 'La ilaha illallahu Muhammadur-rasulullah',
    englishTranslation: 'There is no deity worthy of worship except Allah, and Muhammad is the Messenger of Allah.',
    urduTranslation: 'اللہ کے سوا کوئی معبود نہیں اور محمد (ﷺ) اللہ کے رسول ہیں۔',
  },
  {
    categorySlug: 'kalimas', type: IslamicContentType.KALIMA, order: 2,
    title: 'Second Kalima — Shahadat (The Testimony)',
    arabicText: 'أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
    transliteration: 'Ash-hadu an la ilaha illallahu wahdahu la sharika lahu wa ash-hadu anna Muhammadan \'abduhu wa rasuluh',
    englishTranslation: 'I testify that there is no deity worthy of worship except Allah, alone without partner, and I testify that Muhammad is His servant and Messenger.',
    urduTranslation: 'میں گواہی دیتا ہوں کہ اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے اور میں گواہی دیتا ہوں کہ محمد (ﷺ) اللہ کے بندے اور رسول ہیں۔',
  },
  {
    categorySlug: 'kalimas', type: IslamicContentType.KALIMA, order: 3,
    title: 'Third Kalima — Tamjeed (The Glorification)',
    arabicText: 'سُبْحَانَ اللهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلٰهَ إِلَّا اللهُ وَاللهُ أَكْبَرُ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ الْعَلِيِّ الْعَظِيمِ',
    transliteration: 'Subhanallahi walhamdulillahi wa la ilaha illallahu wallahu akbar. Wa la hawla wa la quwwata illa billahil \'aliyyil \'azim.',
    englishTranslation: 'Glory be to Allah, and all praise is for Allah, and there is no deity except Allah, and Allah is the Greatest. There is no power or might except with Allah, the Most High, the Most Great.',
    urduTranslation: 'اللہ پاک ہے، تمام تعریفیں اللہ کے لیے ہیں، اللہ کے سوا کوئی معبود نہیں اور اللہ سب سے بڑا ہے۔ کوئی طاقت و قوت نہیں مگر اللہ کی طرف سے۔',
  },
  {
    categorySlug: 'kalimas', type: IslamicContentType.KALIMA, order: 4,
    title: 'Fourth Kalima — Tawheed (The Oneness)',
    arabicText: 'لَا إِلٰهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِيْ وَيُمِيتُ وَهُوَ حَيٌّ لَّا يَمُوتُ أَبَدًا أَبَدًا ذُو الْجَلَالِ وَالإِكْرَامِ بِيَدِهِ الْخَيْرُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration: 'La ilaha illallahu wahdahu la sharika lahu, lahul-mulku wa lahul-hamdu yuhyi wa yumitu wa huwa hayyul la yamutu abadan abada. Dhul-jalali wal-ikram, biyadihil-khayr, wa huwa \'ala kulli shay\'in qadir.',
    englishTranslation: 'There is no deity except Allah, alone, without partner. His is the sovereignty and His is the praise. He gives life and causes death, and He is Eternally Living, never to die. Possessor of Majesty and Honour. In His hand is all goodness, and He has power over all things.',
    urduTranslation: 'اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے۔ بادشاہت اور تعریف اسی کے لیے ہے، وہ زندگی دیتا اور موت دیتا ہے، وہ ہمیشہ زندہ رہنے والا ہے جسے کبھی موت نہیں۔',
  },
  {
    categorySlug: 'kalimas', type: IslamicContentType.KALIMA, order: 5,
    title: 'Fifth Kalima — Astaghfar (Seeking Forgiveness)',
    arabicText: 'أَسْتَغْفِرُ اللهَ رَبِّي مِنْ كُلِّ ذَنْبٍ أَذْنَبْتُهُ عَمَدًا أَوْ خَطَأً سِرًّا أَوْ عَلَانِيَةً وَأَتُوبُ إِلَيْهِ مِنَ الذَّنْبِ الَّذِي أَعْلَمُ وَمِنَ الذَّنْبِ الَّذِي لَا أَعْلَمُ إِنَّكَ أَنْتَ عَلَّامُ الْغُيُوبِ وَسَتَّارُ الْعُيُوبِ وَغَفَّارُ الذُّنُوبِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ الْعَلِيِّ الْعَظِيمِ',
    transliteration: 'Astaghfirullaha rabbi min kulli dhambin adhnabtuhu \'amadan aw khata\'an sirran aw \'alaniyatan wa atubu ilayhi minadh-dhambi allladhi a\'lamu wa minadh-dhambi alladhi la a\'lam. Innaka anta \'allamul-ghuyubi wa sattarul-\'uyubi wa ghaffarudh-dhunubi. Wa la hawla wa la quwwata illa billahil \'aliyyil \'azim.',
    englishTranslation: 'I seek the forgiveness of Allah, my Lord, from every sin I have committed intentionally or by mistake, secretly or openly. I repent to Him from the sins I know and the sins I do not know. Verily, You are the Knower of hidden things, the Concealer of faults, and the Forgiver of sins.',
    urduTranslation: 'میں اپنے رب اللہ سے ہر اس گناہ کی مغفرت مانگتا ہوں جو میں نے جان بوجھ کر یا غلطی سے، پوشیدہ یا ظاہر کیا۔ بے شک تو ہی غیبوں کا جاننے والا، عیبوں کا چھپانے والا اور گناہوں کا بخشنے والا ہے۔',
  },
  {
    categorySlug: 'kalimas', type: IslamicContentType.KALIMA, order: 6,
    title: 'Sixth Kalima — Radde Kufr (Rejection of Disbelief)',
    arabicText: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ أَنْ أُشْرِكَ بِكَ شَيْئًا وَأَنَا أَعْلَمُهُ وَأَسْتَغْفِرُكَ لِمَا لَا أَعْلَمُهُ إِنَّكَ أَنْتَ عَلَّامُ الْغُيُوبِ',
    transliteration: 'Allahumma inni a\'udhu bika an ushrika bika shay\'an wa ana a\'lamuhu wa astaghfiruka lima la a\'lamuhu. Innaka anta \'allamul-ghuyub.',
    englishTranslation: 'O Allah, I seek Your protection from knowingly associating any partner with You, and I seek Your forgiveness for that which I do not know about. Verily, You are the Knower of hidden things.',
    urduTranslation: 'اے اللہ! میں تیری پناہ مانگتا ہوں اس بات سے کہ جانتے ہوئے تیرے ساتھ کسی کو شریک کروں، اور جو مجھے معلوم نہیں اس سے مغفرت مانگتا ہوں۔ بے شک تو ہی غیبوں کا جاننے والا ہے۔',
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding Islamic Learning content…\n');

  // 1. Upsert categories
  console.log('Upserting categories…');
  const categoryMap = new Map<string, string>(); // slug → id

  for (const cat of CATEGORIES) {
    const result = await prisma.islamicCategory.upsert({
      where:  { slug: cat.slug },
      create: { ...cat, isActive: true },
      update: { name: cat.name, icon: cat.icon, order: cat.order, isActive: true },
    });
    categoryMap.set(cat.slug, result.id);
    console.log(`  ✓ [${cat.type ?? 'GENERAL'}] ${cat.name}`);
  }

  // 2. Upsert items
  console.log('\nUpserting items…');
  let count = 0;

  for (const item of ITEMS) {
    const categoryId = categoryMap.get(item.categorySlug);
    if (!categoryId) {
      console.warn(`  ⚠ No category found for slug "${item.categorySlug}" — skipping "${item.title}"`);
      continue;
    }

    // Use title + categoryId as a soft unique key (no DB unique constraint on items)
    const existing = await prisma.islamicItem.findFirst({
      where: { categoryId, title: item.title },
    });

    const data = {
      categoryId,
      type:               item.type,
      title:              item.title,
      arabicText:         item.arabicText        ?? null,
      transliteration:    item.transliteration   ?? null,
      englishTranslation: item.englishTranslation ?? null,
      urduTranslation:    item.urduTranslation   ?? null,
      stepNumber:         item.stepNumber        ?? null,
      prayerName:         item.prayerName        ?? null,
      rakatCount:         item.rakatCount        ?? null,
      rakatType:          item.rakatType         ?? null,
      order:              item.order,
      isActive:           true,
    };

    if (existing) {
      await prisma.islamicItem.update({ where: { id: existing.id }, data });
    } else {
      await prisma.islamicItem.create({ data });
    }

    count++;
  }

  console.log(`\n✅ Done — ${CATEGORIES.length} categories, ${count} items seeded.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
