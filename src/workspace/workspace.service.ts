import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BcryptService } from '../shared/securities/services/bcrypt.service';
import {
  AiDraftStatus,
  CourseReviewStatus,
  CourseWorkflowStatus,
  DifficultyLevel,
  InstructorApplicationStatus,
  NotificationAudience,
  NotificationLevel,
  PaymentStatus,
  Permission,
  PreviewVideoProvider,
  Prisma,
  PriorityLevel,
  PromotionScopeType,
  PromotionType,
  ReviewQueueContentType,
  ReviewQueueStatus,
  Role,
  SeasonalThemeActivationMode,
  SeasonalThemeKey,
  SkillAttemptStatus,
  SkillExercisePlacement,
  SkillExerciseStatus,
  SkillQuestionType,
  Status,
} from '../database/generated/prisma/client';
import { WorkspaceQueryDto } from './dtos/workspace-query.dto';
import { WorkspaceActionDto } from './dtos/workspace-action.dto';
import { getPermissionsForRoles, normalizeRoles } from '../auth/permissions';

type LocalizedRecord = {
  th?: string;
  en?: string;
};

type ChartPoint = Record<string, string | number>;

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bcryptService: BcryptService,
  ) {}

  private parseLocalized(
    value: unknown,
    fallback = '',
  ): Required<LocalizedRecord> {
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return {
        th:
          typeof record.th === 'string'
            ? record.th
            : typeof record.en === 'string'
              ? record.en
              : fallback,
        en:
          typeof record.en === 'string'
            ? record.en
            : typeof record.th === 'string'
              ? record.th
              : fallback,
      };
    }

    if (typeof value === 'string') {
      return { th: value, en: value };
    }

    return { th: fallback, en: fallback };
  }

  private localizedInput(thai: string, english?: string) {
    return {
      th: thai,
      en: english ?? thai,
    };
  }

  private toNumber(value: unknown) {
    const parsed = typeof value === 'number' ? value : Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  private paginate<T>(items: T[], query: WorkspaceQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.max(1, query.pageSize ?? 10);
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;

    return {
      items: items.slice(start, start + pageSize),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  private applySearch<T extends Record<string, unknown>>(
    items: T[],
    search: string | undefined,
    keys: Array<keyof T>,
  ) {
    if (!search?.trim()) {
      return items;
    }

    const keyword = search.trim().toLowerCase();

    return items.filter((item) =>
      keys.some((key) =>
        String(item[key] ?? '')
          .toLowerCase()
          .includes(keyword),
      ),
    );
  }

  private normalizeCourseStatus(course: {
    workflowStatus: CourseWorkflowStatus;
    isPublished: boolean;
    hiddenFromCatalog: boolean;
    closedEnrollment: boolean;
  }) {
    if (course.hiddenFromCatalog) {
      return 'ซ่อนอยู่';
    }

    if (course.closedEnrollment) {
      return 'ปิดรับสมัคร';
    }

    if (course.isPublished) {
      return 'เผยแพร่แล้ว';
    }

    switch (course.workflowStatus) {
      case CourseWorkflowStatus.DRAFT:
        return 'แบบร่าง';
      case CourseWorkflowStatus.EDITING:
        return 'กำลังแก้ไข';
      case CourseWorkflowStatus.SUBMITTED:
      case CourseWorkflowStatus.PENDING_APPROVAL:
      case CourseWorkflowStatus.ADMIN_REVIEW:
        return 'รออนุมัติ';
      case CourseWorkflowStatus.NEEDS_REVISION:
        return 'ต้องแก้ไข';
      case CourseWorkflowStatus.APPROVED:
        return 'อนุมัติแล้ว';
      case CourseWorkflowStatus.REJECTED:
        return 'ไม่อนุมัติ';
      case CourseWorkflowStatus.SUSPENDED:
        return 'ระงับชั่วคราว';
      default:
        return 'แบบร่าง';
    }
  }

  private buildDateBuckets(
    dates: Date[],
    days = 14,
    labelFormatter?: (date: Date) => string,
  ): ChartPoint[] {
    const formatter =
      labelFormatter ??
      ((date: Date) =>
        `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
          .toString()
          .padStart(2, '0')}`);

    const bucketMap = new Map<string, number>();
    const buckets: ChartPoint[] = [];

    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      const key = date.toISOString().slice(0, 10);
      bucketMap.set(key, 0);
      buckets.push({
        label: formatter(date),
        key,
        value: 0,
      });
    }

    dates.forEach((date) => {
      const key = new Date(date).toISOString().slice(0, 10);
      if (bucketMap.has(key)) {
        bucketMap.set(key, (bucketMap.get(key) ?? 0) + 1);
      }
    });

    return buckets.map((bucket) => ({
      label: bucket.label,
      value: bucketMap.get(String(bucket.key)) ?? 0,
    }));
  }

  private async createAuditLog(input: {
    actorId?: string | null;
    module: string;
    action: string;
    targetType: string;
    targetId?: string | null;
    message?: string;
    previousData?: Prisma.InputJsonValue | null;
    nextData?: Prisma.InputJsonValue | null;
  }) {
    await this.prisma.adminAuditLog.create({
      data: {
        actorId: input.actorId ?? null,
        module: input.module,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        message: input.message,
        previousData: input.previousData ?? undefined,
        nextData: input.nextData ?? undefined,
      },
    });
  }

  private async notify(input: {
    recipientId?: string | null;
    actorId?: string | null;
    audience: NotificationAudience;
    level?: NotificationLevel;
    title: string;
    body: string;
    link?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    await this.prisma.notificationLog.create({
      data: {
        recipientId: input.recipientId ?? null,
        actorId: input.actorId ?? null,
        audience: input.audience,
        level: input.level ?? NotificationLevel.INFO,
        title: input.title,
        body: input.body,
        link: input.link,
        metadata: input.metadata,
      },
    });
  }

  private ensureString(value: unknown, label: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${label} is required`);
    }

    return value.trim();
  }

  private ensureArray(value: unknown) {
    return Array.isArray(value) ? value.map((item) => String(item).trim()) : [];
  }

  private toDecimal(value: unknown) {
    return new Prisma.Decimal(this.toNumber(value));
  }

  private getPreviewProvider(url: string, provider?: string) {
    if (
      provider &&
      Object.values(PreviewVideoProvider).includes(
        provider as PreviewVideoProvider,
      )
    ) {
      return provider as PreviewVideoProvider;
    }

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return PreviewVideoProvider.YOUTUBE;
    }

    if (url.includes('vimeo.com')) {
      return PreviewVideoProvider.VIMEO;
    }

    return PreviewVideoProvider.FILE_URL;
  }

  private getWorkspaceLabel(role: Role) {
    if (role === Role.ADMIN) {
      return 'ผู้ดูแลระบบ';
    }

    if (role === Role.INSTRUCTOR) {
      return 'ผู้สอน';
    }

    return 'ผู้เรียน';
  }

  private async ensureDefaultSettings(adminId?: string) {
    const defaults = [
      {
        section: 'GENERAL',
        key: 'site.general',
        label: 'ตั้งค่าทั่วไป',
        description: 'ชื่อเว็บไซต์ ข้อมูลติดต่อ และข้อความส่วนท้าย',
        value: {
          siteName: 'Learney',
          description: 'แพลตฟอร์มคอร์สเรียนออนไลน์ภาษาไทย',
          contactEmail: 'support@learney.local',
          phone: '02-000-0000',
          footer: 'สร้างโอกาสใหม่ให้การเรียนรู้ทุกวัน',
        },
      },
      {
        section: 'LOCALIZATION',
        key: 'site.localization',
        label: 'ภาษาและเวลา',
        description: 'ภาษาเริ่มต้น เขตเวลา และรูปแบบวันที่',
        value: {
          defaultLanguage: 'th',
          timezone: 'Asia/Bangkok',
          dateFormat: 'dd/MM/yyyy',
          currency: 'THB',
        },
      },
      {
        section: 'PAYMENT',
        key: 'site.payment',
        label: 'การชำระเงิน',
        description: 'ภาษี ค่าธรรมเนียม และการคิดค่าบริการ',
        value: {
          vatPercent: 7,
          platformFeePercent: 15,
          allowCoupons: true,
          allowPromotionsStacking: false,
        },
      },
      {
        section: 'COURSE',
        key: 'site.course',
        label: 'ตั้งค่าคอร์ส',
        description: 'ตั้งค่าคอร์สและการอนุมัติ',
        value: {
          autoPublishAfterApproval: false,
          allowCoursePreview: true,
          requirePreviewBeforeApproval: true,
          requireSeoFields: true,
        },
      },
      {
        section: 'AI',
        key: 'site.ai',
        label: 'ตั้งค่า AI',
        description: 'การร่างเนื้อหาอัตโนมัติและการอนุมัติ',
        value: {
          aiDraftAutoQueue: true,
          aiDraftNeedsAdminApproval: true,
          aiQuizEnabled: true,
        },
      },
      {
        section: 'LEGAL',
        key: 'site.legal',
        label: 'ข้อกฎหมาย',
        description: 'นโยบายความเป็นส่วนตัวและเงื่อนไขการใช้งาน',
        value: {
          privacyTitle: 'นโยบายความเป็นส่วนตัว',
          termsTitle: 'ข้อกำหนดการใช้งาน',
        },
      },
    ] as const;

    await Promise.all(
      defaults.map((item) =>
        this.prisma.platformSetting.upsert({
          where: { key: item.key },
          update: {},
          create: {
            section: item.section as never,
            key: item.key,
            label: item.label,
            description: item.description,
            value: item.value as Prisma.InputJsonValue,
            defaultValue: item.value as Prisma.InputJsonValue,
            updatedById: adminId ?? null,
          },
        }),
      ),
    );
  }

  async getSession(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        instructorProfile: {
          select: {
            id: true,
            displayName: true,
          },
        },
        instructorApplications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            displayName: true,
            createdAt: true,
          },
        },
        notifications: {
          where: { isRead: false },
          select: {
            audience: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roles = normalizeRoles(user.role, user.roles);
    const permissions = getPermissionsForRoles(roles, user.permissions);
    const unreadCounts = user.notifications.reduce<Record<string, number>>(
      (accumulator, notification) => {
        const key =
          notification.audience === NotificationAudience.STUDENT
            ? 'student'
            : notification.audience === NotificationAudience.INSTRUCTOR
              ? 'instructor'
              : 'admin';
        accumulator[key] = (accumulator[key] ?? 0) + 1;
        return accumulator;
      },
      { admin: 0, instructor: 0, student: 0 },
    );

    return {
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        image: user.image,
        role: user.role,
        roles,
        permissions,
        preferredWorkspace: user.preferredWorkspace ?? user.role,
        workspaceLabel: this.getWorkspaceLabel(
          user.preferredWorkspace ?? user.role,
        ),
        instructorProfile: user.instructorProfile,
        latestInstructorApplication: user.instructorApplications[0] ?? null,
      },
      workspaces: roles.map((role) => ({
        key: role,
        label: this.getWorkspaceLabel(role),
        path:
          role === Role.ADMIN
            ? '/admin'
            : role === Role.INSTRUCTOR
              ? '/instructor'
              : '/student',
      })),
      unreadCounts,
    };
  }

  private async getAdminRevenueTrend() {
    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.SUCCESS,
      },
      select: {
        amount: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'asc' },
    });

    const buckets = this.buildDateBuckets(
      payments.map((item) => item.updatedAt),
    );
    const revenueMap = new Map<string, number>();

    buckets.forEach((bucket) => revenueMap.set(String(bucket.label), 0));

    payments.forEach((payment) => {
      const label = `${payment.updatedAt
        .getDate()
        .toString()
        .padStart(2, '0')}/${(payment.updatedAt.getMonth() + 1)
        .toString()
        .padStart(2, '0')}`;
      revenueMap.set(
        label,
        (revenueMap.get(label) ?? 0) + this.toNumber(payment.amount),
      );
    });

    return buckets.map((bucket) => ({
      label: bucket.label,
      value: revenueMap.get(String(bucket.label)) ?? 0,
    }));
  }

  async getAdminOverview() {
    const [
      totalUsers,
      totalStudents,
      totalInstructors,
      totalCourses,
      publishedCourses,
      pendingReviews,
      totalRevenue,
      currentMonthRevenue,
      ordersCount,
      activePromotions,
      totalReviews,
      pendingContent,
      pendingAiDrafts,
      recentTransactions,
      latestAuditLogs,
      topCourses,
      topCategories,
      courseWorkflowBreakdown,
      userGrowth,
      revenueTrend,
      contentWarnings,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: Role.USER } }),
      this.prisma.instructorProfile.count(),
      this.prisma.course.count(),
      this.prisma.course.count({ where: { isPublished: true } }),
      this.prisma.pendingCourseReview.count({
        where: {
          status: {
            in: [
              CourseReviewStatus.PENDING_APPROVAL,
              CourseReviewStatus.SUBMITTED,
            ],
          },
        },
      }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.SUCCESS },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.SUCCESS,
          updatedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({
        where: { status: PaymentStatus.SUCCESS },
      }),
      this.prisma.promotion.count({
        where: { active: true },
      }),
      this.prisma.review.count(),
      this.prisma.contentReviewQueue.count({
        where: { status: ReviewQueueStatus.PENDING },
      }),
      this.prisma.aiDraft.count({
        where: {
          status: {
            in: [
              AiDraftStatus.AI_GENERATED,
              AiDraftStatus.ADMIN_REVIEW,
              AiDraftStatus.EDITED,
            ],
          },
        },
      }),
      this.prisma.payment.findMany({
        where: { status: PaymentStatus.SUCCESS },
        orderBy: { updatedAt: 'desc' },
        take: 6,
        include: {
          user: {
            select: {
              fullname: true,
            },
          },
        },
      }),
      this.prisma.adminAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          actor: {
            select: {
              fullname: true,
            },
          },
        },
      }),
      this.prisma.course.findMany({
        orderBy: [{ learnerCount: 'desc' }, { averageRating: 'desc' }],
        take: 5,
        include: {
          instructor: {
            select: {
              fullname: true,
            },
          },
        },
      }),
      this.prisma.category.findMany({
        include: {
          courses: true,
        },
        orderBy: {
          courses: {
            _count: 'desc',
          },
        },
        take: 5,
      }),
      this.prisma.course.findMany({
        select: {
          workflowStatus: true,
        },
      }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      this.getAdminRevenueTrend(),
      this.prisma.contentReviewQueue.findMany({
        where: {
          priority: {
            in: [PriorityLevel.HIGH, PriorityLevel.URGENT],
          },
          status: ReviewQueueStatus.PENDING,
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),
    ]);

    const workflowSummary = courseWorkflowBreakdown.reduce<
      Record<string, number>
    >((accumulator, course) => {
      const label =
        course.workflowStatus === CourseWorkflowStatus.APPROVED
          ? 'อนุมัติแล้ว'
          : course.workflowStatus === CourseWorkflowStatus.REJECTED
            ? 'ไม่อนุมัติ'
            : course.workflowStatus === CourseWorkflowStatus.NEEDS_REVISION
              ? 'ต้องแก้ไข'
              : course.workflowStatus === CourseWorkflowStatus.PUBLISHED
                ? 'เผยแพร่แล้ว'
                : course.workflowStatus ===
                      CourseWorkflowStatus.PENDING_APPROVAL ||
                    course.workflowStatus ===
                      CourseWorkflowStatus.ADMIN_REVIEW ||
                    course.workflowStatus === CourseWorkflowStatus.SUBMITTED
                  ? 'รออนุมัติ'
                  : 'แบบร่าง';

      accumulator[label] = (accumulator[label] ?? 0) + 1;
      return accumulator;
    }, {});

    return {
      title: 'แดชบอร์ดผู้ดูแลระบบ',
      description:
        'ภาพรวมการใช้งาน รายได้ งานที่ต้องอนุมัติ และกิจกรรมล่าสุดของทั้งระบบ',
      cards: [
        { key: 'totalUsers', label: 'ผู้ใช้งานทั้งหมด', value: totalUsers },
        { key: 'totalStudents', label: 'ผู้เรียน', value: totalStudents },
        { key: 'totalInstructors', label: 'ผู้สอน', value: totalInstructors },
        { key: 'totalCourses', label: 'คอร์สทั้งหมด', value: totalCourses },
        {
          key: 'publishedCourses',
          label: 'คอร์สที่เผยแพร่แล้ว',
          value: publishedCourses,
        },
        {
          key: 'pendingReviews',
          label: 'คอร์สที่รออนุมัติ',
          value: pendingReviews,
        },
        {
          key: 'totalRevenue',
          label: 'รายได้รวม',
          value: this.toNumber(totalRevenue._sum.amount),
        },
        {
          key: 'currentMonthRevenue',
          label: 'รายได้เดือนนี้',
          value: this.toNumber(currentMonthRevenue._sum.amount),
        },
        { key: 'ordersCount', label: 'จำนวนออเดอร์', value: ordersCount },
        {
          key: 'activePromotions',
          label: 'โปรโมชันที่ใช้งานอยู่',
          value: activePromotions,
        },
        { key: 'totalReviews', label: 'จำนวนรีวิว', value: totalReviews },
        {
          key: 'pendingContent',
          label: 'คอนเทนต์ที่รอตรวจ',
          value: pendingContent,
        },
        {
          key: 'pendingAiDrafts',
          label: 'AI Draft ที่รออนุมัติ',
          value: pendingAiDrafts,
        },
      ],
      charts: [
        {
          key: 'revenueTrend',
          title: 'แนวโน้มรายได้ 14 วันล่าสุด',
          type: 'line',
          data: revenueTrend,
        },
        {
          key: 'userGrowth',
          title: 'ผู้สมัครใหม่ 14 วันล่าสุด',
          type: 'bar',
          data: this.buildDateBuckets(userGrowth.map((item) => item.createdAt)),
        },
        {
          key: 'workflowSummary',
          title: 'สถานะคอร์สในระบบ',
          type: 'pie',
          data: Object.entries(workflowSummary).map(([label, value]) => ({
            label,
            value,
          })),
        },
      ],
      reports: {
        topCourses: topCourses.map((course) => ({
          id: course.id,
          title: course.courseName,
          instructor: course.instructor.fullname,
          learners: course.learnerCount,
          rating: this.toNumber(course.averageRating),
          status: this.normalizeCourseStatus({
            workflowStatus: course.workflowStatus,
            isPublished: course.isPublished,
            hiddenFromCatalog: course.hiddenFromCatalog,
            closedEnrollment: course.closedEnrollment,
          }),
        })),
        topCategories: topCategories.map((category) => ({
          id: category.id,
          name: this.parseLocalized(category.name, category.key).th,
          totalCourses: category.courses.length,
        })),
      },
      recentActivity: latestAuditLogs.map((item) => ({
        id: item.id,
        title: item.message ?? `${item.action} ${item.targetType}`,
        actor: item.actor?.fullname ?? 'ระบบ',
        createdAt: item.createdAt.toISOString(),
      })),
      recentTransactions: recentTransactions.map((item) => ({
        id: item.id,
        buyer: item.user.fullname,
        amount: this.toNumber(item.amount),
        createdAt: item.updatedAt.toISOString(),
      })),
      alerts: contentWarnings.map((item) => ({
        id: item.id,
        title: item.previewText ?? 'รายการที่ต้องตรวจสอบ',
        priority: item.priority,
        contentType: item.contentType,
      })),
    };
  }

  private buildCourseForm() {
    return {
      action: 'save_course',
      submitLabel: 'บันทึกคอร์ส',
      fields: [
        { key: 'id', label: 'รหัสคอร์ส', type: 'hidden' },
        { key: 'courseName', label: 'ชื่อคอร์ส', type: 'text', required: true },
        { key: 'slug', label: 'Slug', type: 'text', required: true },
        {
          key: 'shortDescription',
          label: 'คำอธิบายสั้น',
          type: 'textarea',
          required: true,
        },
        {
          key: 'description',
          label: 'คำอธิบายเต็ม',
          type: 'textarea',
          required: true,
        },
        { key: 'category', label: 'หมวดหมู่', type: 'text', required: true },
        {
          key: 'level',
          label: 'ระดับ',
          type: 'select',
          options: ['Beginner', 'Intermediate', 'Advanced'].map((value) => ({
            label:
              value === 'Beginner'
                ? 'เริ่มต้น'
                : value === 'Intermediate'
                  ? 'กลาง'
                  : 'สูง',
            value,
          })),
        },
        {
          key: 'language',
          label: 'ภาษา',
          type: 'select',
          options: [
            { label: 'ภาษาไทย', value: 'TH' },
            { label: 'ภาษาอังกฤษ', value: 'EN' },
          ],
        },
        { key: 'price', label: 'ราคา', type: 'number', required: true, min: 0 },
        { key: 'discountPrice', label: 'ราคาลด', type: 'number', min: 0 },
        { key: 'thumbnail', label: 'ภาพปก', type: 'url', required: true },
        { key: 'seoTitle', label: 'SEO Title', type: 'text' },
        { key: 'seoDescription', label: 'SEO Description', type: 'textarea' },
        { key: 'duration', label: 'ระยะเวลาเรียน', type: 'text' },
        {
          key: 'certificateEnabled',
          label: 'ออกใบรับรอง',
          type: 'checkbox',
        },
      ],
    };
  }

  private buildCourseRow(course: {
    id: string;
    slug: string | null;
    courseName: string;
    category: string;
    level: string | null;
    price: unknown;
    discountPrice: unknown;
    thumbnail: string;
    isPublished: boolean;
    hiddenFromCatalog: boolean;
    closedEnrollment: boolean;
    workflowStatus: CourseWorkflowStatus;
    createdAt: Date;
    updatedAt: Date;
    instructor: {
      fullname: string;
    };
    previewVideos?: Array<{ id: string }>;
  }) {
    return {
      id: course.id,
      courseName: course.courseName,
      slug: course.slug ?? '',
      category: course.category,
      level: course.level ?? 'ไม่ระบุ',
      instructorName: course.instructor.fullname,
      price: this.toNumber(course.discountPrice ?? course.price),
      originalPrice: this.toNumber(course.price),
      status: this.normalizeCourseStatus(course),
      previewVideoCount: course.previewVideos?.length ?? 0,
      thumbnail: course.thumbnail,
      updatedAt: course.updatedAt.toISOString(),
    };
  }

  private sortRows<T extends Record<string, unknown>>(
    items: T[],
    sort?: string,
  ) {
    if (!sort) {
      return items;
    }

    const next = [...items];

    switch (sort) {
      case 'ชื่อ-ก':
        next.sort((left, right) =>
          String(
            left.courseName ?? left.title ?? left.fullname ?? '',
          ).localeCompare(
            String(right.courseName ?? right.title ?? right.fullname ?? ''),
            'th',
          ),
        );
        break;
      case 'อัปเดตล่าสุด':
        next.sort((left, right) =>
          String(right.updatedAt ?? right.createdAt ?? '').localeCompare(
            String(left.updatedAt ?? left.createdAt ?? ''),
          ),
        );
        break;
      case 'ยอดมากไปน้อย':
        next.sort(
          (left, right) =>
            this.toNumber(right.value ?? right.price ?? right.learners) -
            this.toNumber(left.value ?? left.price ?? left.learners),
        );
        break;
      default:
        break;
    }

    return next;
  }

  async getAdminSection(section: string, query: WorkspaceQueryDto) {
    await this.ensureDefaultSettings();

    switch (section) {
      case 'courses': {
        const courses = await this.prisma.course.findMany({
          include: {
            instructor: {
              select: {
                fullname: true,
              },
            },
            previewVideos: {
              select: {
                id: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        });

        const rows = this.sortRows(
          this.applySearch(
            courses
              .filter((course) =>
                query.status
                  ? this.normalizeCourseStatus(course) === query.status
                  : true,
              )
              .filter((course) =>
                query.category ? course.category === query.category : true,
              )
              .map((course) => this.buildCourseRow(course)),
            query.search,
            ['courseName', 'slug', 'category', 'instructorName'],
          ),
          query.sort,
        );
        const paged = this.paginate(rows, query);

        return {
          title: 'จัดการคอร์ส',
          description: 'สร้าง แก้ไข ลบ คัดลอก และเปลี่ยนสถานะคอร์สของทั้งระบบ',
          cards: [
            {
              label: 'แบบร่าง',
              value: courses.filter(
                (course) => this.normalizeCourseStatus(course) === 'แบบร่าง',
              ).length,
            },
            {
              label: 'เผยแพร่แล้ว',
              value: courses.filter((course) => course.isPublished).length,
            },
            {
              label: 'รออนุมัติ',
              value: courses.filter(
                (course) => this.normalizeCourseStatus(course) === 'รออนุมัติ',
              ).length,
            },
            {
              label: 'ไม่อนุมัติ',
              value: courses.filter(
                (course) => this.normalizeCourseStatus(course) === 'ไม่อนุมัติ',
              ).length,
            },
          ],
          columns: [
            { key: 'courseName', label: 'ชื่อคอร์ส' },
            { key: 'slug', label: 'Slug' },
            { key: 'category', label: 'หมวดหมู่' },
            { key: 'level', label: 'ระดับ' },
            { key: 'instructorName', label: 'ผู้สอน' },
            { key: 'price', label: 'ราคา', type: 'currency' },
            { key: 'previewVideoCount', label: 'วิดีโอพรีวิว' },
            { key: 'status', label: 'สถานะ', type: 'badge' },
            { key: 'updatedAt', label: 'อัปเดตล่าสุด', type: 'date' },
          ],
          items: paged.items,
          pagination: paged.pagination,
          filters: {
            statusOptions: [
              'แบบร่าง',
              'เผยแพร่แล้ว',
              'รออนุมัติ',
              'ต้องแก้ไข',
              'ไม่อนุมัติ',
              'ปิดรับสมัคร',
              'ซ่อนอยู่',
            ],
            categoryOptions: Array.from(
              new Set(courses.map((course) => course.category)),
            ).sort(),
            sortOptions: ['อัปเดตล่าสุด', 'ชื่อ-ก', 'ยอดมากไปน้อย'],
          },
          rowActions: [
            { key: 'edit', label: 'แก้ไขข้อมูล' },
            { key: 'duplicate_course', label: 'ทำสำเนา' },
            { key: 'update_course_status', label: 'เปลี่ยนสถานะ' },
            {
              key: 'delete_course',
              label: 'ลบข้อมูล',
              confirm: true,
              variant: 'destructive',
            },
          ],
          bulkActions: [
            { key: 'bulk_publish', label: 'เผยแพร่ที่เลือก' },
            { key: 'bulk_archive', label: 'ปิดการใช้งานที่เลือก' },
          ],
          form: this.buildCourseForm(),
          emptyState: {
            title: 'ยังไม่มีคอร์สในระบบ',
            description: 'เพิ่มคอร์สแรกเพื่อเริ่มจัดการข้อมูล',
          },
          exportable: ['csv', 'excel'],
        };
      }

      case 'video-previews': {
        const videos = await this.prisma.coursePreviewVideo.findMany({
          include: {
            course: {
              select: {
                courseName: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        });
        const rows = this.applySearch(
          videos.map((video) => ({
            id: video.id,
            courseId: video.courseId,
            courseName: video.course.courseName,
            title: video.title,
            provider: video.provider,
            durationSeconds: video.durationSeconds ?? 0,
            isFreePreview: video.isFreePreview ? 'ฟรี' : 'เฉพาะผู้เรียน',
            active: video.active ? 'ใช้งาน' : 'ปิดใช้งาน',
            url: video.url,
            thumbnailUrl: video.thumbnailUrl ?? '',
            updatedAt: video.updatedAt.toISOString(),
            description: video.description ?? '',
          })),
          query.search,
          ['courseName', 'title', 'provider'],
        );
        const paged = this.paginate(rows, query);

        return {
          title: 'วิดีโอพรีวิว',
          description:
            'จัดการวิดีโอพรีวิวแบบเพิ่ม แก้ไข ลบ และเปิดปิดการใช้งาน',
          columns: [
            { key: 'courseName', label: 'คอร์ส' },
            { key: 'title', label: 'ชื่อวิดีโอ' },
            { key: 'provider', label: 'ประเภท' },
            { key: 'durationSeconds', label: 'ความยาว (วินาที)' },
            { key: 'isFreePreview', label: 'สิทธิ์เข้าดู' },
            { key: 'active', label: 'สถานะ', type: 'badge' },
            { key: 'updatedAt', label: 'อัปเดตล่าสุด', type: 'date' },
          ],
          items: paged.items,
          pagination: paged.pagination,
          rowActions: [
            { key: 'edit', label: 'แก้ไขข้อมูล' },
            { key: 'toggle_preview_video', label: 'เปิด/ปิดการใช้งาน' },
            {
              key: 'delete_preview_video',
              label: 'ลบข้อมูล',
              confirm: true,
              variant: 'destructive',
            },
          ],
          form: {
            action: 'save_preview_video',
            submitLabel: 'บันทึกวิดีโอพรีวิว',
            fields: [
              { key: 'id', label: 'รหัส', type: 'hidden' },
              {
                key: 'courseId',
                label: 'รหัสคอร์ส',
                type: 'text',
                required: true,
              },
              {
                key: 'title',
                label: 'ชื่อวิดีโอ',
                type: 'text',
                required: true,
              },
              {
                key: 'provider',
                label: 'ผู้ให้บริการ',
                type: 'select',
                required: true,
                options: Object.values(PreviewVideoProvider).map((value) => ({
                  label:
                    value === PreviewVideoProvider.YOUTUBE
                      ? 'YouTube'
                      : value === PreviewVideoProvider.VIMEO
                        ? 'Vimeo'
                        : value === PreviewVideoProvider.FILE_URL
                          ? 'ลิงก์ไฟล์'
                          : 'อัปโหลดไฟล์',
                  value,
                })),
              },
              { key: 'url', label: 'ลิงก์วิดีโอ', type: 'url', required: true },
              { key: 'thumbnailUrl', label: 'ภาพปกวิดีโอ', type: 'url' },
              { key: 'description', label: 'คำอธิบาย', type: 'textarea' },
              {
                key: 'durationSeconds',
                label: 'ความยาว (วินาที)',
                type: 'number',
                min: 0,
              },
              { key: 'isFreePreview', label: 'ให้ดูฟรี', type: 'checkbox' },
              { key: 'active', label: 'เปิดใช้งาน', type: 'checkbox' },
            ],
          },
          filters: {
            sortOptions: ['อัปเดตล่าสุด', 'ชื่อ-ก'],
          },
          emptyState: {
            title: 'ยังไม่มีวิดีโอพรีวิว',
            description: 'เพิ่มวิดีโอพรีวิวเพื่อให้ผู้เรียนดูตัวอย่างก่อนซื้อ',
          },
        };
      }

      case 'course-approvals': {
        const reviews = await this.prisma.pendingCourseReview.findMany({
          include: {
            course: {
              include: {
                instructor: {
                  select: {
                    fullname: true,
                    email: true,
                  },
                },
                previewVideos: true,
              },
            },
            instructor: {
              select: {
                fullname: true,
                email: true,
              },
            },
          },
          orderBy: [{ updatedAt: 'desc' }],
        });

        const rows = this.applySearch(
          reviews
            .filter((review) =>
              query.status ? review.status === query.status : true,
            )
            .map((review) => ({
              id: review.id,
              courseId: review.courseId,
              courseName: review.course.courseName,
              instructorName: review.instructor.fullname,
              instructorEmail: review.instructor.email,
              status:
                review.status === CourseReviewStatus.NEEDS_REVISION
                  ? 'ต้องแก้ไข'
                  : review.status === CourseReviewStatus.APPROVED
                    ? 'อนุมัติแล้ว'
                    : review.status === CourseReviewStatus.REJECTED
                      ? 'ไม่อนุมัติ'
                      : 'รออนุมัติ',
              version: review.version,
              submissionReason: review.submissionReason ?? '',
              adminNotes: review.adminNotes ?? '',
              previewVideoCount: review.course.previewVideos.length,
              lastSubmittedAt:
                review.lastSubmittedAt?.toISOString() ??
                review.updatedAt.toISOString(),
            })),
          query.search,
          ['courseName', 'instructorName', 'status'],
        );
        const paged = this.paginate(rows, query);

        return {
          title: 'คอร์สรออนุมัติ',
          description:
            'ตรวจสอบคอร์สจากผู้สอน อนุมัติ ขอแก้ไข หรือปฏิเสธได้จากจุดเดียว',
          columns: [
            { key: 'courseName', label: 'คอร์ส' },
            { key: 'instructorName', label: 'ผู้สอน' },
            { key: 'status', label: 'สถานะ', type: 'badge' },
            { key: 'version', label: 'เวอร์ชัน' },
            { key: 'previewVideoCount', label: 'วิดีโอพรีวิว' },
            { key: 'lastSubmittedAt', label: 'ส่งล่าสุด', type: 'date' },
          ],
          items: paged.items,
          pagination: paged.pagination,
          rowActions: [
            { key: 'approve_course_review', label: 'อนุมัติ' },
            { key: 'request_course_changes', label: 'ขอแก้ไขเพิ่มเติม' },
            {
              key: 'reject_course_review',
              label: 'ปฏิเสธ',
              confirm: true,
              variant: 'destructive',
            },
          ],
          form: {
            action: 'update_course_review',
            submitLabel: 'บันทึกหมายเหตุ',
            fields: [
              { key: 'id', label: 'รหัสรายการ', type: 'hidden' },
              {
                key: 'adminNotes',
                label: 'หมายเหตุถึงผู้สอน',
                type: 'textarea',
                required: true,
              },
              {
                key: 'rejectionTemplate',
                label: 'เหตุผลสำเร็จรูป',
                type: 'select',
                options: [
                  'รายละเอียดคอร์สยังไม่ครบ',
                  'วิดีโอพรีวิวยังไม่พร้อม',
                  'ต้องปรับราคาและข้อมูลโปรโมชัน',
                  'โครงสร้างบทเรียนยังไม่สมบูรณ์',
                ].map((value) => ({ label: value, value })),
              },
            ],
          },
          filters: {
            statusOptions: [
              'รออนุมัติ',
              'ต้องแก้ไข',
              'อนุมัติแล้ว',
              'ไม่อนุมัติ',
            ],
          },
          emptyState: {
            title: 'ไม่มีคอร์สรออนุมัติ',
            description: 'เมื่อผู้สอนส่งคอร์สเข้าตรวจ รายการจะปรากฏที่นี่',
          },
        };
      }

      case 'promotions': {
        const promotions = await this.prisma.promotion.findMany({
          include: {
            courses: {
              include: {
                course: {
                  select: {
                    courseName: true,
                  },
                },
              },
            },
            usages: true,
          },
          orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        });
        const rows = this.applySearch(
          promotions.map((promotion) => ({
            id: promotion.id,
            title: this.parseLocalized(promotion.title, 'โปรโมชัน').th,
            code: promotion.code ?? promotion.promoCode ?? '',
            type: promotion.type,
            discount: promotion.discountAmount
              ? this.toNumber(promotion.discountAmount)
              : this.toNumber(promotion.discount),
            usageCount: promotion.usages.length,
            active: promotion.active ? 'ใช้งาน' : 'ปิดใช้งาน',
            priority: promotion.priority,
            stackable: promotion.stackable ? 'ซ้อนได้' : 'ซ้อนไม่ได้',
            startDate: promotion.startDate.toISOString(),
            endDate: promotion.endDate.toISOString(),
            linkedCourses: promotion.courses
              .map((item) => item.course.courseName)
              .join(', '),
          })),
          query.search,
          ['title', 'code', 'type'],
        );
        const paged = this.paginate(rows, query);

        return {
          title: 'โปรโมชัน',
          description:
            'สร้างและจัดการโปรโมชันให้มีผลจริงในระบบชำระเงินและหน้าคอร์ส',
          cards: [
            {
              label: 'โปรโมชันที่ใช้งานอยู่',
              value: promotions.filter((item) => item.active).length,
            },
            {
              label: 'โปรโมชันใกล้หมดอายุ',
              value: promotions.filter(
                (item) =>
                  item.endDate < new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
              ).length,
            },
            {
              label: 'การใช้งานรวม',
              value: promotions.reduce(
                (sum, item) => sum + item.usages.length,
                0,
              ),
            },
          ],
          columns: [
            { key: 'title', label: 'ชื่อโปรโมชัน' },
            { key: 'code', label: 'โค้ด' },
            { key: 'type', label: 'ประเภท' },
            { key: 'discount', label: 'ส่วนลด', type: 'currency' },
            { key: 'usageCount', label: 'ใช้งานแล้ว' },
            { key: 'priority', label: 'Priority' },
            { key: 'stackable', label: 'ซ้อนโปรโมชัน' },
            { key: 'active', label: 'สถานะ', type: 'badge' },
            { key: 'endDate', label: 'สิ้นสุด', type: 'date' },
          ],
          items: paged.items,
          pagination: paged.pagination,
          rowActions: [
            { key: 'edit', label: 'แก้ไขข้อมูล' },
            { key: 'toggle_promotion_active', label: 'เปิด/ปิดการใช้งาน' },
            {
              key: 'delete_promotion',
              label: 'ลบข้อมูล',
              confirm: true,
              variant: 'destructive',
            },
          ],
          form: {
            action: 'save_promotion',
            submitLabel: 'บันทึกโปรโมชัน',
            fields: [
              { key: 'id', label: 'รหัส', type: 'hidden' },
              {
                key: 'title',
                label: 'ชื่อโปรโมชัน',
                type: 'text',
                required: true,
              },
              { key: 'slug', label: 'Slug', type: 'text', required: true },
              { key: 'code', label: 'โค้ดส่วนลด', type: 'text' },
              {
                key: 'type',
                label: 'ประเภท',
                type: 'select',
                required: true,
                options: Object.values(PromotionType).map((value) => ({
                  label: value,
                  value,
                })),
              },
              {
                key: 'discountAmount',
                label: 'มูลค่าส่วนลด',
                type: 'number',
                min: 0,
              },
              {
                key: 'minimumSpend',
                label: 'ยอดขั้นต่ำ',
                type: 'number',
                min: 0,
              },
              {
                key: 'usageLimit',
                label: 'จำกัดการใช้งาน',
                type: 'number',
                min: 0,
              },
              {
                key: 'perUserLimit',
                label: 'จำกัดต่อคน',
                type: 'number',
                min: 0,
              },
              { key: 'priority', label: 'Priority', type: 'number', min: 0 },
              {
                key: 'startDate',
                label: 'วันที่เริ่ม',
                type: 'date',
                required: true,
              },
              {
                key: 'endDate',
                label: 'วันที่สิ้นสุด',
                type: 'date',
                required: true,
              },
              { key: 'stackable', label: 'ซ้อนโปรโมชันได้', type: 'checkbox' },
              { key: 'active', label: 'เปิดใช้งาน', type: 'checkbox' },
            ],
          },
          emptyState: {
            title: 'ยังไม่มีโปรโมชัน',
            description: 'เพิ่มโปรโมชันแรกเพื่อใช้กับหน้าคอร์สและหน้าชำระเงิน',
          },
        };
      }

      case 'themes': {
        const themes = await this.prisma.seasonalTheme.findMany({
          orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }],
        });
        const rows = this.applySearch(
          themes.map((theme) => ({
            id: theme.id,
            key: theme.key,
            name: this.parseLocalized(theme.name, theme.key).th,
            activationMode:
              theme.activationMode === SeasonalThemeActivationMode.AUTOMATIC
                ? 'อัตโนมัติ'
                : 'กำหนดเอง',
            active: theme.active
              ? 'ใช้งาน'
              : theme.previewMode
                ? 'โหมดพรีวิว'
                : 'ปิดใช้งาน',
            startDate: theme.startDate?.toISOString() ?? '',
            endDate: theme.endDate?.toISOString() ?? '',
            primaryColor: theme.primaryColor ?? '',
            secondaryColor: theme.secondaryColor ?? '',
            pageTargets: theme.pageTargets.join(', '),
          })),
          query.search,
          ['name', 'key', 'activationMode'],
        );
        const paged = this.paginate(rows, query);

        return {
          title: 'ธีมตามเทศกาล',
          description:
            'เพิ่ม แก้ไข ลบ และตั้งช่วงใช้งานของธีมเทศกาลทั้ง light/dark mode',
          columns: [
            { key: 'name', label: 'ชื่อธีม' },
            { key: 'key', label: 'คีย์' },
            { key: 'activationMode', label: 'โหมดเปิดใช้งาน' },
            { key: 'primaryColor', label: 'สีหลัก' },
            { key: 'secondaryColor', label: 'สีรอง' },
            { key: 'active', label: 'สถานะ', type: 'badge' },
            { key: 'startDate', label: 'เริ่มต้น', type: 'date' },
            { key: 'endDate', label: 'สิ้นสุด', type: 'date' },
          ],
          items: paged.items,
          pagination: paged.pagination,
          rowActions: [
            { key: 'edit', label: 'แก้ไขข้อมูล' },
            { key: 'activate_theme', label: 'เปิดใช้งาน' },
            {
              key: 'delete_theme',
              label: 'ลบข้อมูล',
              confirm: true,
              variant: 'destructive',
            },
          ],
          form: {
            action: 'save_theme',
            submitLabel: 'บันทึกธีม',
            fields: [
              { key: 'id', label: 'รหัส', type: 'hidden' },
              {
                key: 'key',
                label: 'ธีม',
                type: 'select',
                required: true,
                options: Object.values(SeasonalThemeKey).map((value) => ({
                  label: value,
                  value,
                })),
              },
              { key: 'name', label: 'ชื่อธีม', type: 'text', required: true },
              {
                key: 'activationMode',
                label: 'การเปิดใช้งาน',
                type: 'select',
                options: [
                  {
                    label: 'กำหนดเอง',
                    value: SeasonalThemeActivationMode.MANUAL,
                  },
                  {
                    label: 'อัตโนมัติ',
                    value: SeasonalThemeActivationMode.AUTOMATIC,
                  },
                ],
              },
              { key: 'startDate', label: 'วันที่เริ่ม', type: 'date' },
              { key: 'endDate', label: 'วันที่สิ้นสุด', type: 'date' },
              { key: 'bannerUrl', label: 'แบนเนอร์', type: 'url' },
              { key: 'backgroundUrl', label: 'พื้นหลัง', type: 'url' },
              { key: 'iconUrl', label: 'ไอคอน', type: 'url' },
              { key: 'primaryColor', label: 'สีหลัก', type: 'color' },
              { key: 'secondaryColor', label: 'สีรอง', type: 'color' },
              { key: 'pageTargets', label: 'หน้าที่ใช้', type: 'tags' },
              { key: 'active', label: 'เปิดใช้งานทันที', type: 'checkbox' },
            ],
          },
          emptyState: {
            title: 'ยังไม่มีธีมเทศกาล',
            description: 'เพิ่มธีมใหม่เพื่อเปลี่ยนบรรยากาศหน้าเว็บตามช่วงเวลา',
          },
        };
      }

      case 'analytics': {
        const overview = await this.getAdminOverview();
        const instructorPerformance = await this.prisma.course.groupBy({
          by: ['instructorId'],
          _sum: {
            learnerCount: true,
          },
          _count: {
            _all: true,
          },
        });

        return {
          title: 'Analytics',
          description:
            'วิเคราะห์รายได้ ผู้ใช้งาน คอร์ส โปรโมชัน และ retention ของระบบ',
          tabs: [
            'ภาพรวมระบบ',
            'รายได้',
            'ผู้ใช้งาน',
            'คอร์ส',
            'ผู้สอน',
            'การเรียนรู้',
            'โปรโมชัน',
            'Conversion',
            'Retention',
            'Engagement',
          ],
          cards: overview.cards,
          charts: overview.charts,
          insights: [
            {
              title: 'ผู้สอนที่มีผู้เรียนสูงสุด',
              value:
                instructorPerformance.sort(
                  (left, right) =>
                    (right._sum.learnerCount ?? 0) -
                    (left._sum.learnerCount ?? 0),
                )[0]?._sum.learnerCount ?? 0,
            },
            {
              title: 'ค่าเฉลี่ยคำสั่งซื้อ',
              value:
                overview.recentTransactions.length > 0
                  ? Math.round(
                      overview.recentTransactions.reduce(
                        (sum, item) => sum + item.amount,
                        0,
                      ) / overview.recentTransactions.length,
                    )
                  : 0,
            },
          ],
          anomaly: overview.alerts,
          exportable: ['csv', 'excel', 'pdf'],
        };
      }

      case 'settings': {
        const settings = await this.prisma.platformSetting.findMany({
          orderBy: [{ section: 'asc' }, { key: 'asc' }],
        });

        return {
          title: 'Settings',
          description:
            'ตั้งค่าทั่วไป SEO ภาษา เวลา การชำระเงิน AI โปรโมชั่น และหน้าแรก',
          groups: settings.map((setting) => ({
            id: setting.id,
            section: setting.section,
            key: setting.key,
            label: setting.label,
            description: setting.description,
            value: setting.value,
            defaultValue: setting.defaultValue,
          })),
          rowActions: [
            { key: 'edit', label: 'แก้ไขข้อมูล' },
            { key: 'reset_setting', label: 'คืนค่าเริ่มต้น', confirm: true },
          ],
          form: {
            action: 'save_setting',
            submitLabel: 'บันทึกการตั้งค่า',
            fields: [
              { key: 'id', label: 'รหัส', type: 'hidden' },
              { key: 'label', label: 'ชื่อหมวด', type: 'text', required: true },
              { key: 'key', label: 'คีย์', type: 'text', required: true },
              {
                key: 'section',
                label: 'หมวดหลัก',
                type: 'text',
                required: true,
              },
              { key: 'description', label: 'คำอธิบาย', type: 'textarea' },
              {
                key: 'value',
                label: 'ค่าแบบ JSON',
                type: 'json',
                required: true,
              },
            ],
          },
          emptyState: {
            title: 'ยังไม่มีการตั้งค่า',
            description: 'ระบบจะสร้างค่าเริ่มต้นให้อัตโนมัติเมื่อเข้าหน้านี้',
          },
        };
      }

      case 'content-review-queue': {
        const queue = await this.prisma.contentReviewQueue.findMany({
          include: {
            submittedBy: {
              select: {
                fullname: true,
              },
            },
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        });

        const rows = this.applySearch(
          queue
            .filter((item) =>
              query.status ? item.status === query.status : true,
            )
            .map((item) => ({
              id: item.id,
              contentType: item.contentType,
              sourceModule: item.sourceModule,
              status: item.status,
              priority: item.priority,
              sender: item.submittedBy?.fullname ?? 'ระบบ',
              previewText: item.previewText ?? '',
              createdAt: item.createdAt.toISOString(),
            })),
          query.search,
          ['contentType', 'sourceModule', 'sender', 'previewText'],
        );
        const paged = this.paginate(rows, query);

        return {
          title: 'Content Review Queue',
          description:
            'ตรวจสอบคำอธิบายคอร์ส บทเรียน รูปภาพ วิดีโอ รีวิว และคอมมูนิตี้',
          columns: [
            { key: 'contentType', label: 'ประเภทคอนเทนต์' },
            { key: 'sourceModule', label: 'โมดูลต้นทาง' },
            { key: 'sender', label: 'ผู้ส่ง' },
            { key: 'priority', label: 'ความเร่งด่วน', type: 'badge' },
            { key: 'status', label: 'สถานะ', type: 'badge' },
            { key: 'createdAt', label: 'วันที่ส่ง', type: 'date' },
          ],
          items: paged.items,
          pagination: paged.pagination,
          rowActions: [
            { key: 'approve_content_review', label: 'อนุมัติ' },
            { key: 'request_content_changes', label: 'ส่งกลับไปแก้' },
            { key: 'hide_content_review', label: 'ซ่อน' },
            {
              key: 'delete_content_review',
              label: 'ลบ',
              confirm: true,
              variant: 'destructive',
            },
          ],
          emptyState: {
            title: 'ไม่มีคอนเทนต์รอตรวจ',
            description: 'เมื่อมีการส่งคอนเทนต์เข้าตรวจ รายการจะปรากฏที่นี่',
          },
        };
      }

      case 'ai-draft-approval': {
        const drafts = await this.prisma.aiDraft.findMany({
          include: {
            course: {
              select: {
                courseName: true,
              },
            },
            approvals: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { updatedAt: 'desc' },
        });

        const rows = this.applySearch(
          drafts.map((draft) => ({
            id: draft.id,
            draftType: draft.draftType,
            title: draft.title,
            courseName: draft.course?.courseName ?? 'ไม่ได้ผูกคอร์ส',
            version: draft.version,
            status: draft.status,
            updatedAt: draft.updatedAt.toISOString(),
            preview:
              typeof draft.content === 'object'
                ? JSON.stringify(draft.content).slice(0, 120)
                : String(draft.content),
          })),
          query.search,
          ['draftType', 'title', 'courseName', 'status'],
        );
        const paged = this.paginate(rows, query);

        return {
          title: 'AI Draft Approval',
          description:
            'อนุมัติ ปฏิเสธ แก้ไข และส่งต่อร่างจาก AI เข้าคิวตรวจเนื้อหา',
          columns: [
            { key: 'draftType', label: 'ประเภท Draft' },
            { key: 'title', label: 'หัวข้อ' },
            { key: 'courseName', label: 'คอร์สที่เกี่ยวข้อง' },
            { key: 'version', label: 'เวอร์ชัน' },
            { key: 'status', label: 'สถานะ', type: 'badge' },
            { key: 'updatedAt', label: 'อัปเดตล่าสุด', type: 'date' },
          ],
          items: paged.items,
          pagination: paged.pagination,
          rowActions: [
            { key: 'approve_ai_draft', label: 'อนุมัติ' },
            { key: 'edit_ai_draft', label: 'แก้ไขก่อนอนุมัติ' },
            { key: 'send_ai_draft_to_queue', label: 'ส่งเข้า Content Queue' },
            {
              key: 'reject_ai_draft',
              label: 'ปฏิเสธ',
              confirm: true,
              variant: 'destructive',
            },
          ],
          form: {
            action: 'edit_ai_draft',
            submitLabel: 'บันทึก AI Draft',
            fields: [
              { key: 'id', label: 'รหัส', type: 'hidden' },
              { key: 'title', label: 'หัวข้อ', type: 'text', required: true },
              {
                key: 'content',
                label: 'เนื้อหา JSON',
                type: 'json',
                required: true,
              },
              { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
            ],
          },
          emptyState: {
            title: 'ไม่มี AI Draft รออนุมัติ',
            description: 'เมื่อ AI สร้างร่างใหม่ รายการจะเข้ามาที่หน้านี้',
          },
        };
      }

      case 'skill-exercises': {
        const exercises = await this.prisma.skillExercise.findMany({
          include: {
            course: {
              select: {
                courseName: true,
              },
            },
            instructor: {
              select: {
                fullname: true,
              },
            },
            questions: {
              select: {
                id: true,
              },
            },
            attempts: {
              select: {
                id: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        });

        const rows = this.applySearch(
          exercises.map((exercise) => ({
            id: exercise.id,
            title: exercise.title,
            courseName: exercise.course?.courseName ?? 'ยังไม่ผูกคอร์ส',
            instructorName: exercise.instructor?.fullname ?? 'ระบบ',
            category: exercise.category,
            difficulty:
              exercise.difficulty === DifficultyLevel.EASY
                ? 'ง่าย'
                : exercise.difficulty === DifficultyLevel.MEDIUM
                  ? 'กลาง'
                  : 'ยาก',
            score: exercise.score,
            timeLimitMinutes: exercise.timeLimitMinutes ?? 0,
            questionCount: exercise.questions.length,
            attempts: exercise.attempts.length,
            status: exercise.status,
            updatedAt: exercise.updatedAt.toISOString(),
          })),
          query.search,
          ['title', 'courseName', 'instructorName', 'category'],
        );
        const paged = this.paginate(rows, query);

        return {
          title: 'แบบฝึกสกิล',
          description: 'จัดการแบบฝึก คำถาม คะแนน เวลา และการวางก่อน/หลังเรียน',
          columns: [
            { key: 'title', label: 'ชื่อแบบฝึก' },
            { key: 'courseName', label: 'คอร์ส' },
            { key: 'category', label: 'หมวดหมู่' },
            { key: 'difficulty', label: 'ระดับความยาก', type: 'badge' },
            { key: 'score', label: 'คะแนนเต็ม' },
            { key: 'timeLimitMinutes', label: 'เวลา (นาที)' },
            { key: 'questionCount', label: 'จำนวนคำถาม' },
            { key: 'status', label: 'สถานะ', type: 'badge' },
          ],
          items: paged.items,
          pagination: paged.pagination,
          rowActions: [
            { key: 'edit', label: 'แก้ไขข้อมูล' },
            { key: 'toggle_exercise_status', label: 'เปิด/ปิดการใช้งาน' },
            {
              key: 'delete_exercise',
              label: 'ลบข้อมูล',
              confirm: true,
              variant: 'destructive',
            },
          ],
          form: {
            action: 'save_exercise',
            submitLabel: 'บันทึกแบบฝึก',
            fields: [
              { key: 'id', label: 'รหัส', type: 'hidden' },
              { key: 'courseId', label: 'รหัสคอร์ส', type: 'text' },
              {
                key: 'title',
                label: 'ชื่อแบบฝึก',
                type: 'text',
                required: true,
              },
              {
                key: 'description',
                label: 'คำอธิบาย',
                type: 'textarea',
                required: true,
              },
              {
                key: 'category',
                label: 'หมวดหมู่',
                type: 'text',
                required: true,
              },
              {
                key: 'difficulty',
                label: 'ความยาก',
                type: 'select',
                options: [
                  { label: 'ง่าย', value: DifficultyLevel.EASY },
                  { label: 'กลาง', value: DifficultyLevel.MEDIUM },
                  { label: 'ยาก', value: DifficultyLevel.HARD },
                ],
              },
              { key: 'score', label: 'คะแนนเต็ม', type: 'number', min: 1 },
              {
                key: 'timeLimitMinutes',
                label: 'เวลา (นาที)',
                type: 'number',
                min: 0,
              },
              {
                key: 'passingScore',
                label: 'คะแนนผ่าน',
                type: 'number',
                min: 0,
              },
              {
                key: 'randomizeQuestions',
                label: 'สุ่มคำถาม',
                type: 'checkbox',
              },
              {
                key: 'placement',
                label: 'ตำแหน่งการแสดง',
                type: 'select',
                options: [
                  {
                    label: 'ก่อนเรียน',
                    value: SkillExercisePlacement.BEFORE_LEARNING,
                  },
                  {
                    label: 'หลังเรียน',
                    value: SkillExercisePlacement.AFTER_LEARNING,
                  },
                  { label: 'ทางเลือก', value: SkillExercisePlacement.OPTIONAL },
                ],
              },
              {
                key: 'questions',
                label: 'คำถาม JSON',
                type: 'json',
                required: true,
              },
            ],
          },
          emptyState: {
            title: 'ยังไม่มีแบบฝึก',
            description: 'เพิ่มแบบฝึกแรกเพื่อใช้กับคอร์สและแดชบอร์ดผู้เรียน',
          },
        };
      }

      case 'users': {
        const users = await this.prisma.user.findMany({
          include: {
            enrolledCourses: {
              select: {
                courseId: true,
              },
            },
            payments: {
              where: { status: PaymentStatus.SUCCESS },
              select: {
                id: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        const rows = this.applySearch(
          users.map((user) => ({
            id: user.id,
            fullname: user.fullname,
            email: user.email,
            role: user.role,
            roles: normalizeRoles(user.role, user.roles).join(', '),
            status: user.isSuspended
              ? 'ระงับ'
              : user.isActive
                ? 'ใช้งาน'
                : 'ปิดใช้งาน',
            enrolledCourses: user.enrolledCourses.length,
            orders: user.payments.length,
            createdAt: user.createdAt.toISOString(),
          })),
          query.search,
          ['fullname', 'email', 'role'],
        );
        const paged = this.paginate(rows, query);

        return {
          title: 'จัดการผู้ใช้งาน',
          description:
            'เพิ่ม แก้ไข ลบ ระงับบัญชี และดูประวัติคำสั่งซื้อของผู้ใช้',
          columns: [
            { key: 'fullname', label: 'ชื่อ' },
            { key: 'email', label: 'อีเมล' },
            { key: 'role', label: 'บทบาทหลัก', type: 'badge' },
            { key: 'roles', label: 'สิทธิ์ทั้งหมด' },
            { key: 'status', label: 'สถานะบัญชี', type: 'badge' },
            { key: 'enrolledCourses', label: 'คอร์สที่ลงทะเบียน' },
            { key: 'orders', label: 'จำนวนคำสั่งซื้อ' },
          ],
          items: paged.items,
          pagination: paged.pagination,
          rowActions: [
            { key: 'edit', label: 'แก้ไขข้อมูล' },
            { key: 'suspend_user', label: 'ระงับบัญชี' },
            { key: 'activate_user', label: 'เปิดใช้งาน' },
            {
              key: 'delete_user',
              label: 'ลบข้อมูล',
              confirm: true,
              variant: 'destructive',
            },
          ],
          form: {
            action: 'save_user',
            submitLabel: 'บันทึกผู้ใช้งาน',
            fields: [
              { key: 'id', label: 'รหัส', type: 'hidden' },
              {
                key: 'fullname',
                label: 'ชื่อ-นามสกุล',
                type: 'text',
                required: true,
              },
              { key: 'email', label: 'อีเมล', type: 'email', required: true },
              { key: 'password', label: 'รหัสผ่าน', type: 'password' },
              {
                key: 'role',
                label: 'บทบาทหลัก',
                type: 'select',
                required: true,
                options: [
                  { label: 'ผู้เรียน', value: Role.USER },
                  { label: 'ผู้สอน', value: Role.INSTRUCTOR },
                  { label: 'ผู้ดูแลระบบ', value: Role.ADMIN },
                ],
              },
              { key: 'roles', label: 'บทบาททั้งหมด', type: 'tags' },
            ],
          },
          emptyState: {
            title: 'ยังไม่มีผู้ใช้งาน',
            description: 'เพิ่มผู้ใช้ใหม่เพื่อทดสอบระบบสิทธิ์และการซื้อคอร์ส',
          },
        };
      }

      case 'instructors': {
        const instructors = await this.prisma.instructorProfile.findMany({
          include: {
            user: {
              include: {
                courses: {
                  include: {
                    enrolledCourses: true,
                    reviews: true,
                  },
                },
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        });

        const rows = this.applySearch(
          instructors.map((profile) => {
            const totalStudents = profile.user.courses.reduce(
              (sum, course) => sum + course.enrolledCourses.length,
              0,
            );
            const totalRevenue = profile.user.courses.reduce(
              (sum, course) =>
                sum +
                course.enrolledCourses.length * this.toNumber(course.price),
              0,
            );

            return {
              id: profile.id,
              userId: profile.userId,
              displayName: profile.displayName,
              email: profile.user.email,
              courseCount: profile.user.courses.length,
              totalStudents,
              totalRevenue,
              visible: profile.visible ? 'ใช้งาน' : 'ปิดใช้งาน',
              specialties: profile.specialties.join(', '),
            };
          }),
          query.search,
          ['displayName', 'email', 'specialties'],
        );
        const paged = this.paginate(rows, query);

        return {
          title: 'จัดการผู้สอน',
          description: 'ดูคอร์ส รายได้ รีวิว และเปิดปิดการแสดงผลของผู้สอน',
          columns: [
            { key: 'displayName', label: 'ชื่อผู้สอน' },
            { key: 'email', label: 'อีเมล' },
            { key: 'courseCount', label: 'จำนวนคอร์ส' },
            { key: 'totalStudents', label: 'จำนวนนักเรียน' },
            { key: 'totalRevenue', label: 'รายได้รวม', type: 'currency' },
            { key: 'visible', label: 'สถานะ', type: 'badge' },
          ],
          items: paged.items,
          pagination: paged.pagination,
          rowActions: [
            { key: 'toggle_instructor_visibility', label: 'เปิด/ปิดการใช้งาน' },
            { key: 'edit', label: 'แก้ไขข้อมูล' },
          ],
          form: {
            action: 'save_instructor_profile',
            submitLabel: 'บันทึกข้อมูลผู้สอน',
            fields: [
              { key: 'id', label: 'รหัส', type: 'hidden' },
              {
                key: 'displayName',
                label: 'ชื่อแสดงผล',
                type: 'text',
                required: true,
              },
              {
                key: 'bio',
                label: 'ประวัติย่อ',
                type: 'textarea',
                required: true,
              },
              { key: 'specialties', label: 'ความเชี่ยวชาญ', type: 'tags' },
              { key: 'portfolioUrl', label: 'ลิงก์ผลงาน', type: 'url' },
              { key: 'contactEmail', label: 'อีเมลติดต่อ', type: 'email' },
              { key: 'payoutAccount', label: 'บัญชีรับเงิน', type: 'text' },
              { key: 'visible', label: 'แสดงผลสาธารณะ', type: 'checkbox' },
            ],
          },
          emptyState: {
            title: 'ยังไม่มีผู้สอน',
            description: 'เมื่อมีการอนุมัติผู้สอน รายการจะปรากฏที่นี่',
          },
        };
      }

      case 'instructor-applications': {
        const applications = await this.prisma.instructorApplication.findMany({
          include: {
            user: {
              select: {
                fullname: true,
                email: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        });

        const rows = this.applySearch(
          applications.map((application) => ({
            id: application.id,
            userId: application.userId,
            applicantName: application.user.fullname,
            applicantEmail: application.user.email,
            displayName: application.displayName,
            status:
              application.status === InstructorApplicationStatus.APPROVED
                ? 'อนุมัติแล้ว'
                : application.status ===
                    InstructorApplicationStatus.NEEDS_CHANGES
                  ? 'ต้องแก้ไขข้อมูล'
                  : application.status === InstructorApplicationStatus.REJECTED
                    ? 'ปฏิเสธ'
                    : 'รอการตรวจสอบ',
            expertise: application.expertise.join(', '),
            createdAt: application.createdAt.toISOString(),
          })),
          query.search,
          ['applicantName', 'applicantEmail', 'displayName', 'status'],
        );
        const paged = this.paginate(rows, query);

        return {
          title: 'คำขอสมัครเป็นผู้สอน',
          description: 'อนุมัติ ขอแก้ไข หรือปฏิเสธผู้สมัครเป็นผู้สอน',
          columns: [
            { key: 'applicantName', label: 'ชื่อผู้สมัคร' },
            { key: 'applicantEmail', label: 'อีเมล' },
            { key: 'displayName', label: 'ชื่อแสดงผล' },
            { key: 'status', label: 'สถานะ', type: 'badge' },
            { key: 'expertise', label: 'ความเชี่ยวชาญ' },
            { key: 'createdAt', label: 'วันที่ส่ง', type: 'date' },
          ],
          items: paged.items,
          pagination: paged.pagination,
          rowActions: [
            { key: 'approve_instructor_application', label: 'อนุมัติ' },
            {
              key: 'request_instructor_application_changes',
              label: 'ขอแก้ไขข้อมูล',
            },
            {
              key: 'reject_instructor_application',
              label: 'ปฏิเสธ',
              confirm: true,
              variant: 'destructive',
            },
          ],
          form: {
            action: 'update_instructor_application',
            submitLabel: 'บันทึกหมายเหตุ',
            fields: [
              { key: 'id', label: 'รหัส', type: 'hidden' },
              {
                key: 'adminNotes',
                label: 'หมายเหตุ',
                type: 'textarea',
                required: true,
              },
            ],
          },
          emptyState: {
            title: 'ไม่มีคำขอสมัครเป็นผู้สอน',
            description: 'เมื่อผู้เรียนยื่นคำขอสมัคร รายการจะอยู่ที่หน้านี้',
          },
        };
      }

      case 'notifications': {
        const notifications = await this.prisma.notificationLog.findMany({
          where: {
            audience: NotificationAudience.ADMIN,
          },
          orderBy: { createdAt: 'desc' },
        });
        const rows = this.paginate(
          this.applySearch(
            notifications.map((notification) => ({
              id: notification.id,
              title: notification.title,
              body: notification.body,
              level: notification.level,
              isRead: notification.isRead ? 'อ่านแล้ว' : 'ยังไม่อ่าน',
              createdAt: notification.createdAt.toISOString(),
            })),
            query.search,
            ['title', 'body', 'level'],
          ),
          query,
        );

        return {
          title: 'การแจ้งเตือนผู้ดูแลระบบ',
          description:
            'รวมการแจ้งเตือนสำคัญ เช่น คอร์สรออนุมัติ คำขอผู้สอน และ AI Draft',
          columns: [
            { key: 'title', label: 'หัวข้อ' },
            { key: 'body', label: 'รายละเอียด' },
            { key: 'level', label: 'ระดับ', type: 'badge' },
            { key: 'isRead', label: 'สถานะ', type: 'badge' },
            { key: 'createdAt', label: 'เวลา', type: 'date' },
          ],
          items: rows.items,
          pagination: rows.pagination,
          rowActions: [
            {
              key: 'mark_notification_read',
              label: 'ทำเครื่องหมายว่าอ่านแล้ว',
            },
          ],
        };
      }

      default:
        return this.getAdminOverview();
    }
  }

  private async getInstructorCoursesSection(
    userId: string,
    query: WorkspaceQueryDto,
  ) {
    const courses = await this.prisma.course.findMany({
      where: { instructorId: userId },
      include: {
        instructor: {
          select: {
            fullname: true,
          },
        },
        previewVideos: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const rows = this.paginate(
      this.applySearch(
        courses.map((course) => this.buildCourseRow(course)),
        query.search,
        ['courseName', 'slug', 'category'],
      ),
      query,
    );

    return {
      title: 'คอร์สของฉัน',
      description: 'จัดการคอร์ส บันทึกเป็น draft ส่งตรวจ และดูสถานะอนุมัติ',
      columns: [
        { key: 'courseName', label: 'ชื่อคอร์ส' },
        { key: 'category', label: 'หมวดหมู่' },
        { key: 'level', label: 'ระดับ' },
        { key: 'price', label: 'ราคา', type: 'currency' },
        { key: 'previewVideoCount', label: 'วิดีโอพรีวิว' },
        { key: 'status', label: 'สถานะ', type: 'badge' },
        { key: 'updatedAt', label: 'อัปเดตล่าสุด', type: 'date' },
      ],
      items: rows.items,
      pagination: rows.pagination,
      rowActions: [
        { key: 'edit', label: 'แก้ไขข้อมูล' },
        { key: 'submit_course_review', label: 'ส่งตรวจ' },
        { key: 'duplicate_course', label: 'ทำสำเนา' },
        {
          key: 'delete_own_course',
          label: 'ลบข้อมูล',
          confirm: true,
          variant: 'destructive',
        },
      ],
      form: this.buildCourseForm(),
    };
  }

  async getInstructorOverview(userId: string) {
    const [courses, reviews, notifications, pendingReviews] = await Promise.all(
      [
        this.prisma.course.findMany({
          where: { instructorId: userId },
          include: {
            enrolledCourses: true,
          },
        }),
        this.prisma.review.findMany({
          where: {
            course: {
              instructorId: userId,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        this.prisma.notificationLog.findMany({
          where: {
            OR: [
              { recipientId: userId },
              { audience: NotificationAudience.INSTRUCTOR },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
        this.prisma.pendingCourseReview.findMany({
          where: { instructorId: userId },
          orderBy: { updatedAt: 'desc' },
        }),
      ],
    );

    const totalRevenue = courses.reduce(
      (sum, course) =>
        sum + course.enrolledCourses.length * this.toNumber(course.price),
      0,
    );

    return {
      title: 'แดชบอร์ดผู้สอน',
      description:
        'ภาพรวมคอร์ส นักเรียน รายได้ รีวิวล่าสุด และงานที่ต้องดำเนินการ',
      cards: [
        { label: 'คอร์สทั้งหมดของฉัน', value: courses.length },
        {
          label: 'คอร์สที่เผยแพร่แล้ว',
          value: courses.filter((course) => course.isPublished).length,
        },
        {
          label: 'คอร์สที่รออนุมัติ',
          value: pendingReviews.filter(
            (item) =>
              item.status === CourseReviewStatus.PENDING_APPROVAL ||
              item.status === CourseReviewStatus.SUBMITTED,
          ).length,
        },
        {
          label: 'คอร์สที่ต้องแก้ไข',
          value: pendingReviews.filter(
            (item) => item.status === CourseReviewStatus.NEEDS_REVISION,
          ).length,
        },
        {
          label: 'จำนวนนักเรียนรวม',
          value: courses.reduce((sum, course) => sum + course.learnerCount, 0),
        },
        { label: 'รายได้รวม', value: totalRevenue },
      ],
      charts: [
        {
          key: 'coursePerformance',
          title: 'คอร์สยอดนิยมของฉัน',
          type: 'bar',
          data: courses
            .sort((left, right) => right.learnerCount - left.learnerCount)
            .slice(0, 5)
            .map((course) => ({
              label: course.courseName,
              value: course.learnerCount,
            })),
        },
      ],
      latestReviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        content: review.content,
      })),
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        level: notification.level,
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
      })),
      tasks: pendingReviews.map((item) => ({
        id: item.id,
        title:
          item.status === CourseReviewStatus.NEEDS_REVISION
            ? 'มีคอร์สที่ต้องแก้ไข'
            : 'มีคอร์สรอผลอนุมัติ',
        status: item.status,
        updatedAt: item.updatedAt.toISOString(),
      })),
    };
  }

  async getInstructorSection(
    userId: string,
    section: string,
    query: WorkspaceQueryDto,
  ) {
    switch (section) {
      case 'courses':
        return this.getInstructorCoursesSection(userId, query);
      case 'reviews': {
        const reviews = await this.prisma.review.findMany({
          where: {
            course: {
              instructorId: userId,
            },
          },
          include: {
            course: {
              select: {
                courseName: true,
              },
            },
            user: {
              select: {
                fullname: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        const rows = this.paginate(
          reviews.map((review) => ({
            id: review.id,
            courseName: review.course.courseName,
            author: review.user?.fullname ?? 'ไม่ระบุชื่อ',
            rating: review.rating,
            content: review.content,
            status: review.visible ? 'เผยแพร่' : 'ซ่อนอยู่',
            createdAt: review.createdAt.toISOString(),
          })),
          query,
        );

        return {
          title: 'รีวิวคอร์สของฉัน',
          description: 'ดูความคิดเห็นล่าสุดของผู้เรียนในคอร์สของคุณ',
          columns: [
            { key: 'courseName', label: 'คอร์ส' },
            { key: 'author', label: 'ผู้รีวิว' },
            { key: 'rating', label: 'คะแนน' },
            { key: 'content', label: 'ข้อความ' },
            { key: 'status', label: 'สถานะ', type: 'badge' },
            { key: 'createdAt', label: 'เวลา', type: 'date' },
          ],
          items: rows.items,
          pagination: rows.pagination,
        };
      }
      case 'students': {
        const enrollments = await this.prisma.enrolledCourse.findMany({
          where: {
            course: {
              instructorId: userId,
            },
          },
          include: {
            user: {
              select: {
                fullname: true,
                email: true,
              },
            },
            course: {
              select: {
                courseName: true,
              },
            },
          },
          orderBy: { id: 'desc' },
        });
        const rows = this.paginate(
          enrollments.map((enrollment) => ({
            id: enrollment.id,
            fullname: enrollment.user.fullname,
            email: enrollment.user.email,
            courseName: enrollment.course.courseName,
          })),
          query,
        );

        return {
          title: 'นักเรียนในคอร์สของฉัน',
          description: 'ดูรายชื่อนักเรียนที่ลงทะเบียนในคอร์สของคุณ',
          columns: [
            { key: 'fullname', label: 'ชื่อผู้เรียน' },
            { key: 'email', label: 'อีเมล' },
            { key: 'courseName', label: 'คอร์ส' },
          ],
          items: rows.items,
          pagination: rows.pagination,
        };
      }
      case 'analytics': {
        return this.getInstructorOverview(userId);
      }
      case 'skill-exercises': {
        const exercises = await this.prisma.skillExercise.findMany({
          where: { instructorId: userId },
          include: {
            course: {
              select: {
                courseName: true,
              },
            },
            questions: true,
            attempts: true,
          },
          orderBy: { updatedAt: 'desc' },
        });
        const rows = this.paginate(
          exercises.map((exercise) => ({
            id: exercise.id,
            title: exercise.title,
            courseName: exercise.course?.courseName ?? 'ยังไม่ผูกคอร์ส',
            questionCount: exercise.questions.length,
            attempts: exercise.attempts.length,
            status: exercise.status,
            updatedAt: exercise.updatedAt.toISOString(),
          })),
          query,
        );

        return {
          title: 'แบบฝึกของฉัน',
          description: 'จัดการแบบฝึกและคำถามที่อยู่ในคอร์สของคุณ',
          columns: [
            { key: 'title', label: 'แบบฝึก' },
            { key: 'courseName', label: 'คอร์ส' },
            { key: 'questionCount', label: 'คำถาม' },
            { key: 'attempts', label: 'จำนวนครั้งที่ทำ' },
            { key: 'status', label: 'สถานะ', type: 'badge' },
            { key: 'updatedAt', label: 'อัปเดตล่าสุด', type: 'date' },
          ],
          items: rows.items,
          pagination: rows.pagination,
          rowActions: [
            { key: 'edit', label: 'แก้ไขข้อมูล' },
            { key: 'toggle_exercise_status', label: 'เปิด/ปิดการใช้งาน' },
            {
              key: 'delete_exercise',
              label: 'ลบข้อมูล',
              confirm: true,
              variant: 'destructive',
            },
          ],
          form: {
            action: 'save_exercise',
            submitLabel: 'บันทึกแบบฝึก',
            fields: [
              { key: 'id', label: 'รหัส', type: 'hidden' },
              { key: 'courseId', label: 'รหัสคอร์ส', type: 'text' },
              {
                key: 'title',
                label: 'ชื่อแบบฝึก',
                type: 'text',
                required: true,
              },
              {
                key: 'description',
                label: 'คำอธิบาย',
                type: 'textarea',
                required: true,
              },
              {
                key: 'category',
                label: 'หมวดหมู่',
                type: 'text',
                required: true,
              },
              {
                key: 'questions',
                label: 'คำถาม JSON',
                type: 'json',
                required: true,
              },
            ],
          },
        };
      }
      case 'notifications': {
        const notifications = await this.prisma.notificationLog.findMany({
          where: {
            OR: [
              { recipientId: userId },
              { audience: NotificationAudience.INSTRUCTOR },
            ],
          },
          orderBy: { createdAt: 'desc' },
        });
        const rows = this.paginate(
          notifications.map((notification) => ({
            id: notification.id,
            title: notification.title,
            body: notification.body,
            level: notification.level,
            isRead: notification.isRead ? 'อ่านแล้ว' : 'ยังไม่อ่าน',
            createdAt: notification.createdAt.toISOString(),
          })),
          query,
        );

        return {
          title: 'การแจ้งเตือนผู้สอน',
          description: 'รวมการแจ้งเตือนสำคัญของคอร์ส รีวิว และสถานะการอนุมัติ',
          columns: [
            { key: 'title', label: 'หัวข้อ' },
            { key: 'body', label: 'รายละเอียด' },
            { key: 'level', label: 'ระดับ', type: 'badge' },
            { key: 'isRead', label: 'สถานะ', type: 'badge' },
            { key: 'createdAt', label: 'เวลา', type: 'date' },
          ],
          items: rows.items,
          pagination: rows.pagination,
          rowActions: [
            {
              key: 'mark_notification_read',
              label: 'ทำเครื่องหมายว่าอ่านแล้ว',
            },
          ],
        };
      }
      case 'profile': {
        const profile = await this.prisma.instructorProfile.findUnique({
          where: { userId },
        });

        return {
          title: 'โปรไฟล์ผู้สอน',
          description:
            'แก้ไขข้อมูลสาธารณะ ความเชี่ยวชาญ ลิงก์ผลงาน และข้อมูลการรับเงิน',
          item: profile,
          form: {
            action: 'save_instructor_profile',
            submitLabel: 'บันทึกโปรไฟล์ผู้สอน',
            fields: [
              { key: 'id', label: 'รหัส', type: 'hidden' },
              {
                key: 'displayName',
                label: 'ชื่อแสดงผล',
                type: 'text',
                required: true,
              },
              {
                key: 'bio',
                label: 'ประวัติ',
                type: 'textarea',
                required: true,
              },
              { key: 'specialties', label: 'ความเชี่ยวชาญ', type: 'tags' },
              { key: 'portfolioUrl', label: 'ลิงก์ผลงาน', type: 'url' },
              { key: 'contactEmail', label: 'อีเมลติดต่อ', type: 'email' },
              { key: 'payoutAccount', label: 'บัญชีรับเงิน', type: 'text' },
              { key: 'visible', label: 'เปิดสาธารณะ', type: 'checkbox' },
            ],
          },
        };
      }
      default:
        return this.getInstructorOverview(userId);
    }
  }

  async getStudentOverview(userId: string) {
    const [
      enrollments,
      wishlist,
      payments,
      notifications,
      certificates,
      attempts,
    ] = await Promise.all([
      this.prisma.enrolledCourse.findMany({
        where: { userId },
        include: {
          course: {
            include: {
              instructor: {
                select: {
                  fullname: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.wishlist.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              course: true,
            },
          },
        },
      }),
      this.prisma.payment.findMany({
        where: {
          userId,
          status: PaymentStatus.SUCCESS,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.notificationLog.findMany({
        where: {
          OR: [
            { recipientId: userId },
            { audience: NotificationAudience.STUDENT },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.course.findMany({
        where: {
          enrolledCourses: {
            some: {
              userId,
            },
          },
          certificateEnabled: true,
        },
        select: {
          id: true,
          courseName: true,
        },
      }),
      this.prisma.skillExerciseAttempt.findMany({
        where: { userId },
      }),
    ]);

    return {
      title: 'แดชบอร์ดผู้เรียน',
      description:
        'คอร์สของฉัน คอร์สที่เรียนล่าสุด คะแนนแบบฝึก ใบรับรอง และกิจกรรมล่าสุด',
      cards: [
        { label: 'คอร์สของฉัน', value: enrollments.length },
        { label: 'คอร์สที่บันทึกไว้', value: wishlist?.items.length ?? 0 },
        { label: 'รายการสั่งซื้อ', value: payments.length },
        {
          label: 'คะแนนแบบฝึกล่าสุด',
          value:
            attempts.length > 0
              ? Math.round(
                  attempts.reduce((sum, item) => sum + (item.score ?? 0), 0) /
                    attempts.length,
                )
              : 0,
        },
        { label: 'ใบรับรองของฉัน', value: certificates.length },
      ],
      charts: [
        {
          key: 'progress',
          title: 'ความคืบหน้าการเรียนโดยประมาณ',
          type: 'bar',
          data: enrollments.slice(0, 6).map((enrollment, index) => ({
            label: enrollment.course.courseName,
            value: Math.min(100, 35 + index * 10),
          })),
        },
      ],
      courses: enrollments.map((enrollment) => ({
        id: enrollment.course.id,
        title: enrollment.course.courseName,
        instructorName: enrollment.course.instructor.fullname,
      })),
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        level: notification.level,
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
      })),
    };
  }

  async getStudentSection(
    userId: string,
    section: string,
    query: WorkspaceQueryDto,
  ) {
    switch (section) {
      case 'my-courses': {
        const enrollments = await this.prisma.enrolledCourse.findMany({
          where: { userId },
          include: {
            course: {
              include: {
                instructor: {
                  select: {
                    fullname: true,
                  },
                },
              },
            },
          },
        });
        const rows = this.paginate(
          enrollments.map((enrollment) => ({
            id: enrollment.course.id,
            courseName: enrollment.course.courseName,
            instructorName: enrollment.course.instructor.fullname,
            category: enrollment.course.category,
            progress: Math.min(100, 40 + (enrollment.course.learnerCount % 60)),
            status: enrollment.course.isPublished
              ? 'กำลังเรียน'
              : 'รอเริ่มเรียน',
          })),
          query,
        );

        return {
          title: 'คอร์สของฉัน',
          description: 'ดูคอร์สที่ลงทะเบียน เรียนล่าสุด และติดตามความคืบหน้า',
          columns: [
            { key: 'courseName', label: 'คอร์ส' },
            { key: 'instructorName', label: 'ผู้สอน' },
            { key: 'category', label: 'หมวดหมู่' },
            { key: 'progress', label: 'ความคืบหน้า', type: 'progress' },
            { key: 'status', label: 'สถานะ', type: 'badge' },
          ],
          items: rows.items,
          pagination: rows.pagination,
        };
      }
      case 'orders': {
        const payments = await this.prisma.payment.findMany({
          where: {
            userId,
            status: PaymentStatus.SUCCESS,
          },
          orderBy: { updatedAt: 'desc' },
        });
        const rows = this.paginate(
          payments.map((payment) => ({
            id: payment.id,
            amount: this.toNumber(payment.amount),
            status: payment.status,
            updatedAt: payment.updatedAt.toISOString(),
          })),
          query,
        );

        return {
          title: 'รายการสั่งซื้อ',
          description: 'ดูประวัติคำสั่งซื้อและยอดชำระเงินของคุณ',
          columns: [
            { key: 'id', label: 'เลขที่รายการ' },
            { key: 'amount', label: 'ยอดชำระ', type: 'currency' },
            { key: 'status', label: 'สถานะ', type: 'badge' },
            { key: 'updatedAt', label: 'วันที่ชำระ', type: 'date' },
          ],
          items: rows.items,
          pagination: rows.pagination,
        };
      }
      case 'wishlist': {
        const wishlist = await this.prisma.wishlist.findUnique({
          where: { userId },
          include: {
            items: {
              include: {
                course: true,
              },
            },
          },
        });
        const rows = this.paginate(
          (wishlist?.items ?? []).map((item) => ({
            id: item.course.id,
            courseName: item.course.courseName,
            category: item.course.category,
            price: this.toNumber(
              item.course.discountPrice ?? item.course.price,
            ),
            status: item.course.isPublished ? 'พร้อมเรียน' : 'ยังไม่เผยแพร่',
          })),
          query,
        );

        return {
          title: 'คอร์สที่บันทึกไว้',
          description: 'คอร์สที่คุณสนใจและต้องการกลับมาดูภายหลัง',
          columns: [
            { key: 'courseName', label: 'คอร์ส' },
            { key: 'category', label: 'หมวดหมู่' },
            { key: 'price', label: 'ราคา', type: 'currency' },
            { key: 'status', label: 'สถานะ', type: 'badge' },
          ],
          items: rows.items,
          pagination: rows.pagination,
        };
      }
      case 'certificates': {
        const certificates = await this.prisma.course.findMany({
          where: {
            enrolledCourses: {
              some: { userId },
            },
            certificateEnabled: true,
          },
          select: {
            id: true,
            courseName: true,
            updatedAt: true,
          },
        });
        const rows = this.paginate(
          certificates.map((course) => ({
            id: course.id,
            courseName: course.courseName,
            issuedAt: course.updatedAt.toISOString(),
            status: 'พร้อมดาวน์โหลด',
          })),
          query,
        );

        return {
          title: 'ใบรับรองของฉัน',
          description: 'รวมใบรับรองของคอร์สที่ผ่านเงื่อนไขสำเร็จแล้ว',
          columns: [
            { key: 'courseName', label: 'คอร์ส' },
            { key: 'issuedAt', label: 'วันที่ออกใบรับรอง', type: 'date' },
            { key: 'status', label: 'สถานะ', type: 'badge' },
          ],
          items: rows.items,
          pagination: rows.pagination,
        };
      }
      case 'exercises': {
        const exercises = await this.prisma.skillExercise.findMany({
          where: {
            OR: [
              {
                course: {
                  enrolledCourses: {
                    some: {
                      userId,
                    },
                  },
                },
              },
              {
                courseId: null,
              },
            ],
            status: SkillExerciseStatus.ACTIVE,
          },
          include: {
            course: {
              select: {
                courseName: true,
              },
            },
            attempts: {
              where: { userId },
              orderBy: { updatedAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { updatedAt: 'desc' },
        });
        const rows = this.paginate(
          exercises.map((exercise) => ({
            id: exercise.id,
            title: exercise.title,
            courseName: exercise.course?.courseName ?? 'แบบฝึกทั่วไป',
            difficulty:
              exercise.difficulty === DifficultyLevel.EASY
                ? 'ง่าย'
                : exercise.difficulty === DifficultyLevel.MEDIUM
                  ? 'กลาง'
                  : 'ยาก',
            score: exercise.score,
            timeLimitMinutes: exercise.timeLimitMinutes ?? 0,
            latestScore: exercise.attempts[0]?.score ?? null,
            actionPath: `/student/exercises/${exercise.id}`,
          })),
          query,
        );

        return {
          title: 'แบบฝึกและ Quiz',
          description: 'ทำแบบฝึก ดูผลลัพธ์ ย้อนดูเฉลย และเริ่มใหม่ได้ทุกเมื่อ',
          columns: [
            { key: 'title', label: 'แบบฝึก' },
            { key: 'courseName', label: 'คอร์ส' },
            { key: 'difficulty', label: 'ความยาก', type: 'badge' },
            { key: 'score', label: 'คะแนนเต็ม' },
            { key: 'timeLimitMinutes', label: 'เวลา (นาที)' },
            { key: 'latestScore', label: 'คะแนนล่าสุด' },
          ],
          items: rows.items,
          pagination: rows.pagination,
          rowActions: [{ key: 'open_path', label: 'ทำแบบฝึก' }],
        };
      }
      case 'notifications': {
        const notifications = await this.prisma.notificationLog.findMany({
          where: {
            OR: [
              { recipientId: userId },
              { audience: NotificationAudience.STUDENT },
            ],
          },
          orderBy: { createdAt: 'desc' },
        });
        const rows = this.paginate(
          notifications.map((notification) => ({
            id: notification.id,
            title: notification.title,
            body: notification.body,
            level: notification.level,
            isRead: notification.isRead ? 'อ่านแล้ว' : 'ยังไม่อ่าน',
            createdAt: notification.createdAt.toISOString(),
          })),
          query,
        );

        return {
          title: 'การแจ้งเตือน',
          description:
            'แจ้งเตือนการซื้อคอร์ส โปรโมชัน ใบรับรอง และกิจกรรมจากผู้สอน',
          columns: [
            { key: 'title', label: 'หัวข้อ' },
            { key: 'body', label: 'รายละเอียด' },
            { key: 'level', label: 'ระดับ', type: 'badge' },
            { key: 'isRead', label: 'สถานะ', type: 'badge' },
            { key: 'createdAt', label: 'เวลา', type: 'date' },
          ],
          items: rows.items,
          pagination: rows.pagination,
          rowActions: [
            {
              key: 'mark_notification_read',
              label: 'ทำเครื่องหมายว่าอ่านแล้ว',
            },
          ],
        };
      }
      case 'become-instructor': {
        const application = await this.prisma.instructorApplication.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        return {
          title: 'สมัครเป็นผู้สอน',
          description:
            'กรอกข้อมูลโปรไฟล์ ความเชี่ยวชาญ ประสบการณ์ และช่องทางรับเงินเพื่อยื่นสมัคร',
          item: application,
          form: {
            action: 'submit_instructor_application',
            submitLabel: application ? 'อัปเดตคำขอสมัคร' : 'ส่งคำขอสมัคร',
            fields: [
              { key: 'id', label: 'รหัส', type: 'hidden' },
              {
                key: 'displayName',
                label: 'ชื่อที่ใช้แสดง',
                type: 'text',
                required: true,
              },
              {
                key: 'shortBio',
                label: 'ประวัติย่อ',
                type: 'textarea',
                required: true,
              },
              {
                key: 'expertise',
                label: 'ความเชี่ยวชาญ',
                type: 'tags',
                required: true,
              },
              {
                key: 'teachingCategories',
                label: 'หมวดหมู่ที่สอน',
                type: 'tags',
                required: true,
              },
              {
                key: 'experienceYears',
                label: 'ประสบการณ์ (ปี)',
                type: 'number',
                min: 0,
              },
              { key: 'portfolioUrl', label: 'ลิงก์ผลงาน', type: 'url' },
              {
                key: 'payoutAccount',
                label: 'บัญชีรับเงิน / ช่องทางติดต่อ',
                type: 'text',
              },
              {
                key: 'identityDocumentUrl',
                label: 'เอกสารยืนยันตัวตน',
                type: 'url',
              },
            ],
          },
        };
      }
      case 'profile': {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
        });

        return {
          title: 'โปรไฟล์ของฉัน',
          description: 'แก้ไขข้อมูลส่วนตัว อีเมล เบอร์โทร และรูปโปรไฟล์',
          item: user,
          form: {
            action: 'save_student_profile',
            submitLabel: 'บันทึกโปรไฟล์',
            fields: [
              {
                key: 'fullname',
                label: 'ชื่อ-นามสกุล',
                type: 'text',
                required: true,
              },
              { key: 'email', label: 'อีเมล', type: 'email', required: true },
              { key: 'phone', label: 'เบอร์โทร', type: 'text' },
              { key: 'image', label: 'รูปโปรไฟล์', type: 'url' },
            ],
          },
        };
      }
      default:
        return this.getStudentOverview(userId);
    }
  }

  private validateCoursePayload(payload: Record<string, unknown>) {
    const courseName = this.ensureString(payload.courseName, 'courseName');
    const slug = this.slugify(this.ensureString(payload.slug, 'slug'));
    const shortDescription = this.ensureString(
      payload.shortDescription,
      'shortDescription',
    );
    const description = this.ensureString(payload.description, 'description');
    const category = this.ensureString(payload.category, 'category');
    const price = this.toNumber(payload.price);
    const discountPrice = payload.discountPrice
      ? this.toNumber(payload.discountPrice)
      : null;

    if (price < 0) {
      throw new BadRequestException('price must be at least 0');
    }

    if (discountPrice !== null && discountPrice > price) {
      throw new BadRequestException(
        'discountPrice must be less than or equal to price',
      );
    }

    return {
      courseName,
      slug,
      shortDescription,
      description,
      category,
      price,
      discountPrice,
      thumbnail: this.ensureString(payload.thumbnail, 'thumbnail'),
      level: typeof payload.level === 'string' ? payload.level : null,
      language: typeof payload.language === 'string' ? payload.language : null,
      duration: typeof payload.duration === 'string' ? payload.duration : null,
      seoTitle: typeof payload.seoTitle === 'string' ? payload.seoTitle : null,
      seoDescription:
        typeof payload.seoDescription === 'string'
          ? payload.seoDescription
          : null,
      certificateEnabled: Boolean(payload.certificateEnabled),
    };
  }

  private async saveCourse(
    actorId: string,
    payload: Record<string, unknown>,
    mode: 'admin' | 'instructor',
  ) {
    const data = this.validateCoursePayload(payload);
    const id = typeof payload.id === 'string' ? payload.id : '';
    const instructorId =
      mode === 'admin'
        ? typeof payload.instructorId === 'string' && payload.instructorId
          ? payload.instructorId
          : actorId
        : actorId;

    const input = {
      courseName: data.courseName,
      slug: data.slug,
      title: this.localizedInput(data.courseName) as Prisma.InputJsonValue,
      shortDescription: this.localizedInput(
        data.shortDescription,
      ) as Prisma.InputJsonValue,
      description: data.description,
      localizedDescription: this.localizedInput(
        data.description,
      ) as Prisma.InputJsonValue,
      category: data.category,
      thumbnail: data.thumbnail,
      price: this.toDecimal(data.price),
      discountPrice:
        data.discountPrice !== null ? this.toDecimal(data.discountPrice) : null,
      level: data.level,
      language: data.language as never,
      duration: data.duration,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      certificateEnabled: data.certificateEnabled,
      instructorId,
      tags: this.ensureArray(payload.tags),
      requirements: this.ensureArray(payload.requirements),
      willLearnMessages: this.ensureArray(payload.willLearnMessages),
      targetAudience: this.ensureArray(payload.targetAudience),
    };

    if (id) {
      const existingCourse = await this.prisma.course.findUnique({
        where: { id },
      });

      if (!existingCourse) {
        throw new NotFoundException('Course not found');
      }

      if (mode === 'instructor' && existingCourse.instructorId !== actorId) {
        throw new BadRequestException('You cannot edit this course');
      }

      const course = await this.prisma.course.update({
        where: { id },
        data: input,
      });

      await this.createAuditLog({
        actorId,
        module: 'courses',
        action: 'update',
        targetType: 'course',
        targetId: course.id,
        message: `อัปเดตคอร์ส ${course.courseName}`,
      });

      return course;
    }

    const course = await this.prisma.course.create({
      data: {
        ...input,
        workflowStatus: CourseWorkflowStatus.DRAFT,
        status: Status.DRAFT,
      },
    });

    await this.createAuditLog({
      actorId,
      module: 'courses',
      action: 'create',
      targetType: 'course',
      targetId: course.id,
      message: `สร้างคอร์ส ${course.courseName}`,
    });

    return course;
  }

  private async savePreviewVideo(
    actorId: string,
    payload: Record<string, unknown>,
    mode: 'admin' | 'instructor',
  ) {
    const courseId = this.ensureString(payload.courseId, 'courseId');
    const title = this.ensureString(payload.title, 'title');
    const url = this.ensureString(payload.url, 'url');
    const provider = this.getPreviewProvider(
      url,
      typeof payload.provider === 'string' ? payload.provider : undefined,
    );
    const id = typeof payload.id === 'string' ? payload.id : '';

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (mode === 'instructor' && course.instructorId !== actorId) {
      throw new BadRequestException(
        'You cannot manage preview videos for this course',
      );
    }

    const videoData = {
      courseId,
      createdById: actorId,
      provider,
      title,
      description:
        typeof payload.description === 'string' ? payload.description : null,
      url,
      thumbnailUrl:
        typeof payload.thumbnailUrl === 'string' ? payload.thumbnailUrl : null,
      durationSeconds: this.toNumber(payload.durationSeconds) || null,
      isFreePreview: Boolean(payload.isFreePreview),
      active: payload.active === undefined ? true : Boolean(payload.active),
    };

    const video = id
      ? await this.prisma.coursePreviewVideo.update({
          where: { id },
          data: videoData,
        })
      : await this.prisma.coursePreviewVideo.create({
          data: videoData,
        });

    if (video.active) {
      await this.prisma.course.update({
        where: { id: courseId },
        data: {
          previewVideoUrl: video.url,
          previewThumbnail: video.thumbnailUrl,
          videoPreview: video.url,
        },
      });
    }

    await this.createAuditLog({
      actorId,
      module: 'video-previews',
      action: id ? 'update' : 'create',
      targetType: 'course-preview-video',
      targetId: video.id,
      message: `${id ? 'อัปเดต' : 'เพิ่ม'}วิดีโอพรีวิว ${video.title}`,
    });

    return video;
  }

  private async savePromotion(
    actorId: string,
    payload: Record<string, unknown>,
  ) {
    const title = this.ensureString(payload.title, 'title');
    const slug = this.slugify(this.ensureString(payload.slug, 'slug'));
    const type = this.ensureString(payload.type, 'type') as PromotionType;
    const startDate = new Date(
      this.ensureString(payload.startDate, 'startDate'),
    );
    const endDate = new Date(this.ensureString(payload.endDate, 'endDate'));

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid promotion date');
    }

    if (startDate > endDate) {
      throw new BadRequestException(
        'Promotion startDate must be before endDate',
      );
    }

    const id = typeof payload.id === 'string' ? payload.id : '';
    const courseIds = this.ensureArray(payload.courseIds);
    const categoryKeys = this.ensureArray(payload.categoryKeys);
    const instructorIds = this.ensureArray(payload.instructorIds);

    const data = {
      slug,
      title: this.localizedInput(title) as Prisma.InputJsonValue,
      description:
        typeof payload.description === 'string'
          ? (this.localizedInput(payload.description) as Prisma.InputJsonValue)
          : undefined,
      type,
      discountAmount:
        payload.discountAmount !== undefined
          ? this.toDecimal(payload.discountAmount)
          : null,
      discount:
        this.toNumber(payload.discountAmount || payload.discount) || null,
      code:
        typeof payload.code === 'string' && payload.code.trim()
          ? payload.code.trim().toUpperCase()
          : null,
      promoCode:
        typeof payload.code === 'string' && payload.code.trim()
          ? payload.code.trim().toUpperCase()
          : null,
      banner: typeof payload.banner === 'string' ? payload.banner : null,
      minimumSpend:
        payload.minimumSpend !== undefined
          ? this.toDecimal(payload.minimumSpend)
          : null,
      usageLimit: this.toNumber(payload.usageLimit) || null,
      perUserLimit: this.toNumber(payload.perUserLimit) || null,
      priority: this.toNumber(payload.priority),
      stackable: Boolean(payload.stackable),
      scope:
        typeof payload.scope === 'string'
          ? (payload.scope as PromotionScopeType)
          : PromotionScopeType.GLOBAL,
      categoryKeys,
      instructorIds,
      startDate,
      endDate,
      active: Boolean(payload.active),
      themeKey:
        typeof payload.themeKey === 'string'
          ? (payload.themeKey as SeasonalThemeKey)
          : null,
    };

    const promotion = id
      ? await this.prisma.promotion.update({
          where: { id },
          data,
        })
      : await this.prisma.promotion.create({
          data,
        });

    await this.prisma.promotionCourse.deleteMany({
      where: { promotionId: promotion.id },
    });

    if (courseIds.length) {
      await this.prisma.promotionCourse.createMany({
        data: courseIds.map((courseId) => ({
          promotionId: promotion.id,
          courseId,
        })),
        skipDuplicates: true,
      });
    }

    await this.createAuditLog({
      actorId,
      module: 'promotions',
      action: id ? 'update' : 'create',
      targetType: 'promotion',
      targetId: promotion.id,
      message: `${id ? 'อัปเดต' : 'สร้าง'}โปรโมชัน ${title}`,
    });

    return promotion;
  }

  private async saveTheme(actorId: string, payload: Record<string, unknown>) {
    const key = this.ensureString(payload.key, 'key') as SeasonalThemeKey;
    const name = this.ensureString(payload.name, 'name');
    const id = typeof payload.id === 'string' ? payload.id : '';
    const startDate =
      typeof payload.startDate === 'string' && payload.startDate
        ? new Date(payload.startDate)
        : null;
    const endDate =
      typeof payload.endDate === 'string' && payload.endDate
        ? new Date(payload.endDate)
        : null;

    if (
      startDate &&
      endDate &&
      !Number.isNaN(startDate.getTime()) &&
      !Number.isNaN(endDate.getTime()) &&
      startDate > endDate
    ) {
      throw new BadRequestException('Theme startDate must be before endDate');
    }

    const data = {
      key,
      slug: this.slugify(key),
      name: this.localizedInput(name) as Prisma.InputJsonValue,
      activationMode:
        typeof payload.activationMode === 'string'
          ? (payload.activationMode as SeasonalThemeActivationMode)
          : SeasonalThemeActivationMode.MANUAL,
      startDate,
      endDate,
      bannerUrl:
        typeof payload.bannerUrl === 'string' ? payload.bannerUrl : null,
      backgroundUrl:
        typeof payload.backgroundUrl === 'string'
          ? payload.backgroundUrl
          : null,
      iconUrl: typeof payload.iconUrl === 'string' ? payload.iconUrl : null,
      primaryColor:
        typeof payload.primaryColor === 'string' ? payload.primaryColor : null,
      secondaryColor:
        typeof payload.secondaryColor === 'string'
          ? payload.secondaryColor
          : null,
      pageTargets: this.ensureArray(payload.pageTargets),
      lightConfig:
        typeof payload.lightConfig === 'object'
          ? (payload.lightConfig as Prisma.InputJsonValue)
          : undefined,
      darkConfig:
        typeof payload.darkConfig === 'object'
          ? (payload.darkConfig as Prisma.InputJsonValue)
          : undefined,
      active: Boolean(payload.active),
      previewMode: Boolean(payload.previewMode),
    };

    if (data.active) {
      await this.prisma.seasonalTheme.updateMany({
        data: {
          active: false,
        },
      });
    }

    const theme = id
      ? await this.prisma.seasonalTheme.update({
          where: { id },
          data,
        })
      : await this.prisma.seasonalTheme.create({
          data,
        });

    await this.createAuditLog({
      actorId,
      module: 'themes',
      action: id ? 'update' : 'create',
      targetType: 'theme',
      targetId: theme.id,
      message: `${id ? 'อัปเดต' : 'สร้าง'}ธีม ${name}`,
    });

    return theme;
  }

  private async saveSetting(actorId: string, payload: Record<string, unknown>) {
    const key = this.ensureString(payload.key, 'key');
    const label = this.ensureString(payload.label, 'label');
    const section = this.ensureString(payload.section, 'section');
    const id = typeof payload.id === 'string' ? payload.id : '';
    const value =
      typeof payload.value === 'string'
        ? (JSON.parse(payload.value) as Prisma.InputJsonValue)
        : (payload.value as Prisma.InputJsonValue);

    return id
      ? this.prisma.platformSetting.update({
          where: { id },
          data: {
            key,
            label,
            section: section as never,
            description:
              typeof payload.description === 'string'
                ? payload.description
                : null,
            value,
            updatedById: actorId,
          },
        })
      : this.prisma.platformSetting.create({
          data: {
            key,
            label,
            section: section as never,
            description:
              typeof payload.description === 'string'
                ? payload.description
                : null,
            value,
            updatedById: actorId,
          },
        });
  }

  private async saveExercise(
    actorId: string,
    payload: Record<string, unknown>,
    mode: 'admin' | 'instructor',
  ) {
    const title = this.ensureString(payload.title, 'title');
    const description = this.ensureString(payload.description, 'description');
    const category = this.ensureString(payload.category, 'category');
    const id = typeof payload.id === 'string' ? payload.id : '';
    const courseId =
      typeof payload.courseId === 'string' && payload.courseId
        ? payload.courseId
        : null;
    const instructorId =
      mode === 'instructor'
        ? actorId
        : typeof payload.instructorId === 'string'
          ? payload.instructorId
          : actorId;
    const questionsValue = payload.questions;
    const questions =
      typeof questionsValue === 'string'
        ? (JSON.parse(questionsValue) as Array<Record<string, unknown>>)
        : Array.isArray(questionsValue)
          ? questionsValue
          : [];

    if (!questions.length) {
      throw new BadRequestException('questions is required');
    }

    const exerciseData = {
      courseId,
      instructorId,
      title,
      description,
      category,
      difficulty:
        typeof payload.difficulty === 'string'
          ? (payload.difficulty as DifficultyLevel)
          : DifficultyLevel.MEDIUM,
      score: this.toNumber(payload.score) || 100,
      timeLimitMinutes: this.toNumber(payload.timeLimitMinutes) || null,
      passingScore: this.toNumber(payload.passingScore) || 60,
      randomizeQuestions: Boolean(payload.randomizeQuestions),
      placement:
        typeof payload.placement === 'string'
          ? (payload.placement as SkillExercisePlacement)
          : SkillExercisePlacement.OPTIONAL,
      status:
        typeof payload.status === 'string'
          ? (payload.status as SkillExerciseStatus)
          : SkillExerciseStatus.DRAFT,
    };

    const exercise = id
      ? await this.prisma.skillExercise.update({
          where: { id },
          data: exerciseData,
        })
      : await this.prisma.skillExercise.create({
          data: exerciseData,
        });

    await this.prisma.skillQuestion.deleteMany({
      where: { exerciseId: exercise.id },
    });

    await this.prisma.skillQuestion.createMany({
      data: questions.map((question, index) => ({
        exerciseId: exercise.id,
        type:
          typeof question.type === 'string'
            ? (question.type as SkillQuestionType)
            : SkillQuestionType.MULTIPLE_CHOICE,
        prompt: String(question.prompt ?? ''),
        options:
          typeof question.options === 'undefined'
            ? Prisma.JsonNull
            : (question.options as Prisma.InputJsonValue),
        answerKey:
          typeof question.answerKey === 'undefined'
            ? Prisma.JsonNull
            : (question.answerKey as Prisma.InputJsonValue),
        explanation:
          typeof question.explanation === 'string'
            ? question.explanation
            : null,
        points: this.toNumber(question.points) || 1,
        order: this.toNumber(question.order) || index + 1,
      })),
    });

    await this.createAuditLog({
      actorId,
      module: 'skill-exercises',
      action: id ? 'update' : 'create',
      targetType: 'skill-exercise',
      targetId: exercise.id,
      message: `${id ? 'อัปเดต' : 'สร้าง'}แบบฝึก ${title}`,
    });

    return exercise;
  }

  private async saveUser(actorId: string, payload: Record<string, unknown>) {
    const fullname = this.ensureString(payload.fullname, 'fullname');
    const email = this.ensureString(payload.email, 'email');
    const role = this.ensureString(payload.role, 'role') as Role;
    const id = typeof payload.id === 'string' ? payload.id : '';
    const requestedRoles = this.ensureArray(payload.roles);
    const roles = normalizeRoles(
      role,
      (requestedRoles.length ? requestedRoles : [role]) as Role[],
    );

    if (id) {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          fullname,
          email,
          role,
          roles,
          preferredWorkspace: role,
        },
      });

      await this.createAuditLog({
        actorId,
        module: 'users',
        action: 'update',
        targetType: 'user',
        targetId: user.id,
        message: `อัปเดตผู้ใช้ ${fullname}`,
      });

      return user;
    }

    const password = this.ensureString(payload.password, 'password');
    const hashedPassword = await this.bcryptService.hash(password);
    const user = await this.prisma.user.create({
      data: {
        fullname,
        email,
        password: hashedPassword,
        role,
        roles,
        preferredWorkspace: role,
      },
    });

    await this.createAuditLog({
      actorId,
      module: 'users',
      action: 'create',
      targetType: 'user',
      targetId: user.id,
      message: `สร้างผู้ใช้ ${fullname}`,
    });

    return user;
  }

  private async saveInstructorProfile(
    actorId: string,
    payload: Record<string, unknown>,
    mode: 'admin' | 'instructor',
  ) {
    const displayName = this.ensureString(payload.displayName, 'displayName');
    const bio = this.ensureString(payload.bio, 'bio');
    const id = typeof payload.id === 'string' ? payload.id : '';

    const existing =
      id !== ''
        ? await this.prisma.instructorProfile.findUnique({
            where: { id },
          })
        : await this.prisma.instructorProfile.findUnique({
            where: { userId: actorId },
          });

    const userId =
      mode === 'instructor'
        ? actorId
        : (existing?.userId ??
          (typeof payload.userId === 'string' ? payload.userId : actorId));

    if (mode === 'instructor' && existing && existing.userId !== actorId) {
      throw new BadRequestException('You cannot edit this instructor profile');
    }

    const data = {
      userId,
      displayName,
      bio: this.localizedInput(bio) as Prisma.InputJsonValue,
      headline:
        typeof payload.headline === 'string'
          ? (this.localizedInput(payload.headline) as Prisma.InputJsonValue)
          : undefined,
      specialties: this.ensureArray(payload.specialties),
      expertiseAreas: this.ensureArray(payload.specialties),
      portfolioUrl:
        typeof payload.portfolioUrl === 'string' ? payload.portfolioUrl : null,
      contactEmail:
        typeof payload.contactEmail === 'string' ? payload.contactEmail : null,
      payoutAccount:
        typeof payload.payoutAccount === 'string'
          ? payload.payoutAccount
          : null,
      visible: payload.visible === undefined ? true : Boolean(payload.visible),
    };

    const profile = existing
      ? await this.prisma.instructorProfile.update({
          where: { id: existing.id },
          data,
        })
      : await this.prisma.instructorProfile.create({
          data,
        });

    await this.createAuditLog({
      actorId,
      module: 'instructors',
      action: existing ? 'update' : 'create',
      targetType: 'instructor-profile',
      targetId: profile.id,
      message: `${existing ? 'อัปเดต' : 'สร้าง'}โปรไฟล์ผู้สอน ${displayName}`,
    });

    return profile;
  }

  private async submitInstructorApplication(
    actorId: string,
    payload: Record<string, unknown>,
  ) {
    const displayName = this.ensureString(payload.displayName, 'displayName');
    const shortBio = this.ensureString(payload.shortBio, 'shortBio');
    const expertise = this.ensureArray(payload.expertise);
    const teachingCategories = this.ensureArray(payload.teachingCategories);

    if (!expertise.length || !teachingCategories.length) {
      throw new BadRequestException(
        'expertise and teachingCategories are required',
      );
    }

    const latest = await this.prisma.instructorApplication.findFirst({
      where: { userId: actorId },
      orderBy: { createdAt: 'desc' },
    });

    const data = {
      userId: actorId,
      displayName,
      shortBio,
      expertise,
      teachingCategories,
      experienceYears: this.toNumber(payload.experienceYears) || null,
      portfolioUrl:
        typeof payload.portfolioUrl === 'string' ? payload.portfolioUrl : null,
      payoutAccount:
        typeof payload.payoutAccount === 'string'
          ? payload.payoutAccount
          : null,
      contactChannel:
        typeof payload.payoutAccount === 'string'
          ? payload.payoutAccount
          : null,
      identityDocumentUrl:
        typeof payload.identityDocumentUrl === 'string'
          ? payload.identityDocumentUrl
          : null,
      status: InstructorApplicationStatus.PENDING,
      applicantNotes:
        typeof payload.applicantNotes === 'string'
          ? payload.applicantNotes
          : null,
    };

    const application = latest
      ? await this.prisma.instructorApplication.update({
          where: { id: latest.id },
          data,
        })
      : await this.prisma.instructorApplication.create({
          data,
        });

    await this.notify({
      audience: NotificationAudience.ADMIN,
      level: NotificationLevel.WARNING,
      title: 'มีผู้สมัครเป็นผู้สอนใหม่',
      body: `${displayName} ส่งคำขอสมัครเป็นผู้สอนแล้ว`,
      link: '/admin/instructor-applications',
      actorId,
      metadata: { applicationId: application.id } as Prisma.InputJsonValue,
    });

    await this.createAuditLog({
      actorId,
      module: 'instructor-applications',
      action: latest ? 'update' : 'create',
      targetType: 'instructor-application',
      targetId: application.id,
      message: `${latest ? 'อัปเดต' : 'ส่ง'}คำขอสมัครเป็นผู้สอน`,
    });

    return application;
  }

  async applyAdminAction(
    section: string,
    dto: WorkspaceActionDto,
    adminId: string,
  ) {
    const payload = dto.payload ?? {};

    switch (section) {
      case 'courses': {
        if (dto.action === 'save_course') {
          await this.saveCourse(adminId, payload, 'admin');
          return { message: 'บันทึกคอร์สเรียบร้อยแล้ว' };
        }

        if (dto.action === 'delete_course') {
          const courseId = this.ensureString(
            payload.id ?? payload.courseId,
            'courseId',
          );
          await this.prisma.course.delete({ where: { id: courseId } });
          await this.createAuditLog({
            actorId: adminId,
            module: 'courses',
            action: 'delete',
            targetType: 'course',
            targetId: courseId,
            message: 'ลบคอร์สออกจากระบบ',
          });
          return { message: 'ลบคอร์สเรียบร้อยแล้ว' };
        }

        if (dto.action === 'duplicate_course') {
          const courseId = this.ensureString(
            payload.id ?? payload.courseId,
            'courseId',
          );
          const course = await this.prisma.course.findUnique({
            where: { id: courseId },
          });
          if (!course) {
            throw new NotFoundException('Course not found');
          }
          const duplicated = await this.prisma.course.create({
            data: {
              slug: `${course.slug ?? this.slugify(course.courseName)}-copy-${Date.now()}`,
              courseName: `${course.courseName} (สำเนา)`,
              title:
                course.title === null
                  ? Prisma.JsonNull
                  : (course.title as Prisma.InputJsonValue),
              shortDescription:
                course.shortDescription === null
                  ? Prisma.JsonNull
                  : (course.shortDescription as Prisma.InputJsonValue),
              description: course.description,
              localizedDescription:
                course.localizedDescription === null
                  ? Prisma.JsonNull
                  : (course.localizedDescription as Prisma.InputJsonValue),
              category: course.category,
              categoryId: course.categoryId,
              coverImage: course.coverImage,
              thumbnail: course.thumbnail,
              videoPreview: course.videoPreview,
              previewVideoUrl: course.previewVideoUrl,
              previewThumbnail: course.previewThumbnail,
              price: course.price,
              discount: course.discount,
              discountPrice: course.discountPrice,
              level: course.level,
              badge: course.badge,
              tags: course.tags,
              status: Status.DRAFT,
              workflowStatus: CourseWorkflowStatus.DRAFT,
              sourceType: course.sourceType,
              currentVersion: 1,
              isPopular: false,
              isFeatured: false,
              isPublished: false,
              closedEnrollment: false,
              hiddenFromCatalog: false,
              certificateEnabled: course.certificateEnabled,
              publishedAt: null,
              approvalRequestedAt: null,
              lastSubmittedAt: null,
              approvedAt: null,
              approvedById: null,
              rejectionReason: null,
              revisionNotes: null,
              learnerCount: 0,
              reviewCount: 0,
              averageRating: null,
              duration: course.duration,
              language: course.language,
              instructorId: course.instructorId,
              displayInstructorId: course.displayInstructorId,
              targetAudience: course.targetAudience,
              seoTitle: course.seoTitle,
              seoDescription: course.seoDescription,
              willLearnMessages: course.willLearnMessages,
              requirements: course.requirements,
            },
          });
          await this.createAuditLog({
            actorId: adminId,
            module: 'courses',
            action: 'duplicate',
            targetType: 'course',
            targetId: duplicated.id,
            message: `ทำสำเนาคอร์ส ${course.courseName}`,
          });
          return { message: 'ทำสำเนาคอร์สเรียบร้อยแล้ว' };
        }

        if (dto.action === 'update_course_status') {
          const courseId = this.ensureString(
            payload.id ?? payload.courseId,
            'courseId',
          );
          const status = this.ensureString(payload.status, 'status');
          const nextData: Prisma.CourseUpdateInput = {};

          if (status === 'เผยแพร่แล้ว') {
            nextData.isPublished = true;
            nextData.workflowStatus = CourseWorkflowStatus.PUBLISHED;
            nextData.status = Status.ACTIVE;
            nextData.publishedAt = new Date();
          } else if (status === 'แบบร่าง') {
            nextData.isPublished = false;
            nextData.workflowStatus = CourseWorkflowStatus.DRAFT;
            nextData.status = Status.DRAFT;
          } else if (status === 'ซ่อนอยู่') {
            nextData.hiddenFromCatalog = true;
          } else if (status === 'ปิดรับสมัคร') {
            nextData.closedEnrollment = true;
          }

          await this.prisma.course.update({
            where: { id: courseId },
            data: nextData,
          });
          return { message: 'อัปเดตสถานะคอร์สเรียบร้อยแล้ว' };
        }
        break;
      }

      case 'video-previews': {
        if (dto.action === 'save_preview_video') {
          await this.savePreviewVideo(adminId, payload, 'admin');
          return { message: 'บันทึกวิดีโอพรีวิวเรียบร้อยแล้ว' };
        }

        if (dto.action === 'toggle_preview_video') {
          const id = this.ensureString(payload.id, 'id');
          const current = await this.prisma.coursePreviewVideo.findUnique({
            where: { id },
          });
          if (!current) {
            throw new NotFoundException('Preview video not found');
          }
          await this.prisma.coursePreviewVideo.update({
            where: { id },
            data: { active: !current.active },
          });
          return { message: 'อัปเดตสถานะวิดีโอพรีวิวเรียบร้อยแล้ว' };
        }

        if (dto.action === 'delete_preview_video') {
          const id = this.ensureString(payload.id, 'id');
          await this.prisma.coursePreviewVideo.delete({ where: { id } });
          return { message: 'ลบวิดีโอพรีวิวเรียบร้อยแล้ว' };
        }
        break;
      }

      case 'course-approvals': {
        const reviewId = this.ensureString(
          payload.id ?? payload.reviewId,
          'reviewId',
        );
        const review = await this.prisma.pendingCourseReview.findUnique({
          where: { id: reviewId },
          include: {
            course: true,
          },
        });
        if (!review) {
          throw new NotFoundException('Pending course review not found');
        }

        if (dto.action === 'approve_course_review') {
          await this.prisma.pendingCourseReview.update({
            where: { id: reviewId },
            data: {
              status: CourseReviewStatus.APPROVED,
              reviewedById: adminId,
              reviewedAt: new Date(),
              approvedAt: new Date(),
              adminNotes:
                typeof payload.adminNotes === 'string'
                  ? payload.adminNotes
                  : review.adminNotes,
            },
          });
          await this.prisma.course.update({
            where: { id: review.courseId },
            data: {
              workflowStatus: CourseWorkflowStatus.APPROVED,
              status: Status.ACTIVE,
              approvedById: adminId,
              approvedAt: new Date(),
              revisionNotes: null,
            },
          });
          await this.notify({
            recipientId: review.instructorId,
            audience: NotificationAudience.INSTRUCTOR,
            level: NotificationLevel.SUCCESS,
            title: 'คอร์สของคุณได้รับการอนุมัติแล้ว',
            body: `${review.course.courseName} ผ่านการอนุมัติจากผู้ดูแลระบบ`,
            link: '/instructor/courses',
            actorId: adminId,
          });
          return { message: 'อนุมัติคอร์สเรียบร้อยแล้ว' };
        }

        if (dto.action === 'request_course_changes') {
          const adminNotes = this.ensureString(
            payload.adminNotes,
            'adminNotes',
          );
          await this.prisma.pendingCourseReview.update({
            where: { id: reviewId },
            data: {
              status: CourseReviewStatus.NEEDS_REVISION,
              reviewedById: adminId,
              reviewedAt: new Date(),
              adminNotes,
              rejectionTemplate:
                typeof payload.rejectionTemplate === 'string'
                  ? payload.rejectionTemplate
                  : null,
            },
          });
          await this.prisma.course.update({
            where: { id: review.courseId },
            data: {
              workflowStatus: CourseWorkflowStatus.NEEDS_REVISION,
              revisionNotes: adminNotes,
            },
          });
          await this.notify({
            recipientId: review.instructorId,
            audience: NotificationAudience.INSTRUCTOR,
            level: NotificationLevel.WARNING,
            title: 'คอร์สต้องแก้ไขเพิ่มเติม',
            body: adminNotes,
            link: '/instructor/courses',
            actorId: adminId,
          });
          return { message: 'ส่งคอร์สกลับไปแก้ไขแล้ว' };
        }

        if (dto.action === 'reject_course_review') {
          const adminNotes = this.ensureString(
            payload.adminNotes ?? 'คอร์สไม่ผ่านการอนุมัติ',
            'adminNotes',
          );
          await this.prisma.pendingCourseReview.update({
            where: { id: reviewId },
            data: {
              status: CourseReviewStatus.REJECTED,
              reviewedById: adminId,
              reviewedAt: new Date(),
              adminNotes,
              rejectionTemplate:
                typeof payload.rejectionTemplate === 'string'
                  ? payload.rejectionTemplate
                  : null,
            },
          });
          await this.prisma.course.update({
            where: { id: review.courseId },
            data: {
              workflowStatus: CourseWorkflowStatus.REJECTED,
              rejectionReason: adminNotes,
              isPublished: false,
              status: Status.DRAFT,
            },
          });
          await this.notify({
            recipientId: review.instructorId,
            audience: NotificationAudience.INSTRUCTOR,
            level: NotificationLevel.ERROR,
            title: 'คอร์สของคุณไม่ผ่านการอนุมัติ',
            body: adminNotes,
            link: '/instructor/courses',
            actorId: adminId,
          });
          return { message: 'ปฏิเสธคอร์สเรียบร้อยแล้ว' };
        }
        break;
      }

      case 'promotions': {
        if (dto.action === 'save_promotion') {
          await this.savePromotion(adminId, payload);
          return { message: 'บันทึกโปรโมชันเรียบร้อยแล้ว' };
        }

        if (dto.action === 'toggle_promotion_active') {
          const id = this.ensureString(payload.id, 'id');
          const current = await this.prisma.promotion.findUnique({
            where: { id },
          });
          if (!current) {
            throw new NotFoundException('Promotion not found');
          }
          await this.prisma.promotion.update({
            where: { id },
            data: { active: !current.active },
          });
          return { message: 'อัปเดตสถานะโปรโมชันเรียบร้อยแล้ว' };
        }

        if (dto.action === 'delete_promotion') {
          const id = this.ensureString(payload.id, 'id');
          await this.prisma.promotion.delete({ where: { id } });
          return { message: 'ลบโปรโมชันเรียบร้อยแล้ว' };
        }
        break;
      }

      case 'themes': {
        if (dto.action === 'save_theme') {
          await this.saveTheme(adminId, payload);
          return { message: 'บันทึกธีมเรียบร้อยแล้ว' };
        }

        if (dto.action === 'activate_theme') {
          const id = this.ensureString(
            payload.id ?? payload.themeId,
            'themeId',
          );
          await this.prisma.seasonalTheme.updateMany({
            data: { active: false },
          });
          await this.prisma.seasonalTheme.update({
            where: { id },
            data: { active: true, previewMode: false },
          });
          return { message: 'เปิดใช้งานธีมเรียบร้อยแล้ว' };
        }

        if (dto.action === 'delete_theme') {
          const id = this.ensureString(payload.id, 'id');
          await this.prisma.seasonalTheme.delete({
            where: { id },
          });
          return { message: 'ลบธีมเรียบร้อยแล้ว' };
        }
        break;
      }

      case 'settings': {
        if (dto.action === 'save_setting') {
          await this.saveSetting(adminId, payload);
          return { message: 'บันทึกการตั้งค่าเรียบร้อยแล้ว' };
        }

        if (dto.action === 'reset_setting') {
          const id = this.ensureString(payload.id, 'id');
          const setting = await this.prisma.platformSetting.findUnique({
            where: { id },
          });
          if (!setting) {
            throw new NotFoundException('Setting not found');
          }
          await this.prisma.platformSetting.update({
            where: { id },
            data: {
              value: (setting.defaultValue ??
                setting.value ??
                Prisma.JsonNull) as Prisma.InputJsonValue,
              updatedById: adminId,
            },
          });
          return { message: 'คืนค่าการตั้งค่าเรียบร้อยแล้ว' };
        }
        break;
      }

      case 'content-review-queue': {
        const id = this.ensureString(payload.id, 'id');
        const nextStatus =
          dto.action === 'approve_content_review'
            ? ReviewQueueStatus.APPROVED
            : dto.action === 'request_content_changes'
              ? ReviewQueueStatus.NEEDS_CHANGES
              : dto.action === 'hide_content_review'
                ? ReviewQueueStatus.HIDDEN
                : dto.action === 'delete_content_review'
                  ? ReviewQueueStatus.DELETED
                  : null;

        if (nextStatus) {
          await this.prisma.contentReviewQueue.update({
            where: { id },
            data: {
              status: nextStatus,
              reviewedById: adminId,
              reviewedAt: new Date(),
              reviewerNotes:
                typeof payload.notes === 'string' ? payload.notes : undefined,
            },
          });
          return { message: 'อัปเดตสถานะคอนเทนต์เรียบร้อยแล้ว' };
        }
        break;
      }

      case 'ai-draft-approval': {
        const id = this.ensureString(payload.id, 'id');
        const draft = await this.prisma.aiDraft.findUnique({
          where: { id },
          include: { course: true },
        });
        if (!draft) {
          throw new NotFoundException('AI draft not found');
        }

        if (dto.action === 'approve_ai_draft') {
          await this.prisma.aiDraft.update({
            where: { id },
            data: {
              status: AiDraftStatus.APPROVED,
              approvedById: adminId,
            },
          });
          await this.prisma.aiDraftApproval.create({
            data: {
              draftId: id,
              reviewerId: adminId,
              previousStatus: draft.status,
              nextStatus: AiDraftStatus.APPROVED,
              notes:
                typeof payload.notes === 'string'
                  ? payload.notes
                  : 'อนุมัติ AI Draft',
            },
          });
          return { message: 'อนุมัติ AI Draft เรียบร้อยแล้ว' };
        }

        if (dto.action === 'reject_ai_draft') {
          await this.prisma.aiDraft.update({
            where: { id },
            data: {
              status: AiDraftStatus.DRAFT,
              reviewNotes: this.localizedInput(
                typeof payload.notes === 'string'
                  ? payload.notes
                  : 'ไม่อนุมัติ',
              ) as Prisma.InputJsonValue,
            },
          });
          await this.prisma.aiDraftApproval.create({
            data: {
              draftId: id,
              reviewerId: adminId,
              previousStatus: draft.status,
              nextStatus: AiDraftStatus.DRAFT,
              notes:
                typeof payload.notes === 'string'
                  ? payload.notes
                  : 'ปฏิเสธ AI Draft',
            },
          });
          return { message: 'ปฏิเสธ AI Draft เรียบร้อยแล้ว' };
        }

        if (dto.action === 'edit_ai_draft') {
          await this.prisma.aiDraft.update({
            where: { id },
            data: {
              title:
                typeof payload.title === 'string' ? payload.title : draft.title,
              content:
                typeof payload.content === 'string'
                  ? (JSON.parse(payload.content) as Prisma.InputJsonValue)
                  : (payload.content as Prisma.InputJsonValue),
              editedById: adminId,
              status: AiDraftStatus.EDITED,
            },
          });
          return { message: 'บันทึก AI Draft เรียบร้อยแล้ว' };
        }

        if (dto.action === 'send_ai_draft_to_queue') {
          await this.prisma.contentReviewQueue.create({
            data: {
              contentType: ReviewQueueContentType.AI_DRAFT,
              sourceModule: 'ai-draft-approval',
              sourceId: draft.id,
              courseId: draft.courseId,
              submittedById: adminId,
              status: ReviewQueueStatus.PENDING,
              priority: PriorityLevel.MEDIUM,
              previewText: draft.title,
              afterContent: (draft.content ??
                Prisma.JsonNull) as Prisma.InputJsonValue,
            },
          });
          return { message: 'ส่ง AI Draft เข้า Content Queue แล้ว' };
        }
        break;
      }

      case 'skill-exercises': {
        if (dto.action === 'save_exercise') {
          await this.saveExercise(adminId, payload, 'admin');
          return { message: 'บันทึกแบบฝึกเรียบร้อยแล้ว' };
        }

        if (dto.action === 'toggle_exercise_status') {
          const id = this.ensureString(payload.id, 'id');
          const current = await this.prisma.skillExercise.findUnique({
            where: { id },
          });
          if (!current) {
            throw new NotFoundException('Skill exercise not found');
          }
          await this.prisma.skillExercise.update({
            where: { id },
            data: {
              status:
                current.status === SkillExerciseStatus.ACTIVE
                  ? SkillExerciseStatus.INACTIVE
                  : SkillExerciseStatus.ACTIVE,
            },
          });
          return { message: 'อัปเดตสถานะแบบฝึกเรียบร้อยแล้ว' };
        }

        if (dto.action === 'delete_exercise') {
          const id = this.ensureString(payload.id, 'id');
          await this.prisma.skillExercise.delete({ where: { id } });
          return { message: 'ลบแบบฝึกเรียบร้อยแล้ว' };
        }
        break;
      }

      case 'users': {
        if (dto.action === 'save_user') {
          await this.saveUser(adminId, payload);
          return { message: 'บันทึกผู้ใช้งานเรียบร้อยแล้ว' };
        }

        if (dto.action === 'suspend_user' || dto.action === 'activate_user') {
          const id = this.ensureString(payload.id, 'id');
          const suspended = dto.action === 'suspend_user';
          await this.prisma.user.update({
            where: { id },
            data: {
              isSuspended: suspended,
              isActive: !suspended,
            },
          });
          return {
            message: suspended
              ? 'ระงับบัญชีผู้ใช้งานแล้ว'
              : 'เปิดใช้งานบัญชีผู้ใช้งานแล้ว',
          };
        }

        if (dto.action === 'delete_user') {
          const id = this.ensureString(payload.id, 'id');
          await this.prisma.user.delete({
            where: { id },
          });
          return { message: 'ลบผู้ใช้งานเรียบร้อยแล้ว' };
        }
        break;
      }

      case 'instructors': {
        if (dto.action === 'save_instructor_profile') {
          await this.saveInstructorProfile(adminId, payload, 'admin');
          return { message: 'บันทึกข้อมูลผู้สอนเรียบร้อยแล้ว' };
        }

        if (dto.action === 'toggle_instructor_visibility') {
          const id = this.ensureString(payload.id, 'id');
          const current = await this.prisma.instructorProfile.findUnique({
            where: { id },
          });
          if (!current) {
            throw new NotFoundException('Instructor profile not found');
          }
          await this.prisma.instructorProfile.update({
            where: { id },
            data: { visible: !current.visible },
          });
          return { message: 'อัปเดตสถานะผู้สอนเรียบร้อยแล้ว' };
        }
        break;
      }

      case 'instructor-applications': {
        const id = this.ensureString(payload.id, 'id');
        const application = await this.prisma.instructorApplication.findUnique({
          where: { id },
          include: {
            user: true,
          },
        });

        if (!application) {
          throw new NotFoundException('Instructor application not found');
        }

        if (dto.action === 'approve_instructor_application') {
          const roles = normalizeRoles(Role.INSTRUCTOR, [
            ...application.user.roles,
            Role.INSTRUCTOR,
          ]);

          await this.prisma.$transaction(async (tx) => {
            const profile = await tx.instructorProfile.upsert({
              where: { userId: application.userId },
              update: {
                displayName: application.displayName,
                bio: this.localizedInput(
                  application.shortBio,
                ) as Prisma.InputJsonValue,
                specialties: application.expertise,
                expertiseAreas: application.expertise,
                payoutAccount: application.payoutAccount,
                contactEmail: application.user.email,
                portfolioUrl: application.portfolioUrl,
                visible: true,
              },
              create: {
                userId: application.userId,
                displayName: application.displayName,
                bio: this.localizedInput(
                  application.shortBio,
                ) as Prisma.InputJsonValue,
                headline: this.localizedInput(
                  'ผู้สอน Learney',
                ) as Prisma.InputJsonValue,
                specialties: application.expertise,
                expertiseAreas: application.expertise,
                payoutAccount: application.payoutAccount,
                contactEmail: application.user.email,
                portfolioUrl: application.portfolioUrl,
                visible: true,
              },
            });

            await tx.user.update({
              where: { id: application.userId },
              data: {
                role: Role.INSTRUCTOR,
                roles,
                preferredWorkspace: Role.INSTRUCTOR,
              },
            });

            await tx.instructorApplication.update({
              where: { id },
              data: {
                status: InstructorApplicationStatus.APPROVED,
                reviewedById: adminId,
                reviewedAt: new Date(),
                adminNotes:
                  typeof payload.adminNotes === 'string'
                    ? payload.adminNotes
                    : null,
                instructorProfileId: profile.id,
              },
            });
          });

          await this.notify({
            recipientId: application.userId,
            audience: NotificationAudience.INSTRUCTOR,
            level: NotificationLevel.SUCCESS,
            title: 'คำขอสมัครเป็นผู้สอนได้รับการอนุมัติ',
            body: 'ตอนนี้คุณสามารถเข้าใช้งานพื้นที่ผู้สอนได้แล้ว',
            link: '/instructor',
            actorId: adminId,
          });

          return { message: 'อนุมัติผู้สอนเรียบร้อยแล้ว' };
        }

        if (dto.action === 'request_instructor_application_changes') {
          const adminNotes = this.ensureString(
            payload.adminNotes,
            'adminNotes',
          );
          await this.prisma.instructorApplication.update({
            where: { id },
            data: {
              status: InstructorApplicationStatus.NEEDS_CHANGES,
              reviewedById: adminId,
              reviewedAt: new Date(),
              adminNotes,
            },
          });
          await this.notify({
            recipientId: application.userId,
            audience: NotificationAudience.STUDENT,
            level: NotificationLevel.WARNING,
            title: 'คำขอสมัครเป็นผู้สอนต้องแก้ไขข้อมูล',
            body: adminNotes,
            link: '/student/become-instructor',
            actorId: adminId,
          });
          return { message: 'ส่งคำขอกลับไปแก้ไขแล้ว' };
        }

        if (dto.action === 'reject_instructor_application') {
          const adminNotes = this.ensureString(
            payload.adminNotes ?? 'คำขอไม่ผ่านการอนุมัติ',
            'adminNotes',
          );
          await this.prisma.instructorApplication.update({
            where: { id },
            data: {
              status: InstructorApplicationStatus.REJECTED,
              reviewedById: adminId,
              reviewedAt: new Date(),
              adminNotes,
            },
          });
          await this.notify({
            recipientId: application.userId,
            audience: NotificationAudience.STUDENT,
            level: NotificationLevel.ERROR,
            title: 'คำขอสมัครเป็นผู้สอนไม่ผ่านการอนุมัติ',
            body: adminNotes,
            link: '/student/become-instructor',
            actorId: adminId,
          });
          return { message: 'ปฏิเสธคำขอสมัครเป็นผู้สอนเรียบร้อยแล้ว' };
        }
        break;
      }

      case 'notifications': {
        if (dto.action === 'mark_notification_read') {
          const id = this.ensureString(payload.id, 'id');
          await this.prisma.notificationLog.update({
            where: { id },
            data: { isRead: true },
          });
          return { message: 'ทำเครื่องหมายว่าอ่านแล้ว' };
        }
        break;
      }
    }

    return { message: 'ไม่มีการดำเนินการ' };
  }

  async applyInstructorAction(
    userId: string,
    section: string,
    dto: WorkspaceActionDto,
  ) {
    const payload = dto.payload ?? {};

    switch (section) {
      case 'courses': {
        if (dto.action === 'save_course') {
          await this.saveCourse(userId, payload, 'instructor');
          return { message: 'บันทึกคอร์สเรียบร้อยแล้ว' };
        }

        if (dto.action === 'submit_course_review') {
          const courseId = this.ensureString(
            payload.id ?? payload.courseId,
            'courseId',
          );
          const course = await this.prisma.course.findUnique({
            where: { id: courseId },
          });
          if (!course || course.instructorId !== userId) {
            throw new NotFoundException('Course not found');
          }

          const existingReview =
            await this.prisma.pendingCourseReview.findFirst({
              where: {
                courseId,
                instructorId: userId,
              },
              orderBy: {
                createdAt: 'desc',
              },
            });

          const version = (existingReview?.version ?? 0) + 1;

          if (existingReview) {
            await this.prisma.pendingCourseReview.update({
              where: { id: existingReview.id },
              data: {
                status: CourseReviewStatus.PENDING_APPROVAL,
                version,
                submissionReason:
                  typeof payload.submissionReason === 'string'
                    ? payload.submissionReason
                    : null,
                instructorNotes:
                  typeof payload.instructorNotes === 'string'
                    ? payload.instructorNotes
                    : null,
                lastSubmittedAt: new Date(),
              },
            });
          } else {
            await this.prisma.pendingCourseReview.create({
              data: {
                courseId,
                instructorId: userId,
                status: CourseReviewStatus.PENDING_APPROVAL,
                version,
                submissionReason:
                  typeof payload.submissionReason === 'string'
                    ? payload.submissionReason
                    : null,
                instructorNotes:
                  typeof payload.instructorNotes === 'string'
                    ? payload.instructorNotes
                    : null,
                lastSubmittedAt: new Date(),
              },
            });
          }

          await this.prisma.course.update({
            where: { id: courseId },
            data: {
              workflowStatus: CourseWorkflowStatus.PENDING_APPROVAL,
              status: Status.PENDING,
              lastSubmittedAt: new Date(),
              approvalRequestedAt: new Date(),
            },
          });

          await this.notify({
            audience: NotificationAudience.ADMIN,
            level: NotificationLevel.WARNING,
            title: 'มีคอร์สรออนุมัติใหม่',
            body: `${course.courseName} ถูกส่งเข้าตรวจแล้ว`,
            link: '/admin/course-approvals',
            actorId: userId,
          });

          return { message: 'ส่งคอร์สเข้าตรวจเรียบร้อยแล้ว' };
        }

        if (dto.action === 'duplicate_course') {
          return this.applyAdminAction('courses', dto, userId);
        }

        if (dto.action === 'delete_own_course') {
          const courseId = this.ensureString(
            payload.id ?? payload.courseId,
            'courseId',
          );
          const course = await this.prisma.course.findUnique({
            where: { id: courseId },
          });
          if (!course || course.instructorId !== userId) {
            throw new NotFoundException('Course not found');
          }

          if (course.isPublished) {
            throw new BadRequestException('Published course cannot be deleted');
          }

          await this.prisma.course.delete({ where: { id: courseId } });
          return { message: 'ลบคอร์สเรียบร้อยแล้ว' };
        }
        break;
      }

      case 'skill-exercises': {
        if (dto.action === 'save_exercise') {
          await this.saveExercise(userId, payload, 'instructor');
          return { message: 'บันทึกแบบฝึกเรียบร้อยแล้ว' };
        }

        if (
          dto.action === 'toggle_exercise_status' ||
          dto.action === 'delete_exercise'
        ) {
          return this.applyAdminAction('skill-exercises', dto, userId);
        }
        break;
      }

      case 'profile': {
        if (dto.action === 'save_instructor_profile') {
          await this.saveInstructorProfile(userId, payload, 'instructor');
          return { message: 'บันทึกโปรไฟล์ผู้สอนเรียบร้อยแล้ว' };
        }
        break;
      }

      case 'notifications': {
        if (dto.action === 'mark_notification_read') {
          const id = this.ensureString(payload.id, 'id');
          await this.prisma.notificationLog.update({
            where: { id },
            data: { isRead: true },
          });
          return { message: 'ทำเครื่องหมายว่าอ่านแล้ว' };
        }
        break;
      }
    }

    return { message: 'ไม่มีการดำเนินการ' };
  }

  async applyStudentAction(
    userId: string,
    section: string,
    dto: WorkspaceActionDto,
  ) {
    const payload = dto.payload ?? {};

    switch (section) {
      case 'become-instructor': {
        if (dto.action === 'submit_instructor_application') {
          await this.submitInstructorApplication(userId, payload);
          return { message: 'ส่งคำขอสมัครเป็นผู้สอนเรียบร้อยแล้ว' };
        }
        break;
      }

      case 'profile': {
        if (dto.action === 'save_student_profile') {
          const fullname = this.ensureString(payload.fullname, 'fullname');
          const email = this.ensureString(payload.email, 'email');
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              fullname,
              email,
              phone: typeof payload.phone === 'string' ? payload.phone : null,
              image: typeof payload.image === 'string' ? payload.image : null,
            },
          });
          return { message: 'บันทึกโปรไฟล์เรียบร้อยแล้ว' };
        }
        break;
      }

      case 'notifications': {
        if (dto.action === 'mark_notification_read') {
          const id = this.ensureString(payload.id, 'id');
          await this.prisma.notificationLog.update({
            where: { id },
            data: { isRead: true },
          });
          return { message: 'ทำเครื่องหมายว่าอ่านแล้ว' };
        }
        break;
      }
    }

    return { message: 'ไม่มีการดำเนินการ' };
  }

  async getStudentExerciseDetail(userId: string, exerciseId: string) {
    const exercise = await this.prisma.skillExercise.findUnique({
      where: { id: exerciseId },
      include: {
        course: {
          select: {
            courseName: true,
          },
        },
        questions: {
          orderBy: { order: 'asc' },
        },
        attempts: {
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException('Skill exercise not found');
    }

    return {
      id: exercise.id,
      title: exercise.title,
      description: exercise.description,
      category: exercise.category,
      difficulty:
        exercise.difficulty === DifficultyLevel.EASY
          ? 'ง่าย'
          : exercise.difficulty === DifficultyLevel.MEDIUM
            ? 'กลาง'
            : 'ยาก',
      score: exercise.score,
      timeLimitMinutes: exercise.timeLimitMinutes ?? 0,
      passingScore: exercise.passingScore,
      placement: exercise.placement,
      courseName: exercise.course?.courseName ?? 'แบบฝึกทั่วไป',
      questions: exercise.questions.map((question) => ({
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        options: question.options,
        explanation: question.explanation,
        points: question.points,
        order: question.order,
      })),
      latestAttempts: exercise.attempts.map((attempt) => ({
        id: attempt.id,
        score: attempt.score,
        maxScore: attempt.maxScore,
        passed: attempt.passed,
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
      })),
    };
  }

  async submitStudentExerciseAttempt(
    userId: string,
    exerciseId: string,
    payload: Record<string, unknown>,
  ) {
    const exercise = await this.prisma.skillExercise.findUnique({
      where: { id: exerciseId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException('Skill exercise not found');
    }

    const answers =
      typeof payload.answers === 'string'
        ? (JSON.parse(payload.answers) as Record<string, unknown>)
        : ((payload.answers as Record<string, unknown>) ?? {});

    let score = 0;
    let maxScore = 0;

    const feedback = exercise.questions.map((question) => {
      const answer = answers[question.id];
      const answerKey = question.answerKey as {
        correct?: unknown;
        correctAnswers?: unknown[];
      } | null;
      const explanation = question.explanation ?? '';
      const isCorrect =
        question.type === SkillQuestionType.SHORT_ANSWER
          ? String(answer ?? '')
              .trim()
              .toLowerCase() ===
            String(answerKey?.correct ?? '')
              .trim()
              .toLowerCase()
          : JSON.stringify(answer ?? null) ===
            JSON.stringify(
              answerKey?.correct ?? answerKey?.correctAnswers ?? null,
            );

      maxScore += question.points;

      if (isCorrect) {
        score += question.points;
      }

      return {
        questionId: question.id,
        isCorrect,
        explanation,
        points: question.points,
      };
    });

    const passed = score >= exercise.passingScore;

    const attempt = await this.prisma.skillExerciseAttempt.create({
      data: {
        exerciseId,
        userId,
        status: SkillAttemptStatus.EVALUATED,
        score,
        maxScore,
        passed,
        answers: answers as Prisma.InputJsonValue,
        feedback: feedback as Prisma.InputJsonValue,
        submittedAt: new Date(),
      },
    });

    return {
      id: attempt.id,
      score,
      maxScore,
      passed,
      feedback,
      summary: passed ? 'ผ่านแบบฝึกแล้ว' : 'ยังไม่ผ่านแบบฝึก',
    };
  }
}
