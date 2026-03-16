#!/usr/bin/env bun

/**
 * Code Quality Gate Hook (afterFileEdit)
 *
 * Performs quick quality checks after file edits.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { extname, join } from 'node:path';

interface Edit {
  range: unknown;
  old_text: string;
  new_text: string;
}

interface HookInput {
  conversation_id: string;
  hook_event_name: string;
  file_path: string;
  edits: Edit[];
}

interface QualityPattern {
  pattern: RegExp;
  issue: string;
  severity: 'high' | 'medium' | 'low';
}

interface QualityConfig {
  patterns: QualityPattern[];
}

const QUALITY_CHECKS: Record<string, QualityConfig> = {
  '.py': {
    patterns: [
      { pattern: /import \*/i, issue: 'wildcard_import', severity: 'medium' },
      { pattern: /except:/i, issue: 'bare_except', severity: 'medium' },
      { pattern: /print\(/i, issue: 'debug_print', severity: 'low' },
      { pattern: /# TODO|# FIXME|# XXX|# HACK/i, issue: 'todo_comment', severity: 'low' },
      { pattern: /password\s*=\s*['"][^'"]+['"]/i, issue: 'hardcoded_secret', severity: 'high' },
      { pattern: /api_key\s*=\s*['"][^'"]+['"]/i, issue: 'hardcoded_secret', severity: 'high' },
    ],
  },
  '.js': {
    patterns: [
      { pattern: /console\.log\(/i, issue: 'debug_log', severity: 'low' },
      { pattern: /var\s+/i, issue: 'var_usage', severity: 'medium' },
      { pattern: /==(?!=)/i, issue: 'loose_equality', severity: 'medium' },
      { pattern: /eval\(/i, issue: 'eval_usage', severity: 'high' },
    ],
  },
  '.ts': {
    patterns: [
      { pattern: /console\.log\(/i, issue: 'debug_log', severity: 'low' },
      { pattern: /any(?:\s|,|\))/i, issue: 'any_type', severity: 'medium' },
      { pattern: /@ts-ignore/i, issue: 'ts_ignore', severity: 'medium' },
    ],
  },
  '.tsx': {
    patterns: [
      { pattern: /console\.log\(/i, issue: 'debug_log', severity: 'low' },
      { pattern: /any(?:\s|,|\))/i, issue: 'any_type', severity: 'medium' },
      { pattern: /@ts-ignore/i, issue: 'ts_ignore', severity: 'medium' },
      { pattern: /dangerouslySetInnerHTML/i, issue: 'xss_risk', severity: 'high' },
    ],
  },
  '.go': {
    patterns: [
      { pattern: /fmt\.Print/i, issue: 'debug_print', severity: 'low' },
      { pattern: /panic\(/i, issue: 'panic_usage', severity: 'medium' },
    ],
  },
  '.rs': {
    patterns: [
      { pattern: /println!\(/i, issue: 'debug_print', severity: 'low' },
      { pattern: /unwrap\(\)/i, issue: 'unwrap_usage', severity: 'medium' },
    ],
  },
  '.sh': {
    patterns: [
      { pattern: /rm\s+-rf\s+\//i, issue: 'dangerous_rm', severity: 'high' },
      { pattern: /eval\s+/i, issue: 'eval_usage', severity: 'high' },
    ],
  },
  '.sql': {
    patterns: [
      { pattern: /DROP\s+TABLE/i, issue: 'drop_table', severity: 'high' },
      { pattern: /DELETE\s+FROM\s+\w+\s*;/i, issue: 'delete_without_where', severity: 'high' },
      { pattern: /SELECT\s+\*/i, issue: 'select_star', severity: 'low' },
    ],
  },
  '.yaml': {
    patterns: [
      { pattern: /password:\s*[^\n]+/i, issue: 'password_in_yaml', severity: 'high' },
      { pattern: /secret:\s*[^\n]+/i, issue: 'secret_in_yaml', severity: 'high' },
    ],
  },
  '.yml': {
    patterns: [
      { pattern: /password:\s*[^\n]+/i, issue: 'password_in_yaml', severity: 'high' },
      { pattern: /secret:\s*[^\n]+/i, issue: 'secret_in_yaml', severity: 'high' },
    ],
  },
  '.json': {
    patterns: [
      { pattern: /"password"\s*:\s*"[^"]+"/i, issue: 'password_in_json', severity: 'high' },
      { pattern: /"api_key"\s*:\s*"[^"]+"/i, issue: 'api_key_in_json', severity: 'high' },
    ],
  },
};

interface Issue {
  issue: string;
  severity: string;
  line: number;
  context: string;
}

function checkPatterns(content: string, patterns: QualityPattern[]): Issue[] {
  const issues: Issue[] = [];
  const lines = content.split('\n');

  for (const { pattern, issue, severity } of patterns) {
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        issues.push({
          issue,
          severity,
          line: i + 1,
          context: lines[i].trim().slice(0, 100),
        });
      }
    }
  }

  return issues;
}

function calculateQualityScore(issues: Issue[]): number {
  let score = 1.0;
  const severityWeights: Record<string, number> = { high: 0.15, medium: 0.08, low: 0.03 };

  for (const issue of issues) {
    score -= severityWeights[issue.severity] || 0.03;
  }

  return Math.max(0, Math.min(1, score));
}

function logQualityIssues(input: HookInput, issues: Issue[], qualityScore: number, ext: string) {
  if (qualityScore >= 0.9 && issues.length === 0) return;

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const diaryDir = join(homedir(), '.shipmate', 'diary', 'entries', dateStr);

  try {
    mkdirSync(diaryDir, { recursive: true });

    const id = createHash('md5')
      .update(`${input.conversation_id}${input.file_path}${now.toISOString()}`)
      .digest('hex')
      .slice(0, 8);

    const entry = {
      id,
      timestamp: now.toISOString(),
      conversation_id: input.conversation_id,
      type: 'quality_gate',
      severity: qualityScore < 0.6 ? 'high' : qualityScore < 0.8 ? 'medium' : 'low',
      category: 'code_quality',
      context: {
        file_path: input.file_path,
        file_type: ext,
        quality_score: qualityScore,
        issues: issues.slice(0, 10),
      },
      learning: {
        what_happened: `Quality check on ${input.file_path}`,
        quality_score: qualityScore,
        issue_count: issues.length,
        high_severity_count: issues.filter((i) => i.severity === 'high').length,
        improvement: 'Review and fix flagged issues',
      },
      metadata: {
        hook_version: '1.0.0',
      },
    };

    writeFileSync(join(diaryDir, `quality-${id}.json`), JSON.stringify(entry, null, 2));
  } catch {
    // Silently fail
  }
}

async function main() {
  try {
    const input: HookInput = await Bun.stdin.json();

    if (!input.file_path) return;

    const ext = extname(input.file_path).toLowerCase();
    const config = QUALITY_CHECKS[ext];

    if (!config) return;

    // Read current file content
    let content: string;
    try {
      content = readFileSync(input.file_path, 'utf-8');
    } catch {
      return;
    }

    const issues = checkPatterns(content, config.patterns);
    const qualityScore = calculateQualityScore(issues);

    logQualityIssues(input, issues, qualityScore, ext);

    // afterFileEdit hooks don't produce output
  } catch {
    // Silently fail
  }
}

main();
