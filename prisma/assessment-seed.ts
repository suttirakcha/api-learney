import { PrismaClient } from '../src/database/generated/prisma/client';
const prisma = new PrismaClient();

async function main() {
  const stages = [
    {
      slug: 'primary-school',
      titleTh: 'วัยประถม (7-12 ปี)',
      titleEn: 'Primary School (7-12)',
      descriptionTh:
        'มาสำรวจว่าคุณชอบอะไร เก่งอะไร และโตขึ้นอาจเหมาะกับอะไรบ้าง',
      ageMin: 7,
      ageMax: 12,
      sortOrder: 1,
    },
    {
      slug: 'secondary-school',
      titleTh: 'วัยมัธยม (13-18 ปี)',
      titleEn: 'Secondary School (13-18)',
      descriptionTh: 'ค้นหาจุดแข็ง ความชอบ และอาชีพที่อาจเหมาะกับคุณในอนาคต',
      ageMin: 13,
      ageMax: 18,
      sortOrder: 2,
    },
    {
      slug: 'university',
      titleTh: 'วัยมหาวิทยาลัย (19-22 ปี)',
      titleEn: 'University (19-22)',
      descriptionTh: 'ค้นหาทักษะ จุดเด่น และเส้นทางอาชีพที่เข้ากับตัวคุณ',
      ageMin: 19,
      ageMax: 22,
      sortOrder: 3,
    },
    {
      slug: 'working-age',
      titleTh: 'วัยทำงาน (23+ ปี)',
      titleEn: 'Working Age (23+)',
      descriptionTh:
        'สำรวจจุดแข็งและโอกาสใหม่ ๆ เพื่อเติบโตในสายงานที่เหมาะกับคุณ',
      ageMin: 23,
      ageMax: 99,
      sortOrder: 4,
    },
  ];

  for (const s of stages) {
    const stage = await prisma.assessmentStage.upsert({
      where: { slug: s.slug },
      update: s,
      create: s,
    });

    // Sample Question for Primary
    if (s.slug === 'primary-school') {
      const qCount = await prisma.assessmentQuestion.count({
        where: { stageId: stage.id },
      });
      if (qCount === 0) {
        await prisma.assessmentQuestion.create({
          data: {
            stageId: stage.id,
            questionText: 'ฉันชอบลองทำสิ่งใหม่ ๆ แม้จะยังไม่เคยทำมาก่อน',
            helperText: 'เช่น ลองเล่นกีฬาใหม่ๆ หรือกินอาหารที่ไม่เคยกิน',
            type: 'LIKERT_5',
            traitCode: 'curiosity',
            traitDimension: 'Exploration',
            sortOrder: 1,
            choices: {
              create: [
                { label: 'ไม่จริงเลย', value: 1, sortOrder: 1 },
                { label: 'จริงที่สุด', value: 5, sortOrder: 5 },
              ],
            },
          },
        });
      }
    }
  }
  console.log('Assessment seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
