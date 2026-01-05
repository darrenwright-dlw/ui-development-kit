import { CommonModule } from '@angular/common';
import { Component, OnDestroy, ViewChildren, QueryList } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClientModule } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import { ColabSectionComponent, CategoryDisplay } from './components/colab-section/colab-section.component';
import { ColabCardComponent } from './components/colab-card/colab-card.component';
import { ColabPost, ColabCategory, DiscourseService } from './services/discourse.service';
import { ElectronApiFactoryService } from '../services/electron-api-factory.service';
import { DeploymentSuccessDialogComponent, DeploymentSuccessData } from './components/deployment-success-dialog/deployment-success-dialog.component';
import { DeploymentErrorDialogComponent, DeploymentErrorData } from './components/deployment-error-dialog/deployment-error-dialog.component';
import { SailPointSDKService } from '../sailpoint-sdk.service';

// Define the categories to display
const COLAB_CATEGORIES: CategoryDisplay[] = [
  { id: 'workflows', title: 'Workflows' },
  { id: 'saas-connectors', title: 'SaaS Connectors' },
  { id: 'saas-connector-customizers', title: 'SaaS Connector Customizers' },
  { id: 'community-tools', title: 'Community Tools' },
  { id: 'rules', title: 'Rules' },
  { id: 'transforms', title: 'Transforms' },
  { id: 'iiq-plugins', title: 'IIQ Plugins' }
];

@Component({
  selector: 'app-colab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    HttpClientModule,
    ColabSectionComponent,
    ColabCardComponent
  ],
  templateUrl: './colab.component.html',
  styleUrl: './colab.component.scss'
})
export class ColabComponent implements OnDestroy {
  title = 'CoLab Marketplace';
  categories = COLAB_CATEGORIES;
  private expandedCategories = new Set<ColabCategory>();
  
  searchTerm = '';
  searching = false;
  searchError: string | null = null;
  searchResults: Array<{ post: ColabPost; category: ColabCategory }> = [];
  private searchCache = new Map<ColabCategory, ColabPost[]>();
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  private isCachingInProgress = false;

  @ViewChildren(ColabSectionComponent) sections!: QueryList<ColabSectionComponent>;

  constructor(
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private discourseService: DiscourseService,
    private apiFactory: ElectronApiFactoryService,
    private sdkService: SailPointSDKService
  ) {
    // Set up debounced search
    this.searchSubject.pipe(
      debounceTime(500), // Wait 500ms after user stops typing
      distinctUntilChanged(), // Only trigger if value actually changed
      takeUntil(this.destroy$)
    ).subscribe(term => {
      void this.performSearch(term);
    });
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle view all for a category - opens the developer website
   */
  onViewAll(category: ColabCategory): void {
    if (this.expandedCategories.has(category)) {
      this.expandedCategories.delete(category);
    } else {
      this.expandedCategories.add(category);
    }
  }

  /**
   * Handle deploy action for a post
   * This is where you'll implement the deployment logic for each category type
   */
  async onDeploy(event: { post: ColabPost; category: ColabCategory }): Promise<void> {
    const { post, category } = event;
    
    console.log(`Deploying ${category}:`, post);

    try {
      // Get the raw content to extract deployment information
      const rawContent = await firstValueFrom(this.discourseService.getTopicRaw(post.id));
      
      // Route to appropriate deployment handler based on category
      switch (category) {
        case 'workflows':
          await this.deployWorkflow(post, rawContent);
          break;
        case 'saas-connectors':
          await this.deploySaaSConnector(post, rawContent);
          break;
        case 'saas-connector-customizers':
          await this.deploySaaSConnectorCustomizer(post);
          break;
        case 'transforms':
          await this.deployTransform(post, rawContent);
          break;
        default:
          this.showMessage(`Deployment not supported for ${category}`, 'warning');
      }
    } catch (error) {
      console.error('Deployment error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.showMessage(`Failed to deploy: ${errorMessage}`, 'error');
    } finally {
      // Clear the deploying state on the section
      this.clearDeployingState(category);
    }
  }

  /**
   * Deploy a workflow to the environment
   */
  private async deployWorkflow(post: ColabPost, rawContent?: string): Promise<void> {
    try {
      let topicRawContent = rawContent;

      if (!topicRawContent) {
        console.log(`Fetching raw content for Workflow: ${post.title} (ID: ${post.id})`);
        topicRawContent = await firstValueFrom(this.discourseService.getTopicRaw(post.id));
      }

      if (!topicRawContent) {
        throw new Error('Failed to fetch topic content from Discourse');
      }

      const githubRepoUrl = this.extractGitHubRepoUrl(topicRawContent);
      if (!githubRepoUrl) {
        throw new Error('Could not find GitHub repository link in topic content. Please ensure the topic contains a "Repository Link" field.');
      }

      console.log(`GitHub repository URL extracted: ${githubRepoUrl}`);

      this.showMessage(`Fetching workflow files from GitHub...`, 'info');

      // List all JSON files in the repository
      const filesResult = await this.apiFactory.getApi().listGitHubJsonFiles(githubRepoUrl);

      if (!filesResult.success || !filesResult.files || filesResult.files.length === 0) {
        throw new Error(filesResult.error || 'No JSON workflow files found in repository');
      }

      console.log(`Found ${filesResult.files.length} JSON file(s) in repository`);

      // Get existing workflows to check for duplicates
      this.showMessage(`Checking for existing workflows...`, 'info');
      const existingWorkflowsResponse = await this.sdkService.listWorkflows();
      const existingWorkflowNames = new Set(
        existingWorkflowsResponse.data.map((wf: any) => wf.name as string)
      );

      const createdWorkflows: Array<{ name: string; id: string }> = [];
      const errors: string[] = [];
      const skipped: string[] = [];

      // Process each JSON file
      for (const file of filesResult.files) {
        try {
          if (!file.download_url) {
            console.warn(`Skipping ${file.name}: no download URL available`);
            continue;
          }

          this.showMessage(`Processing workflow: ${file.name}...`, 'info');
          console.log(`Fetching content for ${file.name}`);

          // Get the file content
          const contentResult = await this.apiFactory.getApi().getGitHubFileContent(
            file.download_url,
            file.name
          );

          if (!contentResult.success || !contentResult.content) {
            console.error(`Failed to fetch ${file.name}: ${contentResult.error}`);
            errors.push(`${file.name}: ${contentResult.error || 'Failed to fetch content'}`);
            continue;
          }

          // Parse the JSON content
          let workflowData;
          try {
            workflowData = JSON.parse(contentResult.content);
          } catch (parseError) {
            console.error(`Failed to parse ${file.name}:`, parseError);
            errors.push(`${file.name}: Invalid JSON format`);
            continue;
          }

          // Check if workflow with this name already exists
          const workflowName = (workflowData.name || file.name) as string;
          if (existingWorkflowNames.has(workflowName)) {
            console.log(`Workflow "${workflowName}" already exists, skipping`);
            skipped.push(workflowName);
            continue;
          }

          // Create the workflow using the SDK
          console.log(`Creating workflow from ${file.name}`);
          const response = await this.sdkService.createWorkflow({
            createWorkflowRequestV2025: workflowData
          });

          // Check if the response indicates an error (status >= 400)
          if (response.status >= 400) {
            throw new Error(response.statusText || 'Workflow creation failed');
          }

          if (response.data) {
            const name = response.data.name || file.name;
            const id = response.data.id || 'unknown';
            console.log(`Successfully created workflow: ${name} (ID: ${id})`);
            createdWorkflows.push({ name, id });
          }
        } catch (fileError: any) {
          console.error(`Error processing ${file.name}:`, fileError);
          
          // Extract error message from Axios error structure or response
          let errorMsg = 'Unknown error';
          
          // Check if it's an error from the SDK response status check
          if (fileError.message && !fileError.response) {
            errorMsg = fileError.message;
          }
          // Check if it's an Axios error with response data
          else if (fileError.response?.data) {
            const responseData = fileError.response.data;
            
            // Check for ISC API error format
            if (responseData.messages && Array.isArray(responseData.messages) && responseData.messages.length > 0) {
              errorMsg = responseData.messages.map((m: any) => (m.text || m.message) as string).join(', ');
            } else if (responseData.message) {
              errorMsg = responseData.message;
            } else if (responseData.error) {
              errorMsg = responseData.error;
            }
          } else if (fileError.message) {
            errorMsg = fileError.message;
          }
          
          // Check if it's a duplicate name error
          if (errorMsg.toLowerCase().includes('name') && errorMsg.toLowerCase().includes('unique')) {
            errors.push(`${file.name}: A workflow with this name already exists. Please delete the existing workflow first.`);
          } else {
            errors.push(`${file.name}: ${errorMsg}`);
          }
        }
      }

      // Show results
      if (createdWorkflows.length > 0) {
        const workflowDetails = createdWorkflows.map(wf => `${wf.name} (${wf.id})`).join(', ');
        
        // Show success dialog
        this.dialog.open(DeploymentSuccessDialogComponent, {
          width: '700px',
          data: {
            connectorName: `${createdWorkflows.length} Workflow${createdWorkflows.length > 1 ? 's' : ''}`,
            connectorId: workflowDetails,
            version: undefined,
            deploymentType: 'workflow'
          } as DeploymentSuccessData
        });

        let message = `Successfully deployed ${createdWorkflows.length} workflow${createdWorkflows.length > 1 ? 's' : ''} from "${post.title}"`;
        if (skipped.length > 0) {
          message += `. Skipped ${skipped.length} existing workflow${skipped.length > 1 ? 's' : ''}: ${skipped.join(', ')}`;
        }
        this.showMessage(message, 'success');
      }

      if (skipped.length > 0 && createdWorkflows.length === 0) {
        // Show dialog for skipped workflows
        this.dialog.open(DeploymentErrorDialogComponent, {
          width: '600px',
          data: {
            title: 'Workflows Already Exist',
            message: 'All workflows from this repository already exist in your environment.',
            details: `The following workflow${skipped.length > 1 ? 's' : ''} already exist${skipped.length === 1 ? 's' : ''}:\n\n${skipped.join('\n')}\n\nPlease delete the existing workflow${skipped.length > 1 ? 's' : ''} first if you want to redeploy.`
          } as DeploymentErrorData
        });
      }

      if (errors.length > 0) {
        const errorMessage = `Some workflows failed to deploy:\n${errors.join('\n')}`;
        console.error(errorMessage);
        
        // Show error dialog
        this.dialog.open(DeploymentErrorDialogComponent, {
          width: '600px',
          data: {
            title: 'Workflow Deployment Failed',
            message: createdWorkflows.length === 0 && skipped.length === 0
              ? 'Failed to deploy workflows. See details below.'
              : `Deployed ${createdWorkflows.length} workflow(s) successfully, but ${errors.length} failed.`,
            details: errors.join('\n\n')
          } as DeploymentErrorData
        });
        
        if (createdWorkflows.length === 0 && skipped.length === 0) {
          throw new Error(errorMessage);
        }
      }

      if (createdWorkflows.length === 0 && errors.length === 0 && skipped.length === 0) {
        throw new Error('No workflows were deployed');
      }

    } catch (error: any) {
      console.error('Error deploying Workflow:', error);
      this.showMessage(`Failed to deploy Workflow: ${error.message || error}`, 'error');
      throw error;
    }
  }


  /**
   * Sanitize connector name to be a valid alias
   */
  private sanitizeConnectorName(name: string): string {
    // Remove special characters, replace spaces with hyphens, convert to lowercase
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50); // Limit length
  }

  /**
   * Extract GitHub repository URL from raw Discourse topic content
   * Looks for the "Repository Link" row in the markdown table
   * Supports both direct URLs and markdown link format [text](url)
   */
  private extractGitHubRepoUrl(rawContent: string): string | null {
    if (!rawContent) {
      return null;
    }

    // Pattern to match the Repository Link row in the markdown table
    // Format can be:
    // 1. Direct URL: :hammer_and_wrench: | **Repository Link** | https://github.com/...
    // 2. Markdown link: :hammer_and_wrench: | **Repository Link** | [text](https://github.com/...)
    
    // First, try to match markdown link format with URL in parentheses
    const markdownLinkPattern = /:hammer_and_wrench:\s*\|\s*\*\*Repository\s+Link\*\*\s*\|\s*\[[^\]]+\]\((https?:\/\/github\.com\/[^)]+)\)/i;
    const markdownMatch = rawContent.match(markdownLinkPattern);
    
    if (markdownMatch && markdownMatch[1]) {
      return markdownMatch[1].trim();
    }

    // Then try direct URL format (original pattern)
    const directUrlPattern = /:hammer_and_wrench:\s*\|\s*\*\*Repository\s+Link\*\*\s*\|\s*(https?:\/\/github\.com\/[^\s|\n\r]+)/i;
    const directMatch = rawContent.match(directUrlPattern);
    
    if (directMatch && directMatch[1]) {
      return directMatch[1].trim();
    }

    // Fallback: Try to find any GitHub URL in a table row that mentions "Repository"
    const fallbackPattern = /[^|]*Repository[^|]*\|\s*(?:\[[^\]]+\]\()?(https?:\/\/github\.com\/[^\s|)\n\r]+)/i;
    const fallbackMatch = rawContent.match(fallbackPattern);
    
    if (fallbackMatch && fallbackMatch[1]) {
      return fallbackMatch[1].trim();
    }

    return null;
  }

  /**
   * Deploy a SaaS Connector to the environment
   */
  private async deploySaaSConnector(post: ColabPost, rawContent?: string): Promise<void> {
    try {
      // Fetch raw topic content from Discourse to extract GitHub location
      let topicRawContent = rawContent;
      
      if (!topicRawContent) {
        console.log(`Fetching raw content for SaaS Connector: ${post.title} (ID: ${post.id})`);
        topicRawContent = await firstValueFrom(this.discourseService.getTopicRaw(post.id));
      }

      if (!topicRawContent) {
        throw new Error('Failed to fetch topic content from Discourse');
      }

      // Extract GitHub repository URL from raw content
      const githubRepoUrl = this.extractGitHubRepoUrl(topicRawContent);
      
      if (!githubRepoUrl) {
        throw new Error('Could not find GitHub repository link in topic content. Please ensure the topic contains a "Repository Link" field.');
      }

      console.log(`GitHub repository URL extracted: ${githubRepoUrl}`);
      
      // Generate connector alias from post title (sanitize it)
      const connectorAlias = this.sanitizeConnectorName(post.title);

      // Upload connector from GitHub (handles everything: fetch artifact, download, create, upload)
      this.showMessage(`Deploying connector "${connectorAlias}" from GitHub...`, 'info');
      const uploadResult = await this.apiFactory.getApi().uploadConnector(githubRepoUrl, connectorAlias);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to deploy connector');
      }

      // Show success dialog
      this.dialog.open(DeploymentSuccessDialogComponent, {
        width: '500px',
        data: {
          connectorName: connectorAlias,
          version: uploadResult.version,
          connectorId: uploadResult.connectorId,
          deploymentType: 'connector'
        } as DeploymentSuccessData
      });

      // Also show a snackbar for quick feedback
      this.showMessage(
        `Successfully deployed "${post.title}"`, 
        'success'
      );
    } catch (error) {
      console.error('Error deploying SaaS Connector:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.showMessage(`Failed to deploy SaaS Connector: ${errorMessage}`, 'error');
      throw error;
    }
  }

  /**
   * Deploy a SaaS Connector Customizer to the environment
   */
  private deploySaaSConnectorCustomizer(post: ColabPost): Promise<void> {
    // TODO: Implement SaaS Connector Customizer deployment
    // This will be implemented based on the deployment approach provided later
    console.log('Deploying SaaS Connector Customizer:', post.title);
    this.showMessage(`SaaS Connector Customizer deployment for "${post.title}" - Coming soon!`, 'info');
    return Promise.resolve();
  }

  /**
   * Deploy a Transform to the environment
   */
  private async deployTransform(post: ColabPost, rawContent?: string): Promise<void> {
    try {
      let topicRawContent = rawContent;

      if (!topicRawContent) {
        console.log(`Fetching raw content for Transform: ${post.title} (ID: ${post.id})`);
        topicRawContent = await firstValueFrom(this.discourseService.getTopicRaw(post.id));
      }

      if (!topicRawContent) {
        throw new Error('Failed to fetch topic content from Discourse');
      }

      const githubRepoUrl = this.extractGitHubRepoUrl(topicRawContent);
      if (!githubRepoUrl) {
        throw new Error('Could not find GitHub repository link in topic content. Please ensure the topic contains a "Repository Link" field.');
      }

      console.log(`GitHub repository URL extracted: ${githubRepoUrl}`);

      this.showMessage(`Fetching transform files from GitHub...`, 'info');

      // List all JSON files in the repository
      const filesResult = await this.apiFactory.getApi().listGitHubJsonFiles(githubRepoUrl);

      if (!filesResult.success || !filesResult.files || filesResult.files.length === 0) {
        throw new Error(filesResult.error || 'No JSON transform files found in repository');
      }

      console.log(`Found ${filesResult.files.length} JSON file(s) in repository`);

      // Get existing transforms to check for duplicates
      this.showMessage(`Checking for existing transforms...`, 'info');
      const existingTransformsResponse = await this.sdkService.listTransforms();
      const existingTransformNames = new Set(
        existingTransformsResponse.data.map((tf: any) => tf.name as string)
      );

      const createdTransforms: Array<{ name: string; id: string }> = [];
      const errors: string[] = [];
      const skipped: string[] = [];

      // Process each JSON file
      for (const file of filesResult.files) {
        try {
          if (!file.download_url) {
            console.warn(`Skipping ${file.name}: no download URL available`);
            continue;
          }

          this.showMessage(`Processing transform: ${file.name}...`, 'info');
          console.log(`Fetching content for ${file.name}`);

          // Get the file content
          const contentResult = await this.apiFactory.getApi().getGitHubFileContent(
            file.download_url,
            file.name
          );

          if (!contentResult.success || !contentResult.content) {
            console.error(`Failed to fetch ${file.name}: ${contentResult.error}`);
            errors.push(`${file.name}: ${contentResult.error || 'Failed to fetch content'}`);
            continue;
          }

          // Parse the JSON content
          let transformData;
          try {
            transformData = JSON.parse(contentResult.content);
          } catch (parseError) {
            console.error(`Failed to parse ${file.name}:`, parseError);
            errors.push(`${file.name}: Invalid JSON format`);
            continue;
          }

          // Check if transform with this name already exists
          const transformName = (transformData.name || file.name) as string;
          if (existingTransformNames.has(transformName)) {
            console.log(`Transform "${transformName}" already exists, skipping`);
            skipped.push(transformName);
            continue;
          }

          // Create the transform using the SDK
          console.log(`Creating transform from ${file.name}`);
          const response = await this.sdkService.createTransform({
            transformV2025: transformData
          });

          // Check if the response indicates an error (status >= 400)
          if (response.status >= 400) {
            throw new Error(response.statusText || 'Transform creation failed');
          }

          if (response.data) {
            const name = response.data.name || file.name;
            const id = response.data.id || 'unknown';
            console.log(`Successfully created transform: ${name} (ID: ${id})`);
            createdTransforms.push({ name, id });
          }
        } catch (fileError: any) {
          console.error(`Error processing ${file.name}:`, fileError);
          
          // Extract error message from Axios error structure or response
          let errorMsg = 'Unknown error';
          
          // Check if it's an error from the SDK response status check
          if (fileError.message && !fileError.response) {
            errorMsg = fileError.message;
          }
          // Check if it's an Axios error with response data
          else if (fileError.response?.data) {
            const responseData = fileError.response.data;
            
            // Check for ISC API error format
            if (responseData.messages && Array.isArray(responseData.messages) && responseData.messages.length > 0) {
              errorMsg = responseData.messages.map((m: any) => (m.text || m.message) as string).join(', ');
            } else if (responseData.message) {
              errorMsg = responseData.message;
            } else if (responseData.error) {
              errorMsg = responseData.error;
            }
          } else if (fileError.message) {
            errorMsg = fileError.message;
          }
          
          // Check if it's a duplicate name error
          if (errorMsg.toLowerCase().includes('name') && errorMsg.toLowerCase().includes('unique')) {
            errors.push(`${file.name}: A transform with this name already exists. Please delete the existing transform first.`);
          } else {
            errors.push(`${file.name}: ${errorMsg}`);
          }
        }
      }

      // Show results
      if (createdTransforms.length > 0) {
        const transformDetails = createdTransforms.map(tf => `${tf.name} (${tf.id})`).join(', ');
        
        // Show success dialog
        this.dialog.open(DeploymentSuccessDialogComponent, {
          width: '700px',
          data: {
            connectorName: `${createdTransforms.length} Transform${createdTransforms.length > 1 ? 's' : ''}`,
            connectorId: transformDetails,
            version: undefined,
            deploymentType: 'transform'
          } as DeploymentSuccessData
        });

        let message = `Successfully deployed ${createdTransforms.length} transform${createdTransforms.length > 1 ? 's' : ''} from "${post.title}"`;
        if (skipped.length > 0) {
          message += `. Skipped ${skipped.length} existing transform${skipped.length > 1 ? 's' : ''}: ${skipped.join(', ')}`;
        }
        this.showMessage(message, 'success');
      }

      if (skipped.length > 0 && createdTransforms.length === 0) {
        // Show dialog for skipped transforms
        this.dialog.open(DeploymentErrorDialogComponent, {
          width: '600px',
          data: {
            title: 'Transforms Already Exist',
            message: 'All transforms from this repository already exist in your environment.',
            details: `The following transform${skipped.length > 1 ? 's' : ''} already exist${skipped.length === 1 ? 's' : ''}:\n\n${skipped.join('\n')}\n\nPlease delete the existing transform${skipped.length > 1 ? 's' : ''} first if you want to redeploy.`
          } as DeploymentErrorData
        });
      }

      if (errors.length > 0) {
        const errorMessage = `Some transforms failed to deploy:\n${errors.join('\n')}`;
        console.error(errorMessage);
        
        // Show error dialog
        this.dialog.open(DeploymentErrorDialogComponent, {
          width: '600px',
          data: {
            title: 'Transform Deployment Failed',
            message: createdTransforms.length === 0 && skipped.length === 0
              ? 'Failed to deploy transforms. See details below.'
              : `Deployed ${createdTransforms.length} transform(s) successfully, but ${errors.length} failed.`,
            details: errors.join('\n\n')
          } as DeploymentErrorData
        });
        
        if (createdTransforms.length === 0 && skipped.length === 0) {
          throw new Error(errorMessage);
        }
      }

      if (createdTransforms.length === 0 && errors.length === 0 && skipped.length === 0) {
        throw new Error('No transforms were deployed');
      }

    } catch (error: any) {
      console.error('Error deploying Transform:', error);
      this.showMessage(`Failed to deploy Transform: ${error.message || error}`, 'error');
      throw error;
    }
  }

  /**
   * Clear the deploying state for a category's section
   */
  private clearDeployingState(category: ColabCategory): void {
    const section = this.sections?.find(s => s.category.id === category);
    if (section) {
      section.clearDeployingState();
    }
  }

  /**
   * Show a snackbar message
   */
  private showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    const panelClass = {
      success: 'snackbar-success',
      error: 'snackbar-error',
      warning: 'snackbar-warning',
      info: 'snackbar-info'
    };

    this.snackBar.open(message, 'Dismiss', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [panelClass[type]]
    });
  }

  /**
   * Open the getting started guide
   */
  openGettingStarted(): void {
    window.open('https://developer.sailpoint.com/discuss/t/developer-community-colab-getting-started-guide/11230', '_blank');
  }

  trackByCategory(index: number, category: CategoryDisplay): string {
    return category.id;
  }

  /**
   * Get limit for category based on expansion state
   */
  getLimitFor(category: ColabCategory): number | undefined {
    return this.expandedCategories.has(category) ? undefined : 5;
  }

  /**
   * Check if category is expanded
   */
  isExpanded(category: ColabCategory): boolean {
    return this.expandedCategories.has(category);
  }

  /**
   * Handle search input changes - triggers debounced search
   */
  onSearchChange(term: string): void {
    this.searchTerm = term;
    const trimmed = term.trim();

    if (trimmed.length < 2) {
      this.searchResults = [];
      this.searchError = null;
      this.searching = false;
      return;
    }

    this.searching = true;
    this.searchError = null;
    this.searchSubject.next(trimmed);
  }

  /**
   * Perform the actual search after debounce
   */
  private async performSearch(term: string): Promise<void> {
    try {
      await this.ensureSearchCache();
      this.applySearch(term);
    } catch (error) {
      console.error('Search error:', error);
      this.searchError = 'Failed to search CoLab items. Please try again.';
      this.searchResults = [];
    } finally {
      this.searching = false;
    }
  }

  /**
   * Ensure we have cached all posts for search across categories
   * Uses sequential loading with delays to avoid rate limiting
   */
  private async ensureSearchCache(): Promise<void> {
    // If already cached, return immediately
    if (this.searchCache.size === this.categories.length) {
      return;
    }

    // If caching is already in progress, wait for it
    if (this.isCachingInProgress) {
      // Wait for caching to complete (poll every 200ms)
      while (this.isCachingInProgress) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      return;
    }

    this.isCachingInProgress = true;

    try {
      // Load categories sequentially with delays to avoid rate limiting
      for (let i = 0; i < this.categories.length; i++) {
        const category = this.categories[i];
        
        // Skip if already cached
        if (this.searchCache.has(category.id)) {
          continue;
        }

        try {
          // Add delay between requests (except for first one)
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay between requests
          }

          const posts = await firstValueFrom(
            this.discourseService.getPostsByCategory(category.id)
          );
          this.searchCache.set(category.id, posts ?? []);
        } catch (error: any) {
          // Handle 429 (Too Many Requests) errors
          if (error?.status === 429 || error?.message?.includes('429')) {
            console.warn(`Rate limited for category ${category.id}, waiting longer...`);
            // Wait longer before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Retry once
            try {
              const posts = await firstValueFrom(
                this.discourseService.getPostsByCategory(category.id)
              );
              this.searchCache.set(category.id, posts ?? []);
            } catch (retryError) {
              console.error(`Failed to load category ${category.id} after retry:`, retryError);
              this.searchCache.set(category.id, []); // Set empty array to mark as attempted
            }
          } else {
            console.error(`Error loading category ${category.id}:`, error);
            this.searchCache.set(category.id, []); // Set empty array to mark as attempted
          }
        }
      }
    } finally {
      this.isCachingInProgress = false;
    }
  }

  /**
   * Filter cached posts based on term
   */
  private applySearch(term: string): void {
    const lower = term.toLowerCase();
    const results: Array<{ post: ColabPost; category: ColabCategory }> = [];

    for (const [category, posts] of this.searchCache.entries()) {
      for (const post of posts) {
        const haystack = `${post.title} ${post.excerpt} ${post.tags?.join(' ')}`.toLowerCase();
        if (haystack.includes(lower)) {
          results.push({ post, category });
        }
      }
    }

    this.searchResults = results;
  }

  /**
   * Check if a category supports deployment
   */
  isDeployable(category: ColabCategory): boolean {
    return this.discourseService.isDeployableCategory(category);
  }
}
