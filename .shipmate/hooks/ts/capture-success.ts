#!/usr/bin/env bun

/**
 * Success Pattern Capture Hook (beforeSubmitPrompt + afterAgentResponse)
 *
 * Two-phase hook that captures successful interaction patterns.
 * Phase 1 (afterAgentResponse): Save response signature as pending
 * Phase 2 (beforeSubmitPrompt): Check for positive feedback, log success
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

interface HookInput {
  conversation_id: string;
  hook_event_name: string;
  text?: string;
  prompt?: string;
}

const PENDING_FILE = join(homedir(), '.shipmate', 'context', 'pending_success.json');

const SUCCESS_PATTERNS = [
  /\b(perfect|excellent|great|awesome|amazing|wonderful)\b/i,
  /\b(thanks|thank\s+you|thx|ty)\b/i,
  /\b(that'?s?\s+(it|right|correct|exactly))\b/i,
  /\b(looks?\s+good|well\s+done|nice\s+(work|job|one))\b/i,
  /\b(works?\s+(great|perfectly|well|now))\b/i,
  /\b(exactly\s+what\s+i\s+(wanted|needed|asked))\b/i,
  /\b(you\s+(got|nailed)\s+it)\b/i,
  /\blgtm\b/i,
  /\bship\s+it\b/i,
];

interface ResponseSignature {
  toolsMentioned: string[];
  filesCreated: string[];
  filesModified: string[];
  approaches: string[];
  keyActions: string[];
  length: number;
  hasCodeBlocks: boolean;
}

function getResponseSignature(text: string): ResponseSignature {
  const signature: ResponseSignature = {
    toolsMentioned: [],
    filesCreated: [],
    filesModified: [],
    approaches: [],
    keyActions: [],
    length: text.length,
    hasCodeBlocks: text.includes('```'),
  };

  const textLower = text.toLowerCase();

  // Extract tools
  const toolMatches = textLower.match(/\b(grep|read|write|edit|bash|glob|task)\b/g);
  signature.toolsMentioned = [...new Set(toolMatches || [])];

  // Extract files
  const fileMatches = text.match(
    /[`"']([^`"']+\.(py|js|ts|tsx|jsx|go|rs|java|md|json|yaml|yml))[`"']/g,
  );
  signature.filesCreated = (fileMatches || []).slice(0, 5).map((m) => m.replace(/[`"']/g, ''));

  // Extract key actions
  const actionMatches = textLower.match(
    /\b(created|implemented|fixed|added|updated|refactored|optimized)\s+(\w+(?:\s+\w+)?)/g,
  );
  signature.keyActions = (actionMatches || []).slice(0, 5);

  // Check for approaches
  if (/test.*pass|pass.*test|all.*green/.test(textLower)) {
    signature.approaches.push('test_driven');
  }
  if (/step\s*\d|first.*then|1\.\s|2\.\s/.test(textLower)) {
    signature.approaches.push('systematic_steps');
  }
  if (/error.*fix|fix.*error|debug/.test(textLower)) {
    signature.approaches.push('debugging');
  }

  return signature;
}

interface PendingResponse {
  timestamp: number;
  response_excerpt: string;
  signature: ResponseSignature;
}

function savePendingResponse(conversationId: string, responseText: string) {
  const contextDir = join(homedir(), '.shipmate', 'context');
  mkdirSync(contextDir, { recursive: true });

  let pending: Record<string, PendingResponse> = {};

  if (existsSync(PENDING_FILE)) {
    try {
      pending = JSON.parse(readFileSync(PENDING_FILE, 'utf-8'));
    } catch {
      pending = {};
    }
  }

  // Clean old entries (> 30 min)
  const cutoff = Date.now() - 1800000;
  for (const key of Object.keys(pending)) {
    if ((pending[key].timestamp || 0) < cutoff) {
      delete pending[key];
    }
  }

  pending[conversationId] = {
    timestamp: Date.now(),
    response_excerpt: responseText.slice(0, 1000),
    signature: getResponseSignature(responseText),
  };

  writeFileSync(PENDING_FILE, JSON.stringify(pending, null, 2));
}

function checkForSuccessFeedback(prompt: string): boolean {
  return SUCCESS_PATTERNS.some((pattern) => pattern.test(prompt));
}

function getPendingResponse(conversationId: string): PendingResponse | null {
  if (!existsSync(PENDING_FILE)) return null;

  try {
    const pending = JSON.parse(readFileSync(PENDING_FILE, 'utf-8'));
    return pending[conversationId] || null;
  } catch {
    return null;
  }
}

function logSuccessPattern(conversationId: string, pending: PendingResponse, userFeedback: string) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const diaryDir = join(homedir(), '.shipmate', 'diary', 'entries', dateStr);

  try {
    mkdirSync(diaryDir, { recursive: true });

    const id = createHash('md5')
      .update(`${conversationId}${now.toISOString()}`)
      .digest('hex')
      .slice(0, 8);
    const signature = pending.signature;

    const entry = {
      id,
      timestamp: now.toISOString(),
      conversation_id: conversationId,
      type: 'success_pattern',
      severity: 'low',
      category: 'workflow',
      context: {
        user_feedback: userFeedback.slice(0, 200),
        response_excerpt: pending.response_excerpt.slice(0, 500),
        tools_used: signature.toolsMentioned,
        files_touched: [...signature.filesCreated, ...signature.filesModified],
        approaches: signature.approaches,
        key_actions: signature.keyActions,
      },
      learning: {
        what_happened: 'User expressed satisfaction with agent response',
        successful_patterns: signature.approaches,
        tools_that_worked: signature.toolsMentioned,
        improvement: 'Reinforce these patterns',
      },
      metadata: {
        hook_version: '1.0.0',
        had_code_blocks: signature.hasCodeBlocks,
        response_length: signature.length,
      },
    };

    writeFileSync(join(diaryDir, `success-${id}.json`), JSON.stringify(entry, null, 2));
  } catch {
    // Silently fail
  }
}

function clearPending(conversationId: string) {
  if (!existsSync(PENDING_FILE)) return;

  try {
    const pending = JSON.parse(readFileSync(PENDING_FILE, 'utf-8'));
    if (conversationId in pending) {
      delete pending[conversationId];
      writeFileSync(PENDING_FILE, JSON.stringify(pending, null, 2));
    }
  } catch {
    // Silently fail
  }
}

async function main() {
  try {
    const input: HookInput = await Bun.stdin.json();
    const conversationId = input.conversation_id || 'unknown';

    if (input.hook_event_name === 'afterAgentResponse') {
      // Phase 1: Save response as pending
      if (input.text) {
        savePendingResponse(conversationId, input.text);
      }
    } else if (input.hook_event_name === 'beforeSubmitPrompt') {
      // Phase 2: Check for positive feedback
      if (input.prompt && checkForSuccessFeedback(input.prompt)) {
        const pending = getPendingResponse(conversationId);
        if (pending) {
          logSuccessPattern(conversationId, pending, input.prompt);
          clearPending(conversationId);
        }
      }
    }

    // Output for beforeSubmitPrompt
    if (input.hook_event_name === 'beforeSubmitPrompt') {
      console.log(JSON.stringify({ continue: true }));
    }
  } catch {
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
