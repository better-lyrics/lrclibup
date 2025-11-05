/**
 * LRC Normalization Module
 * Converts non-standard multi-timestamp LRC format to standard single-timestamp format
 */

export interface NormalizationResult {
  normalized: string;
  plainLyrics: string;
  changes: number;
  expandedLines: number;
}

/**
 * Regex for extracting timestamps and lyrics
 */
const TIMESTAMP_PATTERN = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

/**
 * Normalizes LRC content by expanding multi-timestamp lines into separate lines
 *
 * Example transformation:
 * Input:  [00:29.52][01:29.47][02:09.54] Repeated chorus line
 * Output: [00:29.52] Repeated chorus line
 *         [01:29.47] Repeated chorus line
 *         [02:09.54] Repeated chorus line
 *
 * @param content - Raw LRC content
 * @returns Normalized content with statistics
 */
export function normalizeLRC(content: string): NormalizationResult {
  const lines = content.split("\n");
  const normalizedLines: string[] = [];
  let changesCount = 0;
  let expandedLinesCount = 0;

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    // Preserve empty lines and metadata
    if (!line || /^\[(ti|ar|al|length|offset):/i.test(line)) {
      normalizedLines.push(line);
      return;
    }

    // Extract all timestamps from the line
    const timestamps: string[] = [];
    let match;
    const timestampRegex = new RegExp(TIMESTAMP_PATTERN);

    while ((match = timestampRegex.exec(line)) !== null) {
      timestamps.push(match[0]); // Full timestamp including brackets
    }

    // If no timestamps or only one timestamp, keep line as-is
    if (timestamps.length <= 1) {
      normalizedLines.push(line);
      return;
    }

    // Multi-timestamp detected - normalize it
    changesCount++;

    // Extract lyrics text (everything after all timestamps)
    const lastTimestamp = timestamps[timestamps.length - 1];
    const lastTimestampIndex = line.lastIndexOf(lastTimestamp);
    const lyricsText = line.substring(lastTimestampIndex + lastTimestamp.length);

    // Create separate line for each timestamp
    timestamps.forEach((timestamp) => {
      // Normalize milliseconds to 2 digits
      const normalizedTimestamp = normalizeTimestamp(timestamp);
      normalizedLines.push(`${normalizedTimestamp}${lyricsText}`);
      expandedLinesCount++;
    });
  });

  const normalized = normalizedLines.join("\n");

  // Extract plain lyrics from normalized content
  const plainLyrics = extractPlainLyrics(normalized);

  return {
    normalized,
    plainLyrics,
    changes: changesCount,
    expandedLines: expandedLinesCount,
  };
}

/**
 * Extract plain lyrics from synced lyrics
 */
function extractPlainLyrics(syncedLyrics: string): string {
  const lines = syncedLyrics.split("\n");
  const plainLines: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Skip metadata
    if (/^\[(ti|ar|al|length|offset):/i.test(trimmed)) return;

    // Extract lyrics after timestamp
    const match = trimmed.match(/^\[\d{2}:\d{2}\.\d{2,3}\](.*)$/);
    if (match) {
      const lyrics = match[1].trim();
      if (lyrics) {
        plainLines.push(lyrics);
      }
    }
  });

  return plainLines.join("\n");
}

/**
 * Normalizes timestamp format to ensure 2-digit milliseconds
 * Converts [mm:ss.xxx] to [mm:ss.xx]
 */
function normalizeTimestamp(timestamp: string): string {
  const match = timestamp.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/);
  if (!match) return timestamp;

  const [, minutes, seconds, milliseconds] = match;

  // Convert 3-digit ms to 2-digit
  const ms =
    milliseconds.length === 3
      ? Math.round(parseInt(milliseconds) / 10)
          .toString()
          .padStart(2, "0")
      : milliseconds.padStart(2, "0");

  return `[${minutes}:${seconds}.${ms}]`;
}

/**
 * Sorts LRC lines by timestamp chronologically
 * Useful after normalization to ensure proper ordering
 */
export function sortLRCLines(content: string): string {
  const lines = content.split("\n");
  const metadataLines: string[] = [];
  const timedLines: Array<{ timestamp: number; line: string }> = [];
  const otherLines: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();

    // Preserve metadata at top
    if (/^\[(ti|ar|al|length|offset):/i.test(trimmed)) {
      metadataLines.push(trimmed);
      return;
    }

    // Extract timestamp for sorting
    const match = trimmed.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\]/);
    if (match) {
      const [, minutes, seconds, milliseconds] = match;
      const timeInMs =
        parseInt(minutes) * 60000 + parseInt(seconds) * 1000 + parseInt(milliseconds) * 10;
      timedLines.push({ timestamp: timeInMs, line: trimmed });
    } else if (trimmed) {
      otherLines.push(trimmed);
    }
  });

  // Sort timed lines chronologically
  timedLines.sort((a, b) => a.timestamp - b.timestamp);

  // Reassemble: metadata, then sorted timed lines, then other lines
  return [
    ...metadataLines,
    ...timedLines.map((item) => item.line),
    ...otherLines,
  ].join("\n");
}

/**
 * Full normalization pipeline: normalize + sort
 */
export function normalizeAndSortLRC(content: string): NormalizationResult {
  const normalizeResult = normalizeLRC(content);
  const sorted = sortLRCLines(normalizeResult.normalized);
  const plainLyrics = extractPlainLyrics(sorted);

  return {
    ...normalizeResult,
    normalized: sorted,
    plainLyrics,
  };
}
