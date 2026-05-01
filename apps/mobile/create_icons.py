from PIL import Image, ImageDraw

# Create simple WhatsForLunch icon (green with fork)
icon_size = (1024, 1024)
bg_color = (47, 125, 91)  # Green color from app.json

# iOS icon
ios_icon = Image.new('RGB', icon_size, bg_color)
draw = ImageDraw.Draw(ios_icon)
# Simple text
draw.text((400, 450), "WFL", fill=(255, 255, 255))
ios_icon.save('assets/icon/icon-ios.png')

# Android foreground
android_fg = Image.new('RGBA', icon_size, (47, 125, 91, 255))
draw = ImageDraw.Draw(android_fg)
draw.text((400, 450), "WFL", fill=(255, 255, 255, 255))
android_fg.save('assets/icon/icon-android-foreground.png')

# Splash icon (smaller)
splash_size = (512, 512)
splash = Image.new('RGB', splash_size, (251, 250, 247))  # bg color from app.json
draw = ImageDraw.Draw(splash)
draw.text((200, 230), "WhatsForLunch", fill=(47, 125, 91))
splash.save('assets/icon/splash-icon.png')

print("✓ Icons created")
