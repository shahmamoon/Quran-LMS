/**
 * seed-blog-posts.ts — Idempotent starter blog content.
 *
 * Upserts a set of SEO/GEO articles by slug. Safe to run repeatedly and on
 * production — it never deletes data and only touches the posts listed here.
 *
 *   CONTENT runs as PUBLISHED with authorName "Build AI With Us".
 *   Run:  npm run db:seed:blog   (or via the seed-blog.yml workflow on prod)
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

interface Article {
  slug: string;
  title: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  tags: string[];
  faqs: { q: string; a: string }[];
  content: string;
}

const ARTICLES: Article[] = [
  {
    slug: 'what-age-should-kids-start-learning-ai',
    title: 'What Age Should Kids Start Learning AI? A Parent’s Guide',
    excerpt: 'Wondering when your child should start learning artificial intelligence? Here’s a practical, age-by-age guide for parents — and why 10 is the sweet spot.',
    metaTitle: 'What Age Should Kids Start Learning AI? (Parent’s Guide 2026)',
    metaDescription: 'A practical, age-by-age guide to when kids should start learning AI. Discover why ages 10–13 are ideal and how to get started with 1:1 mentorship.',
    keywords: 'what age to learn AI, AI for kids age, when should kids learn coding, AI education for children',
    tags: ['ai-for-kids', 'parenting', 'getting-started'],
    faqs: [
      { q: 'What is the best age for a child to start learning AI?', a: 'Most children are ready to start learning AI concepts around age 10. At this stage they can grasp logic, cause-and-effect, and prompt design without needing heavy maths or programming theory.' },
      { q: 'Does my child need to know how to code first?', a: 'No. Modern AI tools let beginners build chatbots and voice agents using plain language and visual logic. Coding skills are introduced gradually as the student progresses.' },
    ],
    content: `Artificial intelligence is no longer a niche subject for university students — it is quickly becoming a core literacy for the next generation. As a parent, one of the most common questions we hear is simple: *when should my child start?*

## The short answer: around age 10

In our experience mentoring students one-on-one, **age 10 is the sweet spot** for most children to begin a structured AI journey. By this age, kids can:

- Understand cause and effect ("if I change this prompt, the answer changes")
- Follow multi-step logic without getting overwhelmed
- Stay engaged with project-based learning for 45–60 minutes
- Express their own ideas about what they want to build

That said, the "right age" depends far more on **curiosity and readiness** than a number on a birthday cake.

## An age-by-age guide

### Ages 7–9: Playful exposure
Younger children can benefit from playful exposure to how computers "think" — talking to voice assistants, exploring simple block-based coding, and asking questions about how apps work. The goal here is wonder, not mastery.

### Ages 10–13: The foundation years
This is where structured learning pays off. Children can start designing their own chatbots, experimenting with prompt engineering, and understanding the basics of how AI models make decisions. Our **AI Explorer** program is built precisely for this window.

### Ages 13–16: Building real things
Teens are ready to move from logic to creation — building real iOS apps, automating tasks, and connecting to live data. The abstract suddenly becomes tangible.

### Ages 16+: Going deep
Older teens can tackle large language models, autonomous agents, and full-stack AI products — portfolio-grade work that opens doors to internships and university programs.

## Why earlier (with the right approach) is better

Children who learn AI early don't just gain a technical skill — they develop **agentic thinking**: the ability to break problems down, design systems, and direct powerful tools toward their own goals. In an AI-first world, that mindset matters more than memorising any single programming language.

The key is the *right approach*. Generic video courses lose most kids within weeks. Personalised, 1:1 mentorship that follows the student's curiosity keeps them building — and keeps them excited.

## Getting started

If your child is 10 or older and shows any spark of curiosity about how AI works, that spark is enough. The best next step is a low-pressure conversation about what they'd love to build.

[Book a free assessment](/book) and we'll help you find the right starting point for your child.`,
  },
  {
    slug: 'best-ai-projects-for-teenagers',
    title: '10 Best AI Projects for Teenagers in 2026',
    excerpt: 'Looking for AI project ideas that will actually excite your teen? Here are 10 real, buildable AI projects — from chatbots to autonomous agents.',
    metaTitle: '10 Best AI Projects for Teenagers in 2026 | Build AI With Us',
    metaDescription: 'Ten real, buildable AI project ideas for teenagers in 2026 — from custom chatbots to iOS apps and autonomous agents. Perfect for portfolios and university applications.',
    keywords: 'AI projects for teenagers, AI project ideas, coding projects for teens, AI portfolio projects',
    tags: ['ai-projects', 'teens', 'inspiration'],
    faqs: [
      { q: 'What is a good first AI project for a teenager?', a: 'A custom chatbot is an ideal first project. It teaches prompt design, logic, and user experience while producing something genuinely useful the teen can show off.' },
      { q: 'Do AI projects help with university applications?', a: 'Yes. A portfolio of real, working AI projects demonstrates initiative, technical skill, and creativity — qualities that stand out strongly in competitive university and internship applications.' },
    ],
    content: `The best way for a teenager to learn AI isn't through endless theory — it's by **building something real**. A finished project teaches more than a dozen tutorials, and it gives your teen something concrete to be proud of (and to put on a university application).

Here are ten of our favourite AI projects for teens, roughly ordered from beginner to advanced.

## 1. A custom AI chatbot
The classic first project. Your teen designs a chatbot with its own personality and purpose — a homework helper, a trivia host, or a study buddy. It teaches prompt engineering and conversational design.

## 2. A personal voice agent
Take the chatbot further by giving it a voice. Teens learn how speech-to-text and text-to-speech connect to AI models.

## 3. An AI story or poem generator
A creative favourite. Students build a tool that generates stories, lyrics, or poems in a chosen style — a great introduction to how prompts shape output.

## 4. A daily planner iOS app
Moving into real app development, teens build a working planner app for iPhone using Swift — complete with reminders and a clean interface.

## 5. An automated study assistant
Using automation tools like n8n, teens connect AI to their calendar and notes to automatically summarise lessons or generate flashcards.

## 6. A weather or news bot
A practical project connecting a live API to an AI layer that summarises and personalises the information.

## 7. An image-classification mini-app
An accessible introduction to machine learning: teach a model to recognise categories of images and build a simple app around it.

## 8. A "voice-to-action" system
More advanced: a system that listens to a spoken command and takes a real action — turning natural language into automation.

## 9. An autonomous research agent
For experienced teens — an AI agent that can break a research question into steps, gather information, and produce a structured summary on its own.

## 10. A full-stack AI SaaS MVP
The capstone project. Teens design and ship a real, small software product powered by AI — the kind of work that genuinely impresses admissions officers and employers.

## How to choose the right project

The best project is the one your teen is *excited* about. Motivation beats difficulty every time. In our 1:1 mentorship, we start by asking what a student wishes existed — then we help them build exactly that.

[Book a free assessment](/book) and we'll help your teen pick (and build) their first real AI project.`,
  },
  {
    slug: 'how-to-teach-ai-to-kids',
    title: 'How to Teach AI to Kids: A Step-by-Step Guide for Parents',
    excerpt: 'You don’t need to be a programmer to set your child up for success with AI. Here’s a clear, step-by-step approach any parent can follow.',
    metaTitle: 'How to Teach AI to Kids: A Step-by-Step Parent’s Guide',
    metaDescription: 'A clear, step-by-step guide for parents on how to teach AI to kids — even with no technical background. Build curiosity, confidence, and real skills.',
    keywords: 'how to teach AI to kids, teaching AI to children, AI for kids guide, AI parenting',
    tags: ['ai-for-kids', 'parenting', 'how-to'],
    faqs: [
      { q: 'Can I teach my child AI if I’m not technical?', a: 'Absolutely. The most important thing you provide is encouragement and curiosity. The technical mentoring can be handled by an expert while you support your child’s motivation at home.' },
      { q: 'How much time does learning AI require each week?', a: 'A single focused 1:1 session per week, plus a little independent tinkering, is enough for steady, meaningful progress for most children.' },
    ],
    content: `Many parents feel a quiet worry: *"AI is clearly important, but I'm not technical — how can I possibly help my child learn it?"*

Here's the good news. You don't need to know how to code. The qualities that actually set a child up for success with AI — curiosity, encouragement, and consistency — are things every parent can provide.

## Step 1: Start with curiosity, not curriculum
Before any lessons, talk with your child about AI they already use: voice assistants, recommendation feeds, game characters, image generators. Ask "how do you think that works?" The goal is to turn AI from background noise into something they wonder about.

## Step 2: Let them play with real tools
Hands-on beats theory every time. Supervised, age-appropriate use of AI chat tools — asking questions, giving instructions, seeing how different wording changes the result — builds intuition for prompt engineering before they ever learn the term.

## Step 3: Move from using to building
There's a huge leap between *using* AI and *building* with it. The building stage is where real skill develops. This usually benefits from structured guidance — a mentor who can meet your child at their level and keep them progressing.

## Step 4: Focus on projects, not lectures
Children stay engaged when they're making something they care about. Instead of "today we learn about variables," it's "today we build your chatbot." The concepts get absorbed naturally through the project.

## Step 5: Celebrate finished work
Every completed project — even a simple one — is a confidence milestone. Encourage your child to demo what they built to family. That sense of "I made this" is what keeps them coming back.

## Step 6: Get expert support where it counts
This is where many parents get stuck, and it's completely normal. You can provide motivation and curiosity at home, while an expert mentor handles the technical guidance. A good 1:1 mentor adapts to your child's pace, interests, and learning style — something no pre-recorded course can do.

## The role of 1:1 mentorship

Generic online courses have completion rates below 10% for a reason: they can't adapt. A mentor can notice when your child is bored, stuck, or ready to leap ahead — and adjust on the spot. That personalisation is the single biggest factor in whether a child sticks with AI long enough to get good at it.

[Book a free assessment](/book) and we'll show you exactly how a personalised path could work for your child.`,
  },
  {
    slug: '1-on-1-mentorship-vs-online-courses',
    title: 'Why 1:1 AI Mentorship Beats Online Coding Courses for Kids',
    excerpt: 'Pre-recorded courses are cheap, but most kids never finish them. Here’s why personalised 1:1 mentorship produces dramatically better results.',
    metaTitle: '1:1 AI Mentorship vs Online Courses for Kids | Build AI With Us',
    metaDescription: 'Why personalised 1:1 AI mentorship beats pre-recorded online coding courses for kids — completion rates, motivation, and real outcomes compared.',
    keywords: 'AI mentorship vs online courses, 1:1 coding tutor, best way to learn AI for kids, online coding courses for kids',
    tags: ['mentorship', 'parenting', 'comparison'],
    faqs: [
      { q: 'Are online coding courses bad for kids?', a: 'Not bad — just limited. They work for highly self-motivated learners, but most children need the accountability, feedback, and adaptation that only a live mentor can provide.' },
      { q: 'Is 1:1 mentorship worth the higher cost?', a: 'For most families, yes. The completion and skill-retention rates of 1:1 mentorship are dramatically higher, which means you actually get the outcome you’re paying for rather than an unfinished course.' },
    ],
    content: `When parents start looking into AI education for their children, they quickly find two very different options: cheap (or free) pre-recorded online courses, and premium 1:1 mentorship. The price gap is real — so is the difference in results.

## The problem with pre-recorded courses

Online courses look appealing: low cost, learn-anytime flexibility, polished videos. But the data tells a hard story. **Completion rates for self-paced online courses are often below 10%.** For children, who are still developing self-discipline, the number is usually worse.

Why do kids stall?

- **No accountability.** When no one is expecting them, "later" becomes "never."
- **No adaptation.** A video can't tell when a child is bored, lost, or ready to skip ahead.
- **No feedback.** When something breaks, there's no one to ask — and frustration ends sessions fast.
- **One-size-fits-all pace.** Too slow and they're bored; too fast and they're lost.

## Why 1:1 mentorship works

A live mentor changes the entire dynamic:

### It adapts in real time
A mentor notices the moment a child's eyes glaze over — and changes the example to something they care about. That responsiveness is impossible to pre-record.

### It builds accountability
A scheduled weekly session creates gentle, positive accountability. Children show up, make progress, and build momentum.

### It follows the child's curiosity
Instead of a fixed syllabus, mentorship can pivot to what excites *this* student — whether that's game AI, music generation, or building an app for their sports team.

### It gives instant feedback
When something breaks (and it always does), a mentor turns the frustrating moment into the best learning moment. Stuck-and-quit becomes stuck-then-breakthrough.

## The outcome difference

The result isn't just "more lessons completed." It's a child who **actually builds real things, retains the skills, and stays motivated** long enough to get genuinely good. That's the difference between a half-finished course gathering dust and a portfolio of working AI projects.

## The honest trade-off

1:1 mentorship costs more than a video course — that's real. But the relevant question isn't "which is cheaper?" It's "which one actually delivers the outcome?" A finished, skilled, motivated learner is worth far more than a cheap course your child never completes.

[Book a free assessment](/book) to see how personalised AI mentorship could work for your child.`,
  },
  {
    slug: 'is-ai-safe-for-kids',
    title: 'Is AI Safe for Kids? What Every Parent Should Know in 2026',
    excerpt: 'AI can be a powerful tool for children — or a risk — depending on how it’s used. Here’s an honest, practical guide to keeping kids safe while they learn AI.',
    metaTitle: 'Is AI Safe for Kids? A Parent’s Safety Guide (2026)',
    metaDescription: 'Is AI safe for children? An honest guide for parents on chatbot safety, data privacy, age-appropriate tools, and how supervised AI learning protects kids.',
    keywords: 'is AI safe for kids, AI safety for children, are chatbots safe for kids, kids AI privacy, safe AI tools for children',
    tags: ['ai-safety', 'parenting', 'ai-for-kids'],
    faqs: [
      { q: 'Are AI chatbots safe for children to use alone?', a: 'Open consumer chatbots are not designed for unsupervised use by children — most providers age-gate users under 18. Kids should use AI tools with adult guidance, or through structured, age-appropriate platforms built for learning.' },
      { q: 'What is the biggest AI safety risk for kids?', a: 'The main risks are exposure to inappropriate content, oversharing personal data, and treating AI output as fact. All three are dramatically reduced when a child learns AI in a supervised, project-based setting rather than browsing open tools alone.' },
      { q: 'At what age can a child use AI safely?', a: 'With proper adult mediation, children can explore safe AI tools from around age 9. Independent use of more powerful tools like LLM chatbots should wait until the teen years and remain supervised, with parent-consented access.' },
    ],
    content: `As AI becomes part of everyday life, one question keeps every thoughtful parent up at night: *is this actually safe for my child?* It's the right question to ask — and the honest answer is that **AI is as safe as the way it's used.**

## The real risks (and why they're manageable)

Let's be straight about the concerns, because pretending they don't exist helps no one.

### 1. Inappropriate content
Open, general-purpose chatbots weren't built for kids. They can generate or discuss content that isn't age-appropriate. This is exactly why most major AI providers **age-gate users under 18.**

### 2. Data privacy
Children are natural over-sharers. Left alone with an AI tool, a child might type their full name, school, or location without a second thought. Where that data goes matters.

### 3. Treating AI as truth
AI models confidently state things that are wrong — a behaviour called "hallucination." A child who believes everything a chatbot says is being misled, not educated.

## The safety principle that solves most of this

Here's the key insight from child-safety research: **the problem isn't AI itself — it's unsupervised access to the wrong tools.**

When a child learns AI the right way, every one of those risks shrinks:

- **Supervised, age-appropriate tools** instead of open consumer chatbots
- **Adult guidance** so a child never faces inappropriate content alone
- **No personal data** entered into tools as a teaching rule from day one
- **Critical thinking taught directly** — children learn to *check* AI answers against trusted sources, turning a risk into a skill

## What "safe AI learning" actually looks like

In a well-designed program, a 10-year-old doesn't sit alone with an open chatbot. They train their own image classifier in a structured tool, build a simple chatbot with logic they can see, and learn — explicitly — that "AI is not a person, AI makes mistakes, and AI is not a substitute for real friends or trusted adults."

That last lesson is one of the most valuable things a child can learn in an AI-first world, and it only happens when safety is built into the teaching, not bolted on.

## Safety is a feature, not an afterthought

The safest way for a child to learn AI is **with an expert who treats safety as a hard rule** — age-appropriate tools, adult mediation, no unsupervised open chatbots, and a constant thread of digital-citizenship and critical thinking woven through every lesson.

[Book a free assessment](/book) and we'll walk you through exactly how we keep young learners safe while they build real AI skills.`,
  },
  {
    slug: 'no-code-ai-projects-for-kids',
    title: 'No-Code AI Projects for Kids: Build Real AI Without Coding',
    excerpt: 'Your child can build a working AI model before they ever write a line of code. Here are the best no-code AI projects for kids — and why they’re the perfect starting point.',
    metaTitle: 'No-Code AI Projects for Kids: Build AI Without Coding (2026)',
    metaDescription: 'Discover the best no-code AI projects for kids — train image classifiers, build chatbots, and create gesture games using Teachable Machine, Scratch, and more.',
    keywords: 'no-code AI for kids, AI projects without coding, Teachable Machine for kids, machine learning for kids, no-code machine learning',
    tags: ['ai-projects', 'no-code', 'ai-for-kids', 'getting-started'],
    faqs: [
      { q: 'Can kids really build AI without coding?', a: 'Yes. Tools like Google Teachable Machine and Machine Learning for Kids let children train real machine-learning models by example — no programming required. It’s the ideal first step before learning to code.' },
      { q: 'What is the best no-code AI tool for beginners?', a: 'Google Teachable Machine is the most popular starting point. Kids can train an image, sound, or pose classifier in minutes and immediately test it with their webcam.' },
    ],
    content: `Here's a fact that surprises most parents: **your child can train a real, working AI model today — without writing a single line of code.** No-code AI tools have transformed how children learn, letting them experience the magic of machine learning before tackling the maths or syntax behind it.

This "concept first, code later" approach isn't a shortcut. It's how the best curricula are designed, because building intuition beats memorising theory every time.

## Why start with no-code?

When a 10-year-old trains an AI model by showing it examples, something clicks. They *feel* how AI learns from data, why more varied examples make a better model, and what "bias" means when their classifier gets confused. Those are deep ideas — and they're learned through play, not lectures.

Then, when coding comes later, it has a purpose. The child already knows what they want to build.

## The best no-code AI projects for kids

### 1. Train an image classifier (Teachable Machine)
The perfect first project. Your child uses their webcam to teach an AI to tell things apart — thumbs-up vs. peace sign, a cat toy vs. a ball. In ten minutes they've trained a real model and tested its accuracy.

### 2. A gesture-controlled game
Wire that classifier into a Scratch game so the player controls it by waving — rock-paper-scissors against the computer, or steering with hand gestures. Suddenly the AI *does* something fun.

### 3. A smart camera that recognises emotions
Using block-based tools, kids build a system that detects facial expressions and reacts — a friendly introduction to how computer vision works.

### 4. A "guess the animal" decision tree
An unplugged-then-digital classic: the child builds a question-tree that narrows down to an answer, learning how AI represents knowledge and makes decisions.

### 5. A simple rule-based chatbot
Before LLMs, kids build a chatbot from logic they can see — input leads to response. It demystifies how conversation systems work.

### 6. A self-trained sound classifier
Train an AI to recognise different sounds — a clap, a whistle, a word — and trigger an action. Great for understanding how voice assistants begin.

## What kids actually learn

No-code projects look like play, but they teach the real foundations: how data shapes a model, why quality examples matter, what bias is, and how AI perceives the world. These are the exact concepts that make later coding click.

## The natural next step

Once a child has trained a few models and built a couple of projects, the leap to code becomes exciting rather than intimidating — they're now coding to build something they already imagine. That bridge from no-code to real programming is where a 1:1 mentor adds the most value, meeting your child exactly where they are.

[Book a free assessment](/book) and we'll help your child train their very first AI model.`,
  },
  {
    slug: 'ai-skills-future-proof-childs-career',
    title: 'Will AI Take My Child’s Future Job? How to Future-Proof Their Career',
    excerpt: 'AI is reshaping every career path. Here’s how to make sure your child is the one using AI to get ahead — not the one being replaced by it.',
    metaTitle: 'Future-Proof Your Child’s Career in an AI World (2026 Guide)',
    metaDescription: 'AI is transforming the job market. Learn which skills future-proof your child’s career, why AI literacy matters now, and how to prepare them to thrive.',
    keywords: 'future-proof child career AI, AI and future jobs, skills kids need for AI future, will AI replace jobs, AI literacy for kids',
    tags: ['future-skills', 'parenting', 'career'],
    faqs: [
      { q: 'Will AI replace most jobs my child might want?', a: 'AI will transform far more jobs than it eliminates. The people who thrive won’t be those who avoid AI — they’ll be those who know how to direct it. Teaching your child to build with AI puts them firmly in that group.' },
      { q: 'What skills will matter most in an AI-driven future?', a: 'Beyond AI literacy itself, the most durable skills are problem-framing, creativity, critical thinking, and the ability to direct AI tools toward a goal — exactly the “agentic thinking” that project-based AI learning develops.' },
    ],
    content: `It's the question underneath every parent's interest in AI education: *will there even be a job for my child by the time they grow up?* It's a fair worry. AI is already reshaping how work gets done — and the pace isn't slowing.

But the conclusion most people jump to is wrong. The future doesn't belong to people who avoid AI. **It belongs to people who know how to use it.**

## The real shift: from doing to directing

For most of history, careers rewarded people who could *do* a task well. Increasingly, value comes from people who can *direct* powerful tools to get results — who can frame a problem, choose the right approach, and orchestrate AI to execute.

A child who learns to build with AI isn't just learning a skill. They're learning to be the person who tells AI what to do — and that role isn't going away.

## The skills that actually future-proof a child

Notice that none of these are "memorise a programming language":

### 1. AI literacy
Understanding what AI can and can't do, how it makes decisions, and where it fails. This is becoming as fundamental as reading.

### 2. Problem-framing
The ability to look at a messy real-world situation and define the actual problem worth solving. AI can answer questions; humans still decide which questions matter.

### 3. Agentic thinking
Breaking big goals into steps, designing systems, and directing tools toward an outcome. This is the single most transferable skill in an AI-first world.

### 4. Creativity and judgement
AI generates options; humans choose, refine, and decide what's good. Taste and judgement become *more* valuable, not less.

### 5. Adaptability
The specific tools will change. A child who has learned *how to learn* a new AI tool will keep pace no matter what comes next.

## Why building beats consuming

Most kids today are heavy *consumers* of AI — they use it to answer questions and make images. Far fewer are *builders* who understand and create with it. That gap is exactly where future opportunity lives.

When your child builds a chatbot, trains a model, or ships a small AI app, they cross from the consumer side to the builder side. That's the side with leverage.

## How to start

You don't need to predict exactly which jobs will exist in 2040. You just need to give your child the mindset and skills to thrive whatever those jobs turn out to be — and that starts with building real things with AI, guided by someone who can keep them progressing.

[Book a free assessment](/book) and we'll help you set your child on a future-ready path.`,
  },
  {
    slug: 'prompt-engineering-for-kids',
    title: 'Prompt Engineering for Kids: Teaching the Skill of the Future',
    excerpt: 'Prompt engineering is one of the most valuable new skills — and kids are remarkably good at it. Here’s what it is and how children can learn it.',
    metaTitle: 'Prompt Engineering for Kids: A Simple Guide for Parents (2026)',
    metaDescription: 'What is prompt engineering and why should kids learn it? A parent-friendly guide to teaching children how to communicate with AI clearly and creatively.',
    keywords: 'prompt engineering for kids, teaching kids to use AI, how to write AI prompts, AI communication skills for children',
    tags: ['prompt-engineering', 'ai-for-kids', 'how-to'],
    faqs: [
      { q: 'What is prompt engineering in simple terms?', a: 'Prompt engineering is the skill of giving AI clear, well-structured instructions to get the result you want. Think of it as learning to ask great questions — the better the question, the better the answer.' },
      { q: 'Why is prompt engineering a good skill for kids?', a: 'It builds clear thinking, precise communication, and creativity — all while being immediately rewarding. Kids see instantly how changing their words changes the AI’s output, which makes the learning loop fast and fun.' },
    ],
    content: `If there's one AI skill that's both wildly useful and perfectly suited to children, it's **prompt engineering** — the art of telling AI exactly what you want. It sounds technical, but at its heart it's something kids already love: figuring out the *right way to ask* to get the result they want.

## What is prompt engineering, really?

A prompt is simply the instruction you give an AI. Prompt engineering is the skill of crafting that instruction well — clearly, specifically, and creatively — so the AI produces something genuinely useful.

Vague prompt: *"write a story."*
Engineered prompt: *"write a funny 6-sentence story about a robot who's afraid of the dark, for a 9-year-old, ending on a hopeful note."*

Same tool. Completely different result. That difference *is* the skill.

## Why kids are surprisingly great at it

Children come to prompt engineering with two superpowers: **curiosity** and **a willingness to experiment.** They'll happily try ten variations to see what happens — which is exactly how you get good at this. And because the feedback is instant, the learning loop is fast and genuinely fun.

It also quietly builds skills that matter far beyond AI:

- **Clear communication** — saying precisely what you mean
- **Structured thinking** — breaking a request into the details that matter
- **Iteration** — refining when the first try isn't right
- **Creativity** — imagining what's possible and asking for it

## How children learn prompt engineering

### Start with comparison
The fastest "aha" comes from comparing a lazy prompt with a careful one and seeing how different the outputs are. The lesson teaches itself.

### Add structure
Kids learn to include the key ingredients of a great prompt: the *role* ("act as a friendly tutor"), the *task*, the *audience*, the *format*, and the *tone*.

### Make it a game
Challenges like "get the AI to write a poem that rhymes and mentions your pet" turn practice into play.

### Connect it to building
Prompt engineering isn't just for chatting — it's how kids later control the AI inside the chatbots, assistants, and apps they build. The skill compounds.

## A foundation for everything that follows

Prompt engineering is usually one of the first things we teach, because it unlocks everything after it. A child who can communicate clearly with AI can direct it to do remarkable things — and they carry that clarity of thought into every subject, not just tech.

The best part? It's immediately rewarding, which keeps young learners excited and coming back for more.

[Book a free assessment](/book) and we'll show your child how a few well-chosen words can make AI do amazing things.`,
  },
];

async function main() {
  console.log('\n📝  Seeding starter blog posts…\n');
  for (const a of ARTICLES) {
    const data = {
      title: a.title,
      excerpt: a.excerpt,
      content: a.content,
      metaTitle: a.metaTitle,
      metaDescription: a.metaDescription,
      keywords: a.keywords,
      tags: a.tags,
      faqs: a.faqs,
      status: 'PUBLISHED' as const,
      authorName: 'Build AI With Us',
    };

    const existing = await prisma.post.findUnique({ where: { slug: a.slug } });
    if (existing) {
      await prisma.post.update({
        where: { slug: a.slug },
        // Keep the original publishedAt; only refresh content fields.
        data,
      });
      console.log(`   ✎ updated  ${a.slug}`);
    } else {
      await prisma.post.create({
        data: { ...data, slug: a.slug, publishedAt: new Date() },
      });
      console.log(`   ✓ created  ${a.slug}`);
    }
  }
  console.log(`\n✅  ${ARTICLES.length} blog posts seeded.\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
