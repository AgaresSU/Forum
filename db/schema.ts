import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    username: text('username').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull().default('member'),
    emailVerifiedAt: integer('email_verified_at'),
    totpSecretEncrypted: text('totp_secret_encrypted'),
    totpEnabled: integer('totp_enabled', { mode: 'boolean' })
      .notNull()
      .default(false),
    telegramChatId: text('telegram_chat_id'),
    telegramUsername: text('telegram_username'),
    telegramEnabled: integer('telegram_enabled', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_users_email').on(table.email),
    uniqueIndex('idx_users_username').on(table.username),
  ],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_sessions_token_hash').on(table.tokenHash),
    index('idx_sessions_user_expires').on(table.userId, table.expiresAt),
  ],
);

export const authTokens = sqliteTable(
  'auth_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: text('purpose').notNull(),
    tokenHash: text('token_hash').notNull(),
    metadataJson: text('metadata_json'),
    expiresAt: integer('expires_at').notNull(),
    consumedAt: integer('consumed_at'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_auth_tokens_hash_purpose').on(
      table.tokenHash,
      table.purpose,
    ),
    index('idx_auth_tokens_user_purpose').on(
      table.userId,
      table.purpose,
      table.expiresAt,
    ),
  ],
);

export const securityEvents = sqliteTable(
  'security_events',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    eventType: text('event_type').notNull(),
    metadataJson: text('metadata_json'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_security_events_user_created').on(table.userId, table.createdAt),
  ],
);

export const authRateLimits = sqliteTable('auth_rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  windowStartedAt: integer('window_started_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
});

export const forumNodes = sqliteTable(
  'forum_nodes',
  {
    id: text('id').primaryKey(),
    parentId: text('parent_id').references(
      (): AnySQLiteColumn => forumNodes.id,
      { onDelete: 'cascade' },
    ),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    nodeType: text('node_type').notNull().default('forum'),
    iconKey: text('icon_key'),
    position: integer('position').notNull().default(0),
    minimumRole: text('minimum_role').notNull().default('member'),
    requiresModeration: integer('requires_moderation', { mode: 'boolean' })
      .notNull()
      .default(false),
    isPublished: integer('is_published', { mode: 'boolean' })
      .notNull()
      .default(true),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_forum_nodes_slug').on(table.slug),
    index('idx_forum_nodes_parent_position').on(table.parentId, table.position),
  ],
);

export const topics = sqliteTable(
  'topics',
  {
    id: text('id').primaryKey(),
    forumId: text('forum_id')
      .notNull()
      .references(() => forumNodes.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    assignedToId: text('assigned_to_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    excerpt: text('excerpt').notNull().default(''),
    status: text('status').notNull().default('published'),
    accessLevel: text('access_level').notNull().default('member'),
    isPinned: integer('is_pinned', { mode: 'boolean' })
      .notNull()
      .default(false),
    isLocked: integer('is_locked', { mode: 'boolean' })
      .notNull()
      .default(false),
    isCommercial: integer('is_commercial', { mode: 'boolean' })
      .notNull()
      .default(false),
    commercialDisclosure: text('commercial_disclosure'),
    moderationNote: text('moderation_note'),
    moderationDecidedAt: integer('moderation_decided_at'),
    resubmissionCount: integer('resubmission_count').notNull().default(0),
    viewCount: integer('view_count').notNull().default(0),
    replyCount: integer('reply_count').notNull().default(0),
    lastPostAt: integer('last_post_at').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_topics_slug').on(table.slug),
    index('idx_topics_forum_status_last_post').on(
      table.forumId,
      table.status,
      table.lastPostAt,
    ),
    index('idx_topics_author_created').on(table.authorId, table.createdAt),
    index('idx_topics_status_created').on(table.status, table.createdAt),
  ],
);

export const posts = sqliteTable(
  'posts',
  {
    id: text('id').primaryKey(),
    topicId: text('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    body: text('body').notNull(),
    status: text('status').notNull().default('published'),
    isFirstPost: integer('is_first_post', { mode: 'boolean' })
      .notNull()
      .default(false),
    editedAt: integer('edited_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_posts_topic_created').on(table.topicId, table.createdAt),
    index('idx_posts_author_created').on(table.authorId, table.createdAt),
  ],
);

export const contentRecords = sqliteTable(
  'content_records',
  {
    id: text('id').primaryKey(),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    discussionTopicId: text('discussion_topic_id').references(() => topics.id, {
      onDelete: 'set null',
    }),
    contentType: text('content_type').notNull(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    body: text('body').notNull(),
    status: text('status').notNull().default('draft'),
    accessLevel: text('access_level').notNull().default('member'),
    revision: integer('revision').notNull().default(1),
    isCommercial: integer('is_commercial', { mode: 'boolean' })
      .notNull()
      .default(false),
    commercialDisclosure: text('commercial_disclosure'),
    publishedAt: integer('published_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_content_records_slug').on(table.slug),
    index('idx_content_records_type_status_published').on(
      table.contentType,
      table.status,
      table.publishedAt,
    ),
    index('idx_content_records_author_created').on(
      table.authorId,
      table.createdAt,
    ),
  ],
);

export const contentRevisions = sqliteTable(
  'content_revisions',
  {
    id: text('id').primaryKey(),
    contentRecordId: text('content_record_id')
      .notNull()
      .references(() => contentRecords.id, { onDelete: 'cascade' }),
    editorId: text('editor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    discussionTopicId: text('discussion_topic_id').references(() => topics.id, {
      onDelete: 'set null',
    }),
    revision: integer('revision').notNull(),
    workflowStatus: text('workflow_status').notNull().default('draft'),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    body: text('body').notNull(),
    accessLevel: text('access_level').notNull().default('member'),
    isCommercial: integer('is_commercial', { mode: 'boolean' })
      .notNull()
      .default(false),
    commercialDisclosure: text('commercial_disclosure'),
    changeNote: text('change_note').notNull().default(''),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_content_revisions_record_revision').on(
      table.contentRecordId,
      table.revision,
    ),
    index('idx_content_revisions_status_created').on(
      table.workflowStatus,
      table.createdAt,
    ),
  ],
);

export const reactions = sqliteTable(
  'reactions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    reactionType: text('reaction_type').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_reactions_user_target').on(
      table.userId,
      table.targetType,
      table.targetId,
    ),
    index('idx_reactions_target').on(table.targetType, table.targetId),
    index('idx_reactions_user_created').on(table.userId, table.createdAt),
  ],
);

export const userAdministrationAudit = sqliteTable(
  'user_administration_audit',
  {
    id: text('id').primaryKey(),
    targetUserId: text('target_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    actorUserId: text('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    targetUsername: text('target_username').notNull(),
    action: text('action').notNull(),
    previousRole: text('previous_role'),
    newRole: text('new_role'),
    note: text('note').notNull().default(''),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_user_admin_audit_created').on(table.createdAt),
    index('idx_user_admin_audit_target').on(
      table.targetUserId,
      table.createdAt,
    ),
  ],
);

export const communityGroups = sqliteTable(
  'community_groups',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    visibility: text('visibility').notNull().default('closed'),
    minimumRole: text('minimum_role').notNull().default('member'),
    status: text('status').notNull().default('active'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_community_groups_slug').on(table.slug),
    index('idx_community_groups_status_created').on(
      table.status,
      table.createdAt,
    ),
  ],
);

export const communityGroupMembers = sqliteTable(
  'community_group_members',
  {
    groupId: text('group_id')
      .notNull()
      .references(() => communityGroups.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    membershipRole: text('membership_role').notNull().default('member'),
    status: text('status').notNull().default('active'),
    joinedAt: integer('joined_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.userId] }),
    index('idx_group_members_user_status').on(table.userId, table.status),
  ],
);

export const forumSubscriptions = sqliteTable(
  'forum_subscriptions',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    forumId: text('forum_id')
      .notNull()
      .references(() => forumNodes.id, { onDelete: 'cascade' }),
    notificationMode: text('notification_mode').notNull().default('in_app'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.forumId] }),
    index('idx_forum_subscriptions_forum').on(table.forumId),
  ],
);

export const topicSubscriptions = sqliteTable(
  'topic_subscriptions',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    topicId: text('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    notificationMode: text('notification_mode').notNull().default('in_app'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.topicId] }),
    index('idx_topic_subscriptions_topic').on(table.topicId),
  ],
);

export const notifications = sqliteTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    actorUserId: text('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    notificationType: text('notification_type').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    href: text('href').notNull(),
    isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_notifications_user_read_created').on(
      table.userId,
      table.isRead,
      table.createdAt,
    ),
  ],
);

export const moderationReports = sqliteTable(
  'moderation_reports',
  {
    id: text('id').primaryKey(),
    reporterId: text('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    assignedToId: text('assigned_to_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    reason: text('reason').notNull(),
    details: text('details').notNull().default(''),
    status: text('status').notNull().default('open'),
    resolvedAt: integer('resolved_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_moderation_reports_status_created').on(
      table.status,
      table.createdAt,
    ),
    index('idx_moderation_reports_target').on(table.targetType, table.targetId),
  ],
);

export const moderationActions = sqliteTable(
  'moderation_actions',
  {
    id: text('id').primaryKey(),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    topicId: text('topic_id').references(() => topics.id, {
      onDelete: 'cascade',
    }),
    reportId: text('report_id').references(() => moderationReports.id, {
      onDelete: 'cascade',
    }),
    action: text('action').notNull(),
    note: text('note').notNull().default(''),
    metadataJson: text('metadata_json'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_moderation_actions_topic_created').on(
      table.topicId,
      table.createdAt,
    ),
    index('idx_moderation_actions_report_created').on(
      table.reportId,
      table.createdAt,
    ),
  ],
);

export const communityEvents = sqliteTable(
  'community_events',
  {
    id: text('id').primaryKey(),
    actorUserId: text('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    eventType: text('event_type').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    payloadJson: text('payload_json'),
    status: text('status').notNull().default('pending'),
    processedAt: integer('processed_at'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_community_events_status_created').on(
      table.status,
      table.createdAt,
    ),
  ],
);
