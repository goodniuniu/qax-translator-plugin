#!/usr/bin/env python3
"""
QAX 智能划词翻译插件 - 纯 Python 标准库图标生成
无需任何外部依赖（PIL、svglib、Cairo 都不需要）
直接使用 Python 标准库生成 PNG 图标
"""

import struct
import zlib
import os

ICONS_DIR = "icons"
SIZES = [16, 32, 48, 128]

# UKUI 蓝色主题色
PRIMARY_COLOR = (43, 87, 154)  # #2b579a

def create_png_chunk(chunk_type, data):
    """创建 PNG 数据块"""
    chunk = chunk_type + data
    crc = zlib.crc32(chunk) & 0xffffffff
    return struct.pack(">I", len(data)) + chunk + struct.pack(">I", crc)

def create_png_rgba(width, height, pixels):
    """
    创建 PNG 图片（RGBA 格式）
    pixels: 二维数组，每个元素是 (r, g, b, a) 元组
    """
    # PNG 文件头
    png_data = b'\x89PNG\r\n\x1a\n'
    
    # IHDR 块
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png_data += create_png_chunk(b'IHDR', ihdr_data)
    
    # IDAT 块（图像数据）
    raw_data = b''
    for row in pixels:
        raw_data += b'\x00'  # 过滤字节
        for r, g, b, a in row:
            raw_data += bytes([r, g, b, a])
    
    compressed = zlib.compress(raw_data)
    png_data += create_png_chunk(b'IDAT', compressed)
    
    # IEND 块
    png_data += create_png_chunk(b'IEND', b'')
    
    return png_data

def draw_circle_aa(pixels, width, height, cx, cy, radius, color, alpha=255):
    """绘制抗锯齿圆形"""
    r, g, b = color
    
    for y in range(max(0, cy - radius - 1), min(height, cy + radius + 2)):
        for x in range(max(0, cx - radius - 1), min(width, cx + radius + 2)):
            dx = x - cx
            dy = y - cy
            dist = (dx * dx + dy * dy) ** 0.5
            
            # 抗锯齿边缘
            if dist <= radius - 0.5:
                pixels[y][x] = (r, g, b, alpha)
            elif dist <= radius + 0.5:
                a = int(alpha * (radius + 0.5 - dist))
                # 混合颜色
                old_r, old_g, old_b, old_a = pixels[y][x]
                inv_a = 255 - a
                pixels[y][x] = (
                    int((r * a + old_r * inv_a) / 255),
                    int((g * a + old_g * inv_a) / 255),
                    int((b * a + old_b * inv_a) / 255),
                    min(255, old_a + a)
                )

def draw_line_aa(pixels, width, height, x1, y1, x2, y2, color, line_width=1, alpha=255):
    """绘制抗锯齿线条"""
    r, g, b = color
    
    # 使用简单的距离场算法
    for y in range(height):
        for x in range(width):
            # 计算点到线段的距离
            dx = x2 - x1
            dy = y2 - y1
            
            if dx == 0 and dy == 0:
                dist = ((x - x1) ** 2 + (y - y1) ** 2) ** 0.5
            else:
                t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
                proj_x = x1 + t * dx
                proj_y = y1 + t * dy
                dist = ((x - proj_x) ** 2 + (y - proj_y) ** 2) ** 0.5
            
            if dist <= line_width:
                a = int(alpha * (1 - dist / (line_width + 1)))
                if a > 10:
                    old_r, old_g, old_b, old_a = pixels[y][x]
                    inv_a = 255 - a
                    pixels[y][x] = (
                        int((r * a + old_r * inv_a) / 255),
                        int((g * a + old_g * inv_a) / 255),
                        int((b * a + old_b * inv_a) / 255),
                        min(255, old_a + a)
                    )

def generate_icon(size):
    """生成指定尺寸的图标"""
    # 创建透明背景
    pixels = [[(0, 0, 0, 0) for _ in range(size)] for _ in range(size)]
    
    center = size // 2
    margin = max(1, size // 16)
    radius = (size // 2) - margin
    
    # 绘制蓝色圆形背景
    draw_circle_aa(pixels, size, size, center, center, radius, PRIMARY_COLOR, 255)
    
    # 绘制白色边框（圆环）
    border_width = max(1, size // 24)
    inner_radius = radius - border_width * 2
    for y in range(size):
        for x in range(size):
            dx = x - center
            dy = y - center
            dist = (dx * dx + dy * dy) ** 0.5
            if inner_radius - 0.5 <= dist <= inner_radius + 0.5:
                a = int(200 * (1 - abs(dist - inner_radius)))
                pixels[y][x] = (255, 255, 255, a)
    
    # 绘制水平线（代表赤道）
    line_y = center
    line_width = max(1, size // 32)
    for x in range(center - inner_radius + 2, center + inner_radius - 1):
        for dy in range(-line_width, line_width + 1):
            y = line_y + dy
            if 0 <= y < size:
                dx = x - center
                dist_from_center = (dx * dx + dy * dy) ** 0.5
                if dist_from_center <= inner_radius:
                    a = int(180 * (1 - abs(dy) / (line_width + 1)))
                    old_r, old_g, old_b, old_a = pixels[y][x]
                    pixels[y][x] = (
                        int((255 * a + old_r * (255 - a)) / 255),
                        int((255 * a + old_g * (255 - a)) / 255),
                        int((255 * a + old_b * (255 - a)) / 255),
                        min(255, old_a + a)
                    )
    
    # 绘制垂直弧线（代表经线）
    arc_offset = inner_radius // 3
    for offset in [-arc_offset, arc_offset]:
        arc_x = center + offset
        arc_radius = inner_radius - abs(offset) // 2
        
        for y in range(center - arc_radius, center + arc_radius + 1):
            dy = y - center
            dx_squared = arc_radius * arc_radius - dy * dy
            if dx_squared >= 0:
                dx = int(dx_squared ** 0.5)
                x = arc_x
                if 0 <= x < size and 0 <= y < size:
                    a = 120
                    old_r, old_g, old_b, old_a = pixels[y][x]
                    pixels[y][x] = (
                        int((255 * a + old_r * (255 - a)) / 255),
                        int((255 * a + old_g * (255 - a)) / 255),
                        int((255 * a + old_b * (255 - a)) / 255),
                        min(255, old_a + a)
                    )
    
    return pixels

def save_png(filename, pixels):
    """保存 PNG 文件"""
    height = len(pixels)
    width = len(pixels[0])
    png_data = create_png_rgba(width, height, pixels)
    
    with open(filename, 'wb') as f:
        f.write(png_data)

def main():
    print("=" * 50)
    print("QAX 智能划词翻译插件 - 图标生成")
    print("使用 Python 标准库，无需外部依赖")
    print("=" * 50)
    print()
    
    # 确保目录存在
    os.makedirs(ICONS_DIR, exist_ok=True)
    
    # 生成各尺寸图标
    for size in SIZES:
        output = f"{ICONS_DIR}/icon{size}.png"
        print(f"生成 {size}x{size} 图标...")
        
        pixels = generate_icon(size)
        save_png(output, pixels)
        
        # 显示文件大小
        file_size = os.path.getsize(output)
        print(f"  ✓ {output} ({file_size} bytes)")
    
    print()
    print("✓ 图标生成完成！")
    print()

if __name__ == "__main__":
    main()
