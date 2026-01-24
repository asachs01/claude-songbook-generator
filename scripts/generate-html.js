#!/usr/bin/env node

/**
 * Generates an HTML chord chart page from a song JSON file.
 *
 * Usage:
 *   node scripts/generate-html.js songs/song-name.json
 *   node scripts/generate-html.js songs/*.json   # batch mode
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'song-page.html');
const STYLES_PATH = path.join(__dirname, '..', 'templates', 'styles.css');
const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'html');

/**
 * Build the lyrics HTML from song data.
 */
function buildLyricsHtml(lyrics) {
  if (!lyrics || lyrics.length === 0) return '';

  return lyrics.map(section => {
    const labelHtml = section.label
      ? `<div class="section-label">${section.label}</div>`
      : '';
    const linesHtml = section.lines
      .map(line => `<div class="lyric-line">${escapeHtml(line)}</div>`)
      .join('\n        ');

    return `      <div class="lyrics-section">
        ${labelHtml}
        ${linesHtml}
      </div>`;
  }).join('\n');
}

/**
 * Build the chord grid HTML for a single section.
 */
function buildSectionGrid(section) {
  const rows = section.rows || 8;
  const cols = Math.ceil(section.chords.length / rows);

  // Build ending markers if present
  let endingHtml = '';
  if (section.endings && section.endings.length > 0) {
    const markers = section.endings
      .map(e => `<span class="ending-marker">${e.ending}</span>`)
      .join('');
    endingHtml = `<span class="ending-markers">${markers}</span>`;
  }

  // Section header with label and endings
  const headerHtml = `
    <div class="section-header">
      <span class="section-label-text">${section.label || ''}</span>
      ${endingHtml}
    </div>`;

  // Build grid cells (they fill column-by-column via CSS grid-auto-flow: column)
  const cellsHtml = section.chords
    .map(chord => `<div class="chord-cell">${escapeHtml(chord)}</div>`)
    .join('\n          ');

  return `
        <div class="chord-section">
          ${headerHtml}
          <div class="chord-grid" style="--rows: ${rows}; grid-template-rows: repeat(${rows}, 1fr);">
            ${cellsHtml}
          </div>
        </div>`;
}

/**
 * Build the full chord chart HTML for all keys.
 */
function buildChordChartsHtml(keys) {
  if (!keys || keys.length === 0) return '';

  return keys.map(keyEntry => {
    const sectionsHtml = keyEntry.sections
      .map(section => buildSectionGrid(section))
      .join('\n');

    return `
      <div class="key-group">
        <div class="chart-key">Key of ${keyEntry.key}</div>
        <div class="sections-container">
          ${sectionsHtml}
        </div>
      </div>`;
  }).join('\n');
}

/**
 * Escape HTML entities.
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate the full HTML page for a song.
 */
function generateHtml(song) {
  let template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

  // Read CSS and inline it for self-contained HTML
  const css = fs.readFileSync(STYLES_PATH, 'utf-8');
  template = template.replace(
    '<link rel="stylesheet" href="../templates/styles.css">',
    `<style>\n${css}\n  </style>`
  );

  const chartTitle = song.chartTitle || song.title;
  const lyricsHtml = buildLyricsHtml(song.lyrics);
  const chordChartsHtml = buildChordChartsHtml(song.keys);

  const html = template
    .replace(/\{\{TITLE\}\}/g, escapeHtml(song.title))
    .replace('{{CHART_TITLE}}', escapeHtml(chartTitle))
    .replace('{{LYRICS_HTML}}', lyricsHtml)
    .replace('{{CHORD_CHARTS_HTML}}', chordChartsHtml);

  return html;
}

/**
 * Convert a song title to a filename slug.
 */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node scripts/generate-html.js <song.json> [song2.json ...]');
    process.exit(1);
  }

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const songFile of args) {
    const songPath = path.resolve(songFile);
    const song = JSON.parse(fs.readFileSync(songPath, 'utf-8'));
    const html = generateHtml(song);

    const slug = slugify(song.title);
    const outputPath = path.join(OUTPUT_DIR, `${slug}.html`);
    fs.writeFileSync(outputPath, html);
    console.log(`Generated: ${outputPath}`);
  }
}

module.exports = { generateHtml, slugify };
