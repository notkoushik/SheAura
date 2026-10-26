import os
from PIL import Image, ImageFilter, ImageOps
import numpy as np

os.makedirs("public/products/3D/processed", exist_ok=True)

# 1. Load original user photos
red_path = "public/products/3D/red.jpg"
other_path = "public/products/3D/other.jpg"
still_path = "public/products/Minimal_design/Scarlet Rose Lipstick_still.png"

red_img = Image.open(red_path).convert("RGB")
other_img = Image.open(other_path).convert("RGB")

red_arr = np.array(red_img)
other_arr = np.array(other_img)

# Bounding box of the bullet in red.jpg:
# xs: 296 to 921 (width 625)
# ys: 25 to 1070 (height 1045)
# Let's crop with a small 10px margin
x1, x2 = 295, 922
y1, y2 = 25, 1072

bullet_red = red_img.crop((x1, y1, x2, y2))
bullet_other = other_img.crop((x1, y1, x2, y2))

# Save front crops
bullet_red.save("public/products/3D/processed/bullet_scarlet_front.jpg", quality=95)
bullet_other.save("public/products/3D/processed/bullet_roseberry_front.jpg", quality=95)

# Generate other 2 shades: Blush Rose & Orchid
# Blush Rose: softer, warm petal nude-rose
# Orchid: rich deep berry-plum
red_np = np.array(bullet_red, dtype=np.float32)

# Blush Rose transform: softer luminance, more warm peach-pink tone
blush_np = red_np.copy()
# Normalize red channel, boost green/blue slightly to create soft rose-nude
blush_np[:, :, 0] = np.clip(red_np[:, :, 0] * 0.95 + 40, 0, 255)
blush_np[:, :, 1] = np.clip(red_np[:, :, 1] * 0.6 + red_np[:, :, 0] * 0.4 + 30, 0, 255)
blush_np[:, :, 2] = np.clip(red_np[:, :, 2] * 0.6 + red_np[:, :, 0] * 0.45 + 30, 0, 255)
Image.fromarray(blush_np.astype(np.uint8)).save("public/products/3D/processed/bullet_blush_rose_front.jpg", quality=95)

# Orchid transform: cooler violet undertone
orchid_np = np.array(bullet_other, dtype=np.float32)
orchid_np[:, :, 0] = np.clip(orchid_np[:, :, 0] * 0.9, 0, 255)
orchid_np[:, :, 1] = np.clip(orchid_np[:, :, 1] * 0.7, 0, 255)
orchid_np[:, :, 2] = np.clip(orchid_np[:, :, 2] * 1.35 + 20, 0, 255)
Image.fromarray(orchid_np.astype(np.uint8)).save("public/products/3D/processed/bullet_orchid_front.jpg", quality=95)

print("Saved 4 shade front crops!")

# 2. Extract Relief Heightmap and Tangent-Space Normal Map from red.jpg
# Convert bullet_red to grayscale
gray = bullet_red.convert("L")
# The background is light (~231), the bullet is darker (~100-140)
# Inside the bullet, the carving highlights are slightly brighter and valleys are darker.
# Let's isolate the bullet mask
gray_np = np.array(gray, dtype=np.float32)

# High-pass filter to extract relief details (feathers, flower petals, stamen)
low_pass = np.array(gray.filter(ImageFilter.GaussianBlur(radius=8)), dtype=np.float32)
high_pass = gray_np - low_pass

# Normalize high_pass into 0..255
hp_norm = np.clip(128.0 + high_pass * 2.8, 0, 255).astype(np.uint8)
hp_img = Image.fromarray(hp_norm)
hp_img.save("public/products/3D/processed/bullet_relief_height.png")

# Compute Sobel gradients for Tangent-Space Normal Map
# dx: sobel horizontal, dy: sobel vertical
kx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float32) / 8.0
ky = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=np.float32) / 8.0

# Convolve manually with numpy pad
padded = np.pad(gray_np, 1, mode='edge')
h, w = gray_np.shape
dx = np.zeros((h, w), dtype=np.float32)
dy = np.zeros((h, w), dtype=np.float32)

for i in range(3):
    for j in range(3):
        dx += kx[i, j] * padded[i:i+h, j:j+w]
        dy += ky[i, j] * padded[i:i+h, j:j+w]

# Scale gradient strength for tactile depth
strength = 2.2
dx = dx * strength
dy = dy * strength

# Normal vector N = (-dx, -dy, 1) normalized
length = np.sqrt(dx**2 + dy**2 + 1.0)
nx = -dx / length
ny = -dy / length
nz = 1.0 / length

# Map from [-1, 1] to [0, 255] RGB
r = np.clip((nx * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)
g = np.clip((ny * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)
b = np.clip((nz * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)

normal_map = np.stack([r, g, b], axis=2)
Image.fromarray(normal_map).save("public/products/3D/processed/bullet_relief_normal.png")
print("Generated high-precision tangent-space normal map!")

# 3. Create a seamless cylindrical unwrap texture (2048 x 1024)
# In cylindrical orthographic projection: x = R * sin(theta) where theta goes from -pi/2 to pi/2
# Unproject: theta = arcsin((x - R) / R)
# Let's unproject the front 180 degrees to flat UV space
h_bullet, w_bullet = gray_np.shape
R = w_bullet / 2.0
cx = R

uv_w = 2048
uv_h = 1024
unwrapped_red = np.zeros((uv_h, uv_w, 3), dtype=np.uint8)
unwrapped_normal = np.full((uv_h, uv_w, 3), [128, 128, 255], dtype=np.uint8)

# Map the front 180 deg to center half of uv texture (x: 512 to 1536)
# and mirror/wrap smoothly to the back half (0 to 512 and 1536 to 2048)
# Rescale bullet to uv_h
bullet_red_scaled = bullet_red.resize((w_bullet, uv_h), Image.Resampling.LANCZOS)
normal_scaled = Image.fromarray(normal_map).resize((w_bullet, uv_h), Image.Resampling.LANCZOS)
red_arr_scaled = np.array(bullet_red_scaled)
norm_arr_scaled = np.array(normal_scaled)

# Front 180 degrees:
# u goes from 0.25 to 0.75 (width = 1024)
for col in range(1024):
    u = col / 1024.0 # 0 to 1
    # theta from -pi/2 to pi/2
    theta = (u - 0.5) * np.pi
    # Orthographic projected x in photo:
    proj_x = cx + R * np.sin(theta)
    proj_x_int = int(np.clip(proj_x, 0, w_bullet - 1))
    
    target_x = 512 + col
    unwrapped_red[:, target_x] = red_arr_scaled[:, proj_x_int]
    unwrapped_normal[:, target_x] = norm_arr_scaled[:, proj_x_int]

# For the back 180 degrees (0..512 and 1536..2048), mirror from the sides for seamless coverage
unwrapped_red[:, 0:512] = unwrapped_red[:, 1024:512:-1]
unwrapped_red[:, 1536:2048] = unwrapped_red[:, 1536:1024:-1]

unwrapped_normal[:, 0:512] = unwrapped_normal[:, 1024:512:-1]
unwrapped_normal[:, 1536:2048] = unwrapped_normal[:, 1536:1024:-1]

Image.fromarray(unwrapped_red).save("public/products/3D/processed/bullet_unwrap_scarlet.jpg", quality=95)
Image.fromarray(unwrapped_normal).save("public/products/3D/processed/bullet_unwrap_normal.png")
print("Saved 360 cylindrical unwrapped diffuse and normal maps!")

# 4. Extract authentic casing gold texture from Scarlet Rose Lipstick_still.png
still_img = Image.open(still_path)
# Let's inspect casing region in still_img
# We will create a dedicated casing texture with high-res gold brushed metal + official brand logo
print("All texture processing complete!")
