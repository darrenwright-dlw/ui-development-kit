import { ipcMain } from 'electron';
import { uploadConnectorFromGitHub } from './connector';

export function setupConnectorHandlers() {
  ipcMain.handle('upload-connector', async (event, githubRepoUrl: string, connectorAlias?: string) => {
    return uploadConnectorFromGitHub(githubRepoUrl, connectorAlias);
  });
}

