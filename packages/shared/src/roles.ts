export type RoleId =
  | 'mafia'
  | 'detective'
  | 'doctor'
  | 'bodyguard'
  | 'witch'
  | 'seductress'
  | 'villager'
  | 'jester'
  | 'mayor';

export type Team = 'evil' | 'good' | 'neutral';

export interface RoleDefinition {
  id: RoleId;
  name: string;
  icon: string;
  color: string;
  team: Team;
  actsAtNight: boolean;
  /** Lower acts first. Roles without a night action don't need one. */
  nightOrder?: number;
  description: string;
}

/**
 * Single source of truth for role metadata. Both the server (game logic,
 * win conditions, night turn order) and the web client (RoleCard/RoleDeck
 * rendering) import this array so text/color/icon never drift apart.
 */
export const ROLES: RoleDefinition[] = [
  {
    id: 'seductress',
    name: 'Прелъстителка',
    icon: '💋',
    color: '#d6336c',
    team: 'evil',
    actsAtNight: true,
    nightOrder: 1,
    description:
      'Нощем блокира способността на избран играч за тази нощ. Може да го прави всяка нощ.',
  },
  {
    id: 'mafia',
    name: 'Мафия',
    icon: '🔪',
    color: '#c92a2a',
    team: 'evil',
    actsAtNight: true,
    nightOrder: 2,
    description: 'Нощем избира заедно с останалите мафиоти жертва за убийство.',
  },
  {
    id: 'detective',
    name: 'Детектив',
    icon: '🔍',
    color: '#1971c2',
    team: 'good',
    actsAtNight: true,
    nightOrder: 3,
    description: 'Нощем разследва един играч и разбира дали е зъл, или невинен.',
  },
  {
    id: 'doctor',
    name: 'Лекар',
    icon: '💉',
    color: '#2f9e44',
    team: 'good',
    actsAtNight: true,
    nightOrder: 4,
    description: 'Нощем предпазва избран играч от убийство тази нощ.',
  },
  {
    id: 'bodyguard',
    name: 'Бодигард',
    icon: '🛡️',
    color: '#5c940d',
    team: 'good',
    actsAtNight: true,
    nightOrder: 4,
    description:
      'Нощем пази играч — ако мафията го нападне, бодигардът умира вместо него (еднократно).',
  },
  {
    id: 'witch',
    name: 'Вещица',
    icon: '🧪',
    color: '#9c36b5',
    team: 'good',
    actsAtNight: true,
    nightOrder: 5,
    description:
      'Има по едно еднократно "лек" (спасява жертвата на мафията) и "отрова" (убива по избор) за цялата игра.',
  },
  {
    id: 'villager',
    name: 'Цивилен',
    icon: '👤',
    color: '#495057',
    team: 'good',
    actsAtNight: false,
    description: 'Няма специална способност — само гласува денем.',
  },
  {
    id: 'jester',
    name: 'Шут',
    icon: '🃏',
    color: '#e8590c',
    team: 'neutral',
    actsAtNight: false,
    description: 'Печели сам, ако успее да бъде обесен от гласуването денем.',
  },
  {
    id: 'mayor',
    name: 'Кмет',
    icon: '🎩',
    color: '#f08c00',
    team: 'good',
    actsAtNight: false,
    description: 'Гласът му тежи двойно денем. Трябва сам да се разкрие, за да го активира.',
  },
];

export const ROLES_BY_ID: Record<RoleId, RoleDefinition> = Object.fromEntries(
  ROLES.map((role) => [role.id, role]),
) as Record<RoleId, RoleDefinition>;

export const NIGHT_ACTING_ROLES: RoleId[] = ROLES.filter((r) => r.actsAtNight)
  .sort((a, b) => (a.nightOrder ?? 0) - (b.nightOrder ?? 0))
  .map((r) => r.id);
