const { ipcRenderer: ipcMain } = require('electron');

export const connectorPreloader = {
  uploadConnector: (githubRepoUrl: string, connectorAlias?: string) => ipcMain.invoke('upload-connector', githubRepoUrl, connectorAlias),
};

