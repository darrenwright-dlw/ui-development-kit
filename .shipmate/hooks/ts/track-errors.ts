#!/usr/bin/env bun

/**
 * Error Tracking Hook (afterShellExecution)
 *
 * Tracks shell command errors for pattern learning.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

interface HookInput {
  conversation_id: string;
  hook_event_name: string;
  command: string;
  output: string;
  duration?: number;
}

interface ErrorPattern {
  pattern: RegExp;
  category: string;
  severity: 'high' | 'medium' | 'low';
}

const ERROR_PATTERNS: ErrorPattern[] = [
  { pattern: /command not found/i, category: 'tooling', severity: 'high' },
  { pattern: /permission denied/i, category: 'permissions', severity: 'high' },
  { pattern: /No such file or directory/i, category: 'filesystem', severity: 'medium' },
  { pattern: /SyntaxError/i, category: 'syntax', severity: 'high' },
  { pattern: /TypeError/i, category: 'type_error', severity: 'high' },
  {
    pattern: /ModuleNotFoundError|Cannot find module/i,
    category: 'dependencies',
    severity: 'high',
  },
  { pattern: /ENOENT/i, category: 'filesystem', severity: 'medium' },
  { pattern: /EACCES/i, category: 'permissions', severity: 'high' },
  { pattern: /npm ERR!/i, category: 'npm', severity: 'medium' },
  { pattern: /error\[E\d+\]/i, category: 'rust_compile', severity: 'high' },
  { pattern: /fatal:/i, category: 'git', severity: 'high' },
  { pattern: /Error:|ERROR:|error:/i, category: 'general', severity: 'medium' },
  { pattern: /failed|failure/i, category: 'general', severity: 'medium' },
  { pattern: /exit code [1-9]|exit status [1-9]/i, category: 'execution', severity: 'medium' },
  { pattern: /Traceback \(most recent call last\)/i, category: 'python', severity: 'high' },
  { pattern: /panic:/i, category: 'go_panic', severity: 'high' },
  { pattern: /Exception in thread/i, category: 'java', severity: 'high' },
  { pattern: /Build failed/i, category: 'build', severity: 'high' },
  { pattern: /Test failed|tests? failed/i, category: 'testing', severity: 'medium' },
  { pattern: /Connection refused|ECONNREFUSED/i, category: 'network', severity: 'medium' },
  { pattern: /timeout|timed out/i, category: 'timeout', severity: 'medium' },
  { pattern: /out of memory|OOM/i, category: 'resources', severity: 'high' },
];

interface DetectedError {
  category: string;
  severity: string;
  matched: string;
}

function detectErrors(output: string): DetectedError[] {
  const errors: DetectedError[] = [];

  for (const { pattern, category, severity } of ERROR_PATTERNS) {
    const match = output.match(pattern);
    if (match) {
      errors.push({
        category,
        severity,
        matched: match[0],
      });
    }
  }

  return errors;
}

function extractErrorContext(output: string, maxLength: number = 500): string {
  const lines = output.split('\n');
  const errorLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (/error|fail|exception|traceback/i.test(lines[i])) {
      // Get context: 2 lines before and 3 lines after
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + 4);
      errorLines.push(...lines.slice(start, end));
      i = end;
    }
  }

  const context = errorLines.length > 0 ? errorLines.join('\n') : output;
  return context.slice(0, maxLength);
}

function logError(input: HookInput, errors: DetectedError[]) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const diaryDir = join(homedir(), '.shipmate', 'diary', 'entries', dateStr);

  try {
    mkdirSync(diaryDir, { recursive: true });

    const id = createHash('md5')
      .update(`${input.conversation_id}${now.toISOString()}`)
      .digest('hex')
      .slice(0, 8);
    const primary = errors[0];

    const entry = {
      id,
      timestamp: now.toISOString(),
      conversation_id: input.conversation_id,
      type: 'error_recovery',
      severity: primary.severity,
      category: primary.category,
      context: {
        command: input.command.slice(0, 200),
        error_output: extractErrorContext(input.output),
        duration_ms: input.duration,
        all_errors: errors.slice(0, 5),
      },
      learning: {
        what_happened: `Command failed: ${primary.category}`,
        error_type: primary.category,
        matched_pattern: primary.matched,
        improvement: 'Prevent similar errors',
      },
      metadata: {
        hook_version: '1.0.0',
        error_count: errors.length,
      },
    };

    writeFileSync(join(diaryDir, `error-${id}.json`), JSON.stringify(entry, null, 2));
  } catch {
    // Silently fail
  }
}

async function main() {
  try {
    const input: HookInput = await Bun.stdin.json();

    if (input.output) {
      const errors = detectErrors(input.output);
      if (errors.length > 0) {
        logError(input, errors);
      }
    }

    // afterShellExecution hooks don't produce output
  } catch {
    // Silently fail
  }
}

main();
