# LRCLIBup

> [!WARNING]
> **LRCLIBup is deprecated.** Better Lyrics now has its own lyrics platform, [Unison](https://unison.betterlyrics.org), and [LRCGET](https://github.com/tranxuanthang/lrcget) is the actively maintained LRCLIB publisher, so LRCLIBup duplicates both. This repository is archived and gets no further updates. [lrclibup.boidu.dev](https://lrclibup.boidu.dev) stays online.
>
> - To contribute lyrics to Better Lyrics, use [Unison](https://unison.betterlyrics.org).
> - To publish lyrics to LRCLIB, use [LRCGET](https://github.com/tranxuanthang/lrcget).

A modern web interface for publishing lyrics to the LRCLIB database. Built with Svelte and TailwindCSS.

<img width="1552" alt="image" src="https://github.com/user-attachments/assets/f8a176e3-029e-44a8-909c-c23e6180fdd0" />


## Features

- Clean, user-friendly interface for submitting lyrics
- Support for both plain and synced (LRC) lyrics
- LRC file upload and parsing
- Proof-of-work challenge system to prevent spam
- Real-time submission progress tracking
- Form validation and error handling
- Responsive design

## Technical Details

### Stack

- Svelte + TypeScript
- TailwindCSS for styling
- Web Workers for proof-of-work computation
- Rust for proof-of-work challenge generation

### Key Components

#### Form Data

The application handles the following data fields:

- Track Name (required)
- Artist Name (required)
- Album Name (optional)
- Duration in seconds (optional)
- Plain Lyrics
- Synced Lyrics (LRC format)

A user can either fill in the fields manually or upload an LRC file to auto-fill the form.

#### Proof of Work System

- Implements a challenge-response mechanism
- Uses Web Workers for background computation
- Real-time progress tracking with hash rate display

#### File Handling

- Supports .lrc file uploads
- Automatic parsing of LRC metadata and lyrics
- Auto-fills form fields from LRC metadata

### API Integration

Integrates with LRCLIB API endpoints:

- `/api/request-challenge` - Gets proof-of-work challenge
- `/api/publish` - Publishes lyrics with solved challenge token

## Usage

1. Fill in the required track and artist information
2. Add lyrics either by:
   - Pasting plain lyrics
   - Pasting synced lyrics in LRC format
   - Uploading an LRC file
3. Click "Publish Lyrics" to submit
4. Wait for the proof-of-work challenge to complete

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Notes

- Publishing requires solving a proof-of-work challenge which may take several minutes
- Both lyrics fields can be left empty for instrumental tracks
- The interface provides real-time feedback during the publishing process
- Form data is validated before submission

## License

GPL-3.0 License

## Credits

Powered by [BetterLyrics](https://better-lyrics.boidu.dev) - A browser extension for enhanced lyrics display on YouTube Music.
