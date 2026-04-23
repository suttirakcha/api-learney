import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import {
  CourseSourceType,
  CourseWorkflowStatus,
  LessonType,
  LocaleCode,
  PaymentStatus,
  PreviewVideoProvider,
  Role,
  Status,
} from '../src/database/generated/prisma/client';
import {
  getPermissionsForRoles,
  normalizeRoles,
} from '../src/auth/permissions';
import { buildCourseImageSet } from './course-image-map';
import { createSeedPrisma, t } from './seed-helpers';

const prisma = createSeedPrisma();

type Localized = ReturnType<typeof t>;

type CategorySeed = {
  key: string;
  slug: string;
  legacyName: string;
  name: Localized;
  description: Localized;
  icon: string;
  color: string;
};

type InstructorSeed = {
  fullname: string;
  email: string;
  headline: Localized;
  bio: Localized;
  specialties: string[];
  expertiseAreas: string[];
  experienceYears: number;
  image: string;
};

type StudentSeed = {
  fullname: string;
  email: string;
  image: string;
};

type CourseSeed = {
  slug: string;
  categoryKey: string;
  instructorEmail: string;
  title: Localized;
  shortDescription: Localized;
  localizedDescription: Localized;
  description: string;
  focus: Localized;
  level: string;
  badge: string;
  price: number;
  discount: number;
  duration: string;
  tags: string[];
};

type AssetBlueprint = {
  kind: string;
  title: Localized;
  content?: Localized;
  url?: string;
  order: number;
};

type LessonBlueprint = {
  title: Localized;
  summary: Localized;
  instructorScript: string;
  durationMinutes: number;
  order: number;
  assets: AssetBlueprint[];
};

type ModuleBlueprint = {
  title: Localized;
  summary: Localized;
  order: number;
  lessons: LessonBlueprint[];
};

const careerSeeds = [
  [
    'frontend-developer',
    'Frontend Developer',
    'Frontend Developer',
    'อาชีพพัฒนาเว็บหน้า UI/UX',
    'Frontend web UI/UX developer',
    'frontend',
    '50,000 - 120,000',
    ['React', 'HTML/CSS', 'JavaScript', 'UI/UX'],
  ],
  [
    'backend-developer',
    'Backend Developer',
    'Backend Developer',
    'อาชีพพัฒนาเซิร์ฟเวอร์และฐานข้อมูล',
    'Backend server and DB developer',
    'backend',
    '60,000 - 150,000',
    ['Node.js', 'Python', 'Database', 'API'],
  ],
  [
    'fullstack-developer',
    'Fullstack Developer',
    'Fullstack Developer',
    'อาชีพพัฒนาเว็บทั้ง Frontend และ Backend',
    'Fullstack web developer',
    'fullstack',
    '80,000 - 200,000',
    ['React', 'Node.js', 'Database', 'DevOps'],
  ],
] as const;

const categoryRows = [
  [
    'web-dev',
    'Web Development',
    'พัฒนาเว็บไซต์',
    'เรียนรู้การสร้างเว็บไซต์และเว็บแอปแบบทันสมัยตั้งแต่โครงสร้าง frontend จนถึง backend',
    'Learn how to build modern websites and web applications from frontend structure to backend delivery.',
    'Globe',
    '0ea5e9',
  ],
  [
    'design-ux',
    'Design and UX',
    'ออกแบบประสบการณ์ผู้ใช้',
    'ฝึกคิดเชิงออกแบบ สื่อสารกับผู้ใช้ และสร้างงานที่ใช้งานได้จริง',
    'Practice design thinking, user communication, and create interfaces that work in the real world.',
    'Palette',
    'f97316',
  ],
  [
    'data-ai',
    'Data and AI',
    'ข้อมูลและ AI',
    'เรียนรู้การวิเคราะห์ข้อมูล สร้าง workflow อัตโนมัติ และใช้ AI อย่างมีคุณภาพ',
    'Learn data analysis, automation workflows, and practical AI usage with quality in mind.',
    'BrainCircuit',
    '8b5cf6',
  ],
  [
    'devops-cloud',
    'DevOps and Cloud',
    'DevOps และ Cloud',
    'ยกระดับการ deploy ดูแลระบบ และออกแบบ workflow สำหรับงาน production',
    'Improve deployment, system operations, and production-ready delivery workflows.',
    'CloudCog',
    '22c55e',
  ],
  [
    'product-growth',
    'Product and Growth',
    'Product และ Growth',
    'พัฒนาทักษะการวางกลยุทธ์ product การส่งมอบงาน และการเติบโตของธุรกิจดิจิทัล',
    'Develop product strategy, delivery, and growth skills for digital businesses.',
    'TrendingUp',
    'ec4899',
  ],
] as const;

const instructorRows = [
  [
    'Araya Srithep',
    'araya@learney.test',
    'ผู้สอนสาย Frontend และ Fullstack',
    'Frontend and Fullstack Instructor',
    'อารยาเชี่ยวชาญการสร้างเว็บแอปสมัยใหม่ด้วย React, Next.js และแนวคิด frontend architecture ที่ใช้ได้จริงในทีม',
    'Araya specializes in modern web applications with React, Next.js, and practical frontend architecture for real teams.',
    ['Next.js', 'React', 'Frontend Architecture'],
    ['Web Development', 'Design Systems'],
    8,
  ],
  [
    'Kittipong Devakul',
    'kittipong@learney.test',
    'ผู้สอนสาย Backend และ DevOps',
    'Backend and DevOps Instructor',
    'กิตติพงษ์มีประสบการณ์วางระบบ backend, cloud deployment และ CI/CD สำหรับผลิตภัณฑ์ที่ต้องดูแลระยะยาว',
    'Kittipong has hands-on experience in backend systems, cloud deployment, and CI/CD for products that must scale sustainably.',
    ['NestJS', 'DevOps', 'Kubernetes'],
    ['Backend Systems', 'Cloud Infrastructure'],
    10,
  ],
  [
    'Napat Rattanachai',
    'napat@learney.test',
    'ผู้สอนสาย UX และ Product Design',
    'UX and Product Design Instructor',
    'ณภัทรทำงานด้าน UX research, design systems และ product design ที่เชื่อมผู้ใช้ ธุรกิจ และทีมพัฒนาเข้าด้วยกัน',
    'Napat works across UX research, design systems, and product design that connect users, business goals, and engineering teams.',
    ['UX Research', 'Figma', 'Design Systems'],
    ['Design', 'Product Discovery'],
    9,
  ],
  [
    'Maya Chansiri',
    'maya@learney.test',
    'ผู้สอนสาย Data และ AI Workflow',
    'Data and AI Workflow Instructor',
    'มายาเน้นการใช้ข้อมูลและ AI เพื่อช่วยให้ทีมตัดสินใจดีขึ้นและทำงานซ้ำให้น้อยลง',
    'Maya focuses on using data and AI to help teams make better decisions and reduce repetitive work.',
    ['SQL', 'Python', 'AI Workflow'],
    ['Data Analysis', 'Automation'],
    7,
  ],
  [
    'Pimnara Limsakul',
    'pimnara@learney.test',
    'ผู้สอนสาย Product Strategy และ Growth',
    'Product Strategy and Growth Instructor',
    'พิมณราเชี่ยวชาญ product strategy, agile delivery และการเติบโตของธุรกิจดิจิทัลผ่าน content และ SEO',
    'Pimnara specializes in product strategy, agile delivery, and digital growth through content and SEO.',
    ['Product Strategy', 'Agile', 'SEO'],
    ['Product Management', 'Growth'],
    11,
  ],
] as const;

const studentRows = [
  ['Nicha Wongsa', 'nicha@learney.test'],
  ['Patiphan Meechai', 'patiphan@learney.test'],
  ['Sasithorn Boonmee', 'sasithorn@learney.test'],
  ['Thanawat Imsri', 'thanawat@learney.test'],
  ['Yada Kosit', 'yada@learney.test'],
] as const;

const courseRows = [
  [
    'fullstack-web-development-with-nextjs',
    'web-dev',
    'araya@learney.test',
    'พัฒนาเว็บ Fullstack ด้วย Next.js',
    'Fullstack Web Development with Next.js',
    'เรียนสร้างเว็บตั้งแต่พื้นฐานจน deploy จริงด้วย Next.js, API routes และ workflow แบบ production',
    'Build and ship a production-ready web app with Next.js, API routes, and a practical delivery workflow.',
    'คอร์สนี้พาคุณสร้างเว็บแอป Fullstack ด้วย Next.js ตั้งแต่การวางโครงสร้างโปรเจกต์ การจัดการข้อมูล การออกแบบ UI ไปจนถึงการ deploy ให้พร้อมใช้งานจริงในทีม',
    'This course walks you through building a fullstack Next.js application, covering project structure, data flow, user interface decisions, and deployment for real team environments.',
    'การพัฒนาเว็บ Fullstack ด้วย Next.js',
    'fullstack web development with Next.js',
    'Beginner',
    'Best Seller',
    3490,
    500,
    '16h 20m',
    ['nextjs', 'react', 'fullstack', 'web-development'],
  ],
  [
    'build-rest-apis-with-nestjs-and-prisma',
    'web-dev',
    'kittipong@learney.test',
    'สร้าง REST API ด้วย NestJS และ Prisma',
    'Build REST APIs with NestJS and Prisma',
    'ออกแบบ backend ที่อ่านง่าย ขยายต่อได้ และเชื่อมฐานข้อมูลอย่างมั่นใจ',
    'Design maintainable backends and connect them to databases with confidence using NestJS and Prisma.',
    'เรียนรู้การสร้าง REST API ด้วย NestJS และ Prisma ตั้งแต่การออกแบบ module, service, validation, authentication จนถึงการจัดการฐานข้อมูลและ error handling สำหรับระบบจริง',
    'Learn to build REST APIs with NestJS and Prisma, from modules, services, and validation to authentication, database workflows, and production-grade error handling.',
    'การพัฒนา REST API ด้วย NestJS และ Prisma',
    'REST API development with NestJS and Prisma',
    'Intermediate',
    'Recommended',
    3290,
    400,
    '14h 40m',
    ['nestjs', 'prisma', 'api', 'backend'],
  ],
  [
    'typescript-for-modern-web-teams',
    'web-dev',
    'araya@learney.test',
    'TypeScript สำหรับทีมพัฒนาเว็บสมัยใหม่',
    'TypeScript for Modern Web Teams',
    'ยกระดับคุณภาพโค้ดด้วย type safety, reusable patterns และแนวคิดที่ใช้ได้จริงในทีม',
    'Level up code quality with type safety, reusable patterns, and real workflows for modern web teams.',
    'คอร์สนี้ช่วยให้คุณใช้ TypeScript อย่างมีประสิทธิภาพในงานจริง ตั้งแต่พื้นฐาน type system ไปจนถึงการออกแบบ type ที่อ่านง่าย รองรับการ refactor และลด bug ในทีม',
    'Use TypeScript effectively in real projects, from core type system concepts to designing readable types that support refactoring and reduce bugs across a team.',
    'การใช้ TypeScript ในทีมพัฒนาเว็บ',
    'using TypeScript in modern web teams',
    'Beginner',
    'Popular',
    2590,
    300,
    '10h 50m',
    ['typescript', 'frontend', 'backend', 'quality'],
  ],
  [
    'frontend-architecture-and-design-systems-with-react',
    'web-dev',
    'araya@learney.test',
    'ออกแบบ Frontend Architecture และ Design System ด้วย React',
    'Frontend Architecture and Design Systems with React',
    'สร้าง UI ที่ขยายต่อได้ ดูแลง่าย และสอดคล้องกันทั้งระบบ',
    'Build scalable UI systems with React that stay consistent, maintainable, and easy to extend.',
    'เรียนรู้การวางสถาปัตยกรรม frontend ด้วย React ตั้งแต่ component strategy, state boundaries, token-driven UI และการจัดการ design system ที่พร้อมทำงานร่วมกับทีมออกแบบ',
    'Learn practical frontend architecture with React, including component strategy, state boundaries, token-driven UI, and design system workflows that align with design teams.',
    'การวาง frontend architecture และ design system ด้วย React',
    'frontend architecture and design systems with React',
    'Advanced',
    "Editor's Pick",
    3890,
    650,
    '15h 15m',
    ['react', 'design-system', 'frontend', 'architecture'],
  ],
  [
    'ux-design-foundations-with-figma',
    'design-ux',
    'napat@learney.test',
    'พื้นฐาน UX Design และ Figma สำหรับงานจริง',
    'UX Design Foundations with Figma',
    'เข้าใจหลักคิดของ UX และฝึกออกแบบหน้าจอที่ตอบโจทย์ผู้ใช้จริง',
    'Understand UX thinking and design product screens in Figma for real user needs.',
    'คอร์สนี้พาคุณเรียนรู้การคิดแบบ UX ตั้งแต่การทำความเข้าใจผู้ใช้ จัดโครงสร้างข้อมูล วาง wireframe และออกแบบหน้าจอใน Figma ให้พร้อมต่อยอดสู่การพัฒนาจริง',
    'This course teaches practical UX thinking, from understanding users and structuring information to wireframing and creating polished screens in Figma.',
    'การออกแบบ UX และการใช้ Figma',
    'UX design and working in Figma',
    'Beginner',
    'New Release',
    2790,
    300,
    '12h 10m',
    ['ux', 'figma', 'design', 'product'],
  ],
  [
    'user-research-and-journey-mapping',
    'design-ux',
    'napat@learney.test',
    'User Research และ Journey Mapping สำหรับทีมดิจิทัล',
    'User Research and Journey Mapping for Digital Teams',
    'เก็บ insight จากผู้ใช้และแปลงเป็นแผนปรับปรุง product ที่ชัดเจน',
    'Capture user insight and turn it into clear product decisions with journey mapping.',
    'เรียนรู้วิธีวางแผน research สัมภาษณ์ผู้ใช้ สังเคราะห์ insight และสร้าง journey map ที่ช่วยให้ทีมเห็นปัญหาและโอกาสอย่างตรงจุด',
    'Learn how to plan research, interview users, synthesize insight, and create journey maps that reveal real product problems and opportunities.',
    'การทำ user research และ journey mapping',
    'user research and journey mapping',
    'Intermediate',
    'Recommended',
    2890,
    350,
    '11h 30m',
    ['user-research', 'journey-map', 'ux', 'product'],
  ],
  [
    'design-systems-for-product-teams',
    'design-ux',
    'napat@learney.test',
    'Design Systems สำหรับ Product Teams',
    'Design Systems for Product Teams',
    'สร้างระบบ component และ guideline ที่ช่วยให้ทีมออกแบบและทีมพัฒนาทำงานเร็วขึ้น',
    'Build components and guidelines that help design and engineering teams move faster together.',
    'คอร์สนี้สอนการวางรากฐาน design system ตั้งแต่ token, component, documentation และการสื่อสารข้ามทีม เพื่อให้การออกแบบทั้งระบบสม่ำเสมอและต่อยอดได้',
    'Build a practical design system from tokens and components to documentation and team adoption, so the product stays consistent as it grows.',
    'การสร้าง design system สำหรับ product teams',
    'building design systems for product teams',
    'Advanced',
    'Team Favorite',
    3690,
    500,
    '13h 20m',
    ['design-system', 'figma', 'components', 'collaboration'],
  ],
  [
    'motion-design-for-web-interfaces',
    'design-ux',
    'napat@learney.test',
    'Motion Design สำหรับ Web Interfaces',
    'Motion Design for Web Interfaces',
    'ออกแบบ motion ที่ช่วยให้ UI ชัดขึ้น ลื่นขึ้น และรู้สึกมีเจตนา',
    'Design motion that makes web interfaces clearer, smoother, and more intentional.',
    'เรียนรู้หลักการ motion design สำหรับเว็บ ตั้งแต่การกำหนดจังหวะ การสื่อสาร state ของ UI ไปจนถึงการสร้าง motion ที่เสริมประสบการณ์ผู้ใช้โดยไม่รบกวนการใช้งาน',
    'Learn motion design principles for the web, from timing and transitions to communicating UI state without distracting the user.',
    'การออกแบบ motion สำหรับ web interfaces',
    'motion design for web interfaces',
    'Intermediate',
    'Creative Pick',
    2490,
    250,
    '9h 40m',
    ['motion', 'ui', 'animation', 'web-design'],
  ],
  [
    'sql-analytics-for-business-decisions',
    'data-ai',
    'maya@learney.test',
    'วิเคราะห์ข้อมูลด้วย SQL เพื่อการตัดสินใจทางธุรกิจ',
    'SQL Analytics for Business Decisions',
    'อ่านข้อมูลอย่างเป็นระบบและสื่อสาร insight ที่ทีมเอาไปใช้ต่อได้',
    'Query data with structure and communicate insights that teams can act on.',
    'คอร์สนี้ช่วยให้คุณใช้ SQL กับงานจริง ตั้งแต่การเขียน query พื้นฐาน การ join table การสรุป metric สำคัญ ไปจนถึงการตีความผลลัพธ์เพื่อใช้ตัดสินใจ',
    'Use SQL for real analysis work, from foundational queries and joins to building useful metrics and interpreting results for business decisions.',
    'การวิเคราะห์ข้อมูลด้วย SQL',
    'SQL analytics for business decisions',
    'Beginner',
    'Best Seller',
    2990,
    400,
    '12h 45m',
    ['sql', 'analytics', 'data', 'business'],
  ],
  [
    'python-for-data-analysis-and-automation',
    'data-ai',
    'maya@learney.test',
    'Python สำหรับ Data Analysis และ Automation',
    'Python for Data Analysis and Automation',
    'จัดการข้อมูล ทำงานซ้ำอัตโนมัติ และสร้าง workflow ที่ประหยัดเวลาจริง',
    'Clean data, automate repetitive work, and build workflows that save real time.',
    'เรียนรู้การใช้ Python กับงานข้อมูล ตั้งแต่การอ่านไฟล์ จัดระเบียบข้อมูล วิเคราะห์เบื้องต้น และเขียน automation ที่ช่วยลดงาน manual ในแต่ละวัน',
    'Learn practical Python for data work, including file handling, data cleanup, basic analysis, and automation that reduces repetitive manual tasks.',
    'การใช้ Python เพื่อวิเคราะห์ข้อมูลและทำ automation',
    'Python for data analysis and automation',
    'Beginner',
    'Popular',
    3090,
    350,
    '13h 05m',
    ['python', 'data-analysis', 'automation', 'workflow'],
  ],
  [
    'product-analytics-with-ga4-and-looker-studio',
    'data-ai',
    'maya@learney.test',
    'Product Analytics ด้วย GA4 และ Looker Studio',
    'Product Analytics with GA4 and Looker Studio',
    'ตั้งแต่ event tracking ไปจนถึง dashboard ที่ช่วยให้ทีมเห็นภาพการใช้งานจริง',
    'From event tracking to dashboards that help teams understand real product behavior.',
    'คอร์สนี้สอนการเก็บ event อย่างมีโครงสร้าง วิเคราะห์ funnel และสร้าง dashboard ใน Looker Studio เพื่อให้ทีมผลิตภัณฑ์มองเห็นการใช้งานและโอกาสในการปรับปรุง',
    'Learn structured event tracking, funnel analysis, and dashboard building in Looker Studio so product teams can understand usage and prioritize improvements.',
    'การทำ product analytics ด้วย GA4 และ Looker Studio',
    'product analytics with GA4 and Looker Studio',
    'Intermediate',
    'Growth Pick',
    3390,
    450,
    '11h 55m',
    ['ga4', 'looker-studio', 'analytics', 'product'],
  ],
  [
    'ai-workflows-for-knowledge-workers',
    'data-ai',
    'maya@learney.test',
    'AI Workflows สำหรับ Knowledge Workers',
    'AI Workflows for Knowledge Workers',
    'วางระบบใช้ AI อย่างมีคุณภาพ ตั้งแต่ research, writing ไปจนถึง review',
    'Build high-quality AI workflows for research, writing, review, and everyday knowledge work.',
    'เรียนรู้การออกแบบ workflow ใช้ AI อย่างมีความรับผิดชอบ ตั้งแต่ตั้งโจทย์ เขียน prompt ตรวจคุณภาพผลลัพธ์ ไปจนถึงวางขั้นตอนทำงานร่วมกับมนุษย์ในองค์กร',
    'Design responsible AI workflows for modern knowledge work, from framing tasks and prompting to reviewing output quality and integrating human judgment.',
    'การออกแบบ AI workflows สำหรับงานความรู้',
    'AI workflows for knowledge work',
    'Intermediate',
    'Trending',
    3590,
    500,
    '10h 35m',
    ['ai', 'workflow', 'productivity', 'automation'],
  ],
  [
    'deploy-applications-with-docker-and-kubernetes',
    'devops-cloud',
    'kittipong@learney.test',
    'Deploy แอปด้วย Docker และ Kubernetes',
    'Deploy Applications with Docker and Kubernetes',
    'เข้าใจ container workflow และการ deploy ระบบให้เสถียรในสภาพแวดล้อมจริง',
    'Understand container workflows and deploy applications reliably in real environments.',
    'คอร์สนี้พาคุณเรียนรู้การใช้ Docker และ Kubernetes กับการ deploy แอปจริง ตั้งแต่ container basics, image design, service communication ไปจนถึง rollout และ monitoring',
    'Learn Docker and Kubernetes for real deployments, covering container basics, image design, service communication, rollout strategy, and monitoring.',
    'การ deploy แอปด้วย Docker และ Kubernetes',
    'deploying applications with Docker and Kubernetes',
    'Intermediate',
    'Ops Ready',
    3990,
    600,
    '15h 10m',
    ['docker', 'kubernetes', 'deployment', 'devops'],
  ],
  [
    'cicd-for-fullstack-applications',
    'devops-cloud',
    'kittipong@learney.test',
    'วางระบบ CI/CD สำหรับ Fullstack Applications',
    'CI/CD for Fullstack Applications',
    'ทำให้ทีมปล่อยงานได้เร็วขึ้น มั่นใจขึ้น และลดขั้นตอนที่ผิดพลาดซ้ำ ๆ',
    'Help teams ship faster and with more confidence through practical CI/CD workflows.',
    'เรียนรู้การออกแบบ pipeline สำหรับ fullstack applications ตั้งแต่ test automation, build process, release checklist และ deployment workflow ที่เหมาะกับการทำงานเป็นทีม',
    'Design practical CI/CD pipelines for fullstack applications, including test automation, build steps, release checklists, and deployment workflows for teams.',
    'การวางระบบ CI/CD สำหรับ fullstack applications',
    'CI/CD for fullstack applications',
    'Advanced',
    'Team Favorite',
    3790,
    450,
    '12h 50m',
    ['cicd', 'devops', 'testing', 'deployment'],
  ],
  [
    'web-application-security-and-authentication',
    'devops-cloud',
    'kittipong@learney.test',
    'Security และ Authentication สำหรับ Web Applications',
    'Security and Authentication for Web Applications',
    'วางระบบยืนยันตัวตน สิทธิ์การเข้าถึง และแนวคิดด้าน security ที่ใช้ได้จริง',
    'Build practical authentication, authorization, and security foundations for modern web apps.',
    'คอร์สนี้ช่วยให้คุณเข้าใจแนวคิด security สำคัญสำหรับเว็บแอป ตั้งแต่ session, token, permission, secure storage ไปจนถึงแนวทางลดความเสี่ยงที่พบบ่อย',
    'Understand core web security concepts, from sessions and tokens to permissions, secure storage, and practical ways to reduce common risks.',
    'security และ authentication สำหรับ web applications',
    'security and authentication for web applications',
    'Intermediate',
    'Recommended',
    3490,
    400,
    '11h 15m',
    ['security', 'auth', 'web-app', 'backend'],
  ],
  [
    'production-performance-optimization-for-nextjs',
    'devops-cloud',
    'araya@learney.test',
    'ปรับ Performance ของ Next.js ให้พร้อมใช้งานจริง',
    'Production Performance Optimization for Next.js',
    'วิเคราะห์ bottleneck และปรับเว็บให้เร็วขึ้นทั้งฝั่งผู้ใช้และทีมพัฒนา',
    'Diagnose bottlenecks and improve Next.js performance for users and engineering teams.',
    'เรียนรู้การวัดและปรับ performance ของ Next.js ตั้งแต่ rendering strategy, asset loading, caching, bundle reduction ไปจนถึงการติดตามผลหลัง deploy',
    'Learn to measure and optimize Next.js performance through rendering strategy, asset loading, caching, bundle reduction, and post-deployment monitoring.',
    'การปรับ performance ของ Next.js',
    'performance optimization for Next.js',
    'Advanced',
    'Expert Track',
    3690,
    500,
    '10h 20m',
    ['nextjs', 'performance', 'web-vitals', 'optimization'],
  ],
  [
    'product-management-foundations-for-digital-teams',
    'product-growth',
    'pimnara@learney.test',
    'พื้นฐาน Product Management สำหรับทีมดิจิทัล',
    'Product Management Foundations for Digital Teams',
    'วางทิศทาง product, จัดลำดับความสำคัญ และทำงานร่วมกับทีมอย่างมีโฟกัส',
    'Set product direction, prioritize with clarity, and collaborate effectively across teams.',
    'คอร์สนี้สอน mindset และ workflow ของ product management ตั้งแต่การตั้งเป้าหมาย การตีโจทย์ธุรกิจ การวาง roadmap และการสื่อสารให้ทีมเดินไปในทิศทางเดียวกัน',
    'This course covers product management fundamentals, from goal setting and problem framing to roadmap planning and cross-functional communication.',
    'พื้นฐาน product management',
    'product management foundations',
    'Beginner',
    'Leadership Pick',
    2890,
    300,
    '9h 50m',
    ['product', 'roadmap', 'strategy', 'teamwork'],
  ],
  [
    'agile-delivery-for-cross-functional-teams',
    'product-growth',
    'pimnara@learney.test',
    'Agile Delivery สำหรับ Cross-Functional Teams',
    'Agile Delivery for Cross-Functional Teams',
    'ทำให้ทีมส่งมอบงานได้ต่อเนื่อง พร้อม feedback loop ที่ชัดเจนและใช้งานได้จริง',
    'Run agile delivery with clear feedback loops that help teams ship consistently.',
    'เรียนรู้การวาง cadence การประชุม วิธีแตกงาน การสื่อสาร blocker และการปรับปรุงกระบวนการทำงานแบบ agile ให้เหมาะกับทีมข้ามสายงาน',
    'Learn to run agile delivery across cross-functional teams with practical meeting cadences, work breakdown, blocker communication, and continuous improvement.',
    'การทำ agile delivery สำหรับทีมข้ามสายงาน',
    'agile delivery for cross-functional teams',
    'Intermediate',
    'Team Favorite',
    2690,
    250,
    '8h 40m',
    ['agile', 'delivery', 'scrum', 'collaboration'],
  ],
  [
    'content-strategy-and-seo-for-saas',
    'product-growth',
    'pimnara@learney.test',
    'Content Strategy และ SEO สำหรับ SaaS',
    'Content Strategy and SEO for SaaS',
    'วางแผนคอนเทนต์ที่เชื่อมกับ funnel และสร้าง organic growth อย่างยั่งยืน',
    'Plan content that supports the funnel and drives sustainable organic growth for SaaS.',
    'คอร์สนี้ช่วยให้คุณวาง content strategy สำหรับ SaaS ตั้งแต่ค้นหา topic, intent, content architecture, editorial workflow และการวัดผลลัพธ์เชิงธุรกิจ',
    'Build a practical content strategy for SaaS, covering topic selection, search intent, content architecture, editorial workflow, and measurement tied to business goals.',
    'การวาง content strategy และ SEO สำหรับ SaaS',
    'content strategy and SEO for SaaS',
    'Intermediate',
    'Growth Pick',
    2790,
    300,
    '9h 25m',
    ['seo', 'content-strategy', 'saas', 'growth'],
  ],
  [
    'technical-writing-for-saas-and-developer-products',
    'product-growth',
    'pimnara@learney.test',
    'Technical Writing สำหรับ SaaS และ Developer Products',
    'Technical Writing for SaaS and Developer Products',
    'เขียนเอกสารและคู่มือที่ช่วยให้ผู้ใช้เข้าใจเร็ว ทีม support ทำงานง่ายขึ้น',
    'Write docs and guides that help users understand faster and support teams work better.',
    'เรียนรู้การเขียน technical content สำหรับผลิตภัณฑ์ดิจิทัล ตั้งแต่การวิเคราะห์ผู้อ่าน การจัดโครงสร้างเนื้อหา การเขียน onboarding docs และการปรับภาษาที่อ่านแล้วใช้งานได้จริง',
    'Learn technical writing for digital products, from audience analysis and content structure to onboarding docs and clear, usable instructional language.',
    'การเขียน technical content สำหรับ SaaS และ developer products',
    'technical writing for SaaS and developer products',
    'Beginner',
    'Recommended',
    2490,
    200,
    '8h 15m',
    ['technical-writing', 'docs', 'saas', 'developer-experience'],
  ],
] as const;

const previewVideoIds = [
  'ysz5S6PUM-U',
  'aqz-KE-bpKQ',
  'ScMzIvxBSi4',
  'M7lc1UVf-VE',
  'dQw4w9WgXcQ',
] as const;

const avatarPalettes = [
  ['1f2937', 'f9fafb'],
  ['0f766e', 'f0fdfa'],
  ['7c2d12', 'fff7ed'],
  ['5b21b6', 'f5f3ff'],
  ['9f1239', 'fff1f2'],
] as const;

const categorySeeds: CategorySeed[] = categoryRows.map(
  ([key, legacyName, thaiName, descTh, descEn, icon, color]) => ({
    key,
    slug: key,
    legacyName,
    name: t(thaiName, legacyName),
    description: t(descTh, descEn),
    icon,
    color: `#${color}`,
  }),
);

const instructorSeeds: InstructorSeed[] = instructorRows.map(
  (
    [
      fullname,
      email,
      headlineTh,
      headlineEn,
      bioTh,
      bioEn,
      specialties,
      expertiseAreas,
      experienceYears,
    ],
    index,
  ) => ({
    fullname,
    email,
    headline: t(headlineTh, headlineEn),
    bio: t(bioTh, bioEn),
    specialties: [...specialties],
    expertiseAreas: [...expertiseAreas],
    experienceYears,
    image: buildAvatarUrl(fullname, index),
  }),
);

const studentSeeds: StudentSeed[] = studentRows.map(
  ([fullname, email], index) => ({
    fullname,
    email,
    image: buildAvatarUrl(fullname, index + instructorSeeds.length),
  }),
);

const courseSeeds: CourseSeed[] = courseRows.map(
  ([
    slug,
    categoryKey,
    instructorEmail,
    titleTh,
    titleEn,
    shortTh,
    shortEn,
    descTh,
    descEn,
    focusTh,
    focusEn,
    level,
    badge,
    price,
    discount,
    duration,
    tags,
  ]) => ({
    slug,
    categoryKey,
    instructorEmail,
    title: t(titleTh, titleEn),
    shortDescription: t(shortTh, shortEn),
    localizedDescription: t(descTh, descEn),
    description: descTh,
    focus: t(focusTh, focusEn),
    level,
    badge,
    price,
    discount,
    duration,
    tags: [...tags],
  }),
);

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function buildAvatarUrl(name: string, index: number) {
  const [bg, fg] = avatarPalettes[index % avatarPalettes.length];
  return `https://placehold.co/400x400/${bg}/${fg}?text=${encodeURIComponent(
    name,
  )}`;
}

function buildPreviewVideoUrl(index: number) {
  return `https://www.youtube.com/watch?v=${
    previewVideoIds[index % previewVideoIds.length]
  }`;
}

function buildResourceUrl(
  courseSlug: string,
  moduleOrder: number,
  lessonOrder: number,
) {
  return `https://cdn.learney.dev/mock/${courseSlug}/module-${moduleOrder}-lesson-${lessonOrder}.pdf`;
}

function assertLocalizedField(
  label: string,
  value: Localized | null | undefined,
) {
  if (!value || typeof value.th !== 'string' || typeof value.en !== 'string') {
    throw new Error(`${label} must be a localized object with th/en`);
  }

  if (!value.th.trim() || !value.en.trim()) {
    throw new Error(`${label} must contain non-empty th/en text`);
  }
}

function validateSeedCatalog() {
  categorySeeds.forEach((category) => {
    assertLocalizedField(`category:${category.key}:name`, category.name);
    assertLocalizedField(
      `category:${category.key}:description`,
      category.description,
    );
  });

  instructorSeeds.forEach((instructor) => {
    assertLocalizedField(
      `instructor:${instructor.email}:headline`,
      instructor.headline,
    );
    assertLocalizedField(`instructor:${instructor.email}:bio`, instructor.bio);
  });

  courseSeeds.forEach((course) => {
    assertLocalizedField(`course:${course.slug}:title`, course.title);
    assertLocalizedField(
      `course:${course.slug}:shortDescription`,
      course.shortDescription,
    );
    assertLocalizedField(
      `course:${course.slug}:localizedDescription`,
      course.localizedDescription,
    );
  });
}

function buildTargetAudience(course: CourseSeed) {
  switch (course.categoryKey) {
    case 'web-dev':
      return [
        course.level === 'Beginner'
          ? 'ผู้เริ่มต้นที่อยากสร้างผลงานสายเว็บให้เป็นระบบ'
          : 'นักพัฒนาที่มีพื้นฐานแล้วและอยากยกระดับการทำงานให้เป็นทีมมากขึ้น',
        `คนที่อยากนำ${course.focus.th}ไปใช้กับโปรเจกต์จริง`,
        'ทีมดิจิทัลที่ต้องการ workflow พัฒนาเว็บที่ชัดเจนและดูแลง่าย',
      ];
    case 'design-ux':
      return [
        'นักออกแบบหรือคนทำ product ที่อยากเข้าใจผู้ใช้ให้ลึกขึ้น',
        `คนที่อยากใช้${course.focus.th}เพื่อทำงานร่วมกับทีมได้ดีขึ้น`,
        'ผู้เริ่มต้นที่อยากมีผลงานออกแบบพร้อมอธิบายเหตุผลเบื้องหลังงานได้ชัดเจน',
      ];
    case 'data-ai':
      return [
        'คนทำงานข้อมูลที่อยากอ่านผลลัพธ์และเล่าเรื่องจากข้อมูลได้ดีขึ้น',
        `คนที่ต้องการใช้${course.focus.th}เพื่อลดงานซ้ำและตัดสินใจแม่นยำขึ้น`,
        'ทีมธุรกิจหรือ product ที่อยากเชื่อมข้อมูลเข้ากับการทำงานประจำวัน',
      ];
    case 'devops-cloud':
      return [
        'นักพัฒนาที่อยากดูแลระบบ deploy และสภาพแวดล้อมจริงได้มั่นใจขึ้น',
        `ทีมที่อยากเชื่อม${course.focus.th}เข้ากับ workflow การส่งมอบงาน`,
        'คนที่ต้องการลด human error และเพิ่มความเสถียรของการปล่อยระบบ',
      ];
    default:
      return [
        'คนทำ product, growth หรือ operation ที่อยากทำงานเชิงระบบมากขึ้น',
        `ผู้ที่อยากใช้${course.focus.th}เพื่อจัดลำดับความสำคัญและสื่อสารกับทีมให้ชัด`,
        'ทีมข้ามสายงานที่ต้องการกรอบคิดเพื่อนำไปใช้กับงานจริงทันที',
      ];
  }
}

function buildWillLearnMessages(course: CourseSeed) {
  switch (course.categoryKey) {
    case 'web-dev':
      return [
        `วางโครงสร้างงานของ${course.focus.th}ให้ขยายต่อได้`,
        'เชื่อม frontend, backend และ data flow ให้ทำงานร่วมกันอย่างเป็นระบบ',
        'ใช้ workflow พัฒนา ทดสอบ และส่งมอบงานแบบที่ทีมใช้งานได้จริง',
        'ต่อยอดเป็นโปรเจกต์ portfolio หรือใช้กับงานจริงได้ทันที',
      ];
    case 'design-ux':
      return [
        `ใช้${course.focus.th}เพื่อทำความเข้าใจผู้ใช้และเป้าหมายของงาน`,
        'จัดระบบ component, flow และการสื่อสารของงานออกแบบให้ชัดเจนขึ้น',
        'ตัดสินใจเชิงออกแบบจากเหตุผลและข้อมูลมากกว่าความรู้สึกล้วน',
        'รีวิวและพัฒนางานให้พร้อมทำงานกับทีม product และ engineering',
      ];
    case 'data-ai':
      return [
        `มองภาพรวมของ${course.focus.th}อย่างเป็นระบบและนำไปใช้กับโจทย์ธุรกิจได้`,
        'สร้าง workflow ที่ลดงานซ้ำและเพิ่มความแม่นยำของผลลัพธ์',
        'สื่อสาร insight ให้ทีมเข้าใจง่ายและตัดสินใจต่อได้เร็วขึ้น',
        'ใช้ข้อมูลหรือ AI อย่างมีคุณภาพและตรวจสอบผลลัพธ์ได้จริง',
      ];
    case 'devops-cloud':
      return [
        `วาง workflow ของ${course.focus.th}ให้เสถียรและดูแลง่าย`,
        'ลดความเสี่ยงจากการปล่อยระบบด้วยขั้นตอนที่ตรวจสอบย้อนกลับได้',
        'มองเห็น bottleneck ด้าน deploy, quality และความพร้อมใช้งานของระบบ',
        'ยกระดับมาตรฐานการทำงานให้พร้อมรองรับ production environment',
      ];
    default:
      return [
        `ใช้${course.focus.th}เพื่อเชื่อมโจทย์ผู้ใช้เข้ากับผลลัพธ์ทางธุรกิจ`,
        'จัดลำดับความสำคัญและสื่อสารการตัดสินใจให้ทีมเข้าใจตรงกัน',
        'วาง workflow การทำงานที่ส่งมอบต่อเนื่องและมี feedback ชัดเจน',
        'ต่อยอดกรอบคิดไปใช้กับ product, growth และงานข้ามสายงานได้จริง',
      ];
  }
}

function buildRequirements(course: CourseSeed) {
  switch (course.categoryKey) {
    case 'web-dev':
      return course.level === 'Beginner'
        ? [
            'ใช้งานคอมพิวเตอร์และเว็บเบราว์เซอร์ได้คล่อง',
            'มีคอมพิวเตอร์ที่ติดตั้ง Node.js และโปรแกรม editor ได้',
            'พร้อมฝึกลงมือทำ workshop ทุกบทอย่างต่อเนื่อง',
          ]
        : [
            'มีพื้นฐาน JavaScript หรือการพัฒนาเว็บเบื้องต้น',
            'ติดตั้ง Node.js, package manager และ editor พร้อมใช้งาน',
            'พร้อมอ่านโค้ด ทดลองแก้ bug และทำ mini project ระหว่างเรียน',
          ];
    case 'design-ux':
      return [
        'มีบัญชี Figma หรือเครื่องมือออกแบบที่ถนัด',
        'พร้อมทำแบบฝึกจากโจทย์ผู้ใช้และกรณีศึกษาจริง',
        'ถ้ามีพื้นฐาน UI basics จะช่วยให้เรียนได้เร็วขึ้น',
      ];
    case 'data-ai':
      return [
        'ใช้งาน spreadsheet หรือคอมพิวเตอร์พื้นฐานได้',
        'พร้อมทดลองกับชุดข้อมูลตัวอย่างและกรณีศึกษาที่ให้ในคอร์ส',
        'ถ้ามีพื้นฐาน logic หรือภาษาอังกฤษเล็กน้อยจะช่วยให้เรียนลื่นขึ้น',
      ];
    case 'devops-cloud':
      return [
        'มีพื้นฐานการพัฒนาเว็บหรือ backend มาก่อน',
        'ติดตั้ง Docker และเครื่องมือ command line ได้',
        'พร้อมอ่าน log และฝึกแก้ปัญหาเชิงระบบระหว่างเรียน',
      ];
    default:
      return [
        'สนใจงาน product, growth หรือการทำงานร่วมกับทีมดิจิทัล',
        'พร้อมคิดเชิงระบบและสรุป insight จากกรณีศึกษาจริง',
        'ไม่จำเป็นต้องเป็น PM มาก่อน แต่ควรเปิดใจทดลอง framework ใหม่',
      ];
  }
}

function createLessonBlueprint(
  course: CourseSeed,
  titleTh: string,
  titleEn: string,
  summaryTh: string,
  summaryEn: string,
  moduleOrder: number,
  lessonOrder: number,
  courseIndex: number,
): LessonBlueprint {
  const title = t(titleTh, titleEn);
  const summary = t(summaryTh, summaryEn);

  assertLocalizedField(
    `lesson:${course.slug}:${moduleOrder}:${lessonOrder}:title`,
    title,
  );
  assertLocalizedField(
    `lesson:${course.slug}:${moduleOrder}:${lessonOrder}:summary`,
    summary,
  );

  const lessonTitleSlug = slugify(`${moduleOrder}-${lessonOrder}-${titleEn}`);

  const assets: AssetBlueprint[] = [
    {
      kind: 'TEXT',
      title: t('สรุปบทเรียน', 'Lesson Summary'),
      content: t(
        `บทเรียนนี้ช่วยให้คุณเข้าใจ${course.focus.th}ผ่านหัวข้อ "${titleTh}" และเห็นวิธีนำไปใช้กับงานจริงอย่างเป็นขั้นตอน`,
        `This lesson helps you understand ${course.focus.en} through "${titleEn}" and shows how to apply it to real work step by step.`,
      ),
      order: 1,
    },
    {
      kind: 'RESOURCE',
      title: t('เช็กลิสต์และแบบฝึกหัด', 'Checklist and Practice Sheet'),
      url: buildResourceUrl(course.slug, moduleOrder, lessonOrder),
      order: 2,
    },
  ];

  assets.forEach((asset) => {
    assertLocalizedField(
      `asset:${course.slug}:${moduleOrder}:${lessonOrder}:${asset.kind}:title`,
      asset.title,
    );

    if (asset.content) {
      assertLocalizedField(
        `asset:${course.slug}:${moduleOrder}:${lessonOrder}:${asset.kind}:content`,
        asset.content,
      );
    }
  });

  return {
    title,
    summary,
    instructorScript: [
      `หัวข้อ: ${titleTh}`,
      summaryTh,
      `ในบทนี้ผู้เรียนจะได้ฝึกนำ${course.focus.th}ไปใช้กับสถานการณ์จริง พร้อมเช็กลิสต์สำหรับทบทวนหลังเรียน`,
      `เอกสารประกอบ: ${lessonTitleSlug}`,
    ].join('\n\n'),
    durationMinutes:
      18 + moduleOrder * 6 + lessonOrder * 5 + (courseIndex % 3) * 3,
    order: lessonOrder,
    assets,
  };
}

function createModuleBlueprint(
  course: CourseSeed,
  titleTh: string,
  titleEn: string,
  summaryTh: string,
  summaryEn: string,
  lessons: LessonBlueprint[],
  order: number,
): ModuleBlueprint {
  const title = t(titleTh, titleEn);
  const summary = t(summaryTh, summaryEn);

  assertLocalizedField(`module:${course.slug}:${order}:title`, title);
  assertLocalizedField(`module:${course.slug}:${order}:summary`, summary);

  return {
    title,
    summary,
    order,
    lessons,
  };
}

function buildModulesForCourse(course: CourseSeed, courseIndex: number) {
  const moduleFactories = [
    () =>
      createModuleBlueprint(
        course,
        `ปูพื้นฐาน ${course.focus.th}`,
        `Foundations of ${course.focus.en}`,
        `เข้าใจภาพรวม เครื่องมือ และวิธีคิดที่จำเป็นก่อนเริ่มทำ${course.focus.th}แบบจริงจัง`,
        `Understand the big picture, essential tools, and mindset before working seriously on ${course.focus.en}.`,
        [
          createLessonBlueprint(
            course,
            'ภาพรวมคอร์สและผลลัพธ์ที่ผู้เรียนจะได้',
            'Course Roadmap and Expected Outcomes',
            `เห็นภาพว่า${course.focus.th}เชื่อมกับงานจริงอย่างไร และควรโฟกัสอะไรเป็นพิเศษ`,
            `See how ${course.focus.en} connects to real work and what to focus on first.`,
            1,
            1,
            courseIndex,
          ),
          createLessonBlueprint(
            course,
            'ตั้งค่าเครื่องมือและโครงสร้างเริ่มต้น',
            'Set Up Your Tools and Starter Structure',
            `เตรียมสภาพแวดล้อมและ workflow ที่ทำให้เริ่มงานด้าน${course.focus.th}ได้เร็วและดูแลง่าย`,
            `Prepare the environment and workflow that make it easy to start and maintain ${course.focus.en}.`,
            1,
            2,
            courseIndex,
          ),
        ],
        1,
      ),
    () =>
      createModuleBlueprint(
        course,
        'ออกแบบ workflow และชิ้นงานหลัก',
        'Design the Workflow and Core Deliverables',
        `วางโครงสร้างของ${course.focus.th}ให้ทำงานเป็นระบบและต่อยอดในทีมได้`,
        `Design a practical structure for ${course.focus.en} that teams can extend with confidence.`,
        [
          createLessonBlueprint(
            course,
            'วางโครงสร้างงานให้ขยายต่อได้',
            'Design a Scalable Working Structure',
            `เรียนรู้การแบ่งชิ้นงานและจัดระเบียบองค์ประกอบของ${course.focus.th}ให้อ่านง่ายและดูแลง่าย`,
            `Break down and organize the moving parts of ${course.focus.en} so they remain readable and maintainable.`,
            2,
            1,
            courseIndex,
          ),
          createLessonBlueprint(
            course,
            'ลงมือสร้างฟีเจอร์หลักแบบ step-by-step',
            'Build the Core Deliverables Step by Step',
            `ลงมือทำส่วนสำคัญของ${course.focus.th}พร้อมเข้าใจเหตุผลเบื้องหลังการตัดสินใจในแต่ละขั้น`,
            `Build the most important parts of ${course.focus.en} while understanding the reasoning behind each implementation choice.`,
            2,
            2,
            courseIndex,
          ),
        ],
        2,
      ),
    () =>
      createModuleBlueprint(
        course,
        'ยกระดับคุณภาพให้พร้อมใช้งานจริง',
        'Raise Quality for Production Use',
        `เสริมความมั่นใจให้${course.focus.th}ด้วยการตรวจคุณภาพ แก้ปัญหา และปรับประสิทธิภาพในจุดสำคัญ`,
        `Strengthen ${course.focus.en} with better quality checks, troubleshooting, and targeted optimization.`,
        [
          createLessonBlueprint(
            course,
            'ทดสอบและตรวจสอบคุณภาพอย่างเป็นระบบ',
            'Test and Review Quality Systematically',
            `สร้างวิธีตรวจงานของ${course.focus.th}ให้ทีมเห็นภาพตรงกันและลดปัญหาซ้ำ`,
            `Create a repeatable quality review approach for ${course.focus.en} that reduces recurring issues.`,
            3,
            1,
            courseIndex,
          ),
          createLessonBlueprint(
            course,
            'แก้ปัญหาและปรับประสิทธิภาพในจุดสำคัญ',
            'Troubleshoot and Optimize the Most Important Areas',
            `เรียนรู้วิธีมอง bottleneck ของ${course.focus.th}และปรับปรุงให้พร้อมรองรับการใช้งานจริง`,
            `Learn how to spot bottlenecks in ${course.focus.en} and optimize the areas that matter most in production.`,
            3,
            2,
            courseIndex,
          ),
        ],
        3,
      ),
    () =>
      createModuleBlueprint(
        course,
        'วางแผนการต่อยอดและส่งมอบงาน',
        'Plan Next Steps and Deliver with Confidence',
        `เชื่อม${course.focus.th}เข้ากับโจทย์ธุรกิจและวาง roadmap ต่อหลังจบคอร์ส`,
        `Connect ${course.focus.en} to business needs and define a practical roadmap after the course.`,
        [
          createLessonBlueprint(
            course,
            'เชื่อมงานกับโจทย์ธุรกิจและผู้ใช้งาน',
            'Connect the Work to Business and User Needs',
            `มอง${course.focus.th}ในมุมที่สร้างผลลัพธ์ให้ผู้ใช้ ทีม และเป้าหมายทางธุรกิจพร้อมกัน`,
            `Frame ${course.focus.en} in a way that serves users, teams, and business goals at the same time.`,
            4,
            1,
            courseIndex,
          ),
          createLessonBlueprint(
            course,
            'สรุปบทเรียนและ roadmap หลังจบคอร์ส',
            'Wrap Up and Define Your Post-Course Roadmap',
            `ทบทวนสิ่งที่ได้เรียนจาก${course.focus.th}และเลือกขั้นต่อไปที่เหมาะกับบทบาทของคุณ`,
            `Review what you learned about ${course.focus.en} and choose the next steps that fit your role.`,
            4,
            2,
            courseIndex,
          ),
        ],
        4,
      ),
  ];

  const moduleCount = 2 + (courseIndex % 3);
  return moduleFactories.slice(0, moduleCount).map((factory) => factory());
}

function buildCourseDetails(
  course: CourseSeed,
  courseId: string,
  moduleCount: number,
  previewVideoUrl: string,
) {
  return [
    {
      courseId,
      title: `วิดีโอแนะนำคอร์ส ${course.title.th}`,
      type: LessonType.VIDEO,
      video: previewVideoUrl,
      docs: null,
    },
    {
      courseId,
      title: 'คู่มือการเรียนและแผนฝึกปฏิบัติ',
      type: LessonType.DOCS,
      video: null,
      docs: [
        `คอร์ส: ${course.title.th}`,
        `ระดับ: ${course.level}`,
        `สิ่งที่ควรเตรียม: ${buildRequirements(course).join(', ')}`,
        `จำนวนโมดูลที่เตรียมไว้: ${moduleCount} โมดูล`,
        `แนวทางเรียนแนะนำ: ดูวิดีโอภาพรวมก่อน จากนั้นทำแบบฝึกหัดท้ายบททุกครั้ง`,
      ].join('\n'),
    },
  ];
}

function buildReviewSeeds(
  course: CourseSeed,
  reviewers: Array<{ id: string }>,
  courseId: string,
  courseIndex: number,
) {
  const ratingsByIndex = [
    [5, 5],
    [5, 4],
    [4, 5],
  ] as const;
  const [firstRating, secondRating] =
    ratingsByIndex[courseIndex % ratingsByIndex.length];
  const firstReviewer = reviewers[courseIndex % reviewers.length];
  const secondReviewer = reviewers[(courseIndex + 1) % reviewers.length];
  const createdAt = new Date(Date.UTC(2026, 0, courseIndex + 1));
  const updatedAt = new Date(Date.UTC(2026, 0, courseIndex + 2));

  return [
    {
      courseId,
      userId: firstReviewer.id,
      rating: firstRating,
      content: `ชอบวิธีอธิบายเรื่อง${course.focus.th}ที่ค่อย ๆ พาเห็นภาพและเอาไปใช้ต่อกับงานจริงได้ทันที`,
      createdAt,
      updatedAt,
    },
    {
      courseId,
      userId: secondReviewer.id,
      rating: secondRating,
      content: `แบบฝึกระหว่างบทและตัวอย่างของคอร์สนี้ช่วยให้เรื่อง${course.focus.th}เข้าใจง่ายขึ้นมาก`,
      createdAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
      updatedAt,
    },
  ];
}

function averageRating(reviews: Array<{ rating: number }>) {
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Number((total / reviews.length).toFixed(2));
}

async function clearSeedData() {
  await prisma.review.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.lessonAsset.deleteMany();
  await prisma.courseLesson.deleteMany();
  await prisma.courseModuleEntity.deleteMany();
  await prisma.coursePreviewVideo.deleteMany();
  await prisma.courseDetail.deleteMany();
  await prisma.enrolledCourse.deleteMany();
  await prisma.homepageFeaturedCourse.deleteMany();
  await prisma.promotionCourse.deleteMany();
  await prisma.courseAssessmentQuestion.deleteMany();
  await prisma.courseAssessment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.instructorProfile.deleteMany();
  await prisma.user.deleteMany();

  await prisma.careerAssessmentResult.deleteMany();
  await prisma.careerAssessmentSession.deleteMany();
  await prisma.careerAssessmentQuestion.deleteMany();
  await prisma.career.deleteMany();
}

async function createCareers() {
  await prisma.career.createMany({
    data: careerSeeds.map(
      ([
        slug,
        thName,
        enName,
        thSummary,
        enSummary,
        image,
        salaryRange,
        requiredSkills,
      ]) => ({
        slug,
        name: t(thName, enName),
        summary: t(thSummary, enSummary),
        image,
        salaryRange,
        requiredSkills: [...requiredSkills],
      }),
    ),
  });
}

async function createCategories() {
  const categoryByKey = new Map<string, { id: string; legacyName: string }>();

  for (const [index, category] of categorySeeds.entries()) {
    const created = await prisma.category.upsert({
      where: { key: category.key },
      update: {
        slug: category.slug,
        legacyName: category.legacyName,
        name: category.name,
        description: category.description,
        icon: category.icon,
        color: category.color,
        order: index + 1,
        visible: true,
      },
      create: {
        key: category.key,
        slug: category.slug,
        legacyName: category.legacyName,
        name: category.name,
        description: category.description,
        icon: category.icon,
        color: category.color,
        order: index + 1,
        visible: true,
      },
    });

    categoryByKey.set(category.key, {
      id: created.id,
      legacyName: created.legacyName ?? category.legacyName,
    });
  }

  return categoryByKey;
}

async function createUserWithRole(
  fullname: string,
  email: string,
  password: string,
  role: Role,
  image: string,
) {
  const roles = normalizeRoles(role, [role]);

  return prisma.user.create({
    data: {
      fullname,
      email,
      password,
      role,
      roles,
      permissions: getPermissionsForRoles(roles),
      image,
      localePreference: LocaleCode.TH,
      preferredWorkspace: role,
    },
  });
}

async function main() {
  console.log('🌱 Seeding...');

  validateSeedCatalog();
  await clearSeedData();
  await createCareers();

  const categoryByKey = await createCategories();
  const password = await bcrypt.hash('123456', 10);

  const admin = await createUserWithRole(
    'Admin',
    'admin@test.com',
    password,
    Role.ADMIN,
    buildAvatarUrl('Admin', 0),
  );

  const instructorUsers = await Promise.all(
    instructorSeeds.map((instructor) =>
      createUserWithRole(
        instructor.fullname,
        instructor.email,
        password,
        Role.INSTRUCTOR,
        instructor.image,
      ),
    ),
  );

  const students = await Promise.all(
    studentSeeds.map((student) =>
      createUserWithRole(
        student.fullname,
        student.email,
        password,
        Role.USER,
        student.image,
      ),
    ),
  );

  const userByEmail = new Map(
    [admin, ...instructorUsers, ...students].map((user) => [user.email, user]),
  );

  const instructorProfileByUserId = new Map<string, { id: string }>();

  for (const instructor of instructorSeeds) {
    const user = userByEmail.get(instructor.email);

    if (!user) {
      throw new Error(`Instructor user not found for ${instructor.email}`);
    }

    const profile = await prisma.instructorProfile.create({
      data: {
        userId: user.id,
        displayName: instructor.fullname,
        bio: instructor.bio,
        image: instructor.image,
        headline: instructor.headline,
        visible: true,
        specialties: instructor.specialties,
        expertiseAreas: instructor.expertiseAreas,
        experienceYears: instructor.experienceYears,
        contactEmail: instructor.email,
      },
    });

    instructorProfileByUserId.set(user.id, { id: profile.id });
  }

  const createdCourses: Array<{ id: string; finalPrice: number }> = [];

  for (const [courseIndex, courseSeed] of courseSeeds.entries()) {
    const category = categoryByKey.get(courseSeed.categoryKey);
    const instructor = userByEmail.get(courseSeed.instructorEmail);

    if (!category) {
      throw new Error(`Category not found for ${courseSeed.categoryKey}`);
    }

    if (!instructor) {
      throw new Error(`Instructor not found for ${courseSeed.instructorEmail}`);
    }

    const displayInstructor = instructorProfileByUserId.get(instructor.id);

    if (!displayInstructor) {
      throw new Error(
        `Instructor profile missing for ${courseSeed.instructorEmail}`,
      );
    }

    const modules = buildModulesForCourse(courseSeed, courseIndex);
    const reviews = buildReviewSeeds(
      courseSeed,
      students,
      'pending',
      courseIndex,
    );
    const rating = averageRating(reviews);
    const finalPrice = courseSeed.price - courseSeed.discount;
    const { thumbnail, coverImage, previewThumbnail } = buildCourseImageSet({
      slug: courseSeed.slug,
      title: courseSeed.title,
      courseName: courseSeed.title.en,
      categoryKey: courseSeed.categoryKey,
      category: category.legacyName,
      shortDescription: courseSeed.shortDescription,
      description: courseSeed.localizedDescription,
      tags: courseSeed.tags,
      level: courseSeed.level,
      language: LocaleCode.TH,
    });
    const previewVideoUrl = buildPreviewVideoUrl(courseIndex);
    const publishedAt = new Date(Date.UTC(2026, 0, courseIndex + 1));

    const course = await prisma.course.create({
      data: {
        slug: courseSeed.slug,
        courseName: courseSeed.title.en,
        title: courseSeed.title,
        shortDescription: courseSeed.shortDescription,
        description: courseSeed.description,
        localizedDescription: courseSeed.localizedDescription,
        category: category.legacyName,
        categoryId: category.id,
        coverImage,
        thumbnail,
        videoPreview: previewVideoUrl,
        previewVideoUrl,
        previewThumbnail,
        price: courseSeed.price,
        discount: courseSeed.discount,
        discountPrice: finalPrice,
        level: courseSeed.level,
        badge: courseSeed.badge,
        tags: courseSeed.tags,
        status: Status.ACTIVE,
        workflowStatus: CourseWorkflowStatus.PUBLISHED,
        sourceType: CourseSourceType.MANUAL,
        currentVersion: 1,
        isPopular: courseIndex < 8 || courseIndex % 5 === 0,
        isFeatured: courseIndex < 4,
        isPublished: true,
        publishedAt,
        approvalRequestedAt: publishedAt,
        lastSubmittedAt: publishedAt,
        approvedAt: publishedAt,
        approvedById: admin.id,
        learnerCount: 180 + courseIndex * 37,
        reviewCount: reviews.length,
        averageRating: rating,
        duration: courseSeed.duration,
        language: LocaleCode.TH,
        instructorId: instructor.id,
        displayInstructorId: displayInstructor.id,
        targetAudience: buildTargetAudience(courseSeed),
        seoTitle: `${courseSeed.title.en} | Learney`,
        seoDescription: courseSeed.shortDescription.en,
        willLearnMessages: buildWillLearnMessages(courseSeed),
        requirements: buildRequirements(courseSeed),
      },
    });

    await prisma.coursePreviewVideo.create({
      data: {
        courseId: course.id,
        createdById: instructor.id,
        provider: PreviewVideoProvider.YOUTUBE,
        title: `Preview: ${courseSeed.title.en}`,
        description: `วิดีโอภาพรวมของคอร์ส ${courseSeed.title.th} เพื่อช่วยให้ผู้เรียนเห็นขอบเขตเนื้อหาและผลลัพธ์ที่คาดหวัง`,
        url: previewVideoUrl,
        thumbnailUrl: previewThumbnail,
        durationSeconds: 180,
        isFreePreview: true,
        active: true,
      },
    });

    await prisma.courseDetail.createMany({
      data: buildCourseDetails(
        courseSeed,
        course.id,
        modules.length,
        previewVideoUrl,
      ),
    });

    for (const module of modules) {
      await prisma.courseModuleEntity.create({
        data: {
          courseId: course.id,
          title: module.title,
          summary: module.summary,
          order: module.order,
          lessons: {
            create: module.lessons.map((lesson) => ({
              courseId: course.id,
              title: lesson.title,
              summary: lesson.summary,
              instructorScript: lesson.instructorScript,
              durationMinutes: lesson.durationMinutes,
              order: lesson.order,
              published: true,
              assets: {
                create: lesson.assets.map((asset) => ({
                  kind: asset.kind,
                  title: asset.title,
                  content: asset.content,
                  url: asset.url,
                  order: asset.order,
                })),
              },
            })),
          },
        },
      });
    }

    await prisma.review.createMany({
      data: reviews.map((review) => ({
        ...review,
        courseId: course.id,
      })),
    });

    createdCourses.push({
      id: course.id,
      finalPrice,
    });
  }

  await prisma.enrolledCourse.createMany({
    data: [
      { userId: students[0].id, courseId: createdCourses[0].id },
      { userId: students[0].id, courseId: createdCourses[1].id },
      { userId: students[1].id, courseId: createdCourses[2].id },
      { userId: students[1].id, courseId: createdCourses[3].id },
      { userId: students[2].id, courseId: createdCourses[4].id },
      { userId: students[3].id, courseId: createdCourses[5].id },
      { userId: students[4].id, courseId: createdCourses[6].id },
      { userId: students[2].id, courseId: createdCourses[7].id },
    ],
  });

  const cartCourses = createdCourses.slice(8, 10);
  const cartSubtotal = cartCourses.reduce(
    (sum, course) => sum + course.finalPrice,
    0,
  );

  const cart = await prisma.cart.create({
    data: {
      userId: students[0].id,
      subtotal: cartSubtotal,
      total: cartSubtotal,
      discount: 0,
    },
  });

  await prisma.cartItem.createMany({
    data: cartCourses.map((course) => ({
      cartId: cart.id,
      courseId: course.id,
    })),
  });

  await prisma.payment.create({
    data: {
      cartId: cart.id,
      userId: students[0].id,
      amount: cartSubtotal,
      status: PaymentStatus.SUCCESS,
    },
  });

  console.log('✅ Seed สำเร็จ!');
  console.log('Demo credentials:');
  console.log('  admin@test.com / 123456');
  console.log('  araya@learney.test / 123456');
  console.log('  nicha@learney.test / 123456');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
