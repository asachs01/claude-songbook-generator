#!/usr/bin/env node

/**
 * Chord transposition utility for bluegrass songbook.
 * Handles sharp/flat spelling conventions by key.
 *
 * Usage:
 *   node scripts/transpose.js songs/song.json <targetKey>
 *   node scripts/transpose.js songs/song.json A   # adds Key of A variant
 */

const fs = require('fs');
const path = require('path');

// Chromatic scale with enharmonic mappings
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Keys that use sharps vs flats (bluegrass conventions)
const SHARP_KEYS = new Set(['G', 'D', 'A', 'E', 'B', 'F#']);
const FLAT_KEYS  = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'C']);

/**
 * Parse a chord string into root + quality.
 * Examples: "G" -> {root: "G", quality: ""}
 *           "Am" -> {root: "A", quality: "m"}
 *           "F#m" -> {root: "F#", quality: "m"}
 *           "Bb7" -> {root: "Bb", quality: "7"}
 */
function parseChord(chord) {
  if (!chord || chord.trim() === '') return null;

  const match = chord.match(/^([A-G][#b]?)(.*)/);
  if (!match) return null;

  return { root: match[1], quality: match[2] };
}

/**
 * Get the semitone index for a note name.
 */
function noteToIndex(note) {
  let idx = SHARPS.indexOf(note);
  if (idx === -1) idx = FLATS.indexOf(note);
  return idx;
}

/**
 * Get the note name for a semitone index, using appropriate spelling.
 */
function indexToNote(idx, useFlats) {
  const normalizedIdx = ((idx % 12) + 12) % 12;
  return useFlats ? FLATS[normalizedIdx] : SHARPS[normalizedIdx];
}

/**
 * Transpose a single chord by a number of semitones.
 */
function transposeChord(chord, semitones, useFlats) {
  const parsed = parseChord(chord);
  if (!parsed) return chord;

  const fromIdx = noteToIndex(parsed.root);
  if (fromIdx === -1) return chord;

  const newNote = indexToNote(fromIdx + semitones, useFlats);
  return newNote + parsed.quality;
}

/**
 * Determine whether to use flats for a given target key.
 */
function shouldUseFlats(targetKey) {
  if (FLAT_KEYS.has(targetKey)) return true;
  if (SHARP_KEYS.has(targetKey)) return false;
  // Default to sharps for unknown keys
  return false;
}

/**
 * Transpose an entire song's key entry to a new target key.
 */
function transposeKey(keyEntry, targetKey) {
  const fromIdx = noteToIndex(keyEntry.key);
  const toIdx = noteToIndex(targetKey);
  if (fromIdx === -1 || toIdx === -1) {
    throw new Error(`Invalid key: ${keyEntry.key} or ${targetKey}`);
  }

  const semitones = toIdx - fromIdx;
  const useFlats = shouldUseFlats(targetKey);

  const newSections = keyEntry.sections.map(section => ({
    ...section,
    chords: section.chords.map(chord => transposeChord(chord, semitones, useFlats))
  }));

  return {
    key: targetKey,
    sections: newSections
  };
}

/**
 * Add a transposed key variant to a song object.
 */
function transposeSong(song, targetKey) {
  // Find a source key to transpose from (use the first one)
  if (!song.keys || song.keys.length === 0) {
    throw new Error('Song has no key entries to transpose from');
  }

  // Check if target key already exists
  if (song.keys.some(k => k.key === targetKey)) {
    throw new Error(`Song already has a Key of ${targetKey}`);
  }

  const sourceKey = song.keys[0];
  const newKey = transposeKey(sourceKey, targetKey);

  return {
    ...song,
    keys: [...song.keys, newKey]
  };
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node scripts/transpose.js <song.json> <targetKey>');
    console.error('Example: node scripts/transpose.js songs/angeline-the-baker.json A');
    process.exit(1);
  }

  const songPath = path.resolve(args[0]);
  const targetKey = args[1];

  const song = JSON.parse(fs.readFileSync(songPath, 'utf-8'));
  const transposed = transposeSong(song, targetKey);

  fs.writeFileSync(songPath, JSON.stringify(transposed, null, 2) + '\n');
  console.log(`Added Key of ${targetKey} to ${path.basename(songPath)}`);
}

module.exports = { transposeChord, transposeKey, transposeSong, parseChord };
