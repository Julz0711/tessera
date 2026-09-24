import type { PlayerColor } from '@/engine/types';
import { PLAYER_COLORS } from '@/shared/colors';
import { ARMOR_COLORS, type Emblem, type KnightCustomization } from '@/shared/knight';
import { EMBLEM_PATHS } from './emblems';

/** Emblem glyphs in a 20×20 box centred on (0,0). */
export function EmblemShape({ emblem, fill }: { emblem: Emblem; fill: string }) {
  const path = EMBLEM_PATHS[emblem];
  if (path) return <path fill={fill} d={path} />;
  switch (emblem) {
    case 'lion':
      return (
        <g fill={fill}>
          <circle r="7" opacity="0.55" />
          <circle r="4.2" />
        </g>
      );
    case 'rose':
      return (
        <g fill={fill}>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={Math.sin((a * Math.PI) / 180) * 4} cy={-Math.cos((a * Math.PI) / 180) * 4} r="3.2" />
          ))}
          <circle r="2.4" fill="#00000030" />
        </g>
      );
    case 'sun':
      return (
        <g fill={fill}>
          <circle r="4" />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x="-0.9" y="-8.5" width="1.8" height="3.2" rx="0.6" transform={`rotate(${i * 45})`} />
          ))}
        </g>
      );
    default:
      return null;
  }
}

/** Flat portrait of a player's knight — used in the lobby, player panels and profile. */
export function KnightBadge({
  knight,
  color,
  size = 56,
  ring = true,
}: {
  knight: KnightCustomization;
  color: PlayerColor;
  size?: number;
  ring?: boolean;
}) {
  const pc = PLAYER_COLORS[color];
  const armor = ARMOR_COLORS[knight.armor];
  const crest = knight.crest;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Knight">
      {ring && <circle cx="50" cy="50" r="48" fill={pc.hex} opacity="0.22" stroke={pc.dark} strokeWidth="3" />}
      <g transform="translate(0 4)">
        {/* weapon behind the right shoulder */}
        {knight.weapon === 'sword' && (
          <g>
            <rect x="69" y="14" width="5" height="46" rx="1.5" fill="#dfe5ea" stroke="#3b3f45" strokeWidth="1.5" />
            <rect x="63" y="54" width="17" height="4" rx="1.5" fill="#8a6a3a" stroke="#3b3f45" strokeWidth="1.5" />
          </g>
        )}
        {knight.weapon === 'lance' && (
          <g>
            <path d="M71 4 75 26h-8Z" fill="#dfe5ea" stroke="#3b3f45" strokeWidth="1.5" />
            <rect x="69" y="25" width="4" height="45" fill="#9b7442" stroke="#3b3f45" strokeWidth="1.5" />
            <path d="M73 27h13l-4 4 4 4H73Z" fill={crest} stroke="#3b3f45" strokeWidth="1.2" />
          </g>
        )}
        {knight.weapon === 'axe' && (
          <g>
            <rect x="69" y="16" width="4" height="52" rx="1.5" fill="#9b7442" stroke="#3b3f45" strokeWidth="1.5" />
            <path d="M73 18c8 0 12 5 12 11s-4 11-12 11Z" fill="#dfe5ea" stroke="#3b3f45" strokeWidth="1.5" />
          </g>
        )}
        {knight.weapon === 'mace' && (
          <g>
            <rect x="69" y="24" width="4" height="46" rx="1.5" fill="#9b7442" stroke="#3b3f45" strokeWidth="1.5" />
            <circle cx="71" cy="20" r="7.5" fill="#9aa3ab" stroke="#3b3f45" strokeWidth="1.5" />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <path key={a} d="M71 10.5 73 14h-4Z" fill="#3b3f45" transform={`rotate(${a} 71 20)`} />
            ))}
          </g>
        )}
        {/* cape */}
        {knight.cape && <path d="M26 56 50 46l24 10 6 34H20Z" fill={pc.hex} stroke={pc.dark} strokeWidth="2.5" />}
        {/* torso */}
        <path d="M24 92c0-18 10-30 26-30s26 12 26 30Z" fill={armor.base} stroke={armor.trim} strokeWidth="3" />
        <path d="M50 64v26M38 70l12 6 12-6" stroke={armor.trim} strokeWidth="2.5" fill="none" />
        {/* helmet */}
        <HelmetShape knight={knight} base={armor.base} trim={armor.trim} crest={crest} />
        {/* shield */}
        <g transform="translate(34 76)">
          <path d="M-15-13h30v10c0 10-7 16-15 20-8-4-15-10-15-20Z" fill={pc.hex} stroke={pc.dark} strokeWidth="2.5" />
          <g transform="translate(0 0) scale(0.95)">
            <EmblemShape emblem={knight.emblem} fill={pc.ink} />
          </g>
        </g>
      </g>
    </svg>
  );
}

function HelmetShape({ knight, base, trim, crest }: { knight: KnightCustomization; base: string; trim: string; crest: string }) {
  const stroke = { stroke: trim, strokeWidth: 3 };
  switch (knight.helmet) {
    case 'greathelm':
      return (
        <g>
          <rect x="33" y="22" width="34" height="38" rx="6" fill={base} {...stroke} />
          <rect x="37" y="36" width="26" height="4" rx="1" fill="#1d1f22" />
          <path d="M50 40v14" stroke="#1d1f22" strokeWidth="3" />
        </g>
      );
    case 'crowned':
      return (
        <g>
          <path d="M34 58V40a16 16 0 0 1 32 0v18Z" fill={base} {...stroke} />
          <rect x="39" y="41" width="22" height="4" rx="1" fill="#1d1f22" />
          <path d="M35 26 40 14l5 8 5-10 5 10 5-8 5 12Z" fill="#e3b94a" stroke="#8a6414" strokeWidth="2" />
          <circle cx="50" cy="21" r="2.6" fill={crest} />
        </g>
      );
    case 'horned':
      return (
        <g>
          <path d="M35 34c-8-3-12-11-10-20 3 7 7 11 13 12" fill="#efe6d2" stroke="#7f725c" strokeWidth="2.5" />
          <path d="M65 34c8-3 12-11 10-20-3 7-7 11-13 12" fill="#efe6d2" stroke="#7f725c" strokeWidth="2.5" />
          <circle cx="25.5" cy="15" r="2.4" fill={crest} />
          <circle cx="74.5" cy="15" r="2.4" fill={crest} />
          <path d="M34 58V40a16 16 0 0 1 32 0v18Z" fill={base} {...stroke} />
          <path d="M40 42h20" stroke="#1d1f22" strokeWidth="4" strokeLinecap="round" />
          <path d="M50 28v28" stroke={trim} strokeWidth="2.5" />
        </g>
      );
    case 'plumed':
      return (
        <g>
          <path d="M50 26c4-12 16-18 24-14-10 1-14 8-16 16Z" fill={crest} stroke="#00000055" strokeWidth="2" />
          <path d="M34 58V40a16 16 0 0 1 32 0v18Z" fill={base} {...stroke} />
          <path d="M39 42h22" stroke="#1d1f22" strokeWidth="4" strokeLinecap="round" />
          <path d="M44 48h12" stroke="#1d1f22" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    default:
      // bascinet
      return (
        <g>
          <path d="M34 58V42c0-12 7-20 16-26 9 6 16 14 16 26v16Z" fill={base} {...stroke} />
          <path d="M40 43h20l-4 7H44Z" fill="#1d1f22" />
          <circle cx="50" cy="20" r="3" fill={crest} />
        </g>
      );
  }
}
