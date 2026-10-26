import os
from PIL import Image, ImageFilter
import numpy as np

# Load the carved wax texture map
wrap_path = "public/products/3D/refined/sheaura_carved_bullet_wrap.jpg"
wrap_img = Image.open(wrap_path).convert("RGB")
wrap_arr = np.array(wrap_img)

# 1. Generate Scarlet Rose (native crimson)
wrap_img.save("public/products/3D/refined/bullet_scarlet.jpg", quality=95)

# 2. Generate Roseberry (rich deep mulberry plum, sampled from other.jpg)
# other.jpg sample: R=124, G=27, B=46 (ratio: R is high, G is low, B is medium-high)
arr_roseberry = wrap_arr.copy().astype(np.float32)
# Reduce green and shift toward deep wine / mulberry
arr_roseberry[:, :, 0] = np.clip(wrap_arr[:, :, 0] * 0.85 + 10, 0, 255)
arr_roseberry[:, :, 1] = np.clip(wrap_arr[:, :, 1] * 0.45, 0, 255)
arr_roseberry[:, :, 2] = np.clip(wrap_arr[:, :, 2] * 1.15 + 25, 0, 255)
Image.fromarray(arr_roseberry.astype(np.uint8)).save("public/products/3D/refined/bullet_roseberry.jpg", quality=95)

# 3. Generate Blush Rose (warm petal nude-rose)
# Target ~ #d37d80 -> soft, lighter, warmer
arr_blush = wrap_arr.copy().astype(np.float32)
lum = 0.299 * wrap_arr[:, :, 0] + 0.587 * wrap_arr[:, :, 1] + 0.114 * wrap_arr[:, :, 2]
lum_n = lum / 255.0
arr_blush[:, :, 0] = np.clip(210 * (0.4 + 0.6 * lum_n) + 25, 0, 255)
arr_blush[:, :, 1] = np.clip(130 * (0.4 + 0.6 * lum_n) + 20, 0, 255)
arr_blush[:, :, 2] = np.clip(135 * (0.4 + 0.6 * lum_n) + 25, 0, 255)
Image.fromarray(arr_blush.astype(np.uint8)).save("public/products/3D/refined/bullet_blush.jpg", quality=95)

# 4. Generate Orchid (dark rich royal plum)
# Target ~ #661f43
arr_orchid = wrap_arr.copy().astype(np.float32)
arr_orchid[:, :, 0] = np.clip(wrap_arr[:, :, 0] * 0.70 + 15, 0, 255)
arr_orchid[:, :, 1] = np.clip(wrap_arr[:, :, 1] * 0.35, 0, 255)
arr_orchid[:, :, 2] = np.clip(wrap_arr[:, :, 2] * 1.30 + 35, 0, 255)
Image.fromarray(arr_orchid.astype(np.uint8)).save("public/products/3D/refined/bullet_orchid.jpg", quality=95)

print("Generated 4 shade diffuse textures!")

# 5. Generate high-fidelity Normal Map from wrap_img
gray = np.array(wrap_img.convert("L"), dtype=np.float32)
# High-pass filter
blurred = np.array(wrap_img.convert("L").filter(ImageFilter.GaussianBlur(radius=4)), dtype=np.float32)
hp = gray - blurred

# Sobel filter
kx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float32) / 8.0
ky = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=np.float32) / 8.0

h, w = gray.shape
padded = np.pad(gray, 1, mode='wrap') # Seamless wrap mode!
dx = np.zeros_like(gray)
dy = np.zeros_like(gray)

for i in range(3):
    for j in range(3):
        dx += kx[i, j] * padded[i:i+h, j:j+w]
        dy += ky[i, j] * padded[i:i+h, j:j+w]

# Tangent normal map
strength = 2.5
dx *= strength
dy *= strength

length = np.sqrt(dx**2 + dy**2 + 1.0)
nx = -dx / length
ny = -dy / length
nz = 1.0 / length

r = np.clip((nx * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)
g = np.clip((ny * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)
b = np.clip((nz * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)

normal_map = np.stack([r, g, b], axis=2)
Image.fromarray(normal_map).save("public/products/3D/refined/bullet_normal_seamless.png")

# Roughness map: carving crevices are slightly rougher (velvet matte)
roughness = np.clip(140.0 - hp * 1.5, 90, 210).astype(np.uint8)
Image.fromarray(roughness).save("public/products/3D/refined/bullet_roughness.png")

print("Generated seamless normal and roughness maps!")
