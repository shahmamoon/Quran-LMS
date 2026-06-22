// Idempotent seed for the content engine. Safe to run repeatedly — it does NOT
// wipe data (unlike seed.ts). Creates/updates:
//   1. the "Content Bot" service account the n8n workflow logs in as
//   2. the P1 article topic queue (from research/01-keyword-query-map.md)
//
// Run:  CONTENT_BOT_PASSWORD='strong-secret' npm run db:seed:content-engine
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BOT_EMAIL = process.env.CONTENT_BOT_EMAIL || 'content-bot@quranacademy.com';
const BOT_PASSWORD = process.env.CONTENT_BOT_PASSWORD || 'ChangeMe-ContentBot@123';

// Each topic maps to one cornerstone article. priority drives claim order (P1 first).
const TOPICS: Array<{
  topicTitle: string; seoKeyword: string; geoQuery: string;
  cluster: string; intent: string; priority: string; notes?: string;
  // if a published Post with this slug already exists, the topic is linked + marked DRAFTED
  existingSlug?: string;
}> = [
  { topicTitle: 'What Age Should Kids Learn AI? An Honest Guide for Parents (Ages 5–17)', seoKeyword: 'what age should kids learn ai', geoQuery: 'What age should my child start learning AI?', cluster: 'B', intent: 'TOFU', priority: 'P1', notes: 'Cornerstone #1 — may already be published.', existingSlug: 'what-age-should-kids-learn-ai' },
  { topicTitle: 'Is AI Safe for Kids? What Every Parent Should Know Before Starting', seoKeyword: 'is ai safe for kids', geoQuery: 'Is it safe for my kid to use AI tools?', cluster: 'B', intent: 'TOFU', priority: 'P1', notes: 'Trust-builder. Internal-link to the "what age" article.' },
  { topicTitle: '1:1 AI Mentorship vs. Group AI Classes: Which Is Right for Your Child?', seoKeyword: '1:1 vs group ai classes for kids', geoQuery: 'Is 1:1 or a group AI class better for my child?', cluster: 'C', intent: 'MOFU', priority: 'P1', notes: 'Differentiator cluster — our home turf.' },
  { topicTitle: 'How Your Kid Can Build Their First AI Chatbot (Step-by-Step)', seoKeyword: 'how to build a chatbot for kids', geoQuery: 'How can my kid build their own chatbot?', cluster: 'D', intent: 'MOFU', priority: 'P1', notes: 'Outcome proof; demonstrates the value prop.' },
  { topicTitle: 'How to Find a Private AI Tutor for Your Child (and What to Look For)', seoKeyword: 'private ai tutor for kids', geoQuery: 'Can my kid get one-on-one AI lessons?', cluster: 'C', intent: 'BOFU', priority: 'P1', notes: 'BOFU capture.' },
  { topicTitle: 'How to Teach Your Child About AI at Home', seoKeyword: 'teach ai to kids', geoQuery: 'How do I teach my child about AI at home?', cluster: 'A', intent: 'TOFU', priority: 'P1', notes: 'Long-tail entry into the head term.' },
  { topicTitle: 'Is My 12-Year-Old Too Young to Learn AI Coding?', seoKeyword: 'ai for 12 year old', geoQuery: 'Is my 12-year-old too young to learn to code AI?', cluster: 'B', intent: 'TOFU', priority: 'P1', notes: 'Age-specific; pairs with the "what age" article.' },
  { topicTitle: 'Is There a Private AI Tutor for My Child? 1:1 AI Mentorship Explained', seoKeyword: '1:1 ai mentorship for kids', geoQuery: 'Is there a private AI tutor for my child?', cluster: 'C', intent: 'BOFU', priority: 'P1', notes: 'Home-turf BOFU.' },
  { topicTitle: 'How to Find an AI Mentor for Your Teenager', seoKeyword: 'ai mentor for teens', geoQuery: 'How do I find an AI mentor for my teenager?', cluster: 'C', intent: 'BOFU', priority: 'P1', notes: 'Teen-focused BOFU.' },
  { topicTitle: "Personalized (Not Group) AI Classes for Kids: A Parent's Guide", seoKeyword: 'personalized ai learning for kids', geoQuery: 'Are there personalized (not group) AI classes for kids?', cluster: 'C', intent: 'MOFU', priority: 'P1', notes: 'Personalization angle.' },
  { topicTitle: 'What AI Projects Can a Teenager Build?', seoKeyword: 'ai app projects for teens', geoQuery: 'What AI projects can a teenager build?', cluster: 'D', intent: 'MOFU', priority: 'P1', notes: 'Outcome/project content.' },
];

async function seedContentBot() {
  const passwordHash = await bcrypt.hash(BOT_PASSWORD, 10);
  const bot = await prisma.user.upsert({
    where: { email: BOT_EMAIL },
    // keep an existing bot's password unless this run is creating it
    update: { firstName: 'Content', lastName: 'Bot', role: Role.TEACHER, emailVerified: true },
    create: {
      email: BOT_EMAIL, passwordHash,
      firstName: 'Content', lastName: 'Bot', role: Role.TEACHER,
      bio: 'Automated content-engine service account (n8n).',
      emailVerified: true,
    },
  });
  console.log(`   ✓ Content Bot ready: ${bot.email} (role ${bot.role})`);
  return bot;
}

async function seedTopics() {
  let created = 0, skipped = 0, linked = 0;
  for (const t of TOPICS) {
    const exists = await prisma.blogTopic.findFirst({ where: { topicTitle: t.topicTitle } });
    if (exists) { skipped++; continue; }

    // If the article was already published manually, link it and mark DRAFTED.
    let postId: string | null = null;
    let status: 'QUEUED' | 'DRAFTED' = 'QUEUED';
    if (t.existingSlug) {
      const post = await prisma.post.findUnique({ where: { slug: t.existingSlug }, select: { id: true } });
      if (post) { postId = post.id; status = 'DRAFTED'; linked++; }
    }

    await prisma.blogTopic.create({
      data: {
        topicTitle: t.topicTitle, seoKeyword: t.seoKeyword, geoQuery: t.geoQuery,
        cluster: t.cluster, intent: t.intent, priority: t.priority, notes: t.notes ?? null,
        status, postId, draftedAt: status === 'DRAFTED' ? new Date() : null,
      },
    });
    created++;
  }
  console.log(`   ✓ Topics — created ${created}, skipped (already present) ${skipped}, linked to existing posts ${linked}`);
}

async function main() {
  console.log('🌱 Seeding content engine (non-destructive)…');
  await seedContentBot();
  await seedTopics();
  console.log('✅ Done. Add these to n8n credentials/env:');
  console.log(`   CONTENT_BOT_EMAIL=${BOT_EMAIL}`);
  console.log('   CONTENT_BOT_PASSWORD=(the value you seeded with)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
