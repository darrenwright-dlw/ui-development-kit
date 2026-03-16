#!/usr/bin/env bun

/**
 * Correction/Frustration Detection Hook (beforeSubmitPrompt)
 *
 * Detects when users correct the agent or show frustration.
 * Injects context to help the agent course-correct.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

interface HookInput {
  conversation_id: string;
  hook_event_name: string;
  prompt: string;
  model?: string;
  workspace_roots?: string[];
  cursor_version?: string;
}

interface HookOutput {
  continue: boolean;
  user_message?: string;
}

interface PatternInfo {
  pattern: RegExp;
  type: string;
  severity: 'high' | 'medium' | 'low';
}

const IMPLEMENTATION_CORRECTIONS: PatternInfo[] = [
  // Wrong approach
  {
    pattern: /\b(that'?s?\s+not\s+(the\s+)?(right|correct)\s+(way|approach|method))/i,
    type: 'wrong_approach',
    severity: 'high',
  },
  {
    pattern: /\b(don'?t\s+(do\s+it\s+)?(like\s+)?that)/i,
    type: 'wrong_approach',
    severity: 'high',
  },
  {
    pattern: /\b(that'?s?\s+not\s+what\s+i\s+(meant|wanted|asked))/i,
    type: 'misunderstanding',
    severity: 'high',
  },
  {
    pattern: /\b(you\s+(should|need\s+to)\s+(have\s+)?(done|used|implemented))/i,
    type: 'wrong_approach',
    severity: 'medium',
  },

  // Wrong file/location
  {
    pattern: /\b(wrong\s+(file|place|location|directory|folder))/i,
    type: 'wrong_location',
    severity: 'high',
  },
  {
    pattern: /\b(that'?s?\s+not\s+the\s+(right|correct)\s+(file|place))/i,
    type: 'wrong_location',
    severity: 'high',
  },
  {
    pattern: /\b(put\s+it\s+in|move\s+it\s+to|should\s+be\s+in)/i,
    type: 'wrong_location',
    severity: 'medium',
  },

  // Wrong code/implementation
  {
    pattern: /\b(that\s+code\s+(is\s+)?(wrong|broken|doesn'?t\s+work))/i,
    type: 'wrong_code',
    severity: 'high',
  },
  {
    pattern: /\b(you\s+broke|that\s+broke|it'?s?\s+broken)/i,
    type: 'wrong_code',
    severity: 'high',
  },
  {
    pattern: /\b(that'?s?\s+not\s+(how|the\s+way)\s+(it\s+)?(should\s+)?(work|be))/i,
    type: 'wrong_code',
    severity: 'high',
  },
  { pattern: /\b(use\s+.+\s+instead)/i, type: 'use_instead', severity: 'medium' },

  // Undo/revert requests
  {
    pattern: /\b(undo|revert|rollback|go\s+back|restore)/i,
    type: 'undo_request',
    severity: 'high',
  },
  { pattern: /\b(put\s+it\s+back|change\s+it\s+back)/i, type: 'undo_request', severity: 'high' },

  // Stop/halt
  { pattern: /\b(stop|wait|hold\s+on|don'?t\s+continue)/i, type: 'stop_request', severity: 'high' },
  { pattern: /\b(no\s+no\s+no)/i, type: 'stop_request', severity: 'high' },

  // Missing something
  {
    pattern: /\b(you\s+(forgot|missed|didn'?t\s+(add|include|do)))/i,
    type: 'missing_work',
    severity: 'medium',
  },
  { pattern: /\b(what\s+about|you\s+need\s+to\s+also)/i, type: 'missing_work', severity: 'medium' },

  // Wrong understanding
  { pattern: /\b(no[,.]?\s+(i\s+)?(meant|want|need))/i, type: 'clarification', severity: 'medium' },
  {
    pattern: /\b(let\s+me\s+(clarify|explain|be\s+more\s+clear))/i,
    type: 'clarification',
    severity: 'low',
  },
  { pattern: /\b(i\s+mean|what\s+i\s+meant)/i, type: 'clarification', severity: 'low' },
];

const POSITIVE_PATTERNS = [
  /\b(no\s+problem|no\s+worries|no\s+rush)/i,
  /\b(don'?t\s+worry)/i,
  /\b(that'?s\s+(fine|ok|okay|good|great|perfect))/i,
  /\b(thanks|thank\s+you)/i,
  /\b(looks\s+good|well\s+done|nice)/i,
];

const CONTEXT_INJECTIONS: Record<string, string> = {
  wrong_approach:
    'Note: User is indicating the approach taken was incorrect. Listen carefully to their guidance on the correct approach and follow their direction.',
  wrong_location:
    'Note: User is indicating files were placed in wrong location. Pay close attention to where they want the code placed.',
  wrong_code:
    'Note: User is indicating the implementation has errors. Carefully review their feedback and fix the issues they identify.',
  use_instead:
    'Note: User is suggesting a different implementation. Follow their guidance on what to use instead.',
  undo_request:
    'Note: User wants to revert recent changes. Carefully undo the specified changes and restore previous state.',
  stop_request:
    'Note: User wants to pause/stop current action. Wait for their guidance before proceeding.',
  missing_work:
    'Note: User is indicating something was forgotten or missed. Make sure to address what they mention.',
  clarification:
    'Note: User is clarifying their intent. Pay close attention to their clarification and adjust accordingly.',
  misunderstanding:
    "Note: There was a misunderstanding. Re-read the user's original request and their clarification carefully.",
};

function isPositiveMessage(prompt: string): boolean {
  return POSITIVE_PATTERNS.some((pattern) => pattern.test(prompt));
}

function detectCorrections(
  prompt: string,
): Array<{ type: string; severity: string; category: string }> {
  if (isPositiveMessage(prompt)) return [];

  const detections: Array<{ type: string; severity: string; category: string }> = [];

  for (const { pattern, type, severity } of IMPLEMENTATION_CORRECTIONS) {
    if (pattern.test(prompt)) {
      detections.push({ type, severity, category: 'implementation' });
    }
  }

  return detections;
}

function getContextInjection(detections: Array<{ type: string; severity: string }>): string {
  if (detections.length === 0) return '';

  const severityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
  const primary = detections.sort(
    (a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0),
  )[0];

  return CONTEXT_INJECTIONS[primary.type] || '';
}

function saveDiaryEntry(
  input: HookInput,
  detections: Array<{ type: string; severity: string; category: string }>,
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
    const primary = detections[0];

    const entry = {
      id,
      timestamp: now.toISOString(),
      conversation_id: input.conversation_id,
      type: 'correction',
      severity: primary.severity,
      category: primary.category,
      context: {
        user_prompt: input.prompt.slice(0, 500),
        detection_type: primary.type,
        all_detections: detections.map((d) => ({
          type: d.type,
          severity: d.severity,
          category: d.category,
        })),
        model: input.model || 'unknown',
        workspace_roots: input.workspace_roots || [],
      },
      learning: {
        what_happened: `User correction: ${primary.type}`,
        correction_type: primary.type,
        is_implementation_correction: primary.category === 'implementation',
        improvement: 'Agent should have understood user intent better',
      },
      metadata: {
        hook_version: '2.0.0',
        cursor_version: input.cursor_version || 'unknown',
        detection_count: detections.length,
      },
    };

    writeFileSync(join(diaryDir, `correction-${id}.json`), JSON.stringify(entry, null, 2));
  } catch {
    // Silently fail - don't block the hook
  }
}

async function main() {
  try {
    const input: HookInput = await Bun.stdin.json();
    const output: HookOutput = { continue: true };

    if (input.prompt) {
      const detections = detectCorrections(input.prompt);

      if (detections.length > 0) {
        saveDiaryEntry(input, detections);

        const context = getContextInjection(detections);
        if (context) {
          output.user_message = context;
        }
      }
    }

    console.log(JSON.stringify(output));
  } catch {
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
