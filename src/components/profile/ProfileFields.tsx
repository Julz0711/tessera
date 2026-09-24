'use client';

import type { PlayerColor } from '@/engine/types';
import type { KnightCustomization } from '@/shared/knight';
import { NAME_MAX } from '@/shared/text';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { KnightCustomizer } from '@/components/knight/KnightCustomizer';

export interface ProfileDraft {
  name: string;
  color: PlayerColor;
  knight: KnightCustomization;
}

/** Display name + color + knight — the three things every player picks before playing. */
export function ProfileFields({
  value,
  onChange,
  takenColors = [],
  autoFocus = false,
}: {
  value: ProfileDraft;
  onChange: (next: ProfileDraft) => void;
  takenColors?: PlayerColor[];
  autoFocus?: boolean;
}) {
  return (
    <div className="grid gap-5">
      <label className="grid gap-1.5">
        <span className="label">Your name</span>
        <input
          className="input text-lg"
          value={value.name}
          maxLength={NAME_MAX}
          placeholder="e.g. Alex"
          autoFocus={autoFocus}
          autoComplete="nickname"
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </label>
      <div className="grid gap-1.5">
        <span className="label">Color</span>
        <ColorPicker value={value.color} taken={takenColors} onChange={(color) => onChange({ ...value, color })} />
      </div>
      <div className="grid gap-1.5">
        <span className="label">Knight</span>
        <KnightCustomizer value={value.knight} color={value.color} onChange={(knight) => onChange({ ...value, knight })} compact />
      </div>
    </div>
  );
}
