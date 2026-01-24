#!/usr/bin/env node

/**
 * Converts an HTML chord chart to a landscape letter PDF via Puppeteer.
 *
 * Usage:
 *   node scripts/generate-pdf.js output/html/song-name.html
 *   node scripts/generate-pdf.js output/html/*.html   # batch mode
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'pdf');

async function generatePdf(htmlPath) {
  const absolutePath = path.resolve(htmlPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`HTML file not found: ${absolutePath}`);
  }

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Load the HTML file
  await page.goto(`file://${absolutePath}`, { waitUntil: 'networkidle0' });

  // Generate PDF with landscape letter dimensions
  const slug = path.basename(htmlPath, '.html');
  const outputPath = path.join(OUTPUT_DIR, `${slug}.pdf`);

  await page.pdf({
    path: outputPath,
    width: '11in',
    height: '8.5in',
    margin: {
      top: '0.5in',
      right: '0.5in',
      bottom: '0.5in',
      left: '0.5in'
    },
    printBackground: true
  });

  await browser.close();
  return outputPath;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node scripts/generate-pdf.js <file.html> [file2.html ...]');
    process.exit(1);
  }

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  (async () => {
    for (const htmlFile of args) {
      try {
        const outputPath = await generatePdf(htmlFile);
        console.log(`Generated: ${outputPath}`);
      } catch (err) {
        console.error(`Error processing ${htmlFile}: ${err.message}`);
        process.exit(1);
      }
    }
  })();
}

module.exports = { generatePdf };
