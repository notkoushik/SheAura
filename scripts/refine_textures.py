import os
from PIL import Image, ImageFilter
import numpy as np

os.makedirs("public/products/3D/refined", exist_ok=True)

red_img = Image.open("public/products/3D/red.jpg").convert("RGB")
other_img = Image.open("public/products/3D/other.jpg").convert("RGB")

red_arr = np.array(red_img)
other_arr = np.array(other_img)

# Isolate bullet in red.jpg
# Background is ~231, 231, 231
bg = np.array([231, 231, 231], dtype=np.float32)
dist = np.linalg.norm(red_arr.astype(np.float32) - bg, axis=2)

# Mask where pixel is part of the bullet or gold collar
# Bullet is from y=25 to y=1070
mask = dist > 35
# Refine mask to bullet area
bullet_mask = np.zeros_like(mask)
bullet_mask[25:1072, 290:925] = mask[25:1072, 290:925]

# Crop bounding box
x1, x2 = 295, 922
y1, y2 = 25, 1072

crop_red = red_arr[y1:y2, x1:x2]
crop_other = other_arr[y1:y2, x1:x2]
crop_mask = bullet_mask[y1:y2, x1:x2]

# Inpaint background with adjacent bullet color so no gray edge appears
h, w, _ = crop_red.shape

clean_red = crop_red.copy()
clean_other = crop_other.copy()

# For any pixel where mask is False, fill with median bullet color
bullet_pixels_red = clean_red[crop_mask]
bullet_pixels_other = clean_other[crop_mask]

median_color_red = np.median(bullet_pixels_red, axis=0).astype(np.uint8)
median_color_other = np.median(bullet_pixels_other, axis=0).astype(np.uint8)

# Smooth feathering on edges
for c in range(3):
    clean_red[:, :, c] = np.where(crop_mask, clean_red[:, :, c], median_color_red[c])
    clean_other[:, :, c] = np.where(crop_mask, clean_other[:, :, c], median_color_other[c])

# Generate Blush Rose (warm petal nude-rose)
# Target hex ~ #c46e72 -> R=196, G=110, B=114
clean_blush = np.zeros_like(clean_red, dtype=np.float32)
# Grayscale of red
lum = 0.299 * clean_red[:, :, 0] + 0.587 * clean_red[:, :, 1] + 0.114 * clean_red[:, :, 2]
lum_norm = lum / 255.0
clean_blush[:, :, 0] = np.clip(196 * (0.5 + 0.5 * lum_norm) + 20, 0, 255)
clean_blush[:, :, 1] = np.clip(110 * (0.5 + 0.5 * lum_norm) + 15, 0, 255)
clean_blush[:, :, 2] = np.clip(114 * (0.5 + 0.5 * lum_norm) + 20, 0, 255)

# Generate Orchid (rich deep plum)
# Target hex ~ #6b2247 -> R=107, G=34, B=71
clean_orchid = np.zeros_like(clean_other, dtype=np.float32)
lum_other = 0.299 * clean_other[:, :, 0] + 0.587 * clean_other[:, :, 1] + 0.114 * clean_other[:, :, 2]
lum_o_norm = lum_other / 255.0
clean_orchid[:, :, 0] = np.clip(115 * (0.4 + 0.6 * lum_o_norm), 0, 255)
clean_orchid[:, :, 1] = np.clip(34 * (0.4 + 0.6 * lum_o_norm), 0, 255)
clean_orchid[:, :, 2] = np.clip(75 * (0.4 + 0.6 * lum_o_norm), 0, 255)

# Save individual shade front textures
Image.fromarray(clean_red).save("public/products/3D/refined/shade_scarlet.jpg", quality=96)
Image.fromarray(clean_other).save("public/products/3D/refined/shade_roseberry.jpg", quality=96)
Image.fromarray(clean_blush.astype(np.uint8)).save("public/products/3D/refined/shade_blush.jpg", quality=96)
Image.fromarray(clean_orchid.astype(np.uint8)).save("public/products/3D/refined/shade_orchid.jpg", quality=96)

# Generate high-precision normal map from clean_red grayscale
gray = np.array(Image.fromarray(clean_red).convert("L"), dtype=np.float32)
# Apply high-pass to isolate relief
blurred = np.array(Image.fromarray(gray.astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius=6)), dtype=np.float32)
hp = gray - blurred

# Sobel filter
kx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float32) / 8.0
ky = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=np.float32) / 8.0

padded = np.pad(gray, 1, mode='edge')
dx = np.zeros_like(gray)
dy = np.zeros_like(gray)

for i in range(3):
    for j in range(3):
        dx += kx[i, j] * padded[i:i+h, j:j+w]
        dy += ky[i, j] * padded[i:i+h, j:j+w]

# Zero out outside mask
dx = np.where(crop_mask, dx * 3.0, 0.0)
dy = np.where(crop_mask, dy * 3.0, 0.0)

length = np.sqrt(dx**2 + dy**2 + 1.0)
nx = -dx / length
ny = -dy / length
nz = 1.0 / length

r = np.clip((nx * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)
g = np.clip((ny * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)
b = np.clip((nz * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)

normal_map = np.stack([r, g, b], axis=2)
Image.fromarray(normal_map).save("public/products/3D/refined/bullet_normal.png")

# Also save high-contrast height bump map
bump = np.clip(128.0 + hp * 3.5, 0, 255).astype(np.uint8)
bump = np.where(crop_mask, bump, 128)
Image.fromarray(bump).save("public/products/3D/refined/bullet_bump.png")

print("Generated refined textures and clean normal map!")
