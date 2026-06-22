/**
 * Idempotent seed: Noorani Qaida subject (6 weeks, 22 lessons).
 * Safe to re-run — uses upsert/skipDuplicates throughout.
 *
 * Usage:
 *   npx tsx scripts/seed-noorani-qaida.ts
 *   (or via package.json: pnpm db:seed:noorani-qaida)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Image base URLs ────────────────────────────────────────────────────────────
const ENG = 'https://www.learningquranschool.com/noorani_qaida';

function eng(...pages: number[]) {
  return pages.map(n => ({
    id: `nq-eng-${String(n).padStart(2, '0')}`,
    filename: `NQ-eng-${String(n).padStart(2, '0')}.jpg`,
    originalName: `Noorani Qaida English Page ${n}`,
    mimeType: 'image/jpeg',
    size: 0,
    url: `${ENG}/NQ-eng-${String(n).padStart(2, '0')}.jpg`,
    uploadedAt: new Date().toISOString(),
  }));
}

function urdu(...pages: number[]) {
  return pages.map(n => ({
    id: `nq-urdu-${String(n).padStart(2, '0')}`,
    filename: `NQ-NQ-${n}.jpg`,
    originalName: `Noorani Qaida Urdu Page ${n}`,
    mimeType: 'image/jpeg',
    size: 0,
    url: `${ENG}/NQ-NQ-${n}.jpg`,
    uploadedAt: new Date().toISOString(),
  }));
}

// ── Curriculum data ────────────────────────────────────────────────────────────

const WEEKS: {
  order: number;
  title: string;
  description: string;
  lessons: {
    order: number;
    title: string;
    content: string;
    objectives: string[];
    resources: ReturnType<typeof eng>;
  }[];
}[] = [
  {
    order: 1,
    title: 'Week 1 — Arabic Alphabet & Joined Letters',
    description: 'Foundation: recognise all 28 Arabic letters, learn their names, and see how they join to form words.',
    lessons: [
      {
        order: 1,
        title: 'Lesson 1: The Alphabets — Recognition',
        content: `Learn to identify all 28 Arabic letters by shape. Letters are shown large and colour-coded to help distinguish similarly-shaped ones.

**Practice tips:**
- Read from right to left, top to bottom
- Focus on distinguishing letters that differ only by dot placement (ب / ت / ث, etc.)
- Drill until every letter is instantly recognisable by shape alone`,
        objectives: [
          'Identify all 28 Arabic letters by shape',
          'Distinguish similarly shaped letters by their dots',
          'Read the alphabet grid fluently from right to left',
        ],
        resources: [...eng(3), ...urdu(1)],
      },
      {
        order: 2,
        title: 'Lesson 2: The Alphabets — Names & Transliteration',
        content: `Learn the full name of each Arabic letter (Alif, Baa, Taa, Saa…) alongside English transliteration for pronunciation guidance.

**All 28 letters:** Alif · Baa · Taa · Saa · Jeem · Haa · Khaa · Daal · Zaal · Raa · Zaa · Seen · Sheen · Suaad · Duaad · Tuaa · Zuaa · Aeen · Ghaeen · Faa · Qaaf · Kaaf · Laam · Meem · Noon · Wao · Haa · Hamzah · Yaa

**Note:** Bold letters (ص ض ط ظ خ غ ق) require the back of the mouth/throat — give them extra practice.`,
        objectives: [
          'Recite the name of every Arabic letter correctly',
          'Distinguish bold (heavy) letters from light letters',
          'Connect English transliteration to the Arabic letter sound',
        ],
        resources: [...eng(2), ...urdu(1)],
      },
      {
        order: 3,
        title: 'Lesson 3: Joined Letters (مرکبات) — Part 1',
        content: `Arabic letters change shape depending on their position in a word (initial / medial / final / isolated). Learn how Alif, Laam, and Kaaf connect.

**Key rule:** Have students identify every individual letter inside a joined word before reading it as a whole.

**Letters introduced:** Alif (4 joined forms) · Laam · Kaaf · Yaa`,
        objectives: [
          'Understand the 4 positional forms of Arabic letters',
          'Identify individual letters inside joined words',
          'Read short 2–3 letter joined combinations fluently',
        ],
        resources: [...eng(4, 5), ...urdu(2, 3)],
      },
      {
        order: 4,
        title: 'Lesson 3: Joined Letters (مرکبات) — Part 2',
        content: `Extended joining practice covering the remaining letters of the alphabet in all positional forms.

**Letters covered:** Kha · Jeem · Yaa · Meem · Noon · Taa · Baa · Laam · Haa · Dal · Zaal · Raa · Zaa · Seen · Sheen · Saad · Daad · Taa · Zaa · Aeen · Ghaeen · Faa · Wao · Qaaf`,
        objectives: [
          'Read all remaining letters in their joined forms',
          'Recognise letter shape changes at each position',
          'Read multi-letter combinations without hesitation',
        ],
        resources: [...eng(6), ...urdu(3, 4)],
      },
      {
        order: 5,
        title: 'Lesson 4 & 5: Muqattiat Letters + The Movements',
        content: `**Lesson 4 — Muqattiat (حروف مقطعات):** The disconnected letters that open certain Quranic surahs (الم · الر · طه · يس · حم · ن · ق…). Each is read by its letter name, not as a word.

**Lesson 5 — The Three Movements (حرکات):**
- **Fatha (زبر ـَ)** — short "a" sound, written above the letter
- **Kasra (زیر ـِ)** — short "i" sound, written below the letter
- **Damma (پیش ـُ)** — short "u" sound, written above the letter

**Critical rule:** Do NOT prolong or jerk a letter that carries Fatha, Kasra, or Damma — read it short and clean.`,
        objectives: [
          'Read all Muqattiat letter combinations correctly',
          'Identify and pronounce Fatha, Kasra, and Damma',
          'Apply short vowels to every letter of the alphabet',
        ],
        resources: [...eng(7), ...urdu(5)],
      },
    ],
  },

  {
    order: 2,
    title: 'Week 2 — Vowels, Tanween & Standing Vowels',
    description: 'Master all short and long vowel signs: the three harakat, tanween (double vowels), and the standing forms.',
    lessons: [
      {
        order: 1,
        title: 'Lesson 5: Movements — Full Exercise',
        content: `Full exercise applying Fatha, Kasra, and Damma to every letter of the alphabet. This is the most important drill in the Qaida — do not move forward until this is mastered.

**Practice every letter with all three vowels:**
ع · غ · خ · ق · ك · ج · ي · ض · ل · ن · ر · ت · د · ص · ز · ظ · ذ — each in all three vowel forms.`,
        objectives: [
          'Apply all three short vowels fluently to any letter',
          'Maintain consistent vowel quality without prolonging',
          'Read letter–vowel combinations at speed',
        ],
        resources: [...eng(8), ...urdu(6)],
      },
      {
        order: 2,
        title: 'Lesson 6: The Tanween (تنوین)',
        content: `Tanween = double vowel signs — the letter is followed by an "n" sound.

- **Tanween Fatha (ـً)** — double fatha, sounds like "an"
- **Tanween Kasra (ـٍ)** — double kasra, sounds like "in"
- **Tanween Damma (ـٌ)** — double damma, sounds like "un"

**Ikhfa rule:** When Tanween is followed by a non-throat letter, partially hide the "n" sound in the nose (Ikhfa). When followed by throat letters (ء ه ع ح غ خ), do NOT apply Ikhfa — pronounce the "n" fully.`,
        objectives: [
          'Recognise and pronounce all three Tanween forms',
          'Apply Ikhfa correctly after non-throat letters',
          'Read Tanween clearly after throat letters without nasal sound',
        ],
        resources: [...eng(9, 10), ...urdu(7, 8)],
      },
      {
        order: 3,
        title: 'Lesson 7: Tanween & Movements — Combined Practice',
        content: `Combined practice using both short vowels (harakat) and Tanween in real Quranic words.

**Key instruction:** If students cannot connect letters correctly, revise the previous lesson. This combined drill is critical — do not advance until mastered.

**Practice words from the Quran:** أبدا · أحد · أمر · نون · جعل · حسد · خلق · ذكر · رفع · صحفا · طبق · عبس · علق · فعل · قدر · كبد · وجد`,
        objectives: [
          'Read short vowels and Tanween in connected Quranic words',
          'Identify harakat and Tanween signs at speed',
          'Maintain correct pronunciation without slowing on familiar words',
        ],
        resources: [...eng(11, 12), ...urdu(9, 10)],
      },
      {
        order: 4,
        title: 'Lesson 8: Standing Fatha, Kasra & Damma (کھڑی زبر/زیر/پیش)',
        content: `Standing vowels look like small Alif, Yaa, or Wao sitting on/below a letter. They are **prolonged** (equal to one Alif length) unlike regular short vowels.

- **Standing Fatha (ـٰ)** — prolong like Alif Maddah
- **Standing Kasra (ـٖ)** — prolong like Yaa Maddah
- **Standing Damma (ـٗ)** — prolong like Wao Maddah

**Rule:** Do not take the voice of Maddah letters that come after Noon or Meem into the nose.`,
        objectives: [
          'Distinguish standing vowels from regular short vowels by sight',
          'Prolong standing vowels correctly (1 Alif length)',
          'Avoid nasalisation after Noon/Meem + Maddah combinations',
        ],
        resources: [...eng(12, 13), ...urdu(11)],
      },
    ],
  },

  {
    order: 3,
    title: 'Week 3 — Madd, Leen & Sukoon',
    description: 'Learn the long vowel letters (Madd), the Leen letters, and the silence sign (Sukoon/Jazm).',
    lessons: [
      {
        order: 1,
        title: 'Lesson 9: The Madd-o-Leen — Rules',
        content: `**Madd letters** extend a vowel sound for 1–2 seconds:
- **Alif Maddah (ا)** — when the letter before it has Fatha: بَا
- **Wao Maddah (وْ)** — when the letter before it has Damma: بُو
- **Yaa Maddah (يْ)** — when the letter before it has Kasra: بِي

**Leen letters:** When Wao Sakin (وْ) or Yaa Sakin (يْ) is preceded by Fatha — neither prolonged nor jerked, read softly.

**Four types of Madd:**
1. Madd Mutasil — Hamzah in the same word (جَاءَ)
2. Madd Munfasil — Hamzah at start of next word (إِنَّا أَنزَلْنَا)
3. Madd Lazim — Sukoon after Maddah (آلْآنَ) — prolong 3–5 seconds
4. Madd Arzi — Sukoon due to stopping (جُوع)`,
        objectives: [
          'Identify the three Madd letters and when each applies',
          'Distinguish Leen letters from Madd letters',
          'Name and recognise all four types of Madd',
        ],
        resources: [...eng(13, 14, 15), ...urdu(12, 13, 14)],
      },
      {
        order: 2,
        title: 'Lesson 10: Madd — Full Exercise with Quranic Words',
        content: `Comprehensive Madd and Leen practice using real Quranic words. All four Madd types are drilled here.

**Practice words:** آمن · جَاءَ · خَوْف · خَيْر · قَال · مَاء · يَوْم · عَاد · فِيه · كَان · لَيْس · وَيْل · حَاسِد · شَاهِد · عَابِد · رَسُول · عَظِيم · كَرِيم · نَعِيم · يَتِيم`,
        objectives: [
          'Apply all Madd rules in continuous reading',
          'Prolong Madd Lazim correctly for 3–5 seconds',
          'Read Leen letters without prolonging or jerking',
        ],
        resources: [...eng(16, 17, 18), ...urdu(15, 16, 17)],
      },
      {
        order: 3,
        title: 'Lesson 11: The Sukoon and Jazm (سکون/جزم)',
        content: `Sukoon (ـْ) is the "silence sign" — it means the letter has no vowel and is pronounced without any vowel sound. The letter is held briefly then released.

**Practice questions teachers should ask students:**
- What is Jazm? What is a letter with Jazm called?
- How many beats does a Sukoon letter get?

**Focus on distinguishing similar-sounding letters:**
ث · س · ص (all "s" variants) and ذ · ز · ظ (all "z" variants)`,
        objectives: [
          'Recognise the Sukoon sign and apply it correctly',
          'Pronounce letters with Sukoon without any vowel sound',
          'Distinguish similar letters (ث/س/ص and ذ/ز/ظ) by sound',
        ],
        resources: [...eng(19, 20), ...urdu(18)],
      },
      {
        order: 4,
        title: 'Lesson 12: Sukoon Exercise — Quranic Words (Part 1)',
        content: `Apply Sukoon rules to real Quranic vocabulary. This is the main bridge between the Qaida and actual Quran reading.

**Key rules reviewed:**
- **Ikhfa of Noon Sakin/Tanween:** Apply Ikhfa when followed by non-throat letters
- **Bold Raa (ر):** Read bold unless preceded by Yaa Sakin or Kasra
- **Bold letters:** ص ض ط ظ خ غ ق
- **Waqf symbols:** ط (full stop) · م (must stop) · ج (may stop) · ب (prefer to continue)

**Practice words:** حبل · خسر · سبح · صبح · عبد · عشر · فصل · قدم · كأس · لغو · مسك · نخل · يسر`,
        objectives: [
          'Read Quranic words with Sukoon accurately',
          'Apply Ikhfa and Izhar rules for Noon Sakin correctly',
          'Recognise Waqf (stopping) symbols in the Quran',
        ],
        resources: [...eng(20, 21), ...urdu(19, 20)],
      },
    ],
  },

  {
    order: 4,
    title: 'Week 4 — Quranic Word Practice',
    description: 'Intensive reading of Quranic words and phrases using all rules learned so far.',
    lessons: [
      {
        order: 1,
        title: 'Lesson 12: Sukoon Exercise — Quranic Words (Part 2)',
        content: `Continued Sukoon practice with longer Quranic words, including words with suffixes and verb forms.

**Words include:** يخرج · يحسب · يشرب · يشهد · يرهق · تعرف · يبدي · ينفخ · ينقلب · يوسوس · ثقلت · حشرت · سطحت · كشطت · نشرت · أثرن · وسطن

These multi-syllable words require smooth application of all previous rules simultaneously.`,
        objectives: [
          'Read multi-syllable Quranic words with Sukoon smoothly',
          'Apply verb forms and suffixes without pausing',
          'Maintain correct Madd lengths within longer words',
        ],
        resources: [...eng(22), ...urdu(21)],
      },
      {
        order: 2,
        title: 'Lesson 12: Sukoon Exercise — Quranic Phrases',
        content: `Reading complete Quranic phrases — multiple words connected together. This is the final step before beginning Quran reading.

**Phrases include:**
- والفتح · والعصر · من المعصرات · مع العسر
- ما القارعة · ينظر المرء · ليلة القدر
- أخرجت الأرض · من أهل الكتاب
- لقد خلقنا الإنسان في أحسن تقويم
- أعطيناك الكوثر`,
        objectives: [
          'Read multi-word Quranic phrases with proper flow',
          'Apply all vowel and Sukoon rules simultaneously',
          'Observe stopping (Waqf) signs correctly in context',
        ],
        resources: [...eng(23, 24), ...urdu(22)],
      },
    ],
  },

  {
    order: 5,
    title: 'Week 5 — Tashdeed (Shaddah)',
    description: 'Learn the Shaddah sign — the double consonant — and its interaction with Sukoon and Madd letters.',
    lessons: [
      {
        order: 1,
        title: 'Lesson 13: The Tashdeed — Introduction',
        content: `**Shaddah (ـّ)** means the letter is doubled — read it twice, the first time as a Sukoon, the second time with its vowel. It is read with a strong, emphatic voice.

**Q&A for teachers to test students:**
- What is this symbol called (ـّ)? → Tashdeed
- What is a letter with Tashdeed called? → Mushadad
- How many times is it read? → Two times
- How is it read? → With a strong voice

**Special rule:** Meem (م) and Noon (ن) with Shaddah always carry Ghunna (nasal resonance).`,
        objectives: [
          'Recognise the Shaddah sign and know its name',
          'Pronounce Mushadad letters with the correct double emphasis',
          'Apply Ghunna on Meem and Noon Mushadad',
        ],
        resources: [...eng(25), ...urdu(23)],
      },
      {
        order: 2,
        title: 'Lesson 14: Tashdeed — Full Exercise',
        content: `Full drill applying Shaddah to every letter with all three vowels. Then Shaddah with extended Madd forms.

**Every letter practiced as:** بَّ / بِّ / بُّ / بَّا / بَّي / بُّو

Then Quranic words with Shaddah: كذب · نعم · يظن · جنة · قوة · كرة · سعرت · قدمت · كذبت · تظلم · تحدث · إياك · لله · تجلى · تصدى · تزكى`,
        objectives: [
          'Read all letters with Shaddah and all three vowels',
          'Combine Shaddah with Madd correctly (no shortening of Madd)',
          'Read Shaddah words in Quranic context accurately',
        ],
        resources: [...eng(26, 27), ...urdu(24, 25)],
      },
      {
        order: 3,
        title: 'Lesson 15 & 16: Tashdeed with Sukoon, and Double Tashdeed',
        content: `**Lesson 15 — Tashdeed with Sukoon:** Combining Shaddah and Sukoon in the same word.

**Practice words:** مروا ربي · مدت · حقت · خفت · ثبت · والصبح · والشمس · والشفق · بالصبر · والضيف · والليل · والتين · والزيتون · سجيل · سجين · منفكين

**Lesson 16 — Double Tashdeed:** Two Shaddah letters in the same phrase (common in Quran).

**Examples:** يذكر · المدثر · المزمل · عليين · إن الذين · إلا الذين · فعال لما يريد`,
        objectives: [
          'Read Tashdeed with Sukoon in the same word smoothly',
          'Handle consecutive Shaddah letters without merging them',
          'Identify these patterns in Quranic text independently',
        ],
        resources: [...eng(28, 29), ...urdu(26, 27)],
      },
    ],
  },

  {
    order: 6,
    title: 'Week 6 — Advanced Rules & Recitation Standards',
    description: 'Master the final Tajweed rules: Idgham, Ikhfa, Iqlab, Izhar, Meem Sakin, and the standards for correct Quranic recitation.',
    lessons: [
      {
        order: 1,
        title: 'Lesson 17: Tashdeed with Madd Letters',
        content: `Shaddah combined with Madd letters — one of the most frequent patterns in Quranic recitation.

**How to connect:** ضاد · الف · لام · ذربضال · لام · ذبر · لا = ضَالًّا

**Practice words:** ضالاّ · حاجوك · لضالون · ولا الضالين · اتحاجوني · جاءت · والصافات · فإذا جاءت · الطامة الكبرى`,
        objectives: [
          'Combine Shaddah with all three Madd letter types',
          'Maintain full Madd length on letters followed by Shaddah',
          'Read these combinations in continuous Quranic phrases',
        ],
        resources: [...eng(30), ...urdu(28)],
      },
      {
        order: 2,
        title: 'Lesson 18: The Four Ending Rules (Noon Sakin & Tanween)',
        content: `The four rules that govern how Noon Sakin (نْ) and Tanween interact with the following letter:

**1. Idgham (إدغام):** Merge Noon/Tanween into the following letter when followed by يرملون letters (ي ر م ل و ن). Apply Ghunna on all except ل and ر.

**2. Ikhfa (إخفاء):** Hide Noon/Tanween in the nose when followed by the 15 Ikhfa letters. Partial nasal sound.

**3. Iqlab (إقلاب):** Convert Noon/Tanween into Meem with Ghunna when followed by ب.

**4. Izhar (إظهار):** Pronounce Noon/Tanween clearly when followed by throat letters (ء ه ع ح غ خ). No nasal sound.

**Note:** Do not read the letter before Tashdeed when the preceding word ends in Noon Sakin (مَن رَّبِّك → مَرَّبِّك).`,
        objectives: [
          'Name and apply all four rules for Noon Sakin and Tanween',
          'Identify which rule applies based on the following letter',
          'Read Idgham, Ikhfa, Iqlab, and Izhar correctly in Quranic text',
        ],
        resources: [...eng(30, 31), ...urdu(29, 30)],
      },
      {
        order: 3,
        title: 'Lesson 18: Meem Sakin Rules + Final Practice',
        content: `**Meem Sakin (مْ) has three rules:**

1. **Ikhfa Shafawi:** When Meem Sakin is followed by ب — hide the Meem in the lips with Ghunna.
2. **Idgham Shafawi:** When Meem Sakin is followed by م — merge the two Meems with Ghunna.
3. **Izhar Shafawi:** When Meem Sakin is followed by any other letter — pronounce Meem clearly.

**Special rule:** When the word اللّٰه is preceded by Kasra, the Laam is read light (لَهُ اللهُ vs بِسْمِ اللهِ).

**Final Quranic practice** covering all rules learned throughout the Qaida.`,
        objectives: [
          'Apply all three Meem Sakin rules correctly',
          'Read the word "Allah" with the correct Laam weight based on context',
          'Recite extended Quranic passages applying all Qaida rules',
        ],
        resources: [...eng(31, 32), ...urdu(30)],
      },
      {
        order: 4,
        title: 'Reference: Recitation Standards & Common Errors',
        content: `**Qualities of correct Tilawat (تلاوت):**
- **Tarteel** — measured, unhurried recitation
- **Tajweed** — applying pronunciation rules precisely
- **Taghni** — melodious recitation
- **Tafkhim** — correct emphasis on bold/heavy letters

**What to avoid (لحن):**
- **Lahn Jali (لحن جلی):** Major errors that change the meaning — mispronouncing letters, adding/dropping vowels, confusing similar letters. These are sinful and must be corrected immediately.
- **Lahn Khafi (لحن خفی):** Minor errors — incorrect Madd length, weak Ghunna, missing Qalqala. These reduce the quality of recitation.

**Reference table:** Key Quranic words with unusual/exception pronunciation rules (e.g. special Waqf positions, irregular Madd lengths, words that look one way but are read another).

If your student has completed this Qaida with all rules, they are ready to begin reading the Holy Quran.`,
        objectives: [
          'Understand the four qualities of correct Quranic recitation',
          'Distinguish Lahn Jali (major) from Lahn Khafi (minor) errors',
          'Use the reference table to handle exception pronunciation cases',
        ],
        resources: [...eng(33), ...urdu(31)],
      },
    ],
  },
];

// ── Subjects to seed ──────────────────────────────────────────────────────────

type ResourceFilter = 'english' | 'urdu';

const SUBJECTS: { id: string; title: string; description: string; color: string; filter: ResourceFilter }[] = [
  {
    id:          'noorani-qaida-english',
    title:       'Noorani Qaida (English)',
    description: 'Noorani Qaida with English-medium pages. Covers Arabic alphabet recognition, vowels, Tanween, Madd, Sukoon, Shaddah, and core Tajweed rules using English transliteration aids.',
    color:       '#059669',
    filter:      'english',
  },
  {
    id:          'noorani-qaida-urdu',
    title:       'Noorani Qaida (Urdu)',
    description: 'Noorani Qaida with Urdu-medium pages. Covers Arabic alphabet recognition, vowels, Tanween, Madd, Sukoon, Shaddah, and core Tajweed rules with Urdu explanations.',
    color:       '#0d9488',
    filter:      'urdu',
  },
];

// ── Main ───────────────────────────────────────────────────────────────────────

async function seedSubject(subjectDef: typeof SUBJECTS[number]) {
  const subject = await prisma.subject.upsert({
    where:  { id: subjectDef.id },
    create: { id: subjectDef.id, title: subjectDef.title, description: subjectDef.description, color: subjectDef.color, grade: null, isPublished: true },
    update: { title: subjectDef.title, description: subjectDef.description, color: subjectDef.color, isPublished: true },
  });

  console.log(`  Subject: ${subject.title} (${subject.id})`);

  for (const weekData of WEEKS) {
    const week = await prisma.week.upsert({
      where:  { subjectId_order: { subjectId: subject.id, order: weekData.order } },
      create: { subjectId: subject.id, title: weekData.title, description: weekData.description, order: weekData.order },
      update: { title: weekData.title, description: weekData.description },
    });

    console.log(`    Week ${weekData.order}: ${week.title}`);

    for (const lessonData of weekData.lessons) {
      // Filter resources to only the relevant language
      const filteredResources = lessonData.resources.filter(r =>
        subjectDef.filter === 'english'
          ? r.originalName.toLowerCase().includes('english')
          : r.originalName.toLowerCase().includes('urdu')
      );

      await prisma.lesson.upsert({
        where:  { weekId_order: { weekId: week.id, order: lessonData.order } },
        create: { weekId: week.id, title: lessonData.title, type: 'TEXT', content: lessonData.content, order: lessonData.order, isPublished: true, objectives: lessonData.objectives, resources: filteredResources },
        update: { title: lessonData.title, content: lessonData.content, isPublished: true, objectives: lessonData.objectives, resources: filteredResources },
      });
    }
  }

  const totalLessons = WEEKS.reduce((sum, w) => sum + w.lessons.length, 0);
  return totalLessons;
}

export async function main() {
  console.log('Seeding Noorani Qaida subjects…\n');
  for (const subjectDef of SUBJECTS) {
    const n = await seedSubject(subjectDef);
    console.log(`  ✓ ${subjectDef.title} — ${WEEKS.length} weeks, ${n} lessons\n`);
  }
  console.log('Done.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
