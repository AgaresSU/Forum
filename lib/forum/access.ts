const roleWeight: Record<string, number> = {
  member: 1,
  author: 2,
  expert: 3,
  pro: 4,
  partner: 4,
  moderator: 5,
  admin: 6,
};

export function canAccessRole(role: string, minimumRole: string) {
  return (
    (roleWeight[role] || 0) >= (roleWeight[minimumRole] || roleWeight.member)
  );
}

export function canModerate(role: string) {
  return role === 'moderator' || role === 'admin';
}

export function roleLabel(role: string) {
  const labels: Record<string, string> = {
    member: 'Участник',
    author: 'Автор',
    expert: 'Эксперт',
    pro: 'PRO-участник',
    partner: 'Партнёр',
    moderator: 'Модератор',
    admin: 'Администратор',
  };
  return labels[role] || role;
}

export function decodeRouteValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
