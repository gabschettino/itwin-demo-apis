export interface RealityDataSummary {
  id: string;
  displayName: string;
  type: string;
  // Optional extended fields when Prefer: return=representation
  dataset?: string;
  group?: string;
  description?: string;
  tags?: string[];
  rootDocument?: string;
  size?: number;
  classification?: string;
  dataCenterLocation?: string;
  modifiedDateTime?: string;
  lastAccessedDateTime?: string;
  createdDateTime?: string;
  ownerId?: string;
}

export interface RealityDataListResponse {
  realityData: RealityDataSummary[];
  _links?: {
    next?: { href: string };
  };
}

export interface RealityDataListParams {
  iTwinId?: string;
  continuationToken?: string;
  $top?: number;
  extent?: string; // "lonSW,latSW,lonNE,latNE"
  $orderBy?: string; // e.g., "displayName desc"
  $search?: string;
  types?: string; // comma-separated
  acquisitionDateTime?: string; // start/end
  createdDateTime?: string;
  modifiedDateTime?: string;
  lastAccessedDateTime?: string;
  ownerId?: string;
  dataCenter?: string;
  tag?: string;
}

// Creation
export interface CreateRealityDataRequest {
  iTwinId: string;
  displayName: string;
  type: string; // e.g. 'CCImageCollection'
  classification?: string; // API allows classification label, optional
  description?: string;
}

export interface RealityDataResponse {
  realityData: RealityDataSummary;
}

// Write access (container) response shape (approximate; adjust if API differs)
export interface RealityDataWriteAccessResponse {
  containerUrl: string; // SAS URL or pre-signed container URL
  expiresAt?: string;
  // Some APIs may return additional hints
  [key: string]: unknown;
}
