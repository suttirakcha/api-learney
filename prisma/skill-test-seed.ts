import { createSeedPrisma, t } from './seed-helpers';

const prisma = createSeedPrisma();

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

async function main() {
  const ageGroups = [
    'Primary School (7-12)',
    'Secondary School (13-18)',
    'University (19-22)',
    'Working Age (23+)',
  ] as const;

  const promptTemplates = [
    [
      'Creativity',
      'ฉันสนุกเมื่อได้ใช้ความคิดสร้างสรรค์เพื่อทำให้สิ่งต่าง ๆ ดีขึ้น',
      'I feel energized when I use creativity to improve something.',
    ],
    [
      'Leadership',
      'ฉันพร้อมช่วยพาทีมหรือเพื่อนให้เดินหน้าต่อได้',
      'I am willing to help a team or friend move forward.',
    ],
    [
      'Helping Others',
      'ฉันมีความสุขเมื่อได้ช่วยให้คนอื่นเข้าใจหรือแก้ปัญหาได้',
      'I enjoy helping others understand or solve problems.',
    ],
    [
      'Analysis',
      'ฉันชอบสังเกตข้อมูลและคิดหาคำตอบอย่างเป็นระบบ',
      'I like studying information and finding answers systematically.',
    ],
    [
      'Communication',
      'ฉันมั่นใจขึ้นเมื่อได้อธิบายความคิดของตัวเองให้คนอื่นเข้าใจ',
      'I feel confident when I explain my ideas clearly.',
    ],
    [
      'Teamwork',
      'ฉันทำงานร่วมกับคนอื่นได้ดีและพร้อมรับฟังความคิดเห็น',
      'I work well with others and listen to their ideas.',
    ],
  ] as const;

  const careerSeeds = [
    [
      'ux-designer',
      'UX Designer',
      'UX Designer',
      'งานออกแบบประสบการณ์ผู้ใช้ที่เชื่อมความคิดสร้างสรรค์กับการแก้ปัญหา',
      'Design user experiences by blending creativity with problem solving.',
      'https://placehold.co/1200x800/f4dce5/4a3245?text=UX+Designer',
      '50k-150k THB',
      ['Creativity', 'Empathy', 'Communication'],
    ],
    [
      'data-analyst',
      'นักวิเคราะห์ข้อมูล',
      'Data Analyst',
      'งานที่ใช้การวิเคราะห์ข้อมูลเพื่อช่วยตัดสินใจอย่างมีเหตุผล',
      'Use data analysis to support clear and confident decisions.',
      'https://placehold.co/1200x800/dceff4/2f4a54?text=Data+Analyst',
      '45k-120k THB',
      ['Analysis', 'Communication', 'Problem Solving'],
    ],
    [
      'product-marketer',
      'นักการตลาดผลิตภัณฑ์',
      'Product Marketer',
      'งานที่ผสานการสื่อสาร ความเข้าใจลูกค้า และการเล่าเรื่องแบรนด์',
      'Combine communication, customer insight, and brand storytelling.',
      'https://placehold.co/1200x800/f6ecd6/5a4127?text=Product+Marketer',
      '40k-130k THB',
      ['Communication', 'Creativity', 'Analysis'],
    ],
  ] as const;

  for (const ageGroup of ageGroups) {
    const skillTest = await prisma.skillTest.upsert({
      where: { slug: slugify(ageGroup) },
      update: {
        title: t(
          'คุณอาจเก่งมากกว่าที่คิด',
          'You might be more capable than you think',
        ),
        intro: t(
          'ค้นหาจุดแข็งและเส้นทางอาชีพที่เหมาะกับตัวคุณ',
          'Discover strengths and career directions that fit you.',
        ),
        ageGroup,
        active: true,
      },
      create: {
        slug: slugify(ageGroup),
        ageGroup,
        title: t(
          'คุณอาจเก่งมากกว่าที่คิด',
          'You might be more capable than you think',
        ),
        intro: t(
          'ค้นหาจุดแข็งและเส้นทางอาชีพที่เหมาะกับตัวคุณ',
          'Discover strengths and career directions that fit you.',
        ),
        active: true,
      },
    });

    const questionCount = await prisma.skillTestQuestion.count({
      where: { skillTestId: skillTest.id },
    });

    if (questionCount === 0) {
      await prisma.skillTestQuestion.createMany({
        data: promptTemplates.map(([category, thPrompt, enPrompt], index) => ({
          skillTestId: skillTest.id,
          prompt: t(thPrompt, enPrompt),
          category,
          order: index + 1,
          weight: 1,
        })),
      });
    }
  }

  for (const [
    slug,
    thName,
    enName,
    thSummary,
    enSummary,
    image,
    salaryRange,
    requiredSkills,
  ] of careerSeeds) {
    await prisma.career.upsert({
      where: { slug },
      update: {
        name: t(thName, enName),
        summary: t(thSummary, enSummary),
        image,
        salaryRange,
        requiredSkills: [...requiredSkills],
      },
      create: {
        slug,
        name: t(thName, enName),
        summary: t(thSummary, enSummary),
        image,
        salaryRange,
        requiredSkills: [...requiredSkills],
      },
    });
  }

  console.log('Skill test seed completed!');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
