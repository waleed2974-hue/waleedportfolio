import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import cv2

os.makedirs('public/media/hero', exist_ok=True)
os.makedirs('public/media/projects/luxury-fragrance', exist_ok=True)
os.makedirs('public/media/projects/darkmode-uiux', exist_ok=True)
os.makedirs('public/media/projects/ecommerce-exp', exist_ok=True)
os.makedirs('public/media/projects/vector-identity', exist_ok=True)
os.makedirs('public/media/updates', exist_ok=True)

# Colors
BG_DARK = (11, 11, 12)
BG_ELEVATED = (18, 18, 21)
TEXT_WHITE = (244, 244, 246)
TEXT_MUTED = (142, 142, 147)
HAIRLINE = (40, 40, 48)
ACCENT = (226, 255, 50) # #E2FF32
ACCENT_ALT = (255, 77, 45) # #FF4D2D

def get_font(size):
    try:
        # Try system fonts
        for font_name in ["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/segoeui.ttf"]:
            if os.path.exists(font_name):
                return ImageFont.truetype(font_name, size)
    except:
        pass
    return ImageFont.load_default()

def draw_artistic_canvas(width, height, category, title, subtitle, accent_color=ACCENT, theme_type=0):
    img = Image.new('RGB', (width, height), color=BG_DARK)
    draw = ImageDraw.Draw(img)

    # Hairline Grid
    grid_step = 64
    for x in range(0, width, grid_step):
        draw.line([(x, 0), (x, height)], fill=HAIRLINE, width=1)
    for y in range(0, height, grid_step):
        draw.line([(0, y), (width, y)], fill=HAIRLINE, width=1)

    # Frame border
    draw.rectangle([16, 16, width - 16, height - 16], outline=HAIRLINE, width=2)
    # Corner marks
    mark_len = 16
    for cx, cy in [(16, 16), (width - 16, 16), (16, height - 16), (width - 16, height - 16)]:
        draw.rectangle([cx - 4, cy - 4, cx + 4, cy + 4], fill=accent_color)

    # Abstract Geometry / Graphic Design Artifact based on theme_type
    center_x, center_y = width // 2, height // 2 - 20

    if theme_type == 0: # Luxury / Flacon & Curves
        # Draw concentric luxury arcs and gold/acid oval
        for r in range(60, 260, 35):
            draw.ellipse([center_x - r, center_y - r * 1.3, center_x + r, center_y + r * 1.3], outline=(60, 60, 75), width=1)
        draw.ellipse([center_x - 110, center_y - 170, center_x + 110, center_y + 170], outline=accent_color, width=3)
        draw.line([(center_x - 140, center_y), (center_x + 140, center_y)], fill=accent_color, width=2)
        draw.line([(center_x, center_y - 200), (center_x, center_y + 200)], fill=HAIRLINE, width=1)

    elif theme_type == 1: # UI/UX System & Data Architecture
        # Draw modular dashboard wireframe boxes
        draw.rectangle([center_x - 220, center_y - 140, center_x + 220, center_y + 140], outline=HAIRLINE, fill=BG_ELEVATED, width=2)
        # Top bar
        draw.rectangle([center_x - 220, center_y - 140, center_x + 220, center_y - 100], fill=(28, 28, 34))
        draw.ellipse([center_x - 200, center_y - 126, center_x - 188, center_y - 114], fill=accent_color)
        draw.ellipse([center_x - 180, center_y - 126, center_x - 168, center_y - 114], fill=(80, 80, 90))
        draw.ellipse([center_x - 160, center_y - 126, center_x - 148, center_y - 114], fill=(80, 80, 90))
        # Inner widgets
        draw.rectangle([center_x - 200, center_y - 80, center_x - 20, center_y + 40], outline=accent_color, width=1)
        draw.rectangle([center_x + 10, center_y - 80, center_x + 200, center_y + 40], outline=HAIRLINE, width=1)
        # Chart polyline
        chart_pts = [(center_x - 180, center_y + 20), (center_x - 140, center_y - 40), (center_x - 100, center_y - 10), (center_x - 40, center_y - 60)]
        draw.line(chart_pts, fill=accent_color, width=3)

    elif theme_type == 2: # E-Commerce / Minimalist Product
        # Minimalist product silhouette
        draw.rectangle([center_x - 130, center_y - 180, center_x + 130, center_y + 150], fill=(24, 24, 28), outline=HAIRLINE, width=2)
        draw.ellipse([center_x - 70, center_y - 90, center_x + 70, center_y + 50], outline=accent_color, width=2)
        draw.line([(center_x - 100, center_y + 110), (center_x + 100, center_y + 110)], fill=accent_color, width=4)
        draw.text((center_x - 90, center_y + 80), "PREMIUM SPEC", fill=TEXT_MUTED, font=get_font(14))

    elif theme_type == 3: # Vector / Precision Geometry
        # Interlocking vector geometry
        for ang in range(0, 360, 45):
            rad = math.radians(ang)
            x2 = center_x + int(160 * math.cos(rad))
            y2 = center_y + int(160 * math.sin(rad))
            draw.line([(center_x, center_y), (x2, y2)], fill=HAIRLINE, width=1)
            draw.ellipse([x2 - 8, y2 - 8, x2 + 8, y2 + 8], outline=accent_color, width=2)
        draw.polygon([(center_x, center_y - 120), (center_x + 120, center_y + 80), (center_x - 120, center_y + 80)], outline=accent_color, width=3)
        draw.polygon([(center_x, center_y + 120), (center_x + 120, center_y - 80), (center_x - 120, center_y - 80)], outline=(80, 80, 100), width=1)

    elif theme_type == 4: # Creative Lab / Shader & Typographic Waves
        for i in range(12):
            y_offset = center_y - 120 + i * 22
            pts = []
            for px in range(width // 4, width * 3 // 4, 15):
                py = y_offset + int(24 * math.sin((px + i * 20) * 0.02))
                pts.append((px, py))
            draw.line(pts, fill=accent_color if i % 4 == 0 else (50, 50, 65), width=2 if i % 4 == 0 else 1)

    # Category Pill
    font_badge = get_font(18)
    draw.rectangle([48, 48, 48 + len(category) * 12 + 28, 86], outline=accent_color, width=1, fill=BG_DARK)
    draw.text((62, 56), category.upper(), fill=accent_color, font=font_badge)

    # Title & Subtitle at bottom
    font_title = get_font(32 if width > 600 else 22)
    font_sub = get_font(18)
    draw.text((48, height - 100), title.upper(), fill=TEXT_WHITE, font=font_title)
    draw.text((48, height - 55), subtitle, fill=TEXT_MUTED, font=font_sub)

    # Monogram stamp
    draw.rectangle([width - 110, 48, width - 48, 86], outline=HAIRLINE, fill=BG_ELEVATED)
    draw.text((width - 92, 56), "SW", fill=TEXT_WHITE, font=font_badge)

    return img

def save_webp(img, path, quality=90):
    img.save(path, 'WEBP', quality=quality)
    print(f"Generated: {path}")

def make_mp4_loop(path, width, height, title, subtitle, accent_bgr=(50, 255, 226)):
    # 36 frames at 24fps = 1.5s seamless loop
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(path, fourcc, 24.0, (width, height))
    
    num_frames = 36
    for f in range(num_frames):
        t = f / num_frames
        # Background
        frame = np.full((height, width, 3), (11, 11, 12), dtype=np.uint8)
        
        # Grid lines
        for x in range(0, width, 64):
            cv2.line(frame, (x, 0), (x, height), (30, 30, 36), 1)
        for y in range(0, height, 64):
            cv2.line(frame, (0, y), (width, y), (30, 30, 36), 1)
            
        cx, cy = width // 2, height // 2 - 20
        # Kinetic animation
        radius = int(80 + 35 * math.sin(t * 2 * math.pi))
        cv2.circle(frame, (cx, cy), radius, accent_bgr, 2)
        
        # Rotating sweep line
        ang = t * 2 * math.pi
        lx = int(cx + 180 * math.cos(ang))
        ly = int(cy + 180 * math.sin(ang))
        cv2.line(frame, (cx, cy), (lx, ly), accent_bgr, 3)
        cv2.circle(frame, (lx, ly), 6, accent_bgr, -1)
        
        # Outer boundary box
        cv2.rectangle(frame, (20, 20), (width - 20, height - 20), (50, 50, 60), 1)
        
        # Text labels
        cv2.putText(frame, title.upper(), (48, height - 70), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (244, 244, 246), 2, cv2.LINE_AA)
        cv2.putText(frame, subtitle, (48, height - 35), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (142, 142, 147), 1, cv2.LINE_AA)
        cv2.putText(frame, "LIVE GSAP / VIDEO OBSERVER", (48, 55), cv2.FONT_HERSHEY_SIMPLEX, 0.55, accent_bgr, 1, cv2.LINE_AA)
        
        out.write(frame)
        
    out.release()
    print(f"Generated MP4: {path}")

# 1. Hero Sequencer (8 frames 1024x1024)
hero_meta = [
    ("01 / Luxury Fragrance", "AFZAL SCENTS UAE", "Bespoke Flacon & Tactile Unboxing", ACCENT, 0),
    ("02 / UI/UX Systems", "AETHELGARD CLOUD", "Dark-Mode Developer Platform", ACCENT, 1),
    ("03 / Modern Commerce", "VELOCE MINIMALIST", "Tactile Product Discovery Architecture", ACCENT_ALT, 2),
    ("04 / Vector Precision", "KINETIX TRANSIT", "Algorithmic Identity & Collateral", ACCENT, 3),
    ("05 / Creative Code", "VARIABLE TYPOGRAPHY", "Interactive GSAP & GLSL Fluid Waves", ACCENT, 4),
    ("06 / Bilingual Type", "ARABIC & LATIN", "Kufic Geometry Meets Grotesque", ACCENT, 0),
    ("07 / Tactile Packaging", "GOLD EMBOSS & SILK", "Materiality in Luxury Consumer Goods", ACCENT_ALT, 2),
    ("08 / UI Interactions", "TELEMETRY CARDS", "Spring-Damped Physics Micro-Interactions", ACCENT, 1),
]

for idx, (cat, title, sub, acc, th) in enumerate(hero_meta):
    img = draw_artistic_canvas(1024, 1024, cat, title, sub, acc, th)
    save_webp(img, f"public/media/hero/frame-0{idx+1}.webp", quality=85)

# 2. Project 1: Luxury Fragrance
p1_img1 = draw_artistic_canvas(1024, 1024, "Brand Identity & Packaging", "AFZAL Scents & ZHALIA", "Primary Cover Art", ACCENT, 0)
save_webp(p1_img1, "public/media/projects/luxury-fragrance/cover.webp")

p1_banner = draw_artistic_canvas(1024, 500, "Packaging Showcase", "AFZAL Luxury Packaging Suite", "2:1 Hero Showcase Banner", ACCENT, 0)
save_webp(p1_banner, "public/media/projects/luxury-fragrance/banner-hero.webp")

save_webp(draw_artistic_canvas(1024, 1024, "Typography", "Bilingual Arabic-Latin Lockup", "Custom Ligatures & Proportions", ACCENT, 0), "public/media/projects/luxury-fragrance/square-typography.webp")
save_webp(draw_artistic_canvas(1024, 1024, "Flacon Geometry", "Obsidian Glass Structural Detail", "Bespoke Mold Blueprint", ACCENT, 0), "public/media/projects/luxury-fragrance/square-bottle-grid.webp")
save_webp(draw_artistic_canvas(1024, 1024, "Rigid Box", "Velvet Inlay & Gold Foil", "Unboxing Architecture", ACCENT, 0), "public/media/projects/luxury-fragrance/square-mockup-1.webp")
save_webp(draw_artistic_canvas(1024, 1024, "Materiality", "Sandstone, Brass, Matte Paper", "Tactile Sample Grid", ACCENT, 0), "public/media/projects/luxury-fragrance/square-palette.webp")
save_webp(draw_artistic_canvas(1024, 1024, "Discovery Set", "10ml Travel Atomizer Sleeves", "Retail Packaging Edition", ACCENT, 0), "public/media/projects/luxury-fragrance/square-mockup-2.webp")
save_webp(draw_artistic_canvas(1024, 1024, "Brand Guidelines", "Stationery & Corporate Collateral", "Comprehensive Standards", ACCENT, 0), "public/media/projects/luxury-fragrance/square-mockup-3.webp")

save_webp(draw_artistic_canvas(1024, 500, "Film Poster", "Bottle Reveal Light Sweep", "Video Poster Thumbnail", ACCENT, 0), "public/media/projects/luxury-fragrance/bottle-reveal-poster.webp")
make_mp4_loop("public/media/projects/luxury-fragrance/bottle-reveal.mp4", 1024, 500, "AFZAL Perfumes 3D Reveal", "Atmospheric Light Reflections")

# 3. Project 2: Dark-Mode UI/UX
save_webp(draw_artistic_canvas(1024, 1024, "UI/UX Design", "Aethelgard Cloud System", "Primary Cover Art", ACCENT, 1), "public/media/projects/darkmode-uiux/cover.webp")
save_webp(draw_artistic_canvas(1024, 500, "Design System", "Enterprise Multi-Device Suite", "Desktop & Tablet Ecosystem", ACCENT, 1), "public/media/projects/darkmode-uiux/banner-devices.webp")
save_webp(draw_artistic_canvas(1024, 1024, "Tokens & Scale", "Design Tokens Matrix", "Fluid Typography & Radii", ACCENT, 1), "public/media/projects/darkmode-uiux/square-tokens.webp")
save_webp(draw_artistic_canvas(1024, 1024, "Components", "Telemetry & Analytics Cards", "48 Modular Interface Blocks", ACCENT, 1), "public/media/projects/darkmode-uiux/square-components.webp")

save_webp(draw_artistic_canvas(1024, 500, "Prototype Poster", "Interactive Figma Flow Walkthrough", "Video Poster Thumbnail", ACCENT, 1), "public/media/projects/darkmode-uiux/prototype-flow-poster.webp")
make_mp4_loop("public/media/projects/darkmode-uiux/prototype-flow.mp4", 1024, 500, "Aethelgard High-Fi Prototype", "Telemetry Dashboard Navigation")

save_webp(draw_artistic_canvas(1024, 500, "Interaction Poster", "Kinetic Button & Drawer Physics", "Video Poster Thumbnail", ACCENT, 1), "public/media/projects/darkmode-uiux/micro-interaction-poster.webp")
make_mp4_loop("public/media/projects/darkmode-uiux/micro-interaction.mp4", 1024, 500, "Micro-Interaction Dynamics", "Spring-Damped State Feedback")

# 4. Project 3: E-Commerce Experience
save_webp(draw_artistic_canvas(1024, 1024, "UX Research & UI", "Veloce Minimalist Goods", "Primary Cover Art", ACCENT_ALT, 2), "public/media/projects/ecommerce-exp/cover.webp")
save_webp(draw_artistic_canvas(1024, 500, "E-Commerce", "Veloce Desktop Lookbook", "Editorial Product Experience", ACCENT_ALT, 2), "public/media/projects/ecommerce-exp/banner-desktop.webp")
save_webp(draw_artistic_canvas(1024, 1024, "UX Architecture", "User Journey & Wireframe Comparison", "Cart Abandonment Optimization", ACCENT_ALT, 2), "public/media/projects/ecommerce-exp/square-wireframes.webp")
save_webp(draw_artistic_canvas(1024, 1024, "Customizer", "Live 3D Spec & Pricing Engine", "Real-Time Material Switcher", ACCENT_ALT, 2), "public/media/projects/ecommerce-exp/square-hifi-flow.webp")
save_webp(draw_artistic_canvas(1024, 1024, "Mobile UX", "Thumb-Optimized PDP & Sticky CTA", "Single-Handed Commerce", ACCENT_ALT, 2), "public/media/projects/ecommerce-exp/square-mobile-1.webp")
save_webp(draw_artistic_canvas(1024, 1024, "Checkout", "One-Page Checkout & Apple Pay", "Frictionless Conversion", ACCENT_ALT, 2), "public/media/projects/ecommerce-exp/square-mobile-2.webp")

# 5. Project 4: Vector Identity Suite
save_webp(draw_artistic_canvas(1024, 1024, "Graphic Design", "Kinetix Global Logistics", "Primary Cover Art", ACCENT, 3), "public/media/projects/vector-identity/cover.webp")
save_webp(draw_artistic_canvas(1024, 500, "Transit Suite", "Brand Identity Ecosystem", "4,000+ Fleet Vehicle Application", ACCENT, 3), "public/media/projects/vector-identity/banner-ecosystem.webp")
save_webp(draw_artistic_canvas(1024, 1024, "Vector Math", "Bezier Coordinates vs Final Render", "Mathematical Precision System", ACCENT, 3), "public/media/projects/vector-identity/square-vector-outlines.webp")
save_webp(draw_artistic_canvas(1024, 1024, "Iconography", "64-Piece Custom Wayfinding Grid", "Signage & Airport Hub Directionals", ACCENT, 3), "public/media/projects/vector-identity/square-icon-system.webp")
save_webp(draw_artistic_canvas(1024, 1024, "Print", "Letterpress Cotton Cards & NFC Badges", "Corporate Tactile Stationery", ACCENT, 3), "public/media/projects/vector-identity/square-stationery.webp")
save_webp(draw_artistic_canvas(1024, 1024, "Editorial", "Hardcover Annual Financial Book", "Spot-UV Inlays & Grid Layouts", ACCENT, 3), "public/media/projects/vector-identity/square-print-collateral.webp")

# 6. Creative Lab Updates (8 items)
update_items = [
    ("Brand Marks", "Bilingual Calligraphic Logotype", "Arabic Kufic & Grotesque Study", ACCENT, 0, False),
    ("UI/UX Shots", "Dynamic Bento Telemetry Widget", "Real-Time Spring Chart Micro-Interaction", ACCENT, 1, True),
    ("Code Experiments", "Kinetic Variable Font Wave", "GLSL Distance-Mapped Font Axes", ACCENT, 4, True),
    ("Vector & 3D Studies", "Hyper-Detailed Vector Heart", "1,200 Precision Bezier Anchor Points", ACCENT_ALT, 3, False),
    ("UI/UX Shots", "Tactile Dark E-Commerce Drawer", "Haptic Gesture Swipe Interaction", ACCENT, 2, False),
    ("Brand Marks", "Minimalist Tech Monogram", "Reductive Single-Stroke Geometry", ACCENT, 3, False),
    ("Vector & 3D Studies", "Raymarched Glass Caustics", "Optical Light Dispersion in Flacons", ACCENT_ALT, 0, True),
    ("Code Experiments", "Magnetic Cursor Physics", "Euler Integration Interaction Zone", ACCENT, 4, False),
]

for idx, (cat, title, sub, acc, th, has_vid) in enumerate(update_items):
    num = f"lab-0{idx+1}"
    img = draw_artistic_canvas(800, 800, cat, title, sub, acc, th)
    save_webp(img, f"public/media/updates/{num}.webp", quality=85)
    if has_vid:
        poster = draw_artistic_canvas(800, 450, cat, title, "Video Poster Preview", acc, th)
        save_webp(poster, f"public/media/updates/{num}-poster.webp", quality=85)
        make_mp4_loop(f"public/media/updates/{num}.mp4", 800, 450, title, sub)

print("All media generated successfully!")
