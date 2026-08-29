export type IntegrationStatus = 'local' | 'planned';

export type IntegrationDefinition = {
  key: string;
  name: string;
  purpose: string;
  consumer: string;
  status: IntegrationStatus;
  boundary: string;
};

export const integrationRegistry: IntegrationDefinition[] = [
  {
    key: 'identity',
    name: 'Пользователи и сессии',
    purpose: 'Вход, профиль и назначение роли',
    consumer: 'Все закрытые действия',
    status: 'local',
    boundary: 'IdentityGateway',
  },
  {
    key: 'billing',
    name: 'Подписка PRO',
    purpose: 'Оплата и проверка платного доступа',
    consumer: 'PRO-разделы и материалы',
    status: 'local',
    boundary: 'BillingGateway',
  },
  {
    key: 'notifications',
    name: 'Уведомления',
    purpose: 'Ответы, упоминания и решения модерации',
    consumer: 'Лента и профиль участника',
    status: 'planned',
    boundary: 'NotificationGateway',
  },
  {
    key: 'referrals',
    name: 'Реферальная аналитика',
    purpose: 'Учёт источников и переходов без хранения секретов в теме',
    consumer: 'Реферальные программы',
    status: 'planned',
    boundary: 'ReferralGateway',
  },
  {
    key: 'moderation',
    name: 'Очередь модерации',
    purpose: 'Жалобы, проверка публикаций и аудит решений',
    consumer: 'Модератор и администратор',
    status: 'local',
    boundary: 'ModerationGateway',
  },
];
