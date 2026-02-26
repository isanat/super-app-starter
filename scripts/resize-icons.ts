import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sizes = [192, 512];
const iconDir = './public/icons';

async function resizeIcons() {
  const sourceIcon = path.join(iconDir, 'icon-new.png');
  
  for (const size of sizes) {
    // Regular icon
    await sharp(sourceIcon)
      .resize(size, size)
      .png()
      .toFile(path.join(iconDir, `icon-${size}.png`));
    
    console.log(`✓ Created icon-${size}.png`);
    
    // Maskable icon (with 10% padding for safe area)
    const padding = Math.floor(size * 0.1);
    const innerSize = size - (padding * 2);
    
    // Create maskable version with padding
    await sharp(sourceIcon)
      .resize(innerSize, innerSize)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(iconDir, `icon-${size}-maskable.png`));
    
    console.log(`✓ Created icon-${size}-maskable.png`);
  }
  
  // Apple touch icon (180x180)
  await sharp(sourceIcon)
    .resize(180, 180)
    .png()
    .toFile(path.join(iconDir, 'apple-touch-icon.png'));
  
  console.log('✓ Created apple-touch-icon.png');
  
  // Also copy to public root
  await sharp(sourceIcon)
    .resize(180, 180)
    .png()
    .toFile('./public/apple-touch-icon.png');
  
  console.log('✓ Created public/apple-touch-icon.png');
  
  console.log('\n✅ All icons created successfully!');
}

resizeIcons().catch(console.error);
