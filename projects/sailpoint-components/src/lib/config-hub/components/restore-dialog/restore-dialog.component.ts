import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { ConfigHubApiService } from '../../services/config-hub-api.service';
import { BackupObject, RestoreResult } from '../../models/config-hub.models';

export interface RestoreDialogData {
  object: BackupObject;
  content: any;
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
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './restore-dialog.component.html',
  styleUrl: './restore-dialog.component.scss',
})
export class RestoreDialogComponent {
  readonly data: RestoreDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<RestoreDialogComponent>);
  private apiService = inject(ConfigHubApiService);

  restoring = signal(false);
  result = signal<RestoreResult | null>(null);

  async onConfirm(): Promise<void> {
    this.restoring.set(true);
    const outcome = await this.apiService.restore(this.data.object, this.data.content);
    this.result.set(outcome);
    this.restoring.set(false);
  }

  onClose(): void {
    this.dialogRef.close(this.result());
  }

  formatTimestamp(iso: string | undefined): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString();
  }
}
