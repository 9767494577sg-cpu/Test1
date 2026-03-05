"""
Generate PWA icons using Python's built-in capabilities.
Creates simple colored SVG-based placeholder icons.
"""
import os
import struct
import zlib

def create_png(size, bg_color=(99, 102, 241), emoji_char='🏃'):
    """Create a simple solid-color PNG icon."""
    width = height = size
    # Create image data (RGB)
    r, g, b = bg_color
    row = bytes([r, g, b] * width)
    raw = b''
    for _ in range(height):
        raw += b'\x00' + row  # filter byte + row

    compressed = zlib.compress(raw, 9)

    def png_chunk(name, data):
        crc = zlib.crc32(name + data) & 0xffffffff
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', crc)

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = png_chunk(b'IHDR', ihdr_data)
    idat = png_chunk(b'IDAT', compressed)
    iend = png_chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

ICONS_DIR = os.path.join(os.path.dirname(__file__), 'icons')
os.makedirs(ICONS_DIR, exist_ok=True)

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
for size in SIZES:
    png_data = create_png(size)
    path = os.path.join(ICONS_DIR, f'icon-{size}.png')
    if not os.path.exists(path):
        with open(path, 'wb') as f:
            f.write(png_data)
        print(f'Created icon-{size}.png')

print('Icons generated!')
