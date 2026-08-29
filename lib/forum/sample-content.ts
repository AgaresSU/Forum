import { findForum, forumSections, type ForumNode } from '@/lib/forum/catalog';

export type TopicListItem = {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  authorRole: string;
  replies: number;
  views: number;
  updated: string;
  pinned?: boolean;
  commercial?: boolean;
  access: 'member' | 'pro';
};

export type TopicPost = {
  id: string;
  author: string;
  authorRole: string;
  initials: string;
  published: string;
  body: string[];
  reactions: number;
};

const topicDetails: Record<string, { excerpt: string; body: string[]; commercial?: boolean }> = {
  'legal-content-policy': {
    excerpt: 'Какие темы разрешены на платформе и где проходит граница между практическим опытом и опасной схемой.',
    body: [
      '«Основа» создаётся как профессиональная площадка для законной работы, разработки, рекламы и предпринимательства. Мы не публикуем инструкции, основанные на обмане, чужих данных, вредоносном ПО, фишинге или обходе технических и правовых ограничений.',
      'Коммерческие предложения и реферальные ссылки должны быть явно маркированы. Автор обязан описать свою заинтересованность, условия вознаграждения и существенные риски для участника.',
      'Материалы о безопасности допустимы для защиты собственных систем, учебных лабораторий и согласованного аудита. Спорные публикации отправляются на премодерацию.',
    ],
  },
  'go-connection-leak': {
    excerpt: 'Как нашли деградацию пула, локализовали причину и добавили защитные метрики.',
    body: [
      'Через сорок минут после очередного релиза p95 вырос почти в три раза, хотя CPU и память оставались в норме. Первым сигналом стала очередь ожидания соединений к PostgreSQL.',
      'Причиной оказался ранний выход из одной из веток обработки без закрытия rows. Ошибка проявлялась только на редком ответе внешнего сервиса, поэтому обычные нагрузочные сценарии её не замечали.',
      'После исправления мы добавили метрики занятых соединений, алерт на время ожидания пула и тест, который многократно проходит по ошибочной ветке. В теме собрал запросы и последовательность диагностики.',
    ],
  },
  'project-estimation': {
    excerpt: 'Практический шаблон оценки сроков, рисков и границ проекта до подписания договора.',
    body: [
      'До расчёта стоимости я отделяю известный объём от исследовательской части. Всё, что нельзя оценить без доступа к системе или прототипа, оформляется отдельным платным этапом.',
      'В итоговой оценке фиксируются результат, исключения, зависимости от заказчика, порядок приёмки и диапазон сроков. Это снижает конфликтность гораздо сильнее, чем увеличение запаса по часам.',
      'Ниже предлагаю обсудить структуру брифа и типовые красные флаги, из-за которых проект стоит остановить до договора.',
    ],
  },
  'affiliate-checklist': {
    excerpt: 'Документы, правила трафика, атрибуция, выплаты и поддержка — что проверить до первой рекомендации.',
    commercial: true,
    body: [
      'Перед публикацией предложения проверьте юридическое лицо, договор-оферту, допустимые источники трафика, окно атрибуции, холд, минимальную выплату и основания для отклонения лидов.',
      'Реферальная ссылка должна быть подписана как рекламная или партнёрская. Автору нужно раскрыть, какое вознаграждение он получает, и не обещать участнику гарантированный доход.',
      'В этом чек-листе нет рейтинга конкретных программ: он нужен, чтобы участник мог самостоятельно сравнить условия и отказаться от непрозрачного предложения.',
    ],
  },
  'manual-quality-standard': {
    excerpt: 'Минимальные требования к пошаговым инструкциям: версия, входные условия, проверка результата и история изменений.',
    body: [
      'Хороший мануал начинается не с команды, а с результата и границ применимости. Укажите версии систем, права доступа, необходимые знания и безопасный способ вернуться к исходному состоянию.',
      'Каждый шаг должен иметь наблюдаемый результат. Если инструкция меняет данные или конфигурацию, добавьте резервное копирование и проверку целевого пути.',
      'После обновления инструмента создаётся новая ревизия материала, а связанная тема остаётся местом для вопросов и обратной связи.',
    ],
  },
};

export function getForumTopics(forum: ForumNode): TopicListItem[] {
  const primaryDetails = topicDetails[forum.lastTopic.slug];
  return [
    {
      slug: forum.lastTopic.slug,
      title: forum.lastTopic.title,
      excerpt: primaryDetails?.excerpt || `Практическое обсуждение участников раздела «${forum.title}».`,
      author: forum.lastTopic.author,
      authorRole: 'Эксперт',
      replies: Math.max(8, Math.round(forum.posts / Math.max(forum.topics, 1))),
      views: Math.max(140, forum.topics * 6),
      updated: forum.lastTopic.updated,
      pinned: forum.slug === 'announcements' || forum.slug === 'rules-and-help',
      commercial: primaryDetails?.commercial,
      access: forum.access,
    },
    {
      slug: `${forum.slug}-questions`,
      title: `Вопросы и короткие консультации: ${forum.title}`,
      excerpt: 'Общая тема для небольших вопросов, которым пока не требуется отдельное обсуждение.',
      author: 'Сообщество',
      authorRole: 'Участники',
      replies: 42,
      views: 1260,
      updated: 'сегодня, 12:05',
      pinned: true,
      access: forum.access,
    },
    {
      slug: `${forum.slug}-resources`,
      title: `Полезные материалы и инструменты по теме «${forum.title}»`,
      excerpt: 'Поддерживаемая участниками подборка документации, сервисов и открытых проектов.',
      author: 'Редакция',
      authorRole: 'Куратор',
      replies: 19,
      views: 874,
      updated: 'вчера, 18:24',
      access: forum.access,
    },
    {
      slug: `${forum.slug}-experience`,
      title: `Практический опыт участников: ${forum.title}`,
      excerpt: 'Разбор решений, ограничений, ошибок и результатов без рекламных обещаний.',
      author: 'Виктория Н.',
      authorRole: 'Автор',
      replies: 27,
      views: 633,
      updated: 'вчера, 10:16',
      access: forum.access,
    },
  ];
}

export function findTopic(slug: string) {
  for (const section of forumSections) {
    for (const forum of section.forums) {
      const topic = getForumTopics(forum).find((item) => item.slug === slug);
      if (!topic) continue;
      const detail = topicDetails[slug];
      const body = detail?.body || [
        `Эта тема собирает практический опыт по направлению «${forum.title}». Автор описывает исходные условия, выбранный подход и ограничения решения.`,
        'В ответах приветствуются проверяемые примеры, ссылки на первичные источники и спокойное обсуждение альтернатив. Коммерческую заинтересованность необходимо раскрывать.',
      ];
      const posts: TopicPost[] = [
        {
          id: 'first',
          author: topic.author,
          authorRole: topic.authorRole,
          initials: topic.author.slice(0, 2).toUpperCase(),
          published: topic.updated,
          body,
          reactions: 18,
        },
        {
          id: 'reply-1',
          author: 'Алексей Р.',
          authorRole: 'Эксперт',
          initials: 'АР',
          published: '36 минут назад',
          body: ['Полезно дополнить исходные условия: размер команды, ограничения по бюджету и критерий, по которому решение признали успешным. Тогда кейс будет проще воспроизвести.'],
          reactions: 7,
        },
        {
          id: 'reply-2',
          author: 'Марина Волкова',
          authorRole: 'Автор',
          initials: 'МВ',
          published: '12 минут назад',
          body: ['Поддерживаю. Ещё стоит вынести итоговый чек-лист в базу знаний и связать его с этой темой — обсуждение сохранится, а инструкция получит версии.'],
          reactions: 4,
        },
      ];
      return { section, forum, topic, posts };
    }
  }
  return null;
}

export function getForumBySlug(slug: string) {
  return findForum(slug);
}
