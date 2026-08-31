const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const input = 'src/assets/images/beatwap-logo.png';
const outputDir = 'public/icons';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sizes = [16, 32, 72, 96, 144, 152, 192, 384, 512];

async function generateIcons() {
  for (const size of sizes) {
    const output = path.join(outputDir, `icon-${size}x${size}.png`);
    await sharp(input)
      .resize(size, size, { fit: 'contain', background: { r: 11, g: 11, b: 11, alpha: 1 } })
      .png()
      .toFile(output);
    console.log(`Generated ${size}x${size}`);
  }
  await sharp(input)
    .resize(512, 512, { fit: 'contain', background: { r: 11, g: 11, b: 11, alpha: 1 } })
    .png()
    .toFile(path.join(outputDir, 'icon-512x512-maskable.png'));
  console.log('Generated maskable icon');
}

generateIcons().catch(console.error);