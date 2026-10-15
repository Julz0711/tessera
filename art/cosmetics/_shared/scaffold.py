"""
Builds the cosmetics art folders from docs/tessera-items-per-level.xlsx (sheet "Proposal (reference)").

Safe to re-run after the spreadsheet changes: it adds folders and briefs for new items, never
overwrites an existing brief, and rebuilds INDEX.md and titles.md while keeping each item's status.

    py -m pip install openpyxl   (once)
    py art/cosmetics/_shared/scaffold.py
"""
import re
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[3]
ART = ROOT / 'art' / 'cosmetics'
SHEET = ROOT / 'docs' / 'tessera-items-per-level.xlsx'

# kind in the sheet -> (folder, pipeline, export extension)
KINDS = {
    'Character': ('characters', 'Blender', 'glb'),
    'Companion': ('companions', 'Blender', 'glb'),
    'Plinth': ('plinths', 'Blender', 'glb'),
    'Banner': ('banners', 'SVG', 'svg'),
    'Surround': ('surrounds', 'SVG', 'svg'),
    # 3D die for rolling animations, plus a flat face SVG for the CSS dice; both from the same skin.
    'Dice': ('dice', 'Blender + SVG', ('glb', 'svg')),
}
STATUSES = ['todo', 'brief', 'built', 'approved', 'in game']


def slug(name: str) -> str:
    name = name.lower().replace('&', 'and').replace("'", '')
    return re.sub(r'[^a-z0-9]+', '-', name).strip('-')


def read_items():
    ws = openpyxl.load_workbook(SHEET, read_only=True)['Proposal (reference)']
    items, titles = [], []
    for level, _badge, kind, name, desc in ws.iter_rows(min_row=2, max_col=5, values_only=True):
        if not name:
            continue
        if level == 'Free':
            unlock, order = 'free', 0
        elif isinstance(level, int):
            unlock, order = f'level {level}', level
        elif (desc or '').startswith('Rating'):
            unlock, order = desc.lower(), 1000 + int(desc.split()[1])
        else:
            unlock, order = f'feat: {desc}', 500
        desc = '' if (desc or '').startswith('Rating') else (desc or '')
        if kind == 'Surround + Title':
            items.append(('Surround', name, unlock, order, f'{name} rank frame'))
            titles.append((order, unlock, name))
        elif kind == 'Title':
            titles.append((order, unlock, name))
        else:
            items.append((kind, name, unlock, order, desc))
    seen = set()
    for kind, name, *_ in items:
        key = (kind, slug(name))
        assert key not in seen, f'duplicate {key}'
        seen.add(key)
    return sorted(items, key=lambda i: (i[3], list(KINDS).index(i[0]))), sorted(titles)


def old_statuses():
    index = ART / 'INDEX.md'
    if not index.exists():
        return {}
    found = {}
    for line in index.read_text(encoding='utf-8').splitlines():
        cells = [c.strip() for c in line.strip('|').split('|')]
        if len(cells) == 5 and cells[4] in STATUSES:
            found[cells[3].strip('`')] = cells[4]
    return found


def exports(folder, item_id, ext):
    if folder == 'characters':
        return f'`public/cosmetics/{folder}/{item_id}-a.glb`, `public/cosmetics/{folder}/{item_id}-b.glb` (variants a and b)'
    exts = ext if isinstance(ext, tuple) else (ext,)
    return ', '.join(f'`public/cosmetics/{folder}/{item_id}.{e}`' for e in exts)


# A brief still carrying this marker (or the first template's placeholder) has not been written yet,
# so re-running the scaffold may replace it. Writing the brief means deleting the marker line.
UNTOUCHED = '<!-- template: delete this line once the brief is written -->'
OLD_PLACEHOLDER = '(Step 1 of WORKFLOW.md'

AGENTS = {
    'characters': 'main session (Opus): needs visual judgement with `look`. Once the base body exists, a Sonnet subagent may build it, then the main session reviews the preview.',
    'companions': 'first companion: main session (Opus); later ones: Sonnet subagent with the Blender MCP, main session reviews the preview.',
    'plinths': 'first plinth: main session (Opus); later ones: Sonnet subagent with the Blender MCP, main session reviews the preview.',
    'dice': 'first die: main session (Opus) builds the die base; later ones: Sonnet subagent (3D die, then the flat face SVG), main session reviews.',
    'banners': 'Sonnet subagent writes the SVG from the template; main session reviews.',
    'surrounds': 'Sonnet subagent writes the SVG from the template; main session reviews.',
}


def brief(kind, name, unlock, desc, folder, pipeline, ext, item_id):
    return f"""{UNTOUCHED}
# {name}

- Kind: {kind.lower()} ({pipeline}) · Unlock: {unlock} · Id: `{item_id}`
- Export: {exports(folder, item_id, ext)}
- Agent: {AGENTS[folder]}

## Goal

(What this item must achieve: who it is for, where it is seen, what makes it a success.)

## Research

- **Low-poly style:** see `_shared/style.md`; add only what matters for this item.
- **History / real world:** (what the thing really is or was)
- **Catan:** (how it connects to the game, its expansions or our feats)
- **Our interpretation:** (the take we go with)

## Design choices

Starting idea from the spreadsheet: {desc or '(none)'}

| | Choice | Why |
|---|---|---|
| Silhouette / layout | | |
| Colours (palette names) | | |
| Player colour | | |
| Signature detail | | |
| Not this | | (what belongs to other items) |

## Specs

(Size, triangle budget, object and material names, animation, file size.)

## Blender prompt

(Numbered build steps for the agent, with `look` checkpoints. SVG kinds: the SVG brief instead.)

## Acceptance

- [ ] Reads at its smallest size (see `_shared/style.md`).
- [ ] Within budget.
- [ ] Doesn't borrow another item's signature.

## Notes

"""


def untouched(text: str) -> bool:
    return UNTOUCHED in text or OLD_PLACEHOLDER in text


def main():
    items, titles = read_items()
    status = old_statuses()
    rows = []
    for kind, name, unlock, _order, desc in items:
        folder, pipeline, ext = KINDS[kind]
        item_id = slug(name)
        path = ART / folder / item_id
        path.mkdir(parents=True, exist_ok=True)
        brief_path = path / 'brief.md'
        if not brief_path.exists() or untouched(brief_path.read_text(encoding='utf-8')):
            (path / 'brief.md').write_text(brief(kind, name, unlock, desc, folder, pipeline, ext, item_id), encoding='utf-8')
        key = f'{folder}/{item_id}'
        rows.append(f'| {unlock} | {kind.lower()} | {name} | `{key}` | {status.get(key, "todo")} |')

    counts = {}
    for kind, *_ in items:
        counts[kind] = counts.get(kind, 0) + 1
    summary = ', '.join(f'{KINDS[k][0]} {n}' for k, n in counts.items())
    (ART / 'INDEX.md').write_text(
        '# Cosmetics index\n\n'
        'Production tracker. Generated by `_shared/scaffold.py` from the spreadsheet; edit only the Status column '
        f'({" → ".join(STATUSES)}).\n\n{summary}. Titles are text only: see titles.md.\n\n'
        '| Unlock | Kind | Item | Folder | Status |\n|---|---|---|---|---|\n' + '\n'.join(rows) + '\n',
        encoding='utf-8')
    (ART / 'titles.md').write_text(
        '# Titles\n\nText only, no art. Added to the catalog in code directly.\n\n| Unlock | Title |\n|---|---|\n'
        + '\n'.join(f'| {u} | {t} |' for _o, u, t in titles) + '\n',
        encoding='utf-8')
    print(f'{len(items)} items, {len(titles)} titles')


if __name__ == '__main__':
    main()
