/**
 * LRC Validation and Analysis Module
 * Provides utilities for validating LRC format and detecting non-standard patterns
 */

export type IssueType =
  | "multi-timestamp"
  | "invalid-format"
  | "invalid-timestamp"
  | "out-of-order"
  | "negative-timestamp"
  | "duplicate-timestamp"
  | "excessive-gap"
  | "timestamp-overlap"
  | "no-timestamps"
  | "elrc-word-timing";

export interface LRCValidationIssue {
  line: number;
  type: IssueType;
  severity: "warning" | "error";
  message: string;
  raw: string;
  timestamps?: string[];
  suggestion?: string;
}

export interface LRCValidationResult {
  isValid: boolean;
  issues: LRCValidationIssue[];
  hasMultiTimestamps: boolean;
  hasELRC: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  totalLines: number;
  affectedLines: number;
  issuesByType: Record<IssueType, number>;
}

/**
 * Regex patterns for LRC validation
 */
const PATTERNS = {
  // Standard single timestamp: [mm:ss.xx]
  SINGLE_TIMESTAMP: /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/,

  // Multi-timestamp pattern: [mm:ss.xx][mm:ss.xx]... text
  MULTI_TIMESTAMP: /^(\[\d{2}:\d{2}\.\d{2,3}\])+(.*)$/,

  // Extract all timestamps from a line
  ALL_TIMESTAMPS: /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g,

  // Metadata tags
  METADATA: /^\[(ti|ar|al|length|offset):/i,

  // ELRC word-level timestamps: <mm:ss.xx> or <mm:ss.xxx> (also handles single-digit minutes)
  ELRC_WORD_TIMING: /<\d{1,2}:\d{2}\.\d{2,3}>/g,
};

/**
 * Parse timestamp to milliseconds
 */
function parseTimestampToMs(timestamp: string): number | null {
  const match = timestamp.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/);
  if (!match) return null;

  const [, minutes, seconds, milliseconds] = match;
  const ms =
    milliseconds.length === 3
      ? Math.round(parseInt(milliseconds) / 10)
      : parseInt(milliseconds);

  return parseInt(minutes) * 60000 + parseInt(seconds) * 1000 + ms * 10;
}

/**
 * Validates LRC content and detects non-standard formatting issues
 * @param content - Raw LRC file content
 * @returns Validation result with detailed issue breakdown
 */
export function validateLRC(content: string): LRCValidationResult {
  const lines = content.split("\n");
  const issues: LRCValidationIssue[] = [];
  let multiTimestampCount = 0;
  let elrcCount = 0;

  const timedLines: Array<{ timestamp: number; line: number; raw: string }> =
    [];
  const seenTimestamps = new Map<number, number>();

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;

    // Skip metadata lines
    if (PATTERNS.METADATA.test(line)) return;

    // Check for ELRC word-level timestamps
    const elrcMatches = Array.from(line.matchAll(PATTERNS.ELRC_WORD_TIMING));
    if (elrcMatches.length > 0) {
      elrcCount++;
      issues.push({
        line: index + 1,
        type: "elrc-word-timing",
        severity: "error",
        message: `Contains ${elrcMatches.length} ELRC word timestamp${elrcMatches.length > 1 ? "s" : ""} (not supported by LRCLIB)`,
        raw: line,
        timestamps: elrcMatches.map((m) => m[0]),
        suggestion: "Use auto-fix to strip word timestamps while keeping line timestamps",
      });
    }

    // Check if line contains timestamps
    const timestamps = Array.from(line.matchAll(PATTERNS.ALL_TIMESTAMPS));

    if (timestamps.length === 0) {
      // No timestamps found (could be plain text or invalid)
      return;
    }

    if (timestamps.length > 1) {
      // Multi-timestamp detected
      multiTimestampCount++;
      issues.push({
        line: index + 1,
        type: "multi-timestamp",
        severity: "warning",
        message: `Contains ${timestamps.length} timestamps (non-standard format)`,
        raw: line,
        timestamps: timestamps.map((t) => t[0]),
        suggestion: "Use auto-fix to expand into separate lines",
      });
      return;
    }

    const timestampStr = timestamps[0][0];
    const timestampMs = parseTimestampToMs(timestampStr);

    if (timestampMs === null) {
      issues.push({
        line: index + 1,
        type: "invalid-timestamp",
        severity: "error",
        message: "Invalid timestamp format",
        raw: line,
        suggestion: "Format should be [mm:ss.xx]",
      });
      return;
    }

    // Check for negative timestamp
    if (timestampMs < 0) {
      issues.push({
        line: index + 1,
        type: "negative-timestamp",
        severity: "error",
        message: "Timestamp cannot be negative",
        raw: line,
      });
      return;
    }

    // Extract lyrics text
    const lyricsText = line.substring(timestampStr.length).trim();

    // Note: Empty lyrics (instrumental breaks) are valid, so we don't flag missing lyrics

    // Check for duplicate timestamps
    if (seenTimestamps.has(timestampMs)) {
      const previousLine = seenTimestamps.get(timestampMs)!;
      issues.push({
        line: index + 1,
        type: "duplicate-timestamp",
        severity: "warning",
        message: `Duplicate timestamp (also on line ${previousLine})`,
        raw: line,
        suggestion: "Different lyrics should have different timestamps",
      });
    } else {
      seenTimestamps.set(timestampMs, index + 1);
    }

    timedLines.push({ timestamp: timestampMs, line: index + 1, raw: line });

    // Single timestamp - validate format
    if (!PATTERNS.SINGLE_TIMESTAMP.test(line)) {
      issues.push({
        line: index + 1,
        type: "invalid-format",
        severity: "error",
        message: "Invalid timestamp format",
        raw: line,
        suggestion: "Format should be [mm:ss.xx] Lyrics",
      });
    }
  });

  // Check for out-of-order timestamps
  for (let i = 1; i < timedLines.length; i++) {
    if (timedLines[i].timestamp < timedLines[i - 1].timestamp) {
      issues.push({
        line: timedLines[i].line,
        type: "out-of-order",
        severity: "warning",
        message: `Timestamp is earlier than previous line (${
          timedLines[i - 1].line
        })`,
        raw: timedLines[i].raw,
        suggestion: "Lines should be in chronological order",
      });
    }
  }

  // Check for excessive gaps (more than 30 seconds)
  for (let i = 1; i < timedLines.length; i++) {
    const gap = timedLines[i].timestamp - timedLines[i - 1].timestamp;
    if (gap > 30000) {
      // 30 seconds
      issues.push({
        line: timedLines[i].line,
        type: "excessive-gap",
        severity: "warning",
        message: `Large gap (${Math.round(gap / 1000)}s) from previous line`,
        raw: timedLines[i].raw,
        suggestion: "Verify this gap is intentional",
      });
    }
  }

  // Check for timestamp overlaps (same timestamp as previous, different from duplicates)
  for (let i = 1; i < timedLines.length; i++) {
    if (timedLines[i].timestamp === timedLines[i - 1].timestamp) {
      // This is caught by duplicate check, skip
      continue;
    }
    // Check if timestamps are too close (less than 100ms)
    const gap = timedLines[i].timestamp - timedLines[i - 1].timestamp;
    if (gap > 0 && gap < 100) {
      issues.push({
        line: timedLines[i].line,
        type: "timestamp-overlap",
        severity: "warning",
        message: `Very close to previous timestamp (${gap}ms gap)`,
        raw: timedLines[i].raw,
        suggestion: "Ensure this timing is intentional",
      });
    }
  }

  // Check if there are NO valid timestamps at all
  if (timedLines.length === 0 && content.trim().length > 0) {
    // Content exists but no valid LRC timestamps found
    issues.push({
      line: 1,
      type: "no-timestamps",
      severity: "error",
      message: "No valid LRC timestamps found in the content",
      raw: content.substring(0, 100) + (content.length > 100 ? "..." : ""),
      suggestion:
        "LRC format requires timestamps like [mm:ss.xx] lyrics. If you are submitting plain lyrics, use the plain lyrics field instead.",
    });
  }

  // Count issues by type
  const issuesByType: Record<IssueType, number> = {
    "multi-timestamp": 0,
    "invalid-format": 0,
    "invalid-timestamp": 0,
    "out-of-order": 0,
    "negative-timestamp": 0,
    "duplicate-timestamp": 0,
    "excessive-gap": 0,
    "timestamp-overlap": 0,
    "no-timestamps": 0,
    "elrc-word-timing": 0,
  };

  issues.forEach((issue) => {
    issuesByType[issue.type]++;
  });

  const hasErrors = issues.some((i) => i.severity === "error");
  const hasWarnings = issues.some((i) => i.severity === "warning");

  return {
    isValid: issues.length === 0,
    issues,
    hasMultiTimestamps: multiTimestampCount > 0,
    hasELRC: elrcCount > 0,
    hasErrors,
    hasWarnings,
    totalLines: lines.filter((l) => l.trim()).length,
    affectedLines: issues.length,
    issuesByType,
  };
}

/**
 * Validates synced lyrics field specifically
 * Used for real-time validation as user types
 */
export function validateSyncedLyrics(
  syncedLyrics: string
): LRCValidationResult {
  return validateLRC(syncedLyrics);
}

/**
 * Quick check if content has multi-timestamp issues
 * Useful for fast validation before normalization
 */
export function hasMultiTimestampIssues(content: string): boolean {
  const lines = content.split("\n");
  return lines.some((line) => {
    const timestamps = Array.from(line.matchAll(PATTERNS.ALL_TIMESTAMPS));
    return timestamps.length > 1;
  });
}

/**
 * Get human-readable summary of validation issues
 */
export function getValidationSummary(result: LRCValidationResult): string {
  if (result.isValid) {
    return "LRC format is valid";
  }

  const parts: string[] = [];

  // Group by severity
  const errors = result.issues.filter((i) => i.severity === "error");
  const warnings = result.issues.filter((i) => i.severity === "warning");

  if (errors.length > 0) {
    parts.push(`${errors.length} error${errors.length > 1 ? "s" : ""}`);
  }

  if (warnings.length > 0) {
    parts.push(`${warnings.length} warning${warnings.length > 1 ? "s" : ""}`);
  }

  return parts.join(", ");
}

/**
 * Get issue type display name
 */
export function getIssueTypeLabel(type: IssueType): string {
  const labels: Record<IssueType, string> = {
    "multi-timestamp": "Multi-timestamp Format",
    "invalid-format": "Invalid Format",
    "invalid-timestamp": "Invalid Timestamp",
    "out-of-order": "Out of Order",
    "negative-timestamp": "Negative Timestamp",
    "duplicate-timestamp": "Duplicate Timestamp",
    "excessive-gap": "Excessive Gap",
    "timestamp-overlap": "Timestamp Overlap",
    "no-timestamps": "No LRC Timestamps Found",
    "elrc-word-timing": "ELRC Word Timestamps",
  };

  return labels[type] || type;
}
