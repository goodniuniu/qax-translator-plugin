#!/usr/bin/env python3
"""
QAX 智能划词翻译插件 - 图标生成脚本
在开发环境运行，为内网部署生成 PNG 图标
"""

import os
import sys
import subprocess

ICONS_DIR = "icons"
SIZES = [16, 32, 48, 128]

def check_cairosvg():
    """检查是否安装了 cairosvg"""
    try:
        import cairosvg
        return True
    except ImportError:
        return False

def check_svglib():
    """检查是否安装了 svglib"""
    try:
        from svglib.svglib import svg2rlg
        from reportlab.graphics import renderPM
        return True
    except ImportError:
        return False

def generate_with_cairosvg():
    """使用 CairoSVG 生成图标"""
    print("使用 CairoSVG 生成图标...")
    import cairosvg
    
    for size in SIZES:
        output = f"{ICONS_DIR}/icon{size}.png"
        cairosvg.svg2png(
            url=f"{ICONS_DIR}/icon.svg",
            write_to=output,
            output_width=size,
            output_height=size
        )
        print(f"  ✓ {output}")
    return True

def generate_with_svglib():
    """使用 svglib + reportlab 生成图标"""
    print("使用 svglib + reportlab 生成图标...")
    from svglib.svglib import svg2rlg
    from reportlab.graphics import renderPM
    from PIL import Image
    
    drawing = svg2rlg(f"{ICONS_DIR}/icon.svg")
    
    for size in SIZES:
        output = f"{ICONS_DIR}/icon{size}.png"
        # 先生成较大的图，再缩放到目标尺寸以获得更好质量
        temp_png = f"{ICONS_DIR}/temp_{size}.png"
        renderPM.drawToFile(drawing, temp_png, fmt="PNG", dpi=size*10)
        
        # 使用 PIL 调整尺寸
        img = Image.open(temp_png)
        img = img.resize((size, size), Image.LANCZOS)
        img.save(output, 'PNG')
        
        # 清理临时文件
        os.remove(temp_png)
        print(f"  ✓ {output}")
    return True

def generate_with_pil():
    """使用纯 PIL 生成简单图标（备用方案）"""
    print("使用 PIL 生成基础图标...")
    try:
        from PIL import Image, ImageDraw
        
        for size in SIZES:
            output = f"{ICONS_DIR}/icon{size}.png"
            
            # 创建蓝色背景圆形图标
            img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            
            # 绘制蓝色圆形背景 (#2b579a)
            margin = max(1, size // 16)
            draw.ellipse(
                [margin, margin, size-margin, size-margin],
                fill=(43, 87, 154, 255)  # #2b579a
            )
            
            # 绘制简单的地球/翻译图案
            center = size // 2
            radius = (size // 2) - (size // 8)
            
            # 白色圆形边框
            draw.ellipse(
                [center-radius, center-radius, center+radius, center+radius],
                outline=(255, 255, 255, 255),
                width=max(1, size // 16)
            )
            
            # 水平线
            draw.line(
                [(center-radius, center), (center+radius, center)],
                fill=(255, 255, 255, 200),
                width=max(1, size // 32)
            )
            
            # 垂直弧线（模拟地球）
            arc_width = max(1, size // 32)
            for offset in [-radius//3, radius//3]:
                x = center + offset
                draw.arc(
                    [x-arc_width, center-radius, x+arc_width, center+radius],
                    start=0, end=360,
                    fill=(255, 255, 255, 150),
                    width=arc_width
                )
            
            img.save(output, 'PNG')
            print(f"  ✓ {output}")
        return True
    except Exception as e:
        print(f"PIL 生成失败: {e}")
        return False

def generate_with_imagemagick():
    """使用 ImageMagick 生成图标"""
    print("使用 ImageMagick 生成图标...")
    
    for size in SIZES:
        output = f"{ICONS_DIR}/icon{size}.png"
        cmd = [
            "convert",
            "-background", "none",
            f"{ICONS_DIR}/icon.svg",
            "-resize", f"{size}x{size}",
            output
        ]
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            print(f"  ✓ {output}")
        except subprocess.CalledProcessError as e:
            print(f"  ✗ {output} 失败: {e}")
            return False
    return True

def generate_with_rsvg():
    """使用 rsvg-convert 生成图标"""
    print("使用 rsvg-convert 生成图标...")
    
    for size in SIZES:
        output = f"{ICONS_DIR}/icon{size}.png"
        cmd = [
            "rsvg-convert",
            "-w", str(size),
            "-h", str(size),
            f"{ICONS_DIR}/icon.svg",
            "-o", output
        ]
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            print(f"  ✓ {output}")
        except subprocess.CalledProcessError as e:
            print(f"  ✗ {output} 失败: {e}")
            return False
    return True

def generate_with_inkscape():
    """使用 Inkscape 生成图标"""
    print("使用 Inkscape 生成图标...")
    
    for size in SIZES:
        output = f"{ICONS_DIR}/icon{size}.png"
        cmd = [
            "inkscape",
            "-w", str(size),
            "-h", str(size),
            f"{ICONS_DIR}/icon.svg",
            "-o", output
        ]
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            print(f"  ✓ {output}")
        except subprocess.CalledProcessError as e:
            print(f"  ✗ {output} 失败: {e}")
            return False
    return True

def main():
    print("=" * 50)
    print("QAX 智能划词翻译插件 - 图标生成工具")
    print("=" * 50)
    print()
    
    # 检查源文件
    if not os.path.exists(f"{ICONS_DIR}/icon.svg"):
        print(f"错误: 未找到 {ICONS_DIR}/icon.svg")
        sys.exit(1)
    
    # 确保目录存在
    os.makedirs(ICONS_DIR, exist_ok=True)
    
    # 按优先级尝试各种方法
    methods = [
        ("rsvg-convert", generate_with_rsvg),
        ("inkscape", generate_with_inkscape),
        ("cairosvg", generate_with_cairosvg),
        ("svglib", generate_with_svglib),
        ("imagemagick", generate_with_imagemagick),
        ("pil", generate_with_pil),
    ]
    
    # 检查命令行参数
    if len(sys.argv) > 1 and sys.argv[1] == "--pil-only":
        # 强制使用 PIL 方案
        if generate_with_pil():
            print("\n✓ 图标生成成功！")
            sys.exit(0)
        else:
            print("\n✗ 图标生成失败")
            sys.exit(1)
    
    # 自动选择最佳方案
    for name, method in methods:
        if name == "cairosvg" and not check_cairosvg():
            continue
        if name == "svglib" and not check_svglib():
            continue
        
        try:
            if method():
                print("\n✓ 图标生成成功！")
                print("\n生成的文件:")
                for size in SIZES:
                    path = f"{ICONS_DIR}/icon{size}.png"
                    if os.path.exists(path):
                        size_kb = os.path.getsize(path) / 1024
                        print(f"  - {path} ({size_kb:.1f} KB)")
                sys.exit(0)
        except Exception as e:
            print(f"{name} 失败: {e}")
            continue
    
    print("\n✗ 所有图标生成方法均失败")
    print("\n请安装以下任一工具:")
    print("  • sudo apt install librsvg2-bin    (推荐)")
    print("  • sudo apt install inkscape")
    print("  • pip3 install cairosvg")
    print("  • pip3 install svglib reportlab pillow")
    print("  • sudo apt install imagemagick")
    sys.exit(1)

if __name__ == "__main__":
    main()
