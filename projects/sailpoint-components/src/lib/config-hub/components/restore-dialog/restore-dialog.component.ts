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
import { ConfigHubTokenService, SubstitutionPreview } from '../../services/config-hub-token.service';
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

  /** Cached parsed vars, loaded when target is selected. */
  sourceVars: Record<string, string | string[]> = {};
  private targetVars: Record<string, string | string[]> = {};

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

  /** Used in template because Object is not in Angular's template scope. */
  get sourceVarsEmpty(): boolean {
    return Object.keys(this.sourceVars).length === 0;
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

    const [tenants, sourceRaw] = await Promise.all([
      this.gitService.getVarsTenants(),
      sourceTenant ? this.gitService.getVarsFile(sourceTenant) : Promise.resolve(''),
    ]);

    this.targetTenants.set(tenants);
    if (sourceRaw) {
      this.sourceVars = this.tokenService.parseVarsYaml(sourceRaw);
    }

    this.loadingMeta.set(false);

    // If there's only one other tenant, auto-select it.
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

    if (Object.keys(this.sourceVars).length > 0 && this.data.content) {
      this.preview.set(
        this.tokenService.computeSubstitutionPreview(
          this.data.content,
          this.sourceVars,
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
      if (this.useEnvSubstitution && Object.keys(this.sourceVars).length > 0) {
        content = this.tokenService.applyVarsSubstitution(
          content,
          this.sourceVars,
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

  formatTimestamp(iso: string | undefined): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString();
  }
}
