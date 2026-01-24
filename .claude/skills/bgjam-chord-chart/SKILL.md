# Bluegrass Jam Chord Chart Generator

Generate chord charts matching the TNBGJ (Tuesday Night Bluegrass Jam) songbook format.

## Trigger

Use this skill when the user asks to:
- "Add a song" or "create a chord chart"
- "Generate [song name]" or "add [song name] to the songbook"
- Any request involving bluegrass chord charts or the jam songbook

## Workflow

### 1. Gather Song Info
Ask the user for:
- Song name
- Target key(s) (e.g., "G" or "G and A")
- If they have specific chord progressions, accept those directly

### 2. Research (if chords not provided)
Use WebSearch to find chord information:
- Search: "[song name] chords bluegrass"
- Search: "[song name] lyrics"
- Look for: verse/chorus structure, chord changes per measure, section labels (A Part/B Part or Verse/Chorus)

### 3. Parse Into Grid Format
Map the song structure to the JSON data model:

**Determine grid dimensions:**
- Count measures per section → that's your total chord count
- Standard grid is 8 rows tall
- Columns = total chords / 8 (round up if needed)
- Each chord cell = one measure (2 beats or 4 beats depending on time signature)

**Section types:**
- Instrumentals (fiddle tunes, banjo tunes): Use "A Part" / "B Part" labels
- Vocal songs: Use "Verse" / "Chorus" / "Bridge" labels
- If a section repeats with a different ending: add `endings` array

**Reading order:** Chords array fills top-to-bottom, then left-to-right (column-major). This matches the visual grid where you read down each column.

### 4. Handle Multi-Key
If 2 keys requested:
- Create the primary key's chords first
- Use the transpose utility: `node scripts/transpose.js songs/<slug>.json <targetKey>`
- Or manually specify both keys in the JSON

### 5. Create the Song JSON
Write to `songs/<song-slug>.json` with this structure:

```json
{
  "title": "Song Name",
  "chartTitle": "Abbreviated Title (optional, for long names)",
  "lyrics": [
    { "label": "Verse", "lines": ["line 1", "line 2", "..."] },
    { "label": "Chorus", "lines": ["line 1", "..."] }
  ],
  "keys": [
    {
      "key": "G",
      "sections": [
        {
          "label": "Verse",
          "rows": 8,
          "endings": [
            { "column": 0, "ending": 1 },
            { "column": 1, "ending": 2 }
          ],
          "chords": ["G", "G", "C", "C", "G", "G", "D", "D", "..."]
        }
      ]
    }
  ]
}
```

### 6. Generate & Review
```bash
node scripts/generate-html.js songs/<slug>.json
```

Then tell the user:
- The HTML is at `output/html/<slug>.html`
- They can open it in a browser to review the layout
- When satisfied, generate PDF: `node scripts/generate-pdf.js output/html/<slug>.html`

### 7. Validate
Check the output against these rules:
- Grid reads correctly top-to-bottom, left-to-right
- Chord progression matches the song
- Section labels are accurate
- Endings are marked if the section has first/second endings
- Lyrics match known versions of the song

## Data Model Reference

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Full song title |
| `chartTitle` | string? | Short title for chord panel (optional) |
| `lyrics[].label` | string? | Section label: "Verse", "Chorus", etc. |
| `lyrics[].lines` | string[] | Lyric lines for this section |
| `keys[].key` | string | Key name: "G", "A", "D", "C", etc. |
| `keys[].sections[].label` | string | Section label: "A Part", "Verse", etc. |
| `keys[].sections[].rows` | number | Grid rows (default: 8) |
| `keys[].sections[].endings` | object[]? | Column ending markers |
| `keys[].sections[].chords` | string[] | Chord names, column-major order |

## Bluegrass Key Conventions
- Most common keys: G, D, A, C, E, B
- Sharp keys (G, D, A, E, B): use sharps (F#, C#, G#)
- Flat keys (F, Bb, Eb): use flats (Bb, Eb, Ab)
- Common chord types: major (G), minor (Am), seventh (D7, E7)

## Examples

**Simple instrumental (Angeline the Baker):**
- 2 sections: A Part, B Part
- Each section has 2 columns with endings 1 & 2
- 8 rows, all in Key of D

**Vocal song (Are You Missing Me):**
- 2 sections: Verse, Chorus
- Each section has 4 columns (no endings)
- 8 rows, Key of G

**Multi-key (Blue Ridge Cabin Home):**
- 1 section: Verse/Chorus
- 4 columns, 8 rows
- Two keys: G and A shown side by side
