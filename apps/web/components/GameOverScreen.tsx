import type { RoomStateSummary } from '@mafia/shared';
import { RoleCard } from './RoleCard';
import { Avatar } from './Avatar';

const TEAM_LABEL: Record<string, string> = {
  good: 'Добрите победиха!',
  evil: 'Мафията победи!',
  jester: 'Шутът победи!',
  neutral: 'Неутралните победиха!',
};

export function GameOverScreen({ roomState }: { roomState: RoomStateSummary }) {
  const winner = roomState.winner;
  const revealed = roomState.revealedRoles ?? {};

  return (
    <div className="section">
      <div className="winner-banner">
        <div className="title">{winner ? TEAM_LABEL[winner.team] : 'Играта приключи'}</div>
      </div>
      <h2>Всички роли</h2>
      <div className="reveal-grid">
        {roomState.players.map((p) => {
          const roleId = revealed[p.id];
          if (!roleId) return null;
          return (
            <div key={p.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Avatar seed={p.avatarSeed} name={p.name} size={28} />
                <span>{p.name}</span>
              </div>
              <RoleCard roleId={roleId} variant="compact" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
