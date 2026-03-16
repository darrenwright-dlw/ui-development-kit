#!/usr/bin/env bun
/**
 * File Edit Tracking Hook (afterFileEdit)
 *
 * Tracks file modifications for session analysis.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { extname, join } from 'node:path';

interface Edit {
  range: { start: { line: number }; end: { line: number } };
  old_text: string;
  new_text: string;
}

interface HookInput {
  conversation_id: string;
  hook_event_name: string;
  file_path: string;
  edits: Edit[];
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

function saveSessionStats(conversationId: string, stats: SessionStats) {
  const contextDir = join(homedir(), '.shipmate', 'context');
  mkdirSync(contextDir, { recursive: true });

  let allStats: Record<string, SessionStats> = {};

  if (existsSync(STATS_FILE)) {
    try {
      allStats = JSON.parse(readFileSync(STATS_FILE, 'utf-8'));
    } catch {
      allStats = {};
    }
  }

  // Clean old entries (> 2 hours)
  const cutoff = Date.now() - 7200000;
  for (const key of Object.keys(allStats)) {
    if ((allStats[key].last_update || 0) < cutoff) {
      delete allStats[key];
    }
  }

  stats.last_update = Date.now();
  allStats[conversationId] = stats;

  writeFileSync(STATS_FILE, JSON.stringify(allStats, null, 2));
}

function analyzeEdits(edits: Edit[]): { linesAdded: number; linesRemoved: number } {
  let linesAdded = 0;
  let linesRemoved = 0;

  for (const edit of edits) {
    const oldLines = edit.old_text ? edit.old_text.split('\n').length : 0;
    const newLines = edit.new_text ? edit.new_text.split('\n').length : 0;
    linesRemoved += oldLines;
    linesAdded += newLines;
  }

  return { linesAdded, linesRemoved };
}

async function main() {
  try {
    const input: HookInput = await Bun.stdin.json();

    if (!input.file_path || !input.edits) return;

    const stats = loadSessionStats(input.conversation_id);
    const ext = extname(input.file_path) || 'unknown';
    const { linesAdded, linesRemoved } = analyzeEdits(input.edits);

    // Update stats
    if (!stats.files_edited.includes(input.file_path)) {
      stats.files_edited.push(input.file_path);
    }
    stats.total_lines_added += linesAdded;
    stats.total_lines_removed += linesRemoved;
    stats.file_types[ext] = (stats.file_types[ext] || 0) + 1;
    stats.edit_count += input.edits.length;

    saveSessionStats(input.conversation_id, stats);

    // afterFileEdit hooks don't produce output
  } catch {
    // Silently fail
  }
}

main();
