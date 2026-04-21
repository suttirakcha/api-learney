export interface LessonPublishState {
  published: boolean;
}

export interface CategoryEnrollmentCourse {
  category: string;
  enrolledCourses: Array<{ id: string }>;
}

export interface PopularCategory {
  category: string;
  learners: number;
}

export function calculateAverageCompletion(
  lessons: LessonPublishState[],
): number {
  if (lessons.length === 0) {
    return 0;
  }

  const publishedLessons = lessons.filter((lesson) => lesson.published).length;

  return Math.round((publishedLessons / lessons.length) * 100);
}

export function summarizePopularCategories(
  courses: CategoryEnrollmentCourse[],
): PopularCategory[] {
  const totals = new Map<string, number>();

  for (const course of courses) {
    totals.set(
      course.category,
      (totals.get(course.category) ?? 0) + course.enrolledCourses.length,
    );
  }

  return Array.from(totals.entries())
    .map(([category, learners]) => ({ category, learners }))
    .sort((left, right) => right.learners - left.learners);
}

export function buildAiSuggestions(
  popularCategories: PopularCategory[],
  currentThemeKey?: string,
) {
  const suggestions = popularCategories.slice(0, 3).map((category) => ({
    title: `คอร์ส ${category.category} ขั้นสูง`,
    reason: `หมวด ${category.category} ขายดี (${category.learners} ผู้เรียน)`,
    template: category.category.toLowerCase().replace(/\s+/g, '-'),
  }));

  if (currentThemeKey) {
    suggestions.push({
      title: `คอร์สพิเศษธีม ${currentThemeKey}`,
      reason: `ธีมปัจจุบัน: ${currentThemeKey}`,
      template: `theme-${currentThemeKey}`,
    });
  }

  return suggestions;
}
