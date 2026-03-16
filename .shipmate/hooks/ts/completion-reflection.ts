#!/usr/bin/env bun

/**
 * Completion Reflection Hook (stop)
 *
 * Brief self-reflection when agent stops/completes.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

interface HookInput {
  conversation_id: string;
  hook_event_name: string;
  status?: string;
  loop_count?: number;
}

interface HookOutput {
  followup_message?: string;
}

interface SessionStats {
  files_edited: string[];
  total_lines_added: number;
  total_lines_removed: number;
  file_types: Record<string, number>;
  edit_count: number;
  last_update: number;
}

const STATS_FILE = join(homedir(), '.shipmate', 'context', 'session_stats.json');
const CORRECTIONS_FILE = join(homedir(), '.shipmate', 'context', 'active_corrections.json');

function loadSessionStats(conversationId: string): SessionStats {
  const empty: SessionStats = {
    files_edited: [],
    total_lines_added: 0,
    total_lines_removed: 0,
    file_types: {},
    edit_count: 0,
    last_update: 0,
  };

  if (!existsSync(STATS_FILE)) return empty;

  try {
    const allStats = JSON.parse(readFileSync(STATS_FILE, 'utf-8'));
    return allStats[conversationId] || empty;
  } catch {
    return empty;
  }
}

function countCorrections(conversationId: string): number {
  if (!existsSync(CORRECTIONS_FILE)) return 0;

  try {
    const corrections = JSON.parse(readFileSync(CORRECTIONS_FILE, 'utf-8'));
    const conv = corrections[conversationId];
    return conv ? conv.detections?.length || 0 : 0;
  } catch {
    return 0;
  }
}

interface QualityMetrics {
  score: number;
  factors: string[];
}

function calculateSessionQuality(
  stats: SessionStats,
  corrections: number,
  loopCount: number,
): QualityMetrics {
  const quality: QualityMetrics = { score: 0.5, factors: [] };

  // Corrections reduce quality
  if (corrections > 0) {
    const penalty = Math.min(corrections * 0.1, 0.3);
    quality.score -= penalty;
    quality.factors.push(`${corrections} corrections (-${(penalty * 100).toFixed(0)}%)`);
  }

  // Files edited increase quality
  if (stats.files_edited.length > 0) {
    const bonus = Math.min(stats.files_edited.length * 0.05, 0.2);
    quality.score += bonus;
    quality.factors.push(
      `${stats.files_edited.length} files edited (+${(bonus * 100).toFixed(0)}%)`,
    );
  }

  // High loop counts might indicate issues
  if (loopCount > 10) {
    const penalty = Math.min((loopCount - 10) * 0.02, 0.15);
    quality.score -= penalty;
    quality.factors.push(`High loop count: ${loopCount} (-${(penalty * 100).toFixed(0)}%)`);
  }

  // Net lines added is a positive signal
  const netLines = stats.total_lines_added - stats.total_lines_removed;
  if (netLines > 0) {
    const bonus = Math.min(netLines * 0.001, 0.1);
    quality.score += bonus;
    quality.factors.push(`+${netLines} net lines (+${(bonus * 100).toFixed(0)}%)`);
  }

  quality.score = Math.max(0, Math.min(1, quality.score));
  return quality;
}

function logCompletion(
  input: HookInput,
  stats: SessionStats,
  corrections: number,
  quality: QualityMetrics,
) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const diaryDir = join(homedir(), '.shipmate', 'diary', 'entries', dateStr);

  try {
    mkdirSync(diaryDir, { recursive: true });

    const id = createHash('md5')
      .update(`${input.conversation_id}${now.toISOString()}`)
      .digest('hex')
      .slice(0, 8);

    const entry = {
      id,
      timestamp: now.toISOString(),
      conversation_id: input.conversation_id,
      type: 'completion',
      severity: quality.score < 0.4 ? 'high' : quality.score < 0.6 ? 'medium' : 'low',
      category: 'workflow',
      context: {
        status: input.status,
        loop_count: input.loop_count,
        files_edited: stats.files_edited,
        lines_added: stats.total_lines_added,
        lines_removed: stats.total_lines_removed,
        correction_count: corrections,
      },
      learning: {
        what_happened: 'Session completed',
        quality_score: quality.score,
        quality_factors: quality.factors,
        improvement:
          quality.score < 0.6 ? 'Review session for improvements' : 'Patterns working well',
      },
      metadata: {
        hook_version: '1.0.0',
      },
    };

    writeFileSync(join(diaryDir, `completion-${id}.json`), JSON.stringify(entry, null, 2));
  } catch {
    // Silently fail
  }
}

function cleanupSessionData(conversationId: string) {
  // Clean up session stats
  if (existsSync(STATS_FILE)) {
    try {
      const allStats = JSON.parse(readFileSync(STATS_FILE, 'utf-8'));
      if (conversationId in allStats) {
        delete allStats[conversationId];
        writeFileSync(STATS_FILE, JSON.stringify(allStats, null, 2));
      }
    } catch {
      // Silently fail
    }
  }

  // Clean up corrections
  if (existsSync(CORRECTIONS_FILE)) {
    try {
      const corrections = JSON.parse(readFileSync(CORRECTIONS_FILE, 'utf-8'));
      if (conversationId in corrections) {
        delete corrections[conversationId];
        writeFileSync(CORRECTIONS_FILE, JSON.stringify(corrections, null, 2));
      }
    } catch {
      // Silently fail
    }
  }
}

async function main() {
  try {
    const input: HookInput = await Bun.stdin.json();
    const output: HookOutput = {};

    const stats = loadSessionStats(input.conversation_id);
    const corrections = countCorrections(input.conversation_id);
    const quality = calculateSessionQuality(stats, corrections, input.loop_count || 0);

    // Log completion
    logCompletion(input, stats, corrections, quality);

    // Clean up session data
    cleanupSessionData(input.conversation_id);

    // Optionally provide feedback for poor quality sessions
    if (quality.score < 0.4) {
      output.followup_message = `Session quality was low (${(quality.score * 100).toFixed(0)}%). Consider reviewing the diary for improvements.`;
    }

    console.log(JSON.stringify(output));
  } catch {
    console.log(JSON.stringify({}));
  }
}

main();
