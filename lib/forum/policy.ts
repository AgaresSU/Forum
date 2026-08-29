import { z } from 'zod';

export const communityEventTypes = [
  'user.registered',
  'user.role_changed',
  'topic.created',
  'topic.published',
  'topic.resubmitted',
  'topic.reported',
  'post.created',
  'content.published',
  'partner_program.created',
  'partner_program.reviewed',
  'group.membership_changed',
  'subscription.changed',
] as const;

export type CommunityEventType = (typeof communityEventTypes)[number];

export const prohibitedContentCategories = [
  {
    key: 'fraud',
    title: 'Мошенничество и обман',
    description:
      'Фишинг, скам, социальная инженерия и схемы с заведомым ущербом для третьих лиц.',
  },
  {
    key: 'stolen-access',
    title: 'Чужие аккаунты и данные',
    description:
      'Продажа, покупка, подбор или распространение чужих доступов и персональных данных.',
  },
  {
    key: 'malware',
    title: 'Вредоносное ПО',
    description:
      'Разработка, распространение и эксплуатация ПО для несанкционированного доступа или ущерба.',
  },
  {
    key: 'evasion',
    title: 'Обход закона и ограничений',
    description:
      'Инструкции, направленные на нарушение закона, правил платёжных систем или рекламных площадок.',
  },
] as const;

export const commercialDisclosureSchema = z
  .string()
  .trim()
  .min(20, 'Опишите выгоду автора и характер партнёрской связи.')
  .max(500, 'Раскрытие партнёрства должно быть короче 500 символов.');

export const topicDraftSchema = z
  .object({
    forumSlug: z.string().trim().min(1).max(80),
    title: z.string().trim().min(8).max(140),
    body: z.string().trim().min(40).max(50_000),
    isCommercial: z.boolean().default(false),
    commercialDisclosure: z.string().trim().max(500).optional(),
  })
  .superRefine((topic, context) => {
    if (!topic.isCommercial) return;

    const result = commercialDisclosureSchema.safeParse(
      topic.commercialDisclosure,
    );
    if (!result.success) {
      context.addIssue({
        code: 'custom',
        path: ['commercialDisclosure'],
        message:
          result.error.issues[0]?.message || 'Раскройте коммерческую связь.',
      });
    }
  });

export const moderationReportSchema = z.object({
  targetType: z.enum(['topic', 'post', 'content', 'group']),
  targetId: z.string().trim().min(1).max(100),
  reason: z.enum([
    'illegal',
    'fraud',
    'spam',
    'harassment',
    'personal_data',
    'other',
  ]),
  details: z.string().trim().min(10).max(2_000),
});

export const replyDraftSchema = z.object({
  body: z
    .string()
    .trim()
    .min(10, 'Ответ должен содержать хотя бы 10 символов.')
    .max(20_000),
});

export const subscriptionSchema = z.object({
  targetType: z.enum(['forum', 'topic']),
  slug: z.string().trim().min(1).max(160),
});

export const moderationActionSchema = z
  .object({
    action: z.enum([
      'approve',
      'reject',
      'block',
      'claim',
      'resolve',
      'dismiss',
    ]),
    note: z.string().trim().max(2_000).optional(),
  })
  .superRefine((value, context) => {
    if (
      (value.action === 'reject' || value.action === 'block') &&
      (!value.note || value.note.length < 10)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['note'],
        message: 'Для отклонения или блокировки добавьте комментарий.',
      });
    }
  });

export const topicResubmissionSchema = z.object({
  body: z.string().trim().min(40).max(50_000),
  commercialDisclosure: z.string().trim().max(500).optional(),
});

const editorialFields = {
  title: z.string().trim().min(8).max(160),
  summary: z.string().trim().min(20).max(500),
  body: z.string().trim().min(80).max(100_000),
  accessLevel: z.enum(['member', 'pro']),
  isCommercial: z.boolean().default(false),
  commercialDisclosure: z.string().trim().max(500).optional(),
  discussionSlug: z.string().trim().max(160).optional(),
  changeNote: z.string().trim().max(500).optional(),
};

function validateEditorialDisclosure(
  value: { isCommercial: boolean; commercialDisclosure?: string },
  context: z.RefinementCtx,
) {
  if (!value.isCommercial) return;
  const result = commercialDisclosureSchema.safeParse(
    value.commercialDisclosure,
  );
  if (!result.success) {
    context.addIssue({
      code: 'custom',
      path: ['commercialDisclosure'],
      message:
        result.error.issues[0]?.message || 'Раскройте коммерческую связь.',
    });
  }
}

export const editorialCreateSchema = z
  .object({
    contentType: z.enum(['article', 'manual']),
    ...editorialFields,
  })
  .superRefine(validateEditorialDisclosure);

export const editorialRevisionSchema = z
  .object({
    action: z.enum(['save', 'submit', 'publish', 'reject']),
    ...editorialFields,
  })
  .superRefine((value, context) => {
    validateEditorialDisclosure(value, context);
    if (
      value.action === 'reject' &&
      (!value.changeNote || value.changeNote.length < 10)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['changeNote'],
        message: 'Для возврата материала добавьте редакционный комментарий.',
      });
    }
  });

export const editorialRestoreSchema = z.object({
  revision: z.number().int().positive(),
});

export const reactionSchema = z.object({
  targetType: z.enum(['topic', 'post', 'content']),
  targetId: z.string().trim().min(1).max(200),
  reactionType: z.enum(['helpful', 'insightful', 'thanks']),
});

export const userRoleChangeSchema = z.object({
  role: z.enum([
    'member',
    'author',
    'expert',
    'pro',
    'partner',
    'moderator',
    'admin',
  ]),
  note: z.string().trim().max(500).optional(),
});

export const userDeleteSchema = z.object({
  note: z.string().trim().min(10).max(500),
});

const secureExternalUrl = z
  .url('Укажите корректный URL.')
  .max(2_000)
  .refine((value) => new URL(value).protocol === 'https:', {
    message: 'Разрешены только HTTPS-ссылки.',
  });

export const partnerProgramCreateSchema = z.object({
  name: z.string().trim().min(3).max(100),
  category: z.enum([
    'hosting',
    'devtools',
    'education',
    'saas',
    'finance',
    'other',
  ]),
  description: z.string().trim().min(40).max(1_500),
  websiteUrl: secureExternalUrl,
  referralUrl: secureExternalUrl,
  rewardSummary: z.string().trim().min(10).max(300),
  payoutTerms: z.string().trim().min(20).max(500),
  commercialDisclosure: commercialDisclosureSchema,
});

export const partnerProgramReviewSchema = z
  .object({
    status: z.enum(['published', 'paused', 'rejected']),
    note: z.string().trim().max(500).optional(),
  })
  .superRefine((value, context) => {
    if (
      value.status === 'rejected' &&
      (!value.note || value.note.length < 10)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['note'],
        message: 'Для отклонения добавьте комментарий не короче 10 символов.',
      });
    }
  });

export const publicationPolicy = {
  commercialDisclosureRequired: true,
  premoderatedForumSections: ['income', 'promotion'],
  editorialPrinciples: [
    'Проверяемость фактов и конкретные источники.',
    'Законность способа заработка и рекламного механизма.',
    'Явная маркировка партнёрских ссылок, рекламы и выгоды автора.',
    'Запрет обещаний гарантированного дохода и манипулятивных заголовков.',
  ],
} as const;
