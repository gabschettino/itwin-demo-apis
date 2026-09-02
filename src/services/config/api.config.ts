export const API_CONFIG = {
  BASE_URL: "https://api.bentley.com",
  DEFAULT_HEADERS: {
    Accept: "application/vnd.bentley.itwin-platform.v1+json",
  },
  ENDPOINTS: {
    // Core iTwin endpoints
    ITWINS: "/itwins",
    
    // iModels endpoints
    IMODELS: {
      GET_IMODELS: (iTwinId?: string, top?: number, skip?: number) => {
        const params = new URLSearchParams();
        if (iTwinId) params.append('iTwinId', iTwinId);
        if (typeof top === 'number') params.append('$top', top.toString());
        if (typeof skip === 'number') params.append('$skip', skip.toString());
        // Request additional fields that might not be included by default
        params.append('$select', 'id,displayName,name,description,state,dataCenterLocation,createdDateTime,iTwinId,isSecured,extent,geographicCoordinateSystem,_links');
        return `/imodels${params.toString() ? `?${params.toString()}` : ''}`;
      },
      GET_IMODEL: (iModelId: string) => `/imodels/${iModelId}`,
      CREATE_IMODEL: '/imodels',
      UPDATE_IMODEL: (iModelId: string) => `/imodels/${iModelId}`,
      DELETE_IMODEL: (iModelId: string) => `/imodels/${iModelId}`,
      CLONE_IMODEL: (iModelId: string) => `/imodels/${iModelId}/clone`,
      GET_CHANGESETS: (iModelId: string, top?: number, skip?: number) => {
        const params = new URLSearchParams();
        if (typeof top === 'number') params.append('$top', top.toString());
        if (typeof skip === 'number') params.append('$skip', skip.toString());
        return `/imodels/${iModelId}/changesets${params.toString() ? `?${params.toString()}` : ''}`;
      },
      GET_NAMED_VERSIONS: (iModelId: string, top?: number, skip?: number) => {
        const params = new URLSearchParams();
        if (typeof top === 'number') params.append('$top', top.toString());
        if (typeof skip === 'number') params.append('$skip', skip.toString());
        return `/imodels/${iModelId}/namedversions${params.toString() ? `?${params.toString()}` : ''}`;
      },
      GET_NAMED_VERSION_DETAILS: (iModelId: string, namedVersionId: string) => `/imodels/${iModelId}/namedversions/${namedVersionId}`,
      GET_CHANGESET_DETAILS: (iModelId: string, changesetId: string) => `/imodels/${iModelId}/changesets/${changesetId}`,
      // iTwin Platform uses a separate download API
      DOWNLOAD_CHANGESET: (iModelId: string, changesetIndex: number) => `/download/imodels/${iModelId}/changesets/${changesetIndex}`,
    },
    
    // Reality Modeling endpoints
    CONTEXT_CAPTURE: {
      WORKSPACES: "/contextcapture/workspaces",
      JOBS: "/contextcapture/jobs",
    },
    
    // Access Control endpoints
    ACCESS_CONTROL: {
      MEMBERS: (iTwinId: string) => `/accesscontrol/itwins/${iTwinId}/members/users`,
      MEMBER: (iTwinId: string, memberId: string) => `/accesscontrol/itwins/${iTwinId}/members/users/${memberId}`,
      ROLES: (iTwinId: string) => `/accesscontrol/itwins/${iTwinId}/roles`,
      ROLE: (iTwinId: string, roleId: string) => `/accesscontrol/itwins/${iTwinId}/roles/${roleId}`,
      ALL_PERMISSIONS: '/accesscontrol/itwins/permissions',
    },

    // Synchronization endpoints
    SYNCHRONIZATION: {
    // Generic connections (listing)
      CONNECTIONS: '/synchronization/imodels/connections',
      MANIFEST_CONNECTIONS: '/synchronization/imodels/manifestconnections',
      MANIFEST_CONNECTION: (connectionId: string) => `/synchronization/imodels/manifestconnections/${connectionId}`,
      MANIFEST_RUNS: (connectionId: string) => `/synchronization/imodels/manifestconnections/${connectionId}/runs`,
      MANIFEST_RUN: (connectionId: string, runId: string) => `/synchronization/imodels/manifestconnections/${connectionId}/runs/${runId}`,
      REPORTS: (iModelId: string, runId: string, taskId?: string) => `/synchronization/reports?imodelId=${iModelId}&runId=${runId}${taskId ? `&taskId=${taskId}`: ''}`,
      // Storage Connections
      STORAGE_CONNECTIONS: '/synchronization/imodels/storageconnections',
      STORAGE_CONNECTION_SOURCEFILES: (connectionId: string) => `/synchronization/imodels/storageconnections/${connectionId}/sourcefiles`,
      STORAGE_CONNECTION_RUN: (connectionId: string) => `/synchronization/imodels/storageconnections/${connectionId}/run`,
      STORAGE_CONNECTION_RUNS: (connectionId: string) => `/synchronization/imodels/storageconnections/${connectionId}/runs`,
      STORAGE_CONNECTION_RUN_ITEM: (connectionId: string, runId: string) => `/synchronization/imodels/storageconnections/${connectionId}/runs/${runId}`,
    },

    // Storage API endpoints
    STORAGE: {
      TOP_LEVEL: (iTwinId: string, top?: number, skip?: number) => `/storage/?iTwinId=${encodeURIComponent(iTwinId)}${typeof top === 'number' ? `&$top=${top}` : ''}${typeof skip === 'number' ? `&$skip=${skip}` : ''}`,
      FOLDER: (folderId: string) => `/storage/folders/${folderId}`,
      FOLDER_LIST: (folderId: string, top?: number, skip?: number) => `/storage/folders/${folderId}/list${typeof top === 'number' ? `?$top=${top}` : ''}${typeof skip === 'number' ? `${typeof top === 'number' ? '&' : '?'}$skip=${skip}` : ''}`,
      FOLDERS_IN_FOLDER: (folderId: string, top?: number, skip?: number) => `/storage/folders/${folderId}/folders${typeof top === 'number' ? `?$top=${top}` : ''}${typeof skip === 'number' ? `${typeof top === 'number' ? '&' : '?'}$skip=${skip}` : ''}`,
      FILES_IN_FOLDER: (folderId: string, top?: number, skip?: number) => `/storage/folders/${folderId}/files${typeof top === 'number' ? `?$top=${top}` : ''}${typeof skip === 'number' ? `${typeof top === 'number' ? '&' : '?'}$skip=${skip}` : ''}`,
      CREATE_FOLDER: (folderId: string) => `/storage/folders/${folderId}/folders`,
      CREATE_FILE: (folderId: string) => `/storage/folders/${folderId}/files`,
      FILE: (fileId: string) => `/storage/files/${fileId}`,
      FILE_COMPLETE: (fileId: string) => `/storage/files/${fileId}/complete`,
      FILE_UPDATE_CONTENT: (fileId: string) => `/storage/files/${fileId}/updatecontent`,
      FILE_DOWNLOAD: (fileId: string) => `/storage/files/${fileId}/download`,
      DELETE_FILE: (fileId: string) => `/storage/files/${fileId}`,
      DELETE_FOLDER: (folderId: string) => `/storage/folders/${folderId}`,
      RECYCLE_BIN: (iTwinId: string, top?: number, skip?: number) => `/storage/recyclebin?iTwinId=${encodeURIComponent(iTwinId)}${typeof top === 'number' ? `&$top=${top}` : ''}${typeof skip === 'number' ? `&$skip=${skip}` : ''}`,
      RESTORE_FILE: (fileId: string) => `/storage/recyclebin/files/${fileId}/restore`,
      RESTORE_FOLDER: (folderId: string) => `/storage/recyclebin/folders/${folderId}/restore`,
      LOCK_FOLDER: (folderId: string) => `/storage/folders/${folderId}/lock`,
      UNLOCK_FOLDER: (folderId: string) => `/storage/folders/${folderId}/unlock`,
      MOVE_FILE: (fileId: string) => `/storage/files/${fileId}/move`,
      MOVE_FOLDER: (folderId: string) => `/storage/folders/${folderId}/move`,
      SEARCH_IN_FOLDER: (folderId: string, name: string, top?: number, skip?: number) => `/storage/folders/${folderId}/search?name=${encodeURIComponent(name)}${typeof top === 'number' ? `&$top=${top}` : ''}${typeof skip === 'number' ? `&$skip=${skip}` : ''}`,
    },
  },
} as const;
