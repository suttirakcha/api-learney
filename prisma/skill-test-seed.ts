import { PrismaClient } from '../src/database/generated/prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Research References (30+)
  const researchRefs = [
    {
      title: 'Mindset: The New Psychology of Success',
      author: 'Carol Dweck',
      year: 2006,
      description: 'Growth vs Fixed Mindset',
      category: 'Growth Mindset',
    },
    // Add 28 more: Gardner, Big5, RIASEC, Goleman, etc.
    // ... abbreviated for now
  ];

  for (const ref of researchRefs) {
    await prisma.researchReference.upsert({
      where: { title: ref.title },
      update: ref,
      create: ref,
    });
  }

  // 2. Stages (enhance existing)
  const stages = [
    {
      slug: 'primary-school',
      titleTH: 'Primary School (7–12)',
      /* full fields */ approxQuestions: 35,
      approxTimeMin: 5,
    },
    // 3 more...
  ];

  for (const s of stages) {
    await prisma.skillTestStage.upsert({
      where: { slug: s.slug },
      update: s,
      create: s,
    });
  }

  // 3. Sample Questions (expand to 250+/stage later)
  const sampleQuestions = [
    {
      stageSlug: 'primary-school',
      category: 'Growth Mindset',
      questionTH: 'เมื่อทำการบ้านยาก หนูมักจะ...',
      questionEN: 'When homework is hard, I usually...',
      type: 'LIKERT_SCALE',
      choices: JSON.stringify([{ labelTH: 'พยายามต่อ', value: 5 } /* etc */]),
      scoreMapping: JSON.stringify({ growthMindset: 1 }),
      researchSourceId: refId, // from above
      positiveFeedback: JSON.stringify({
        TH: 'เยี่ยม! นี่คือ Growth Mindset',
        EN: 'Great!',
      }),
      aiHint: 'Encourage persistence',
      order: 1,
    },
    // 249 more...
  ];

  await prisma.skillQuestion.createMany({ data: sampleQuestions });

  // 4. Careers (200+ abbreviated)
  const careers = [
    {
      slug: 'ux-designer',
      name: { TH: 'UX Designer', EN: 'UX Designer' },
      group: 'Creative',
      salaryAvg: '50k-150k THB',
      futureDemand: 'High',
      aiImpact: 'Medium',
      requiredSkills: ['Creativity', 'Empathy'],
    },
    // 199 more...
  ];

  await prisma.career.createMany({ data: careers, skipDuplicates: true });

  console.log('Skill Test Seed Complete!');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
