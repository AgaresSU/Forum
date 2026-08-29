export type ForumAccess = 'member' | 'pro';

export type ForumNode = {
  slug: string;
  title: string;
  description: string;
  icon: 'code' | 'server' | 'database' | 'shield' | 'briefcase' | 'megaphone' | 'handshake' | 'book' | 'tools' | 'users' | 'news' | 'help';
  access: ForumAccess;
  topics: number;
  posts: number;
  tags: string[];
  lastTopic: { slug: string; title: string; author: string; updated: string };
};

export type ForumSection = {
  slug: string;
  title: string;
  description: string;
  forums: ForumNode[];
};

export const forumSections: ForumSection[] = [
  {
    slug: 'foundation',
    title: 'Основа сообщества',
    description: 'Правила, новости платформы и помощь новым участникам.',
    forums: [
      {
        slug: 'announcements', title: 'Новости и объявления',
        description: 'Обновления платформы, планы развития и важные сообщения команды.',
        icon: 'news', access: 'member', topics: 18, posts: 146,
        tags: ['обновления', 'планы', 'команда'],
        lastTopic: { slug: 'platform-roadmap', title: 'План развития платформы', author: 'Команда Основы', updated: 'сегодня, 14:20' },
      },
      {
        slug: 'rules-and-help', title: 'Правила и помощь',
        description: 'Как устроены роли, публикации, модерация и доступ к материалам.',
        icon: 'help', access: 'member', topics: 12, posts: 83,
        tags: ['правила', 'FAQ', 'поддержка'],
        lastTopic: { slug: 'legal-content-policy', title: 'Политика легального контента', author: 'Модерация', updated: 'вчера, 19:40' },
      },
    ],
  },
  {
    slug: 'technology',
    title: 'Разработка и технологии',
    description: 'Инженерная практика, архитектура, инфраструктура, данные и безопасность.',
    forums: [
      {
        slug: 'development', title: 'Разработка',
        description: 'Backend, frontend, mobile, API, тестирование и инженерные практики.',
        icon: 'code', access: 'member', topics: 328, posts: 2481,
        tags: ['backend', 'frontend', 'mobile'],
        lastTopic: { slug: 'go-connection-leak', title: 'Утечка соединений в Go-сервисе', author: 'Алексей Р.', updated: '8 минут назад' },
      },
      {
        slug: 'devops', title: 'DevOps, SRE и инфраструктура',
        description: 'CI/CD, контейнеры, наблюдаемость, облака и эксплуатация систем.',
        icon: 'server', access: 'member', topics: 214, posts: 1740,
        tags: ['Linux', 'Kubernetes', 'observability'],
        lastTopic: { slug: 'observability-stack', title: 'Observability-стек для небольшой команды', author: 'Илья С.', updated: '32 минуты назад' },
      },
      {
        slug: 'data-and-ai', title: 'Data, AI и базы данных',
        description: 'Хранилища, аналитика, ML/LLM и производительность баз данных.',
        icon: 'database', access: 'member', topics: 176, posts: 1098,
        tags: ['PostgreSQL', 'ML', 'LLM'],
        lastTopic: { slug: 'postgres-query-plans', title: 'Диагностика планов PostgreSQL', author: 'Олег Ким', updated: '1 час назад' },
      },
      {
        slug: 'security', title: 'Информационная безопасность',
        description: 'Защитная разработка, аудит собственных систем и легальные лаборатории.',
        icon: 'shield', access: 'pro', topics: 94, posts: 728,
        tags: ['AppSec', 'защита', 'лаборатории'],
        lastTopic: { slug: 'secure-code-review', title: 'Чек-лист безопасного code review', author: 'Анна М.', updated: 'сегодня, 11:05' },
      },
    ],
  },
  {
    slug: 'income',
    title: 'Работа и заработок в интернете',
    description: 'Только законные модели, прозрачные условия и проверяемый опыт участников.',
    forums: [
      {
        slug: 'freelance', title: 'Фриланс и удалённая работа',
        description: 'Поиск клиентов, оценка проектов, договоры, процессы и рост специалиста.',
        icon: 'briefcase', access: 'member', topics: 286, posts: 2310,
        tags: ['фриланс', 'удалёнка', 'клиенты'],
        lastTopic: { slug: 'project-estimation', title: 'Как оценивать проект до договора', author: 'Марина Волкова', updated: '17 минут назад' },
      },
      {
        slug: 'digital-products', title: 'Услуги и цифровые продукты',
        description: 'Микросервисы, шаблоны, обучение, SaaS и монетизация экспертизы.',
        icon: 'tools', access: 'member', topics: 193, posts: 1482,
        tags: ['SaaS', 'услуги', 'продукты'],
        lastTopic: { slug: 'first-b2b-microservice', title: 'Первый B2B-микросервис: экономика запуска', author: 'Дмитрий Л.', updated: 'сегодня, 12:48' },
      },
      {
        slug: 'content-communities', title: 'Контент и сообщества',
        description: 'Медиа, экспертные блоги, образовательные продукты и подписные модели.',
        icon: 'users', access: 'member', topics: 121, posts: 906,
        tags: ['контент', 'сообщество', 'подписка'],
        lastTopic: { slug: 'expert-community-launch', title: 'Запуск экспертного сообщества без рекламы', author: 'Сергей К.', updated: 'вчера, 22:10' },
      },
      {
        slug: 'affiliate-programs', title: 'Партнёрские и реферальные программы',
        description: 'Проверенные офферы, условия выплат и обязательная маркировка рекламы.',
        icon: 'handshake', access: 'pro', topics: 88, posts: 634,
        tags: ['партнёрки', 'рефералы', 'маркировка'],
        lastTopic: { slug: 'affiliate-checklist', title: 'Чек-лист проверки партнёрской программы', author: 'Редакция', updated: 'сегодня, 09:30' },
      },
    ],
  },
  {
    slug: 'promotion',
    title: 'Реклама и продвижение',
    description: 'Белые источники трафика, аналитика, упаковка и развитие продуктов.',
    forums: [
      {
        slug: 'marketing', title: 'Маркетинг и позиционирование',
        description: 'Исследование аудитории, упаковка продукта, контент и воронки.',
        icon: 'megaphone', access: 'member', topics: 164, posts: 1192,
        tags: ['маркетинг', 'воронки', 'бренд'],
        lastTopic: { slug: 'technical-product-positioning', title: 'Позиционирование технического продукта', author: 'Елена П.', updated: '43 минуты назад' },
      },
      {
        slug: 'paid-traffic', title: 'Легальная реклама и трафик',
        description: 'Рекламные кабинеты, бюджеты, аналитика и требования площадок.',
        icon: 'megaphone', access: 'pro', topics: 137, posts: 1056,
        tags: ['реклама', 'аналитика', 'бюджет'],
        lastTopic: { slug: 'campaign-unit-economics', title: 'Юнит-экономика рекламной кампании', author: 'Роман Ф.', updated: 'сегодня, 13:12' },
      },
      {
        slug: 'seo', title: 'SEO и органический рост',
        description: 'Техническое SEO, семантика, контент и измерение результатов.',
        icon: 'tools', access: 'member', topics: 203, posts: 1669,
        tags: ['SEO', 'контент', 'аналитика'],
        lastTopic: { slug: 'seo-audit-2026', title: 'Технический SEO-аудит: рабочий шаблон', author: 'Никита В.', updated: '2 часа назад' },
      },
    ],
  },
  {
    slug: 'knowledge',
    title: 'База знаний и сообщество',
    description: 'Мануалы, инструменты, проекты участников, вакансии и профессиональные группы.',
    forums: [
      {
        slug: 'manuals', title: 'Мануалы и проверенные инструкции',
        description: 'Пошаговые материалы с версиями, требованиями и обсуждением изменений.',
        icon: 'book', access: 'member', topics: 246, posts: 1380,
        tags: ['мануалы', 'чек-листы', 'обновления'],
        lastTopic: { slug: 'manual-quality-standard', title: 'Стандарт качественного мануала', author: 'Редакция', updated: 'вчера, 18:32' },
      },
      {
        slug: 'tools-and-automation', title: 'Инструменты и автоматизация',
        description: 'Полезный софт, скрипты, no-code и автоматизация рабочих процессов.',
        icon: 'tools', access: 'member', topics: 311, posts: 2504,
        tags: ['софт', 'автоматизация', 'open source'],
        lastTopic: { slug: 'automation-stack', title: 'Стек автоматизации для небольшой команды', author: 'Павел Н.', updated: '24 минуты назад' },
      },
      {
        slug: 'jobs-and-teams', title: 'Вакансии, проекты и команды',
        description: 'Поиск специалистов, проектных партнёров и долгосрочного сотрудничества.',
        icon: 'briefcase', access: 'member', topics: 108, posts: 692,
        tags: ['вакансии', 'проекты', 'команды'],
        lastTopic: { slug: 'backend-developer-team', title: 'Ищем backend-разработчика в продуктовую команду', author: 'Основа Jobs', updated: 'сегодня, 10:44' },
      },
      {
        slug: 'clubs', title: 'Группы и клубы',
        description: 'Профессиональные объединения, закрытые рабочие группы и клубы по интересам.',
        icon: 'users', access: 'pro', topics: 67, posts: 940,
        tags: ['группы', 'клубы', 'нетворкинг'],
        lastTopic: { slug: 'founders-club', title: 'Клуб создателей цифровых продуктов', author: 'Команда Основы', updated: 'вчера, 20:15' },
      },
    ],
  },
];

export const featuredActivity = forumSections
  .flatMap((section) => section.forums.map((forum) => ({ ...forum.lastTopic, forum: forum.title, access: forum.access })))
  .slice(0, 8);

export const forumTotals = forumSections.reduce(
  (totals, section) => {
    totals.forums += section.forums.length;
    totals.topics += section.forums.reduce((sum, forum) => sum + forum.topics, 0);
    totals.posts += section.forums.reduce((sum, forum) => sum + forum.posts, 0);
    return totals;
  },
  { forums: 0, topics: 0, posts: 0 },
);

export function findForum(slug: string) {
  for (const section of forumSections) {
    const forum = section.forums.find((item) => item.slug === slug);
    if (forum) return { section, forum };
  }
  return null;
}
