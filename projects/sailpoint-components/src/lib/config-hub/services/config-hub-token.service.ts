import { Injectable } from '@angular/core';

export interface SubstitutionPreview {
  /** Token names whose source value was found in the content AND differs in the target. */
  remapped: string[];
  /** Token names whose source value was found in the content but missing in the target vars. */
  unmapped: string[];
  /** Tokens found in source vars that were not present in this specific backup object. */
  notApplicable: string[];
}

@Injectable({ providedIn: 'root' })
export class ConfigHubTokenService {

  // ── YAML parsing ──────────────────────────────────────────────────────────

  /**
   * Parse the simple YAML format produced by `varsToYaml()` in token-utils.mjs.
   * Supports scalar and array values:
   *   KEY: "string value"
   *   KEY:
   *     - "item1"
   *     - "item2"
   */
  parseVarsYaml(content: string): Record<string, string | string[]> {
    const vars: Record<string, string | string[]> = {};
    const lines = content.split(/\r?\n/);
    let currentKey: string | null = null;
    let currentArray: string[] | null = null;

    for (const line of lines) {
      if (currentArray !== null && /^\s+-\s/.test(line)) {
        const raw = line.replace(/^\s+-\s+/, '').trim();
        currentArray.push(
          raw.replace(/^"(.*)"$/s, '$1').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
        );
        continue;
      }
      if (currentArray !== null) {
        vars[currentKey!] = currentArray;
        currentArray = null;
        currentKey = null;
      }
      if (line.trim() === '' || line.trim().startsWith('#')) continue;
      const match = line.match(/^([A-Z][A-Z0-9_]*):\s*(.*)/);
      if (match) {
        const key = match[1];
        const rest = match[2].trim();
        if (rest === '') {
          currentKey = key;
          currentArray = [];
        } else {
          vars[key] = rest
            .replace(/^"(.*)"$/s, '$1')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        }
      }
    }
    if (currentArray !== null && currentKey !== null) {
      vars[currentKey] = currentArray;
    }
    return vars;
  }

  // ── Value-based substitution (no templates required) ─────────────────────

  /**
   * Preview how many fields would be remapped when applying sourceVars → targetVars
   * to a backup object.  Does NOT modify the content.
   *
   * For each token in sourceVars:
   *   - If the source value is present in the content JSON:
   *       - remapped  → target has a different value (will be swapped)
   *       - unmapped  → token is missing from target vars (can't be swapped)
   *   - If not present → notApplicable (token is for a different object type)
   */
  computeSubstitutionPreview(
    content: any,
    sourceVars: Record<string, string | string[]>,
    targetVars: Record<string, string | string[]>,
  ): SubstitutionPreview {
    const jsonStr = JSON.stringify(content);
    const remapped: string[] = [];
    const unmapped: string[] = [];
    const notApplicable: string[] = [];

    for (const [token, sourceValue] of Object.entries(sourceVars)) {
      const srcJsonVal = this.toJsonValue(sourceValue);
      if (!jsonStr.includes(srcJsonVal)) {
        notApplicable.push(token);
        continue;
      }

      const targetValue = targetVars[token];
      if (targetValue === undefined) {
        unmapped.push(token);
      } else if (this.toJsonValue(targetValue) !== srcJsonVal) {
        remapped.push(token);
      }
      // else: same value in both — silently skip
    }

    return { remapped, unmapped, notApplicable };
  }

  /**
   * Apply source→target value substitution to a backup object.
   * For every token shared between sourceVars and targetVars where the values
   * differ, the source value is replaced with the target value in the JSON.
   */
  applyVarsSubstitution(
    content: any,
    sourceVars: Record<string, string | string[]>,
    targetVars: Record<string, string | string[]>,
  ): { resolved: any; remapped: string[]; unmapped: string[] } {
    let jsonStr = JSON.stringify(content);
    const remapped: string[] = [];
    const unmapped: string[] = [];

    for (const [token, sourceValue] of Object.entries(sourceVars)) {
      const srcJsonVal = this.toJsonValue(sourceValue);
      if (!jsonStr.includes(srcJsonVal)) continue; // Not applicable to this object

      const targetValue = targetVars[token];
      if (targetValue === undefined) {
        unmapped.push(token);
        continue;
      }

      const tgtJsonVal = this.toJsonValue(targetValue);
      if (srcJsonVal === tgtJsonVal) continue; // Same in both envs

      jsonStr = jsonStr.split(srcJsonVal).join(tgtJsonVal);
      remapped.push(token);
    }

    return { resolved: JSON.parse(jsonStr), remapped, unmapped };
  }

  /**
   * Serialize a vars value to its JSON representation so it can be found and
   * replaced in a JSON string.  Arrays are serialized as JSON arrays; scalars
   * as JSON strings (with quotes).
   */
  private toJsonValue(value: string | string[]): string {
    return Array.isArray(value) ? JSON.stringify(value) : JSON.stringify(String(value));
  }

  // ── Token placeholder helpers (kept for any future template use) ──────────

  extractTokenNames(obj: any): string[] {
    const jsonStr = JSON.stringify(obj);
    const matches = [...jsonStr.matchAll(/\{\{([A-Z][A-Z0-9_]*)\}\}/g)];
    return [...new Set(matches.map(m => m[1]))];
  }

  formatToken(name: string): string {
    return `{{${name}}}`;
  }
}
