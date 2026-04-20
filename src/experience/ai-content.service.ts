import { Injectable } from '@nestjs/common';
import { AiJobType } from '../database/generated/prisma/client';

type Localized = {
  th: string;
  en: string;
};

type CourseGenerationInput = {
  title: string;
  category: string;
  targetAudience: string;
  level: string;
  learningGoal: string;
  variantType?: string;
  sourceTitle?: string;
};

const localized = (th: string, en: string): Localized => ({ th, en });

@Injectable()
export class AiContentService {
  generate(type: AiJobType, input: CourseGenerationInput) {
    switch (type) {
      case AiJobType.COURSE_BLUEPRINT:
        return this.generateCourseBlueprint(input);
      case AiJobType.COURSE_EXPANSION:
        return this.expandCourseVariant(input);
      case AiJobType.LESSON_BUNDLE:
        return this.generateLessonBundle(input);
      case AiJobType.VIDEO_BUNDLE:
        return this.generateVideoBundle(input);
      case AiJobType.CASE_STUDY_BUNDLE:
        return this.generateCaseStudyBundle(input);
      case AiJobType.QUIZ_BUNDLE:
        return this.generateQuizBundle(input);
      case AiJobType.COURSE_REFRESH:
        return this.suggestCourseRefresh(input);
      case AiJobType.COURSE_SUGGESTION:
      default:
        return this.suggestNewCourses(input);
    }
  }

  generateCourseBlueprint(input: CourseGenerationInput) {
    return {
      description: localized(
        `คอร์ส ${input.title} ออกแบบมาเพื่อ ${input.targetAudience} ที่อยาก ${input.learningGoal}`,
        `${input.title} is designed for ${input.targetAudience} who want to ${input.learningGoal}.`,
      ),
      learningOutcomes: [
        localized(
          'กำหนดเป้าหมายการเรียนรู้ที่วัดผลได้',
          'Define measurable learning outcomes.',
        ),
        localized(
          'ออกแบบ workflow ที่ใช้ในสถานการณ์จริง',
          'Design workflows for real scenarios.',
        ),
        localized(
          'ประเมินผลก่อนและหลังเรียนได้อย่างชัดเจน',
          'Measure progress before and after learning.',
        ),
      ],
      modules: [
        localized('Foundation and mindset', 'Foundation and mindset'),
        localized(
          'Applied workflow and practice',
          'Applied workflow and practice',
        ),
        localized(
          'Case studies and final project',
          'Case studies and final project',
        ),
      ],
      quizzes: [
        'Readiness check',
        'Module reflection quiz',
        'Final synthesis quiz',
      ],
      preTest: ['Confidence baseline', 'Current workflow audit'],
      postTest: ['Improvement check', 'Transfer to work plan'],
      assignments: [
        localized(
          'ออกแบบ mini system ของตัวเอง',
          'Design your own mini-system',
        ),
        localized(
          'สรุปการทดลองใช้งานจริง',
          'Summarize a real usage experiment',
        ),
      ],
      finalProjectIdeas: [
        localized(
          'นำเสนอ implementation plan 30 วัน',
          'Present a 30-day implementation plan',
        ),
        localized('สร้าง playbook สำหรับทีม', 'Create a team playbook'),
      ],
    };
  }

  expandCourseVariant(input: CourseGenerationInput) {
    const variant = input.variantType ?? 'expanded';

    return {
      variant,
      sourceTitle: input.sourceTitle,
      newPositioning: localized(
        `เวอร์ชัน ${variant} ของคอร์สเพื่อให้เหมาะกับ ${input.targetAudience}`,
        `A ${variant} version tailored for ${input.targetAudience}.`,
      ),
      moduleAdjustments: [
        `Re-sequence the original modules for a ${variant} learner journey`,
        'Add stronger checkpoints and a contextualized capstone',
      ],
      reuseStrategy: {
        keep: ['Core framework', 'Signature case study'],
        expand: ['Examples', 'Assignments', 'Assessment difficulty'],
      },
    };
  }

  generateLessonBundle(input: CourseGenerationInput) {
    return {
      lessonSummary: localized(
        `บทเรียนนี้ช่วยให้ ${input.targetAudience} เข้าใจภาพรวมและลงมือทำได้เร็วขึ้น`,
        `This lesson helps ${input.targetAudience} build quick clarity and action.`,
      ),
      detailedDraft: [
        'Open with the real learner problem',
        'Map the workflow step by step',
        'Pause for reflection and a practical checkpoint',
      ],
      instructorScript: [
        'Warm framing',
        'Live example walkthrough',
        'Debrief using a clear rubric',
      ],
      slideOutline: ['Context', 'Method', 'Example', 'Reflection'],
      worksheet: ['Prompt map', 'Decision checklist', 'Next-step notes'],
      keyTakeaways: ['Use reusable structures', 'Review quality before speed'],
      examplesAndExercises: [
        'Warm-up scenario',
        'Applied scenario',
        'Stretch task',
      ],
    };
  }

  generateVideoBundle(input: CourseGenerationInput) {
    return {
      videoScript: `${input.title} introduction, practical walkthrough, learner recap`,
      sceneOutline: [
        'Hero problem',
        'Tool walkthrough',
        'Real example',
        'Wrap-up',
      ],
      subtitleDraft: [
        'Start with the problem',
        'Show the structure',
        'Pause for the learner task',
      ],
      narrationDraft:
        'Friendly, calm, and encouraging voiceover that keeps the learner moving.',
      storyboard: [
        'Scene 1: learner pain point',
        'Scene 2: workflow demo',
        'Scene 3: case example',
      ],
      previewVideoText: localized(
        'ดูภาพรวมคอร์สในไม่กี่นาที แล้วเริ่มสร้าง skill set ใหม่ของคุณ',
        'See the course in minutes, then start building a new skill set.',
      ),
      productionOptions: [
        'real-video',
        'ai-voice',
        'avatar-video',
        'slide-video',
      ],
    };
  }

  generateCaseStudyBundle(input: CourseGenerationInput) {
    return {
      realWorldExamples: [
        `${input.category} team under deadline pressure`,
        'Small team trying to scale quality without adding headcount',
      ],
      scenarioExercises: [
        'Before-and-after comparison',
        'Role-based decision sprint',
      ],
      workshopTasks: ['Rewrite the brief', 'Improve the feedback loop'],
      beforeAfterExamples: ['Manual workflow -> AI-supported system'],
      roleBasedCases: ['Manager', 'Individual contributor', 'Creator lead'],
    };
  }

  generateQuizBundle(input: CourseGenerationInput) {
    return {
      lessonQuiz: ['Multiple choice', 'Scenario-based judgment'],
      preTest: ['Confidence score', 'Current habit audit'],
      postTest: ['Applied scenario', 'Improvement reflection'],
      answerKey: ['Expected reasoning', 'Common mistake patterns'],
      explanations: ['Why this answer works', 'What to improve next'],
      feedbackLogic: {
        strong: 'Offer a stretch task',
        developing: 'Recommend a focused module revisit',
      },
    };
  }

  suggestCourseRefresh(input: CourseGenerationInput) {
    return {
      outdatedLessons: ['Intro examples', 'Older tool screenshots'],
      newTopics: ['AI governance basics', 'Workflow QA habits'],
      updatedExamples: [
        'Regional case study',
        'Cross-functional collaboration',
      ],
      aiTrendAdditions: ['Model evaluation mindset', 'Human review loops'],
      exerciseRefresh: ['Replace generic prompt tasks with role-based tasks'],
    };
  }

  suggestNewCourses(input: CourseGenerationInput) {
    return {
      recommendations: [
        {
          title: 'AI Sales Enablement Sprint',
          reason:
            'Strong overlap between communication, analysis, and buyer-facing workflows.',
        },
        {
          title: 'Prompting for Student Research',
          reason:
            'High demand from discovery-test usage and community discussion patterns.',
        },
        {
          title: 'Creator Analytics with AI',
          reason: 'Bridges content creation with business decision-making.',
        },
      ],
      basedOnSignals: [
        'sales-trends',
        'search-behavior',
        'community-discussions',
        'skill-test-results',
      ],
    };
  }
}
