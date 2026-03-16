import { Injectable, signal } from '@angular/core';
import { ElectronApiFactoryService } from '../../services/electron-api-factory.service';
import { BackupObject, RestoreResult } from '../models/config-hub.models';

@Injectable({ providedIn: 'root' })
export class ConfigHubApiService {
  readonly restoring = signal(false);

  constructor(private factory: ElectronApiFactoryService) {}

  /**
   * Restore a single config object to the active SailPoint tenant.
   * Calls POST /v2025/sp-config/import with the object wrapped in the
   * sp-config export format expected by the API.
   */
  async restore(backupObject: BackupObject, objectContent: any): Promise<RestoreResult> {
    this.restoring.set(true);
    try {
      const api = this.factory.getApi();
      const payload = {
        description: `Restore ${backupObject.objectType} ${backupObject.name} via Config Hub`,
        includeTypes: [backupObject.objectType],
        objects: [
          {
            version: objectContent.version ?? 1,
            self: objectContent.self,
            object: objectContent.object,
          },
        ],
      };

      // The sp-config import endpoint expects a JSON body with the export format
      const result = await api.callSdkMethod('importConfig', payload);
      return {
        success: true,
        message: `Successfully queued restore for ${backupObject.objectType} "${backupObject.name}"`,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error during restore';
      return { success: false, error: msg };
    } finally {
      this.restoring.set(false);
    }
  }
}
