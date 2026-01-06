/**
 * SaaS Connector deployment logic
 */
import { firstValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ColabPost, DiscourseService } from '../services/discourse.service';
import { ElectronApiFactoryService } from '../../services/electron-api-factory.service';
import { DeploymentSuccessDialogComponent, DeploymentSuccessData } from '../components/deployment-success-dialog/deployment-success-dialog.component';
import { extractGitHubRepoUrl, sanitizeConnectorName } from './deployment-utils';

export interface ConnectorDeploymentDependencies {
  dialog: MatDialog;
  snackBar: MatSnackBar;
  discourseService: DiscourseService;
  apiFactory: ElectronApiFactoryService;
}

export async function deploySaaSConnector(
  post: ColabPost,
  deps: ConnectorDeploymentDependencies,
  rawContent?: string
): Promise<void> {
  try {
    // Fetch raw topic content from Discourse to extract GitHub location
    let topicRawContent = rawContent;
    
    if (!topicRawContent) {
      console.log(`Fetching raw content for SaaS Connector: ${post.title} (ID: ${post.id})`);
      topicRawContent = await firstValueFrom(deps.discourseService.getTopicRaw(post.id));
    }

    if (!topicRawContent) {
      throw new Error('Failed to fetch topic content from Discourse');
    }

    // Extract GitHub repository URL from raw content
    const githubRepoUrl = extractGitHubRepoUrl(topicRawContent);
    
    if (!githubRepoUrl) {
      throw new Error('Could not find GitHub repository link in topic content. Please ensure the topic contains a "Repository Link" field.');
    }

    console.log(`GitHub repository URL extracted: ${githubRepoUrl}`);
    
    // Generate connector alias from post title (sanitize it)
    const connectorAlias = sanitizeConnectorName(post.title);

    // Upload connector from GitHub (handles everything: fetch artifact, download, create, upload)
    showMessage(deps.snackBar, `Deploying connector "${connectorAlias}" from GitHub...`, 'info');
    const uploadResult = await deps.apiFactory.getApi().uploadConnector(githubRepoUrl, connectorAlias);

    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'Failed to deploy connector');
    }

    // Show success dialog
    deps.dialog.open(DeploymentSuccessDialogComponent, {
      width: '500px',
      data: {
        connectorName: connectorAlias,
        version: uploadResult.version,
        connectorId: uploadResult.connectorId,
        deploymentType: 'connector'
      } as DeploymentSuccessData
    });

    // Also show a snackbar for quick feedback
    showMessage(
      deps.snackBar,
      `Successfully deployed "${post.title}"`, 
      'success'
    );
  } catch (error) {
    console.error('Error deploying SaaS Connector:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    showMessage(deps.snackBar, `Failed to deploy SaaS Connector: ${errorMessage}`, 'error');
    throw error;
  }
}

function showMessage(snackBar: MatSnackBar, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
  const panelClass = {
    success: 'snackbar-success',
    error: 'snackbar-error',
    warning: 'snackbar-warning',
    info: 'snackbar-info'
  };

  snackBar.open(message, 'Dismiss', {
    duration: 5000,
    horizontalPosition: 'end',
    verticalPosition: 'top',
    panelClass: [panelClass[type]]
  });
}

