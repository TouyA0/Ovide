import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Member } from '../../api/client';

interface Props {
  member: Pick<Member, 'couleur' | 'initiales' | 'avatarIcon' | 'avatarPhoto'>;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Avatar({ member, size = 22, className, style }: Props) {
  const base: React.CSSProperties = { width: size, height: size, ...style };

  if (member.avatarPhoto) {
    return (
      <span className={`avatar${className ? ' ' + className : ''}`} style={base}>
        <img src={`/api/avatars/${member.avatarPhoto}`} alt="" />
      </span>
    );
  }

  if (member.avatarIcon) {
    const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[member.avatarIcon] ?? LucideIcons.User;
    return (
      <span className={`avatar${className ? ' ' + className : ''}`} style={{ ...base, background: `var(--m-${member.couleur})` }}>
        <Icon size={Math.round(size * 0.6)} />
      </span>
    );
  }

  return (
    <span className={`avatar${className ? ' ' + className : ''}`} style={{ ...base, background: `var(--m-${member.couleur})`, fontSize: Math.round(size * 0.45) }}>
      {member.initiales}
    </span>
  );
}
