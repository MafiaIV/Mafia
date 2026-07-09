function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function seedColor(seed: string): string {
  const hue = hashSeed(seed) % 360;
  return `hsl(${hue}, 65%, 60%)`;
}

export function Avatar({ seed, name, size = 36 }: { seed: string; name: string; size?: number }) {
  const initials = name.trim().slice(0, 2).toUpperCase() || '??';
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: seedColor(seed), fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  );
}
