'use client';

import type { PlayerColor } from '@/engine/types';
import type { KnightCustomization } from '@/shared/knight';
import { NAME_MAX } from '@/shared/text';
import { ColorPicker } from '@/components/ui/ColorPicker';

export interface ProfileDraft {
  name: string;
  color: PlayerColor;
  /** The saved knight look, passed through unchanged (it is no longer edited here). */
  knight: KnightCustomization;
}

/** Display name + color — the two things every player picks before playing. */
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
    </div>
  );
}
