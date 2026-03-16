#!/usr/bin/env bun

/**
 * Struggling Detection Hook (beforeShellExecution)
 *
 * Detects when agent is running same/similar commands repeatedly.
 * Injects guidance to try a different approach.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

interface HookInput {
  conversation_id: string;
  hook_event_name: string;
  command: string;
  cwd?: string;
}

interface HookOutput {
  permission: 'allow' | 'deny';
  user_message?: string;
  agent_message?: string;
}

interface CommandHistory {
  commands: string[];
  signatures: Record<string, number>;
  exact: Record<string, number>;
  last_update: number;
}

const HISTORY_FILE = join(homedir(), '.shipmate', 'context', 'command_history.json');
const STRUGGLE_THRESHOLD = 3;
const SIMILAR_THRESHOLD = 5;
const HISTORY_WINDOW = 20;

function getCommandSignature(command: string): string {
  const normalized = command
    .replace(/"[^"]*"/g, '""')
    .replace(/'[^']*'/g, "''")
    .replace(/\d+/g, 'N')
    .replace(/(cd|cat|ls|rm|cp|mv|mkdir)\s+\S+/g, '$1 PATH');
  return normalized.trim().toLowerCase();
}

function getCommandHash(command: string): string {
  return createHash('md5').update(command).digest('hex').slice(0, 12);
}

function loadHistory(conversationId: string): CommandHistory {
  const empty: CommandHistory = { commands: [], signatures: {}, exact: {}, last_update: 0 };

  if (!existsSync(HISTORY_FILE)) return empty;

  try {
    const allHistory = JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
    return allHistory[conversationId] || empty;
  } catch {
    return empty;
  }
}

function saveHistory(conversationId: string, history: CommandHistory) {
  const contextDir = join(homedir(), '.shipmate', 'context');
  mkdirSync(contextDir, { recursive: true });

  let allHistory: Record<string, CommandHistory> = {};

  if (existsSync(HISTORY_FILE)) {
    try {
      allHistory = JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
    } catch {
      allHistory = {};
    }
  }

  // Clean old entries (> 1 hour)
  const cutoff = Date.now() - 3600000;
  for (const key of Object.keys(allHistory)) {
    if ((allHistory[key].last_update || 0) < cutoff) {
      delete allHistory[key];
    }
  }

  history.last_update = Date.now();
  allHistory[conversationId] = history;

  writeFileSync(HISTORY_FILE, JSON.stringify(allHistory));
}

interface StruggleInfo {
  isStruggling: boolean;
  struggleType: string | null;
  count: number;
  suggestion: string | null;
}

function detectStruggling(command: string, history: CommandHistory): StruggleInfo {
  const result: StruggleInfo = {
    isStruggling: false,
    struggleType: null,
    count: 0,
    suggestion: null,
  };

  const cmdHash = getCommandHash(command);
  const cmdSig = getCommandSignature(command);

  // Check exact command repetition
  const exactCount = history.exact[cmdHash] || 0;
  if (exactCount >= STRUGGLE_THRESHOLD) {
    result.isStruggling = true;
    result.struggleType = 'exact_repeat';
    result.count = exactCount;
    result.suggestion =
      'This exact command has been run multiple times. Consider trying a different approach or checking for underlying issues.';
  }

  // Check similar command pattern
  const sigCount = history.signatures[cmdSig] || 0;
  if (sigCount >= SIMILAR_THRESHOLD) {
    result.isStruggling = true;
    result.struggleType = 'similar_pattern';
    result.count = sigCount;
    result.suggestion =
      'Similar commands have been attempted repeatedly. Step back and reconsider the approach.';
  }

  // Check for package install loops
  if (/\b(npm|yarn|pip|go)\s+(install|add|get)/.test(command)) {
    const pkgAttempts = history.commands
      .slice(-10)
      .filter((c) => /\b(npm|yarn|pip|go)\s+(install|add|get)/.test(c)).length;
    if (pkgAttempts >= 3) {
      result.isStruggling = true;
      result.struggleType = 'dependency_issues';
      result.count = pkgAttempts;
      result.suggestion =
        'Multiple package install attempts detected. Check package.json/requirements.txt for conflicts or try clearing cache.';
    }
  }

  // Check for permission issues
  if (/permission denied/i.test(command) || /sudo/.test(command)) {
    const permAttempts = history.commands
      .slice(-5)
      .filter((c) => /sudo/.test(c) || /chmod/.test(c)).length;
    if (permAttempts >= 2) {
      result.isStruggling = true;
      result.struggleType = 'permission_issues';
      result.count = permAttempts;
      result.suggestion =
        'Permission issues detected. Check file ownership and permissions systematically.';
    }
  }

  return result;
}

function updateHistory(history: CommandHistory, command: string): CommandHistory {
  const cmdHash = getCommandHash(command);
  const cmdSig = getCommandSignature(command);

  history.commands = [...history.commands, command].slice(-HISTORY_WINDOW);
  history.exact[cmdHash] = (history.exact[cmdHash] || 0) + 1;
  history.signatures[cmdSig] = (history.signatures[cmdSig] || 0) + 1;

  return history;
}

function logStruggle(conversationId: string, command: string, struggleInfo: StruggleInfo) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const diaryDir = join(homedir(), '.shipmate', 'diary', 'entries', dateStr);

  try {
    mkdirSync(diaryDir, { recursive: true });

    const id = createHash('md5')
      .update(`${conversationId}${now.toISOString()}`)
      .digest('hex')
      .slice(0, 8);

    const entry = {
      id,
      timestamp: now.toISOString(),
      conversation_id: conversationId,
      type: 'struggling',
      severity: 'medium',
      category: 'execution',
      context: {
        command: command.slice(0, 200),
        struggle_type: struggleInfo.struggleType,
        attempt_count: struggleInfo.count,
      },
      learning: {
        what_happened: `Agent struggled: ${struggleInfo.struggleType}`,
        pattern: struggleInfo.struggleType,
        improvement: 'Detect earlier and try different approach',
      },
    };

    writeFileSync(join(diaryDir, `struggle-${id}.json`), JSON.stringify(entry, null, 2));
  } catch {
    // Silently fail
  }
}

async function main() {
  try {
    const input: HookInput = await Bun.stdin.json();
    const output: HookOutput = { permission: 'allow' };

    if (input.command) {
      let history = loadHistory(input.conversation_id);
      const struggleInfo = detectStruggling(input.command, history);

      history = updateHistory(history, input.command);
      saveHistory(input.conversation_id, history);

      if (struggleInfo.isStruggling) {
        logStruggle(input.conversation_id, input.command, struggleInfo);
        output.agent_message = `[Shipmate] ${struggleInfo.suggestion}`;
      }
    }

    console.log(JSON.stringify(output));
  } catch {
    console.log(JSON.stringify({ permission: 'allow' }));
  }
}

main();
