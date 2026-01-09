/**
 * Connector Customizer deployment logic
 */
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ColabPost } from '../services/discourse.service';
import { ElectronApiFactoryService } from '../../services/electron-api-factory.service';
import { DeploymentSuccessDialogComponent } from '../components/deployment-success-dialog/deployment-success-dialog.component';
import { DeploymentErrorDialogComponent } from '../components/deployment-error-dialog/deployment-error-dialog.component';
import { extractGitHubRepoUrl } from './deployment-utils';

export interface CustomizerDeploymentDependencies {
  dialog: MatDialog;
  snackBar: MatSnackBar;
  apiFactory: ElectronApiFactoryService;
}

export async function deployConnectorCustomizer(
  post: ColabPost,
  deps: CustomizerDeploymentDependencies
): Promise<void> {
  deps.snackBar.open('Deploying Connector Customizer...', 'Close', { duration: 3000 });
  
  try {
    // Step 1: Get the raw post content to extract GitHub URL
    const rawResponse = await deps.apiFactory.getApi().getColabTopicRaw(post.id);
    
    if (!rawResponse.success || !rawResponse.data) {
      deps.dialog.open(DeploymentErrorDialogComponent, {
        width: '700px',
        data: {
          title: 'Deployment Failed',
          message: 'Failed to fetch the CoLab post details. Please try again.',
          details: rawResponse.error || 'Could not retrieve raw post content.'
        }
      });
      return;
    }

    // Step 2: Extract GitHub repository URL from the raw content
    const content = rawResponse.data;
    const githubRepoUrl = extractGitHubRepoUrl(content || '');
    
    if (!githubRepoUrl) {
      deps.dialog.open(DeploymentErrorDialogComponent, {
        width: '700px',
        data: {
          title: 'Deployment Failed',
          message: 'Could not find a GitHub repository link in this CoLab post.',
          details: 'Please ensure the CoLab post contains a valid GitHub repository URL.'
        }
      });
      return;
    }

    console.log('GitHub repository URL extracted:', githubRepoUrl);

    // Step 3: Upload the customizer from GitHub
    const result = await deps.apiFactory.getApi().uploadCustomizer(githubRepoUrl);

    if (result.success && result.customizerId) {
      const customizerName = post.title;
      deps.dialog.open(DeploymentSuccessDialogComponent, {
        width: '700px',
        data: {
          connectorName: customizerName,
          connectorId: `${result.customizerId}`,
          version: result.version,
          deploymentType: 'customizer'
        }
      });
      deps.snackBar.open('Connector Customizer deployed successfully!', 'Close', { duration: 5000 });
    } else {
      deps.dialog.open(DeploymentErrorDialogComponent, {
        width: '700px',
        data: {
          title: 'Deployment Failed',
          message: 'Failed to deploy the connector customizer to your environment.',
          details: result.error || 'Unknown error occurred during customizer deployment.'
        }
      });
    }

  } catch (error: any) {
    console.error('Error deploying connector customizer:', error);
    deps.dialog.open(DeploymentErrorDialogComponent, {
      width: '700px',
      data: {
        title: 'Deployment Failed',
        message: 'An unexpected error occurred during customizer deployment.',
        details: (error.message || 'Unknown error occurred.') as string
      }
    });
  }
}

