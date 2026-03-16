import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { RepoSettingsComponent } from './components/repo-settings/repo-settings.component';
import { ObjectBrowserComponent } from './components/object-browser/object-browser.component';
import { DiffViewerComponent } from './components/diff-viewer/diff-viewer.component';
import {
  RestoreDialogComponent,
  RestoreDialogData,
} from './components/restore-dialog/restore-dialog.component';
import { ConfigHubGitService } from './services/config-hub-git.service';
import { BackupObject, GitRepoSettings } from './models/config-hub.models';

@Component({
  selector: 'app-config-hub',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatToolbarModule,
    MatTooltipModule,
    ObjectBrowserComponent,
    DiffViewerComponent,
  ],
  templateUrl: './config-hub.component.html',
  styleUrl: './config-hub.component.scss',
})
export class ConfigHubComponent implements OnInit {
  selectedObject = signal<BackupObject | null>(null);
  hasSettings = signal(false);

  constructor(
    private gitService: ConfigHubGitService,
    private dialog: MatDialog,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.gitService.loadSettings();
    const s = this.gitService.settings();
    this.hasSettings.set(!!s?.repoUrl);
    if (s?.repoUrl) {
      await this.gitService.loadBranches();
    } else {
      this.openSettings();
    }
  }

  onObjectSelected(obj: BackupObject): void {
    this.selectedObject.set(obj);
  }

  openSettings(): void {
    const ref = this.dialog.open(RepoSettingsComponent, {
      width: '680px',
      maxHeight: '90vh',
      disableClose: false,
    });
    ref.afterClosed().subscribe((saved: GitRepoSettings | undefined) => {
      if (saved?.repoUrl) {
        this.hasSettings.set(true);
      }
    });
  }

  onRestoreRequested(event: { object: BackupObject; content: any; commitSha: string }): void {
    const data: RestoreDialogData = {
      object: event.object,
      content: event.content,
      commitSha: event.commitSha,
    };
    this.dialog.open(RestoreDialogComponent, {
      data,
      width: '560px',
      disableClose: true,
    });
  }
}
