"""Compose local evidence / old campus / revised campus panels using Pillow.
Run after process-campus-videos.py and capture-campus-survey.mjs before/after.
No source images or footage are altered or included in the deployed game.
"""
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'references/processed'
COMPARISON=OUTPUT/os.environ.get('SURVEY_COMPARISON','comparison')
views=json.loads((COMPARISON/'after/cameras.json').read_text())
baseline_views=json.loads((COMPARISON/'before/cameras.json').read_text())
assert baseline_views==views, 'Before and after must use identical comparison cameras'
manifest=json.loads((OUTPUT/'manifest.json').read_text())
font=ImageFont.truetype('/System/Library/Fonts/Menlo.ttc',16)
small=ImageFont.truetype('/System/Library/Fonts/Menlo.ttc',13)
panels=[]
for view in views:
    source=next(item for item in manifest if Path(item['source']).name.startswith(view['clip']))
    frame=min(source['frames'],key=lambda f:abs(f['seconds']-view['seconds']))
    detail=OUTPUT/Path(source['source']).stem/'details'/f"{view['seconds']:07.2f}s.jpg"
    if detail.exists(): frame={'path':str(detail.relative_to(ROOT)),'seconds':view['seconds']}
    panel=Image.new('RGB',(1020,704),'#18211e');draw=ImageDraw.Draw(panel)
    draw.text((12,10),f"{view['id']} | clip {view['clip']} {frame['seconds']:05.2f}s | map registration: {view['confidence']}",font=font,fill='white')
    for col,(path,label) in enumerate([(ROOT/frame['path'],'REAL FOOTAGE'),(COMPARISON/f"before/{view['id']}.png",'BEFORE'),(COMPARISON/f"after/{view['id']}.png",'AFTER')]):
        im=Image.open(path).convert('RGB');im.thumbnail((332,590))
        panel.paste(im,(col*340+(340-im.width)//2,67))
        draw.text((col*340+10,43),label,font=font,fill='#f9db8a')
    # Wrap the short sightline caption without cropping.
    import textwrap
    for i,line in enumerate(textwrap.wrap(view['description'],112)):
        draw.text((12,663+i*17),line,font=small,fill='white')
    path=COMPARISON/f"{view['id']}.jpg";panel.save(path,quality=90);panels.append((path,panel))

board=Image.new('RGB',(1020,352*((len(panels)+1)//2)),'#18211e')
for i,(_,panel) in enumerate(panels):
    panel=panel.resize((510,352));board.paste(panel,((i%2)*510,(i//2)*352))
board.save(COMPARISON/'overview.jpg',quality=90)

html=['<!doctype html><meta charset="utf-8"><title>Hillion campus evidence review</title>',
      '<style>body{max-width:1100px;margin:32px auto;background:#18211e;color:#f5ead1;font:16px system-ui}img{max-width:100%}a{color:#f9db8a}section{margin:40px 0}</style>',
      '<h1>Campus evidence review</h1><p>Real footage / prior geometry / corrected geometry. Cameras share map positions and target registrations; each version resolves its own horizontal scale and keeps eye height unchanged. Portrait QA uses an estimated 82° vertical field of view; phone lens calibration is unknown. Game cameras retain their existing fields of view.</p>',
      '<p>Confidence describes approximate map registration, not measured geometry. The Upper School court remains provisional. Original footage is retained locally.</p>',
      '<h2>Chronological contact sheets</h2>']
for path in sorted(OUTPUT.glob('contact-*.jpg')):
    html.append(f'<a href="../{path.name}">{path.stem}</a> · ')
html.append('<h2>Matched comparisons</h2>')
for path,_ in panels:html.append(f'<section><h3>{path.stem}</h3><img src="{path.name}" alt="Real footage, before, and after for {path.stem}"></section>')
(COMPARISON/'index.html').write_text('\n'.join(html))
print(f'Created {len(panels)} evidence triptychs, overview.jpg and local comparison/index.html')
