import {
  buildAiSuggestions,
  calculateAverageCompletion,
  summarizePopularCategories,
} from './instructor.helpers';

describe('instructor.helpers', () => {
  it('calculates average completion from published lessons', () => {
    expect(
      calculateAverageCompletion([
        { published: true },
        { published: false },
        { published: true },
      ]),
    ).toBe(67);
  });

  it('summarizes popular categories by learner totals', () => {
    expect(
      summarizePopularCategories([
        {
          category: 'AI_TECH',
          enrolledCourses: [{ id: '1' }, { id: '2' }],
        },
        {
          category: 'MARKETING',
          enrolledCourses: [{ id: '3' }],
        },
        {
          category: 'AI_TECH',
          enrolledCourses: [{ id: '4' }],
        },
      ]),
    ).toEqual([
      { category: 'AI_TECH', learners: 3 },
      { category: 'MARKETING', learners: 1 },
    ]);
  });

  it('adds a seasonal theme suggestion when provided', () => {
    expect(
      buildAiSuggestions([{ category: 'AI_TECH', learners: 8 }], 'PRIDE'),
    ).toEqual([
      {
        title: 'คอร์ส AI_TECH ขั้นสูง',
        reason: 'หมวด AI_TECH ขายดี (8 ผู้เรียน)',
        template: 'ai_tech',
      },
      {
        title: 'คอร์สพิเศษธีม PRIDE',
        reason: 'ธีมปัจจุบัน: PRIDE',
        template: 'theme-PRIDE',
      },
    ]);
  });
});
