type LocalizedText = {
  th: string;
  en: string;
};

type CourseImageAsset = {
  baseUrl: string;
  keyword: string;
  reason: string;
};

type CategoryKey =
  | 'web-dev'
  | 'design-ux'
  | 'data-ai'
  | 'devops-cloud'
  | 'product-growth';

type CourseImageSpec = {
  key: string;
  categoryKey: CategoryKey;
  assetKey: keyof typeof imageLibrary;
  keyword?: string;
  reason?: string;
  aliases?: string[];
};

export type CourseImageLookupInput = {
  slug?: string | null;
  id?: string | null;
  title?: string | LocalizedText | null;
  courseName?: string | null;
  categoryKey?: string | null;
  category?: string | LocalizedText | null;
  shortDescription?: string | LocalizedText | null;
  description?: string | LocalizedText | null;
  tags?: string[] | null;
  level?: string | null;
  language?: string | null;
};

export type CourseImageSelection = {
  key: string;
  categoryKey: CategoryKey;
  baseUrl: string;
  imageUrl: string;
  keyword: string;
  reason: string;
  fallback: boolean;
};

const imageLibrary = {
  codeLaptop: {
    baseUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085',
    keyword: 'coding laptop',
    reason:
      'A clean coding workspace matches practical web engineering and TypeScript-heavy courses.',
  },
  backendCode: {
    baseUrl: 'https://images.unsplash.com/photo-1672385277648-85eddc237a2b',
    keyword: 'backend api development',
    reason:
      'Close-up source code works well for backend, API, and implementation-focused lessons.',
  },
  designWorkshop: {
    baseUrl: 'https://images.unsplash.com/photo-1587440871875-191322ee64b0',
    keyword: 'ux workshop sticky notes wireframe',
    reason:
      'Wireframes, sticky notes, and collaboration fit research, journey mapping, and UX workshops.',
  },
  figmaWorkspace: {
    baseUrl: 'https://images.unsplash.com/photo-1621111848501-8d3634f82336',
    keyword: 'figma ui design workspace',
    reason:
      'A polished interface design setup is a strong match for Figma, UI craft, and design systems.',
  },
  analyticsDashboard: {
    baseUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
    keyword: 'analytics dashboard data visualization',
    reason:
      'Dashboard and chart visuals fit SQL, product analytics, SEO, and measurement-driven topics.',
  },
  dataAutomation: {
    baseUrl: 'https://images.unsplash.com/photo-1753613648137-602c669cbe07',
    keyword: 'data analysis laptop automation',
    reason:
      'A data-oriented laptop setup fits Python analysis, automation, and digital workflow topics.',
  },
  aiWorkflow: {
    baseUrl: 'https://images.unsplash.com/photo-1770233621425-5d9ee7a0a700',
    keyword: 'artificial intelligence automation digital brain',
    reason:
      'A clearly AI-themed visual is the best fit for AI workflow, chatbot, and automation content.',
  },
  serverRack: {
    baseUrl: 'https://images.unsplash.com/photo-1695668548342-c0c1ad479aee',
    keyword: 'server rack cloud infrastructure',
    reason:
      'Server racks and infrastructure visuals fit deployment, CI/CD, security, and cloud topics.',
  },
  productTeam: {
    baseUrl: 'https://images.unsplash.com/photo-1758876203342-fc14c0bba67c',
    keyword: 'startup teamwork product strategy',
    reason:
      'A collaborative team scene matches product management, agile delivery, and growth work.',
  },
  writerDesk: {
    baseUrl: 'https://images.unsplash.com/photo-1765867967050-30db3e7a3be8',
    keyword: 'technical writing productivity notebook',
    reason:
      'A focused notebook-and-laptop workspace suits technical writing and structured planning topics.',
  },
} as const satisfies Record<string, CourseImageAsset>;

const exactCourseImageSpecs: CourseImageSpec[] = [
  {
    key: 'fullstack-web-development-with-nextjs',
    categoryKey: 'web-dev',
    assetKey: 'codeLaptop',
    keyword: 'nextjs fullstack web development',
  },
  {
    key: 'build-rest-apis-with-nestjs-and-prisma',
    categoryKey: 'web-dev',
    assetKey: 'backendCode',
    keyword: 'nestjs prisma backend api',
  },
  {
    key: 'typescript-for-modern-web-teams',
    categoryKey: 'web-dev',
    assetKey: 'codeLaptop',
    keyword: 'typescript modern web team code quality',
  },
  {
    key: 'frontend-architecture-and-design-systems-with-react',
    categoryKey: 'web-dev',
    assetKey: 'figmaWorkspace',
    keyword: 'react frontend architecture design system',
  },
  {
    key: 'ux-design-foundations-with-figma',
    categoryKey: 'design-ux',
    assetKey: 'figmaWorkspace',
    keyword: 'ux design figma beginner',
  },
  {
    key: 'user-research-and-journey-mapping',
    categoryKey: 'design-ux',
    assetKey: 'designWorkshop',
    keyword: 'user research journey mapping workshop',
  },
  {
    key: 'design-systems-for-product-teams',
    categoryKey: 'design-ux',
    assetKey: 'figmaWorkspace',
    keyword: 'design system product team figma',
  },
  {
    key: 'motion-design-for-web-interfaces',
    categoryKey: 'design-ux',
    assetKey: 'figmaWorkspace',
    keyword: 'motion design web interface ui',
  },
  {
    key: 'sql-analytics-for-business-decisions',
    categoryKey: 'data-ai',
    assetKey: 'analyticsDashboard',
    keyword: 'sql analytics business dashboard',
  },
  {
    key: 'python-for-data-analysis-and-automation',
    categoryKey: 'data-ai',
    assetKey: 'dataAutomation',
    keyword: 'python data analysis automation',
  },
  {
    key: 'product-analytics-with-ga4-and-looker-studio',
    categoryKey: 'data-ai',
    assetKey: 'analyticsDashboard',
    keyword: 'ga4 looker studio product analytics',
  },
  {
    key: 'ai-workflows-for-knowledge-workers',
    categoryKey: 'data-ai',
    assetKey: 'aiWorkflow',
    keyword: 'ai workflow automation knowledge work',
  },
  {
    key: 'deploy-applications-with-docker-and-kubernetes',
    categoryKey: 'devops-cloud',
    assetKey: 'serverRack',
    keyword: 'docker kubernetes deployment infrastructure',
  },
  {
    key: 'cicd-for-fullstack-applications',
    categoryKey: 'devops-cloud',
    assetKey: 'serverRack',
    keyword: 'ci cd fullstack deployment pipeline',
  },
  {
    key: 'web-application-security-and-authentication',
    categoryKey: 'devops-cloud',
    assetKey: 'serverRack',
    keyword: 'web application security authentication infrastructure',
  },
  {
    key: 'production-performance-optimization-for-nextjs',
    categoryKey: 'devops-cloud',
    assetKey: 'backendCode',
    keyword: 'nextjs performance optimization production',
  },
  {
    key: 'product-management-foundations-for-digital-teams',
    categoryKey: 'product-growth',
    assetKey: 'productTeam',
    keyword: 'product management digital team strategy',
  },
  {
    key: 'agile-delivery-for-cross-functional-teams',
    categoryKey: 'product-growth',
    assetKey: 'productTeam',
    keyword: 'agile delivery cross functional teamwork',
  },
  {
    key: 'content-strategy-and-seo-for-saas',
    categoryKey: 'product-growth',
    assetKey: 'analyticsDashboard',
    keyword: 'content strategy seo saas analytics',
  },
  {
    key: 'technical-writing-for-saas-and-developer-products',
    categoryKey: 'product-growth',
    assetKey: 'writerDesk',
    keyword: 'technical writing docs notebook workspace',
  },
  {
    key: 'ai-for-work-foundations',
    categoryKey: 'data-ai',
    assetKey: 'aiWorkflow',
    keyword: 'ai for work automation productivity',
  },
  {
    key: 'marketing-with-ai-systems',
    categoryKey: 'product-growth',
    assetKey: 'analyticsDashboard',
    keyword: 'marketing ai systems analytics',
  },
  {
    key: 'creator-toolkit-for-the-ai-era',
    categoryKey: 'product-growth',
    assetKey: 'figmaWorkspace',
    keyword: 'creator toolkit digital content workspace',
  },
];

const categoryFallbackSpecs: Record<
  CategoryKey,
  { assetKey: keyof typeof imageLibrary; keyword?: string; reason?: string }
> = {
  'web-dev': {
    assetKey: 'codeLaptop',
    keyword: 'web development coding',
  },
  'design-ux': {
    assetKey: 'figmaWorkspace',
    keyword: 'ui ux design workspace',
  },
  'data-ai': {
    assetKey: 'dataAutomation',
    keyword: 'data ai digital technology',
  },
  'devops-cloud': {
    assetKey: 'serverRack',
    keyword: 'devops cloud infrastructure',
  },
  'product-growth': {
    assetKey: 'productTeam',
    keyword: 'startup teamwork growth strategy',
  },
};

const categoryMatchers: Record<CategoryKey, string[]> = {
  'web-dev': [
    'web-dev',
    'web-development',
    'programming',
    'software-development',
    'frontend',
    'backend',
    'react',
    'nextjs',
    'nestjs',
    'development',
    'programming-course',
    'การพัฒนาซอฟต์แวร์',
    'พัฒนาเว็บไซต์',
  ],
  'design-ux': [
    'design-ux',
    'design',
    'ux',
    'ui',
    'figma',
    'graphic-design',
    'creative',
    'การออกแบบ',
    'ออกแบบประสบการณ์ผู้ใช้',
    'ดีไซน์',
  ],
  'data-ai': [
    'data-ai',
    'ai',
    'ai-digital-skills',
    'analytics',
    'automation',
    'machine-learning',
    'data',
    'sql',
    'python',
    'ข้อมูล',
    'ai-และทักษะดิจิทัล',
  ],
  'devops-cloud': [
    'devops-cloud',
    'devops',
    'cloud',
    'security',
    'deployment',
    'docker',
    'kubernetes',
    'infrastructure',
    'server',
    'authentication',
    'devops-และ-cloud',
  ],
  'product-growth': [
    'product-growth',
    'product',
    'growth',
    'marketing',
    'business',
    'startup',
    'seo',
    'content',
    'writing',
    'career-skills',
    'content-creator',
    'personal-development',
    'product-และ-growth',
    'การตลาด',
    'ธุรกิจ',
    'พัฒนาตนเอง',
    'ทักษะอาชีพ',
  ],
};

function buildUnsplashUrl(baseUrl: string, width: number, height: number) {
  return `${baseUrl}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
}

function getLocalizedValues(value: string | LocalizedText | null | undefined) {
  if (!value) {
    return [];
  }

  if (typeof value === 'string') {
    return [value];
  }

  return [value.th, value.en].filter(Boolean);
}

export function normalizeCourseImageKey(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/['’"]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-|-$)+/g, '');
}

function createExactImageIndex() {
  const index = new Map<string, CourseImageSpec>();

  for (const spec of exactCourseImageSpecs) {
    for (const rawKey of [spec.key, ...(spec.aliases ?? [])]) {
      const normalizedKey = normalizeCourseImageKey(rawKey);

      if (index.has(normalizedKey)) {
        throw new Error(`Duplicate course image mapping key: ${normalizedKey}`);
      }

      index.set(normalizedKey, spec);
    }
  }

  return index;
}

const exactImageIndex = createExactImageIndex();

function getTextPool(input: CourseImageLookupInput) {
  return [
    input.slug ?? '',
    input.id ?? '',
    input.courseName ?? '',
    ...getLocalizedValues(input.title),
    ...getLocalizedValues(input.category),
    ...getLocalizedValues(input.shortDescription),
    ...getLocalizedValues(input.description),
    ...(input.tags ?? []),
    input.level ?? '',
    input.language ?? '',
  ];
}

function inferCategoryKey(input: CourseImageLookupInput): CategoryKey {
  const hints = [
    input.categoryKey ?? '',
    ...getLocalizedValues(input.category),
    ...getTextPool(input),
  ]
    .map((value) => normalizeCourseImageKey(value))
    .filter(Boolean)
    .join(' ');

  for (const categoryKey of Object.keys(categoryMatchers) as CategoryKey[]) {
    if (
      categoryMatchers[categoryKey].some(
        (token) =>
          hints.includes(normalizeCourseImageKey(token)) ||
          hints.includes(token),
      )
    ) {
      return categoryKey;
    }
  }

  return 'product-growth';
}

function buildSelection(
  spec: CourseImageSpec,
  key: string,
  fallback: boolean,
): CourseImageSelection {
  const asset = imageLibrary[spec.assetKey];

  return {
    key,
    categoryKey: spec.categoryKey,
    baseUrl: asset.baseUrl,
    imageUrl: buildUnsplashUrl(asset.baseUrl, 1200, 800),
    keyword: spec.keyword ?? asset.keyword,
    reason: spec.reason ?? asset.reason,
    fallback,
  };
}

export const COURSE_IMAGE_MAP = Object.freeze(
  Object.fromEntries(
    exactCourseImageSpecs.map((spec) => {
      const asset = imageLibrary[spec.assetKey];
      return [spec.key, buildUnsplashUrl(asset.baseUrl, 1200, 800)];
    }),
  ) as Record<string, string>,
);

export const CATEGORY_FALLBACK_IMAGE_MAP = Object.freeze(
  Object.fromEntries(
    (Object.keys(categoryFallbackSpecs) as CategoryKey[]).map((categoryKey) => {
      const asset = imageLibrary[categoryFallbackSpecs[categoryKey].assetKey];
      return [categoryKey, buildUnsplashUrl(asset.baseUrl, 1200, 800)];
    }),
  ) as Record<CategoryKey, string>,
);

export function resolveCourseImage(input: CourseImageLookupInput) {
  const candidateKeys = [
    input.slug,
    input.id,
    input.courseName,
    ...getLocalizedValues(input.title),
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => normalizeCourseImageKey(value));

  for (const candidateKey of candidateKeys) {
    const exactSpec = exactImageIndex.get(candidateKey);

    if (exactSpec) {
      return buildSelection(exactSpec, candidateKey, false);
    }
  }

  const categoryKey = inferCategoryKey(input);
  const fallbackSpec = categoryFallbackSpecs[categoryKey];

  return buildSelection(
    {
      key: `fallback:${categoryKey}`,
      categoryKey,
      assetKey: fallbackSpec.assetKey,
      keyword: fallbackSpec.keyword,
      reason: fallbackSpec.reason,
    },
    candidateKeys[0] ?? `fallback:${categoryKey}`,
    true,
  );
}

export function buildCourseImageSet(input: CourseImageLookupInput) {
  const selection = resolveCourseImage(input);

  return {
    selection,
    thumbnail: buildUnsplashUrl(selection.baseUrl, 1200, 800),
    coverImage: buildUnsplashUrl(selection.baseUrl, 1600, 900),
    previewThumbnail: buildUnsplashUrl(selection.baseUrl, 1280, 720),
  };
}
