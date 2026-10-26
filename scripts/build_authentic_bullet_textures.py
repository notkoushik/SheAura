import os
import numpy as np
from PIL import Image, ImageFilter, ImageOps
from scipy.ndimage import gaussian_filter, sobel

os.makedirs("public/products/3D/refined", exist_ok=True)

# 1. Load original photos
red_img = Image.open("public/products/3D/red.jpg").convert("RGB")
other_img = Image.open("public/products/3D/other.jpg").convert("RGB")

red_arr = np.array(red_img, dtype=np.float32)
other_arr = np.array(other_img, dtype=np.float32)

print("Loaded red.jpg:", red_arr.shape)
print("Loaded other.jpg:", other_arr.shape)

# 2. Extract authentic relief area from red.jpg
# Bullet bounds: x: 360 to 840 (width 480), y: 430 to 1076 (height 646)
x1, x2 = 360, 840
y1, y2 = 430, 1076

front_relief = red_img.crop((x1, y1, x2, y2))
front_relief_arr = np.array(front_relief, dtype=np.float32)

# Also extract upper side floral wings (beside the facet):
# Left wing: x: 360 to 480, y: 120 to 430
# Right wing: x: 720 to 840, y: 120 to 430
left_wing = red_img.crop((360, 120, 480, 430))
right_wing = red_img.crop((720, 120, 840, 430))

# 3. Create a seamless 360-degree cylindrical wrap map of size 2048 x 1024
# u in [0, 1] wraps 360 degrees:
# u = 0.5 is front center (Nightingale bird)
# u = 0.0 and 1.0 is the back seam
wrap_w = 2048
wrap_h = 1024

# Resize front relief to occupy the central 50% width (1024 px) and height (1024 px)
front_resized = front_relief.resize((1024, wrap_h), Image.Resampling.LANCZOS)
front_np = np.array(front_resized, dtype=np.float32)

# Create background canvas filled with deep crimson wax color sampled from flat wax areas
# Flat wax in red.jpg: R ~ 185, G ~ 18, B ~ 24
base_color = np.array([184.0, 18.0, 24.0], dtype=np.float32)
canvas = np.ones((wrap_h, wrap_w, 3), dtype=np.float32) * base_color

# Place front relief in the center: x from 512 to 1536
canvas[:, 512:1536, :] = front_np

# For the left quarter (0 to 512) and right quarter (1536 to 2048):
# We use mirrored and floral elements from the side wings to create continuous, rich botanical vines
# Left wing flipped horizontally:
left_wing_resized = left_wing.resize((512, wrap_h), Image.Resampling.LANCZOS)
right_wing_resized = right_wing.resize((512, wrap_h), Image.Resampling.LANCZOS)

lw_np = np.array(left_wing_resized, dtype=np.float32)
rw_np = np.array(right_wing_resized, dtype=np.float32)

canvas[:, 0:512, :] = rw_np
canvas[:, 1536:2048, :] = lw_np

# Smooth feather blending at seams (around x=512, x=1536, and back seam x=0/2048)
blend_w = 80
for i in range(blend_w):
    alpha = i / float(blend_w)
    # Seam at 512
    x = 512 - blend_w // 2 + i
    if 0 <= x < wrap_w:
        canvas[:, x, :] = (1 - alpha) * canvas[:, 512 - blend_w // 2, :] + alpha * canvas[:, 512 + blend_w // 2, :]

    # Seam at 1536
    x = 1536 - blend_w // 2 + i
    if 0 <= x < wrap_w:
        canvas[:, x, :] = (1 - alpha) * canvas[:, 1536 - blend_w // 2, :] + alpha * canvas[:, 1536 + blend_w // 2, :]

# Ensure seamless left-right edges (x=0 matches x=2047)
edge_w = 60
for i in range(edge_w):
    alpha = i / float(edge_w)
    left_x = i
    right_x = wrap_w - edge_w + i
    avg = (canvas[:, left_x, :] + canvas[:, right_x, :]) * 0.5
    canvas[:, left_x, :] = (1 - alpha) * avg + alpha * canvas[:, left_x, :]
    canvas[:, right_x, :] = alpha * avg + (1 - alpha) * canvas[:, right_x, :]

print("Constructed 360-degree cylindrical wrap canvas!")

# 4. Generate Sculptural Bas-Relief Heightmap (Soft, rounded wax carving - NO harsh combusted edges)
# In the photo, lighting creates luminance variations. Luminance represents relief depth.
lum = 0.299 * canvas[:, :, 0] + 0.587 * canvas[:, :, 1] + 0.114 * canvas[:, :, 2]
# Normalize luminance to [0, 1]
lum_min, lum_max = np.percentile(lum, 5), np.percentile(lum, 98)
heightmap = np.clip((lum - lum_min) / (lum_max - lum_min + 1e-5), 0.0, 1.0)

# Apply gentle Gaussian filter to eliminate photo noise and produce smooth, velvety sculptural curves
heightmap_smooth = gaussian_filter(heightmap, sigma=1.8)

# 5. Compute Pristine 3D Normal Map (Tangent space: R=X, G=Y, B=Z)
# Sobel filter along X (u) and Y (v)
gx = sobel(heightmap_smooth, axis=1) * 3.5
gy = sobel(heightmap_smooth, axis=0) * 3.5

# Tangent space normal vector: (-gx, -gy, 1.0) normalized
nz = np.ones_like(gx) * 1.0
length = np.sqrt(gx**2 + gy**2 + nz**2)

nx = -gx / length
ny = -gy / length
nz = nz / length

# Map [-1, 1] to [0, 255] RGB
normal_map = np.zeros((wrap_h, wrap_w, 3), dtype=np.uint8)
normal_map[:, :, 0] = np.clip((nx * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)
normal_map[:, :, 1] = np.clip((ny * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)
normal_map[:, :, 2] = np.clip((nz * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)

Image.fromarray(normal_map).save("public/products/3D/refined/bullet_relief_normal.png")
print("Saved bullet_relief_normal.png!")

# 6. Compute Velvet Roughness Map (Matte wax: high base roughness 0.82, crevices 0.88)
roughness_map = np.clip(0.80 + 0.10 * (1.0 - heightmap_smooth), 0.0, 1.0)
roughness_uint8 = (roughness_map * 255).astype(np.uint8)
Image.fromarray(roughness_uint8).save("public/products/3D/refined/bullet_relief_roughness.png")
print("Saved bullet_relief_roughness.png!")

# 7. Generate the 4 True Shade Diffuse Textures for Cylindrical Relief Wall
# Normalize canvas color to preserve bas-relief tonal nuance while re-targeting hue to shade
norm_lum = lum / (np.mean(lum) + 1e-5)
norm_lum = np.clip(norm_lum, 0.65, 1.35)

def make_diffuse(target_hex, output_path):
    h = target_hex.lstrip('#')
    r, g, b = tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
    diffuse = np.zeros((wrap_h, wrap_w, 3), dtype=np.float32)
    diffuse[:, :, 0] = np.clip(r * norm_lum, 0, 255)
    diffuse[:, :, 1] = np.clip(g * norm_lum, 0, 255)
    diffuse[:, :, 2] = np.clip(b * norm_lum, 0, 255)
    Image.fromarray(diffuse.astype(np.uint8)).save(output_path, quality=96)
    print(f"Saved {output_path}")

make_diffuse("#b71d28", "public/products/3D/refined/bullet_relief_scarlet.jpg")
make_diffuse("#7e1932", "public/products/3D/refined/bullet_relief_roseberry.jpg")
make_diffuse("#c46e72", "public/products/3D/refined/bullet_relief_blush.jpg")
make_diffuse("#6b2247", "public/products/3D/refined/bullet_relief_orchid.jpg")

# 8. Generate Smooth Velvet Matte Applicator Facet Textures
# Extract the authentic powdery micro-texture from red_facet_crop.png
facet_crop = Image.open("public/products/3D/refined/red_facet_crop.png").convert("RGB")
facet_tile = facet_crop.resize((512, 512), Image.Resampling.LANCZOS)
facet_np = np.array(facet_tile, dtype=np.float32)
facet_lum = (0.299 * facet_np[:, :, 0] + 0.587 * facet_np[:, :, 1] + 0.114 * facet_np[:, :, 2])
facet_lum_norm = facet_lum / (np.mean(facet_lum) + 1e-5)
facet_lum_norm = np.clip(facet_lum_norm, 0.88, 1.12)  # very subtle micro-powder modulation

def make_facet_texture(target_hex, output_path):
    h = target_hex.lstrip('#')
    r, g, b = tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
    facet_img = np.zeros((512, 512, 3), dtype=np.float32)
    facet_img[:, :, 0] = np.clip(r * facet_lum_norm, 0, 255)
    facet_img[:, :, 1] = np.clip(g * facet_lum_norm, 0, 255)
    facet_img[:, :, 2] = np.clip(b * facet_lum_norm, 0, 255)
    Image.fromarray(facet_img.astype(np.uint8)).save(output_path, quality=96)
    print(f"Saved {output_path}")

make_facet_texture("#b71d28", "public/products/3D/refined/bullet_facet_scarlet.jpg")
make_facet_texture("#7e1932", "public/products/3D/refined/bullet_facet_roseberry.jpg")
make_facet_texture("#c46e72", "public/products/3D/refined/bullet_facet_blush.jpg")
make_facet_texture("#6b2247", "public/products/3D/refined/bullet_facet_orchid.jpg")

print("All authentic textures generated successfully!")
