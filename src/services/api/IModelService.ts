import { BaseAPIClient } from "../base/BaseAPIClient";
import { API_CONFIG } from "../config/api.config";
import type {
  IModel,
  IModelsResponse,
  SingleIModelResponse,
  CreateIModelRequest,
  UpdateIModelRequest,
  Changeset,
  ChangesetsResponse,
  NamedVersion,
  NamedVersionsResponse,
  NamedVersionDetailResponse,
} from "../types";

// Lightweight response type definitions for endpoints where we previously used 'any'
interface Async202Response {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  location: string | null;
  operationLocation: string | null;
  body: unknown;
}

interface CheckpointDownloadResponse {
  checkpoint?: {
    _links?: {
      download?: { href: string };
    };
  };
}

interface ChangesetDetailResponse {
  changeset?: {
    _links?: {
      currentOrPrecedingCheckpoint?: { href: string };
      download?: { href: string };
    };
  };
  _links?: {
    download?: { href: string };
  };
}

interface NamedVersionCreateResponse {
  namedVersion?: {
    id: string;
    name?: string;
  };
}

class IModelService extends BaseAPIClient {
  private get iModelsHeaders() {
    return {
      Accept: "application/vnd.bentley.itwin-platform.v2+json",
    };
  }

  /**
   * Extract user ID from creator href URL
   * @param creatorHref - The creator href from iModel._links.creator.href
   * @returns User ID or undefined if not found
   */
  private extractUserIdFromCreatorHref(creatorHref: string): string | undefined {
    try {
      // Extract user ID from URL like: https://api.bentley.com/imodels/{iModelId}/users/{userId}
  const match = creatorHref.match(/\/users\/([^/]+)$/); // simplified (removed unnecessary escapes)
      return match ? match[1] : undefined;
    } catch (error) {
      console.warn('Failed to extract user ID from creator href:', creatorHref, error);
      return undefined;
    }
  }

  /**
   * Enrich iModels with creator information from access control API
   * @param iModels - Array of iModels to enrich
   * @param iTwinId - The iTwin ID to fetch user information from
   * @returns iModels enriched with creator names
   */
  async enrichWithCreatorInfo(iModels: IModel[], iTwinId: string): Promise<IModel[]> {
    try {
      if (iModels.length === 0) return iModels;
      
      // Import access control service dynamically to avoid circular dependencies
      const { accessControlService } = await import('../');
      
      // Get all iTwin members once
      const members = await accessControlService.getiTwinUserMembers(iTwinId);
      if (!members) {
        console.warn('No members found for iTwin:', iTwinId);
        return iModels;
      }
      
      // Create a map for quick user lookup
      const userMap = new Map(members.map(member => [member.id, member]));
      
      // Enrich each iModel with creator information
      return iModels.map(iModel => {
        // Check if _links and creator exist
        if (!iModel._links || !iModel._links.creator) {
          return iModel;
        }
        
        const creatorHref = iModel._links.creator.href;
        if (!creatorHref) return iModel;
        
        const creatorId = this.extractUserIdFromCreatorHref(creatorHref);
        if (!creatorId) return iModel;
        
        const creator = userMap.get(creatorId);
        if (!creator) return { ...iModel, creatorId };
        
        const creatorName = [creator.givenName, creator.surname]
          .filter(Boolean)
          .join(' ') || creator.email || 'Unknown User';
        
        return {
          ...iModel,
          creatorId,
          creatorName
        };
      });
    } catch (error) {
      console.warn('Failed to enrich iModels with creator info:', error);
      return iModels;
    }
  }

  /**
   * Get iModels for a specific iTwin
   * @param iTwinId - The iTwin ID to get iModels for
   * @param top - Number of iModels to return (pagination)
   * @param skip - Number of iModels to skip (pagination)
   */
  async getIModels(iTwinId?: string, top?: number, skip?: number): Promise<IModelsResponse> {
    return this.fetch<IModelsResponse>(
      API_CONFIG.ENDPOINTS.IMODELS.GET_IMODELS(iTwinId, top, skip),
      { headers: this.iModelsHeaders }
    );
  }

  /**
   * Get all iModels for a specific iTwin (with pagination)
   * @param iTwinId - The iTwin ID to get iModels for
   * @param includeDetails - Whether to fetch individual iModel details for complete information
   * @param includeCreator - Whether to enrich with creator information from access control API
   */
  async getAllIModels(iTwinId: string, includeDetails: boolean = false, includeCreator: boolean = false): Promise<IModel[]> {
    const allIModels: IModel[] = [];
    let nextUrl: string | undefined = API_CONFIG.ENDPOINTS.IMODELS.GET_IMODELS(iTwinId);

    while (nextUrl) {
      const response: IModelsResponse | null = await this.fetch<IModelsResponse>(
        nextUrl,
        { headers: this.iModelsHeaders }
      );
      
      if (!response) {
        console.warn('Received empty response while paging iModels for iTwin', iTwinId, 'url:', nextUrl);
        break; // abort paging loop to avoid infinite loop / null deref
      }

      if (includeDetails) {
        // Fetch individual details for each iModel to get complete information
        const detailedIModels = await Promise.all(
          response.iModels.map(async (iModel) => {
            try {
              const detailResponse = await this.getIModel(iModel.id);
              return detailResponse.iModel;
            } catch (error) {
              console.warn(`Failed to fetch details for iModel ${iModel.id}:`, error);
              return iModel; // Fallback to list version
            }
          })
        );
        allIModels.push(...detailedIModels);
      } else {
        allIModels.push(...response.iModels);
      }
      
      // Extract next URL from response links
      const nextLink: string | undefined = response._links.next?.href;
      if (nextLink) {
        // Extract path from full URL
        const url: URL = new URL(nextLink);
        nextUrl = url.pathname + url.search;
      } else {
        nextUrl = undefined;
      }
    }

    // Enrich with creator information if requested
    if (includeCreator && allIModels.length > 0) {
      return await this.enrichWithCreatorInfo(allIModels, iTwinId);
    }

    return allIModels;
  }

  /**
   * Get a specific iModel by ID
   * @param iModelId - The iModel ID
   */
  async getIModel(iModelId: string): Promise<SingleIModelResponse> {
    return this.fetch<SingleIModelResponse>(
      API_CONFIG.ENDPOINTS.IMODELS.GET_IMODEL(iModelId),
      { headers: this.iModelsHeaders }
    );
  }

  /**
   * Create a new iModel
   * @param createRequest - The iModel creation request
   */
  async createIModel(createRequest: CreateIModelRequest): Promise<SingleIModelResponse> {
    return this.fetch<SingleIModelResponse>(
      API_CONFIG.ENDPOINTS.IMODELS.CREATE_IMODEL,
      {
        method: 'POST',
        headers: {
          ...this.iModelsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createRequest),
      }
    );
  }

  /**
   * Update an existing iModel
   * @param iModelId - The iModel ID
   * @param updateRequest - The iModel update request (can be UpdateIModelRequest or simple object with displayName/description)
   */
  async updateIModel(iModelId: string, updateRequest: UpdateIModelRequest | { displayName?: string; description?: string }): Promise<SingleIModelResponse | IModel> {
    const response = await this.fetch<SingleIModelResponse>(
      API_CONFIG.ENDPOINTS.IMODELS.UPDATE_IMODEL(iModelId),
      {
        method: 'PATCH',
        headers: {
          ...this.iModelsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateRequest),
      }
    );
    return response.iModel || response;
  }

  /**
   * Delete an iModel
   * @param iModelId - The iModel ID
   */
  async deleteIModel(iModelId: string): Promise<void> {
    await this.fetch<void>(
      API_CONFIG.ENDPOINTS.IMODELS.DELETE_IMODEL(iModelId),
      { 
        method: 'DELETE',
        headers: this.iModelsHeaders
      }
    );
  }

  /**
   * Clone an existing iModel
   * @param sourceIModelId - The ID of the iModel to clone
   * @param cloneRequest - The clone request data
   */
  async cloneIModel(sourceIModelId: string, cloneRequest: { displayName: string; name?: string; description?: string; iTwinId: string }): Promise<Async202Response | Record<string, unknown>> {
    try {
      console.log('Cloning iModel:', { sourceIModelId, cloneRequest });
      
      // Prepare the request body with the correct field names as per API docs
      const requestBody = {
        iTwinId: cloneRequest.iTwinId,
        ...(cloneRequest.name && { name: cloneRequest.name }),
        ...(cloneRequest.description && { description: cloneRequest.description })
      };
      
      console.log('Clone request body:', requestBody);
      
      const response = await this.fetch<Async202Response | Record<string, unknown>>(
        API_CONFIG.ENDPOINTS.IMODELS.CLONE_IMODEL(sourceIModelId),
        {
          method: 'POST',
          headers: {
            ...this.iModelsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );
      
      console.log('Clone response:', response);
      
      // The clone API returns 202 Accepted with headers pointing to operation status
      if (response && response.status === 202) {
        return {
          success: true,
          message: 'iModel clone operation started successfully',
          status: response.status,
          location: response.location,
          operationLocation: response.operationLocation
        };
      }
      
      return response;
    } catch (error) {
      console.error('Clone iModel error:', error);
      throw error;
    }
  }

  /**
   * Get changesets for an iModel
   * @param iModelId - The iModel ID
   * @param iTwinId - The iTwin ID for creator enrichment
   * @returns List of changesets
   */
  async getChangesets(iModelId: string, iTwinId?: string): Promise<Changeset[]> {
    try {
      const response = await this.fetch<ChangesetsResponse>(
        API_CONFIG.ENDPOINTS.IMODELS.GET_CHANGESETS(iModelId),
        {
          headers: this.iModelsHeaders
        }
      );

      if (!response) {
        console.warn('No changesets response for iModel', iModelId);
        return [];
      }

      let changesets = response.changesets || [];

      // Enrich with creator information if iTwinId is provided
      if (iTwinId && changesets.length > 0) {
        changesets = await this.enrichChangesetsWithCreatorInfo(changesets, iTwinId);
      }

      return changesets;
    } catch (error) {
      console.error('Failed to fetch changesets:', error);
      throw error;
    }
  }

  /**
   * Get named versions for an iModel
   * @param iModelId - The iModel ID
   * @param iTwinId - The iTwin ID for creator enrichment
   * @returns List of named versions
   */
  async getNamedVersions(iModelId: string, iTwinId?: string): Promise<NamedVersion[]> {
    try {
      const endpoint = API_CONFIG.ENDPOINTS.IMODELS.GET_NAMED_VERSIONS(iModelId);
      console.log('Fetching named versions list for iModel:', iModelId);
      console.log('API endpoint URL:', `${API_CONFIG.BASE_URL}${endpoint}`);
      
      // First get the list of named versions
      const response = await this.fetch<NamedVersionsResponse>(
        endpoint,
        {
          headers: this.iModelsHeaders
        }
      );

      console.log('Raw named versions list response:', JSON.stringify(response, null, 2));
      if (!response) {
        console.warn('Named versions response was empty for iModel', iModelId);
        return [];
      }
      const namedVersionsList = response.namedVersions || [];
      console.log('Named versions count:', namedVersionsList.length);

      if (namedVersionsList.length === 0) {
        console.log('No named versions found');
        return [];
      }

      // Fetch detailed information for each named version
      console.log('Fetching detailed information for each named version...');
      const detailedNamedVersions = await Promise.all(
        namedVersionsList.map(async (nv) => {
          try {
            const detailResponse = await this.fetch<NamedVersionDetailResponse>(
              API_CONFIG.ENDPOINTS.IMODELS.GET_NAMED_VERSION_DETAILS(iModelId, nv.id),
              {
                headers: this.iModelsHeaders
              }
            );
            console.log(`Detailed info for ${nv.displayName}:`, JSON.stringify(detailResponse.namedVersion, null, 2));
            return detailResponse.namedVersion;
          } catch (error) {
            console.error(`Failed to fetch details for named version ${nv.id}:`, error);
            return nv; // Fall back to basic info
          }
        })
      );

      let namedVersions = detailedNamedVersions;

      // Enrich with creator information if iTwinId is provided
      if (iTwinId && namedVersions.length > 0) {
        console.log('Starting enrichment with iTwinId:', iTwinId);
        namedVersions = await this.enrichNamedVersionsWithCreatorInfo(namedVersions, iTwinId);
      }

      console.log('Final named versions after enrichment:', namedVersions);
      return namedVersions;
    } catch (error) {
      console.error('Failed to fetch named versions:', error);
      throw error;
    }
  }

  /**
   * Enrich changesets with creator information from access control API
   * @param changesets - Array of changesets to enrich
   * @param iTwinId - The iTwin ID to fetch user information from
   * @returns Changesets enriched with creator names
   */
  private async enrichChangesetsWithCreatorInfo(changesets: Changeset[], iTwinId: string): Promise<Changeset[]> {
    try {
      // Import access control service dynamically to avoid circular dependencies
      const { accessControlService } = await import('../');
      
      // Get all iTwin members once
      const members = await accessControlService.getiTwinUserMembers(iTwinId);
      if (!members) {
        console.warn('No members found for iTwin:', iTwinId);
        return changesets;
      }

      // Create a map of user IDs to names for fast lookup
      const userIdToName = new Map<string, string>();
      members.forEach(member => {
        if (member.id) {
          // Create display name from givenName and surname
          const displayName = [member.givenName, member.surname]
            .filter(Boolean)
            .join(' ') || member.email || 'Unknown User';
          userIdToName.set(member.id, displayName);
        }
      });

      // Enrich each changeset
      return changesets.map(changeset => {
        const creatorId = changeset._links?.creator?.href ? 
          this.extractUserIdFromCreatorHref(changeset._links.creator.href) : undefined;
        
        const enrichedChangeset: Changeset = {
          ...changeset,
          creatorId,
          creatorName: creatorId && userIdToName.has(creatorId) ? 
            userIdToName.get(creatorId) : creatorId || 'Unknown'
        };

        return enrichedChangeset;
      });
    } catch (error) {
      console.error('Failed to enrich changesets with creator info:', error);
      return changesets; // Return original data if enrichment fails
    }
  }

  /**
   * Enrich named versions with creator information from access control API
   * @param namedVersions - Array of named versions to enrich
   * @param iTwinId - The iTwin ID to fetch user information from
   * @returns Named versions enriched with creator names
   */
  private async enrichNamedVersionsWithCreatorInfo(namedVersions: NamedVersion[], iTwinId: string): Promise<NamedVersion[]> {
    try {
      console.log('Enriching named versions with creator info:', namedVersions);
      
      // Import access control service dynamically to avoid circular dependencies
      const { accessControlService } = await import('../');
      
      // Get all iTwin members once
      const members = await accessControlService.getiTwinUserMembers(iTwinId);
      if (!members) {
        console.warn('No members found for iTwin:', iTwinId);
        return namedVersions;
      }
      
      console.log('Found iTwin members:', members.length);

      // Create a map of user IDs to names for fast lookup
      const userIdToName = new Map<string, string>();
      members.forEach(member => {
        if (member.id) {
          // Create display name from givenName and surname
          const displayName = [member.givenName, member.surname]
            .filter(Boolean)
            .join(' ') || member.email || 'Unknown User';
          userIdToName.set(member.id, displayName);
        }
      });

      // Enrich each named version
      return namedVersions.map(namedVersion => {
        console.log('Processing named version:', namedVersion.displayName, namedVersion._links);
        
        const creatorId = namedVersion._links?.creator?.href ? 
          this.extractUserIdFromCreatorHref(namedVersion._links.creator.href) : undefined;
          
        console.log('Extracted creator ID:', creatorId);
        
        const enrichedNamedVersion: NamedVersion = {
          ...namedVersion,
          creatorId,
          creatorName: creatorId && userIdToName.has(creatorId) ? 
            userIdToName.get(creatorId) : creatorId || 'Unknown'
        };

        console.log('Enriched named version:', enrichedNamedVersion.displayName, 'Creator:', enrichedNamedVersion.creatorName);
        return enrichedNamedVersion;
      });
    } catch (error) {
      console.error('Failed to enrich named versions with creator info:', error);
      return namedVersions; // Return original data if enrichment fails
    }
  }

  /**
   * Download an iModel at a specific changeset using the iModel download endpoint with changeset parameter
   * @param iModelId - The iModel ID
   * @param changesetIndex - The changeset index to download at
   * @param fileName - Optional filename for the download
   */
  async downloadIModelAtChangeset(iModelId: string, changesetIndex: number, fileName?: string): Promise<void> {
    try {
      console.log('Downloading full iModel at changeset index:', iModelId, changesetIndex);
      
      // Method 1: Try to get checkpoint (full iModel at specific changeset state)
      console.log('Attempting to get checkpoint download URL for full iModel...');
      
      try {
        const checkpointUrl = `/imodels/${iModelId}/changesets/${changesetIndex}/checkpoint`;
        const checkpointResponse = await this.fetch<CheckpointDownloadResponse | null>(checkpointUrl, {
          headers: this.iModelsHeaders
        });
        
        console.log('Checkpoint response:', JSON.stringify(checkpointResponse, null, 2));
        
        // Check if the response contains download links
        if (checkpointResponse?.checkpoint?._links?.download?.href) {
          const downloadUrl = checkpointResponse.checkpoint._links.download.href;
          console.log('✅ Found checkpoint download URL (full iModel):', downloadUrl);
          
          // Use direct navigation to download
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = fileName || `imodel-${iModelId}-checkpoint-${changesetIndex}.bim`;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          console.log('✅ Full iModel checkpoint download initiated successfully');
          return;
        } else {
          console.log('No direct download link in checkpoint response');
        }
      } catch (error) {
        console.warn('Direct checkpoint approach failed:', error);
      }

      // Method 2: Get changeset details and look for checkpoint link
      console.log('Getting changeset details to find checkpoint reference...');
      
      const changesetResponse = await this.fetch<ChangesetDetailResponse | null>(
        `/imodels/${iModelId}/changesets/${changesetIndex}`,
        {
          headers: this.iModelsHeaders
        }
      );
      
      console.log('Changeset details response:', JSON.stringify(changesetResponse, null, 2));

      // Check for checkpoint link in changeset response
      if (changesetResponse?.changeset?._links?.currentOrPrecedingCheckpoint?.href) {
        console.log('Found checkpoint reference in changeset response');
        
        try {
          // Extract the checkpoint endpoint from the full URL
          const checkpointFullUrl = changesetResponse.changeset._links.currentOrPrecedingCheckpoint.href;
          const checkpointPath = checkpointFullUrl.replace('https://api.bentley.com', '');
          
          const checkpointDetailResponse = await this.fetch<CheckpointDownloadResponse | null>(checkpointPath, {
            headers: this.iModelsHeaders
          });
          
          console.log('Checkpoint detail response:', JSON.stringify(checkpointDetailResponse, null, 2));
          
          if (checkpointDetailResponse?.checkpoint?._links?.download?.href) {
            const downloadUrl = checkpointDetailResponse.checkpoint!._links!.download!.href;
            console.log('✅ Found checkpoint download URL via changeset reference:', downloadUrl);
            
            // Use direct navigation to download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName || `imodel-${iModelId}-checkpoint-${changesetIndex}.bim`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('✅ Full iModel checkpoint download initiated via changeset reference');
            return;
          }
        } catch (checkpointError) {
          console.warn('Failed to get checkpoint via changeset reference:', checkpointError);
        }
      }

      // Method 3: Fall back to changeset download (this gives you the delta, not full iModel)
      console.log('⚠️ Falling back to changeset download (delta only)...');
      console.warn('⚠️ This will download the changeset file (.cs) instead of the full iModel (.bim)');
      console.warn('⚠️ Changeset files contain only the changes, not the complete iModel');
      console.warn('⚠️ To get the full iModel, you need checkpoint data which may not be available for this changeset');

      // Look for download link in the changeset response
      let downloadUrl: string | null = null;
      
      if (changesetResponse?.changeset?._links?.download?.href) {
        downloadUrl = changesetResponse.changeset._links.download.href;
      } else if (changesetResponse?._links?.download?.href) {
        downloadUrl = changesetResponse._links.download.href;
      }
      
      if (!downloadUrl) {
        throw new Error('No download link found. The API responses have been logged to console for debugging.');
      }
      
      console.log('Found changeset download URL (delta only):', downloadUrl);
      
      // Use direct navigation to download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || `changeset-${changesetIndex}.cs`; // Use .cs extension for changeset
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('⚠️ Changeset download initiated - this is the delta, not the full iModel');
    } catch (error) {
      console.error('Failed to download:', error);
      throw error;
    }
  }

  /**
   * Create a new named version for an iModel
   * @param iModelId - The iModel ID
   * @param changesetId - The changeset ID to create the named version at
   * @param name - The name for the named version
   * @param description - Optional description for the named version
   */
  async createNamedVersion(
    iModelId: string,
    changesetId: string,
    name: string,
    description?: string
  ): Promise<void> {
    try {
      console.log('Creating named version:', { iModelId, changesetId, name, description });

      const namedVersionData = {
        name,
        description: description || '',
        changesetId
      };

      const response = await this.fetch<NamedVersionCreateResponse | null>(
        `/imodels/${iModelId}/namedversions`,
        {
          method: 'POST',
          headers: {
            ...this.iModelsHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(namedVersionData)
        }
      );

      console.log('Named version created successfully:', response);
    } catch (error) {
      console.error('Failed to create named version:', error);
      throw error;
    }
  }
}

export const iModelService = new IModelService();