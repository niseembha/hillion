"""Read-only footage extraction. Requires FFmpeg, ffprobe and Pillow.

python scripts/process-campus-videos.py
python scripts/process-campus-videos.py --detail 04:18,20,22,24
Original files are never modified. Frame names use source-local timestamps.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'references/campus-videos'
OUTPUT = ROOT / 'references/processed'
FONT_PATH = '/System/Library/Fonts/Menlo.ttc'
FONT = ImageFont.truetype(FONT_PATH, 16) if Path(FONT_PATH).exists() else ImageFont.load_default()

def run(args):
    return subprocess.check_output(args)

def stamp(seconds):
    return f'{int(seconds)//60:02}:{seconds%60:05.2f}'

def extract(source, seconds, dest, width=360):
    # FFmpeg applies the iPhone display matrix, preserving portrait orientation.
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', str(seconds),
                    '-i', str(source), '-frames:v', '1', '-vf', f'scale={width}:-2',
                    '-q:v', '3', '-y', str(dest)], check=True)

def sheet(frames, dest, title, columns=6):
    width, height = 220, 392
    result = Image.new('RGB', (columns*width, 55+math.ceil(len(frames)/columns)*(height+29)), '#18211e')
    draw = ImageDraw.Draw(result)
    draw.text((12, 12), title, fill='white', font=FONT)
    for i, (path, seconds) in enumerate(frames):
        im = Image.open(path)
        im.thumbnail((width-8, height))
        x, y = (i%columns)*width, 55+(i//columns)*(height+29)
        result.paste(im, (x+(width-im.width)//2, y))
        draw.text((x+10, y+height+3), stamp(seconds), fill='#f9db8a', font=FONT)
    result.save(dest, quality=87)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--detail', help='Clip prefix:comma-separated seconds, e.g. 04:18,20,22')
    args = parser.parse_args()
    OUTPUT.mkdir(exist_ok=True)
    manifest = []
    for source in sorted(SOURCE.iterdir()):
        if source.suffix.lower() not in ['.mov', '.mp4', '.m4v']: continue
        if args.detail and not source.name.startswith(args.detail.split(':')[0]): continue
        metadata = json.loads(run(['ffprobe', '-v', 'quiet', '-show_format', '-show_streams', '-of', 'json', str(source)]))
        duration = float(metadata['format']['duration'])
        directory = OUTPUT / source.stem / ('details' if args.detail else 'frames')
        directory.mkdir(parents=True, exist_ok=True)
        times = [float(t) for t in args.detail.split(':')[1].split(',')] if args.detail else list(range(0, math.ceil(duration-.1), 2))
        frames = []
        for t in times:
            if t >= duration: continue
            dest = directory / f'{t:07.2f}s.jpg'
            if not dest.exists(): extract(source, t, dest, 720 if args.detail else 360)
            frames.append((dest, t))
        for start in range(0, len(frames), 18):
            name = f'contact-{source.name[:2]}-{start//18+1:02}.jpg' if not args.detail else f'detail-{source.name[:2]}.jpg'
            sheet(frames[start:start+18], OUTPUT/name, f'{source.name[:2]} | {source.stem[3:]}', min(6,len(frames)))
        if not args.detail:
            manifest.append({'source': str(source.relative_to(ROOT)), 'sha256': hashlib.file_digest(source.open('rb'), 'sha256').hexdigest(),
                             'duration': duration, 'interval': 2, 'frames': [{'seconds': t, 'path': str(p.relative_to(ROOT))} for p,t in frames]})
        print(source.name, len(frames), 'frames', flush=True)
    if not args.detail: (OUTPUT/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')

if __name__ == '__main__': main()
