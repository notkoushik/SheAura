import os
import shutil
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, sobel

# Source paths
master_src = r"C:\Users\koushik\.gemini\antigravity\brain\12665c7d-03c7-4640-89f9-6146c09bf989\sheaura_lipstick_cylindrical_relief_1024_1793026266905.jpg"
out_dir = "public/products/3D/refined"
os.makedirs(out_dir, exist_ok=True)

# 1. Copy master wrap texture
master_img = Image.open(master_src).convert("RGB")
master_img.save(os.path.join(out_dir, "sheaura_carved_bullet_wrap.jpg"), quality=98)
print("Saved master wrap texture!")

master_arr = np.array(master_img, dtype=np.float32)

# 2. Generate smooth 3D normal map for bas-relief carving
# Compute luminance as height proxy
lum = 0.299 * master_arr[:, :, 0] + 0.587 * master_arr[:, :, 1] + 0.114 * master_arr[:, :, 2]
lum_min, lum_max = np.percentile(lum, 3), np.percentile(lum, 97)
h_norm = np.clip((lum - lum_min) / (lum_max - lum_min + 1e-5), 0.0, 1.0)

# Soft bilateral / gaussian smoothing to eliminate pixel noise and ensure soft velvet wax carving
h_smooth = gaussian_filter(h_norm, sigma=1.5)

# Tangent-space gradients
scale = 2.8
gx = sobel(h_smooth, axis=1) * scale
gy = sobel(h_smooth, axis=0) * scale

nz = np.ones_like(gx) * 1.0
length = np.sqrt(gx**2 + gy**2 + nz**2)

nx = -gx / length
ny = -gy / length
nz = nz / length

# Normal map RGB [0, 255]
normal_rgb = np.zeros((1024, 1024, 3), dtype=np.uint8)
normal_rgb[:, :, 0] = np.clip((nx * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)
normal_rgb[:, :, 1] = np.clip((ny * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)
normal_rgb[:, :, 2] = np.clip((nz * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)

Image.fromarray(normal_rgb).save(os.path.join(out_dir, "bullet_normal_seamless.png"))
print("Saved bullet_normal_seamless.png!")

# 3. Generate velvet matte roughness map (0.78 to 0.88, true matte wax)
roughness = np.clip(0.78 + 0.10 * (1.0 - h_smooth), 0.0, 1.0)
roughness_u8 = (roughness * 255).astype(np.uint8)
Image.fromarray(roughness_u8).save(os.path.join(out_dir, "bullet_roughness.png"))
print("Saved bullet_roughness.png!")

# 4. Generate the 4 Shade Diffuse Textures for Wall
# Normalized modulation factor to preserve subtle sculptural shading
lum_mean = np.mean(lum)
shade_factor = np.clip(lum / (lum_mean + 1e-5), 0.70, 1.30)

shades = [
    ("bullet_scarlet.jpg", "#b71d28"),
    ("bullet_roseberry.jpg", "#7e1932"),
    ("bullet_blush.jpg", "#c46e72"),
    ("bullet_orchid.jpg", "#6b2247"),
]

for filename, hex_val in shades:
    h = hex_val.lstrip('#')
    r, g, b = tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
    diffuse = np.zeros((1024, 1024, 3), dtype=np.float32)
    diffuse[:, :, 0] = np.clip(r * shade_factor, 0, 255)
    diffuse[:, :, 1] = np.clip(g * shade_factor, 0, 255)
    diffuse[:, :, 2] = np.clip(b * shade_factor, 0, 255)
    
    out_path = os.path.join(out_dir, filename)
    Image.fromarray(diffuse.astype(np.uint8)).save(out_path, quality=96)
    print(f"Saved {filename}")

# 5. Generate smooth velvet matte applicator facet textures (512x512 micro-powder texture)
facet_crop = Image.open("public/products/3D/refined/red_facet_crop.png").convert("RGB")
facet_tile = facet_crop.resize((512, 512), Image.Resampling.LANCZOS)
facet_np = np.array(facet_tile, dtype=np.float32)
facet_lum = (0.299 * facet_np[:, :, 0] + 0.587 * facet_np[:, :, 1] + 0.114 * facet_np[:, :, 2])
facet_lum_norm = np.clip(facet_lum / (np.mean(facet_lum) + 1e-5), 0.92, 1.08)

facet_shades = [
    ("facet_scarlet.jpg", "#b71d28"),
    ("facet_roseberry.jpg", "#7e1932"),
    ("facet_blush.jpg", "#c46e72"),
    ("facet_orchid.jpg", "#6b2247"),
]

for filename, hex_val in facet_shades:
    h = hex_val.lstrip('#')
    r, g, b = tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
    facet_img = np.zeros((512, 512, 3), dtype=np.float32)
    facet_img[:, :, 0] = np.clip(r * facet_lum_norm, 0, 255)
    facet_img[:, :, 1] = np.clip(g * facet_lum_norm, 0, 255)
    facet_img[:, :, 2] = np.clip(b * facet_lum_norm, 0, 255)
    
    out_path = os.path.join(out_dir, filename)
    Image.fromarray(facet_img.astype(np.uint8)).save(out_path, quality=96)
    print(f"Saved {filename}")

print("Master lipstick assets generated successfully!")
