// Simple Azure Blob upload helper using a Container SAS URL
// NOTE: Browser upload requires CORS enabled on the storage account/container for the origin of this app.
// Provide a container SAS URL like: https://<account>.blob.core.windows.net/<container>?<SAS>
// A blob upload URL is constructed as: baseWithoutQuery + '/' + encodeURIComponent(fileName) + '?' + originalQuery

export interface AzureBlobUploadResult {
  success: boolean;
  status?: number;
  error?: string;
  blobUrl?: string; // direct blob URL without SAS query
}

export class AzureBlobService {
  /**
   * Upload a file/blob to Azure Blob Storage using a container SAS URL.
   * Reads the provided download URL (Storage API) into a Blob, then performs PUT to Azure.
   * @param containerSasUrl Full container SAS URL
   * @param sourceDownloadUrl The download URL of the IFC file (Bentley Storage)
   * @param targetFileName Desired blob file name
   */
  async uploadFromDownloadUrl(containerSasUrl: string, sourceDownloadUrl: string, targetFileName: string): Promise<AzureBlobUploadResult> {
    try {
      if (!containerSasUrl.includes('?')) {
        return { success: false, error: 'Container SAS URL must include query parameters (token).' };
      }
      // Fetch source file as blob
      const srcResp = await fetch(sourceDownloadUrl);
      if (!srcResp.ok) {
        return { success: false, status: srcResp.status, error: 'Failed to download source IFC file.' };
      }
      const data = await srcResp.blob();
      // Build upload URL
      const [base, query] = containerSasUrl.split('?');
      const uploadUrl = `${base.replace(/\/$/, '')}/${encodeURIComponent(targetFileName)}?${query}`;
      const putResp = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          // Required for Azure Blob REST in browser
          'x-ms-blob-type': 'BlockBlob',
          'x-ms-version': '2023-11-03',
          'Content-Type': data.type || 'application/octet-stream'
        },
        body: data
      });
      if (!putResp.ok) {
        // CORS failures often surface as status 0 or generic network error; attempt to provide guidance
        const corsHint = putResp.status === 0 ? 'Possible CORS rejection. Ensure Storage Account CORS allows origin, methods PUT/OPTIONS, and headers: x-ms-blob-type,x-ms-version,Content-Type.' : undefined;
        return { success: false, status: putResp.status, error: corsHint || `Azure upload failed (${putResp.status}).` };
      }
      const publicBlobUrl = `${base.replace(/\/$/, '')}/${encodeURIComponent(targetFileName)}`;
      return { success: true, status: putResp.status, blobUrl: publicBlobUrl };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      // Network / CORS errors typically appear here as TypeError: Failed to fetch
      const corsMsg = /Failed to fetch/i.test(msg) ? 'Upload blocked by CORS. Configure Azure Storage CORS for your dev origin (e.g., http://localhost:5173).' : undefined;
      return { success: false, error: corsMsg ? `${msg} • ${corsMsg}` : msg };
    }
  }
}

export const azureBlobService = new AzureBlobService();
