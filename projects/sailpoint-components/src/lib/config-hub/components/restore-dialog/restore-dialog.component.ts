import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ConfigHubApiService } from '../../services/config-hub-api.service';
import { ConfigHubGitService } from '../../services/config-hub-git.service';
import { ConfigHubTokenService, SubstitutionPreview, TokenPathsConfig } from '../../services/config-hub-token.service';
import { BackupObject, RestoreResult } from '../../models/config-hub.models';

export interface RestoreDialogData {
  // ── Single-object mode ──────────────────────────────────────────────────
  object?: BackupObject;
  content?: any;

  // ── Multi-object / commit-bundle mode ──────────────────────────────────
  bundle?: any[];
  bundleName?: string;
  affectedObjects?: Array<{ objectType: string; name: string }>;

  // ── Shared commit metadata ──────────────────────────────────────────────
  commitSha: string;
  commitMessage?: string;
  commitAuthor?: string;
  commitTimestamp?: string;
}

@Component({
  selector: 'app-restore-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatChipsModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  templateUrl: './restore-dialog.component.html',
  styleUrl: './restore-dialog.component.scss',
})
export class RestoreDialogComponent implements OnInit {
  readonly data: RestoreDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<RestoreDialogComponent>);
  private apiService = inject(ConfigHubApiService);
  private gitService = inject(ConfigHubGitService);
  private tokenService = inject(ConfigHubTokenService);

  readonly restoring = this.apiService.restoring;
  readonly statusMessage = this.apiService.restoreStatusMessage;

  result = signal<RestoreResult | null>(null);

  // ── Environment substitution ──────────────────────────────────────────
  /** Only offered for single-object restores. */
  readonly showEnvSubstitution = !this.isBundle;

  /** Plain boolean so [(ngModel)] on mat-slide-toggle works reliably. */
  useEnvSubstitution = false;

  /** Tenant derived from backupsPath — the environment the backup came from. */
  sourceTenant = signal<string | null>(null);
  /** Available target environment tenants (all vars files). */
  targetTenants = signal<string[]>([]);
  selectedTargetTenant = signal<string | null>(null);

  /** token-paths.json loaded from the repo (or built-in defaults). */
  private tokenPathsConfig: TokenPathsConfig | null = null;

  /** Parsed vars for the selected target environment. */
  private targetVars: Record<string, string | string[]> = {};

  /** @deprecated kept for template access only; path-based substitution no longer needs this. */
  sourceVars: Record<string, string | string[]> = {};

  preview = signal<SubstitutionPreview | null>(null);
  loadingMeta = signal(false);
  loadingPreview = signal(false);

  get isBundle(): boolean {
    return Array.isArray(this.data.bundle);
  }

  get substitutionReady(): boolean {
    return this.useEnvSubstitution &&
      !!this.selectedTargetTenant() &&
      this.preview() !== null;
  }

  get hasUnmapped(): boolean {
    return (this.preview()?.unmapped.length ?? 0) > 0;
  }

  /** True once token-paths.json (or built-in fallback) is loaded. */
  get configReady(): boolean {
    return this.tokenPathsConfig !== null;
  }

  ngOnInit(): void {
    if (this.showEnvSubstitution) {
      void this.initEnvSubstitution();
    }
  }

  private async initEnvSubstitution(): Promise<void> {
    this.loadingMeta.set(true);

    const sourceTenant = this.gitService.getSourceVarsTenant();
    this.sourceTenant.set(sourceTenant);

    // Fetch vars tenants and token-paths.json in parallel.
    const [tenants, tokenPathsFromRepo] = await Promise.all([
      this.gitService.getVarsTenants(),
      this.gitService.getTokenPathsConfig(),
    ]);

    this.targetTenants.set(tenants);
    // Use repo's token-paths.json if available, otherwise fall back to built-in defaults.
    this.tokenPathsConfig = tokenPathsFromRepo ?? this.tokenService.getBuiltinConfig();

    this.loadingMeta.set(false);

    // If exactly one other tenant exists, auto-select it.
    const others = tenants.filter(t => t !== sourceTenant);
    if (others.length === 1) {
      await this.onTargetTenantChange(others[0]);
    }
  }

  onUseEnvToggle(on: boolean): void {
    this.useEnvSubstitution = on;
    if (!on) {
      this.preview.set(null);
      this.selectedTargetTenant.set(null);
    }
  }

  async onTargetTenantChange(tenant: string): Promise<void> {
    this.selectedTargetTenant.set(tenant);
    this.preview.set(null);
    this.loadingPreview.set(true);

    const raw = await this.gitService.getVarsFile(tenant);
    this.targetVars = raw ? this.tokenService.parseVarsYaml(raw) : {};

    const content = this.data.content;
    const config = this.tokenPathsConfig;
    const { objectType, objectName } = this.getRestoreObjectIdentity(content);

    if (config && content && objectType && objectName) {
      this.preview.set(
        this.tokenService.computePathBasedPreview(
          content,
          objectType,
          objectName,
          config,
          this.targetVars,
        )
      );
    }

    this.loadingPreview.set(false);
  }

  async onConfirm(): Promise<void> {
    let outcome: RestoreResult;

    if (this.isBundle) {
      outcome = await this.apiService.restoreBundle(
        this.data.bundle!,
        this.data.bundleName ?? `Restore ${this.data.bundle!.length} objects`,
      );
    } else {
      let content = this.data.content;
      const config = this.tokenPathsConfig;
      const { objectType, objectName } = this.getRestoreObjectIdentity(content);
      if (this.useEnvSubstitution && config && objectType && objectName) {
        content = this.tokenService.applyPathBasedSubstitution(
          content,
          objectType,
          objectName,
          config,
          this.targetVars,
        ).resolved;
      }
      outcome = await this.apiService.restore(this.data.object!, content);
    }

    this.result.set(outcome);
  }

  onClose(): void {
    this.dialogRef.close(this.result());
  }

  /**
   * Reads type/name from backup envelope `content.self` when present; otherwise
   * falls back to dialog data. Values are narrowed to string so callers can pass
   * them to token helpers without unsafe `any`.
   */
  private getRestoreObjectIdentity(content: unknown): { objectType: string; objectName: string } {
    const self =
      content && typeof content === 'object' && 'self' in content
        ? (content as { self: { type?: unknown; name?: unknown } }).self
        : undefined;
    const fromType = typeof self?.type === 'string' ? self.type : '';
    const objectType = fromType || (this.data.object?.objectType ?? '');
    const objectName = typeof self?.name === 'string' ? self.name : '';
    return { objectType, objectName };
  }

  formatTimestamp(iso: string | undefined): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString();
  }
}
