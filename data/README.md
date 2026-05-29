# Savoy, Texas — Historical Data Source

A structured, searchable archive built by transcribing the site's primary sources
word-for-word: the *History of Savoy Male and Female College 1876–1890* (Mattie Lee
Boyd, 1939), newspaper clippings, original documents, and selected secondary articles.

## Layout

```
data/
  README.md            # this file (schema reference)
  sources.json         # catalog of every source artifact
  transcripts/
    college/           # one JSON per page of the College history
    newspapers/        # one JSON per newspaper clipping
    documents/         # one JSON per document image / doc PDF page
    articles/          # one JSON per secondary article (e.g. web history pieces)
  people.json          # residents database (past & present)
  events.json          # dated events extracted from transcripts
  search-index.json    # flattened index consumed by the site search
```

## Transcript schema (`transcripts/**/*.json`)

```json
{
  "id": "college_p040",
  "source_id": "college_history",
  "title": "Beginning of the College Department",
  "page": 40,
  "image": "PDFs/Savoy_Male_and_Female_College_1876_1890.pdf#40",
  "date": "1876",              // best-known date or null
  "text": "Full word-for-word transcription...",
  "people": ["William Savoy", "Hazle Lee Rice"],
  "places": ["Savoy", "Grayson County"],
  "topics": ["college", "founding"],
  "notes": "transcriber note, e.g. illegible word marked [?]"
}
```

## People schema (`people.json`)

```json
{
  "id": "william-savoy",
  "name": "William Savoy",
  "aka": ["Col. William Savoy"],
  "era": "1850-1899",
  "roles": ["founder", "town namesake"],
  "contributions": [
    { "text": "Donated land for the townsite", "source_id": "college_history", "ref": "college_p012" }
  ],
  "dates": { "born": null, "died": null },
  "sources": ["college_p012", "WilliamSavoy_MarriageCert"]
}
```

## Event schema (`events.json`)

```json
{ "date": "1880", "title": "Cyclone strikes Savoy", "text": "...", "sources": ["..."], "people": ["..."] }
```

## Transcription conventions
- Transcribe verbatim. Preserve original spelling/punctuation.
- Mark unreadable words as `[?]`; uncertain readings as `word[?]`.
- Use `[illegible]` for unreadable spans; `—` for em dashes.
- Keep paragraph breaks as `\n\n`.
