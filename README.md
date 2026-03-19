# iTwin Demo Portal

Interactive demo portal for exploring multiple iTwin Platform capabilities from a single React app.

The project combines:
- SPA frontend (Vite + React + TypeScript)
- optional local backend (Express + iTwin backend/RPC support for rooms/viewport workflows)
- service layer wrappers around iTwin Platform APIs

## Core Functionality

The app is organized into feature pages available from the sidebar.

### 1) My iTwins
- Lists iTwins available to the signed-in user.
- Supports selecting a working iTwin context used by downstream workflows.
- Stores recent selections for faster switching.

### 2) iModels + Named Versions
- Browse iModels per iTwin.
- Inspect named versions and related metadata.
- Integrates export/synchronization-related flows for versioned data scenarios.

### 3) Reality Modeling (V1)
- Lists and filters reality data (e.g., `CCImageCollection`, `CCOrientations`, scan collections, reconstructions).
- Supports upload and inspection helpers for image/orientation data.
- Includes reconstruction workflow steps:
  - create/reuse ContextCapture workspace
  - select inputs (collections/orientations)
  - configure outputs/quality/engines
  - submit and monitor jobs
- Supports delete flows using in-app confirmation dialogs.

### 4) Reality Modeling V2
- Tech-preview oriented workflow for v2 job execution and progress tracking.
- iTwin picker with recent selection support.
- Image collection creation/upload and job submission utilities.
- Reality data listing (v1-backed listing path where applicable) with in-app delete confirmation.

### 5) Synchronization
- UI for synchronization endpoints and run management scenarios.
- Supports setup, trigger, and inspection flows for data synchronization processes.

### 6) Storage
- iTwin-scoped storage browser with folder navigation and breadcrumbs.
- Create folder / create file metadata / upload / complete operations.
- File download via resolved download links.
- Rename, move, and delete for files/folders.
- Bulk copy selected file types from Storage to Azure Blob via SAS URL.
- Recent iTwin persistence and per-iTwin storage preferences.

### 7) Forms
- Lists forms by selected iTwin with filters and paging helpers.
- Form detail retrieval and export-to-storage operations.
- Supports storage folder organization workflows after export.

### 8) Rooms (Revit)
- Room-focused workflows and rendering/query support.
- Uses frontend + backend coordination for certain iTwin/viewport operations.

### 9) Access Control
- Role/member visibility and management workflows.
- Role create/edit/delete operations with in-app confirmation dialogs.

## Architecture Overview

- Frontend app routes are defined in `src/App.tsx`.
- API wrappers are in `src/services/api/*` with shared config in `src/services/config/api.config.ts`.
- Shared auth/session handling is in `src/contexts/AuthContext.tsx` and `src/services/AuthService.ts`.
- Backend entrypoints are in `src/backend/*` and build to `dist-backend/`.

## Prerequisites

- Node.js 18+
- An iTwin SPA application registration (for OAuth)

## Setup

1. Register a Single Page Application in the [iTwin Developer Portal](https://developer.bentley.com/).
2. Configure redirect URIs:
   - `http://localhost:5173/`
   - post-logout: `http://localhost:5173/`
3. Create `.env` in project root:

```env
VITE_CLIENT_ID="your-client-id-here"
```

4. Install dependencies:

```bash
npm install
```

## Running Locally

### Frontend only

```bash
npm run dev
```

### Frontend + backend (recommended for full feature coverage)

Terminal 1:

```bash
npm run dev:backend
```

Terminal 2:

```bash
npm run dev
```

Open `http://localhost:5173`.

## Running in Docker Desktop

This repository now includes a Docker development setup with:
- `frontend` service (Vite on port `5173`)
- `backend` service (Express + RPC on port `3001`)

### Start with Docker Compose

```bash
docker compose up --build
```

Then open `http://localhost:5173`.

### Stop

```bash
docker compose down
```

### Add to Docker Desktop UI

1. Open Docker Desktop.
2. Go to **Containers** (or **Projects**, depending on version).
3. Choose **Create / Add project from compose file**.
4. Select `docker-compose.yml` from this workspace root.
5. Start the project.

### Notes

- Frontend proxy target is configurable via `VITE_DEV_BACKEND_URL` (defaults to `http://localhost:3001`).
- In Docker, compose sets it to `http://backend:3001` so frontend can reach backend by service name.
- Source is mounted into both containers for live development edits.

## Build & Quality

```bash
npm run build
npm run lint
```

## Key Routes

- `/itwins`
- `/itwins/:itwinId`
- `/itwins/:itwinId/imodels`
- `/itwins/:itwinId/imodels/:imodelId/versions`
- `/reality-data`
- `/reality-modeling-v2`
- `/synchronization`
- `/storage`
- `/forms`
- `/rooms`

## API Coverage Matrix

This matrix summarizes the primary frontend service modules and Bentley API families used by each feature area.

| Feature / Page | Primary service modules | Primary API families / endpoint groups |
|---|---|---|
| My iTwins | `iTwinAPIService`, `iTwinService` | `/itwins` |
| iModels + Versions | `iModelService`, `ExportConnectionService` | `/imodels`, `/imodels/{id}/changesets`, `/imodels/{id}/namedversions`, synchronization export endpoints |
| Reality Modeling (V1) | `RealityManagementService`, `RealityModelingService` | reality data listing/CRUD, write-access/upload flows, `/contextcapture/workspaces`, `/contextcapture/jobs` |
| Reality Modeling V2 | `RealityModelingV2Service`, `RealityManagementService` | v2 job create/progress flows, plus reality data APIs for collection/listing operations |
| Synchronization | `SynchronizationService` | `/synchronization/imodels/*` (connections, runs, reports) |
| Storage | `StorageService`, `AzureBlobService` | `/storage/*` (top-level, folders, files, move/rename/delete, recycle-bin), Azure Blob upload via SAS |
| Forms | `FormsService`, `StorageService` | forms endpoints (list/detail/export), storage APIs for post-export organization |
| Rooms (Revit) | frontend rooms modules + backend routes (`roomsFootprints`, `checkpointKey`) | backend `/api/rooms/*`, `/api/imodels/*`, plus iTwin RPC + iModel access patterns |
| Access Control | `AccessControlService`, `iTwinAPIService` | iTwin access-control roles/members/permissions endpoints |

### Notes on Matrix Scope

- The matrix reflects the main implemented paths in this repository, not every optional API capability.
- Several workflows combine multiple service calls (for example: Forms export followed by Storage moves).
- Some modules call Bentley APIs directly from the frontend, while Rooms/viewport-related flows rely on the local backend and RPC support.

## Auth Scopes & Permissions Matrix

The app-level OAuth scope configured in this repository is:

- `itwin-platform` (see `src/config/auth.ts`)

In practice, successful operations also depend on project/iTwin role permissions and (for some endpoints) organization-level authorization.

| Feature / Operation | Minimum app scope used by this app | Typical additional permission requirements |
|---|---|---|
| Sign-in + profile (`/users/me`) | `itwin-platform` | User must be able to authenticate in the target tenant |
| My iTwins list/read | `itwin-platform` | User must have access to the iTwin/project |
| iModels read (list/details/versions) | `itwin-platform` | iModel read access in target iTwin |
| iModels export-related flows | `itwin-platform` | May require explicit export authorization step and project-level export permissions |
| Reality data list/read | `itwin-platform` | Reality data visibility within selected iTwin |
| Reality data create/upload/delete | `itwin-platform` | Modify/delete rights for reality data in selected iTwin |
| ContextCapture workspaces/jobs | `itwin-platform` | ContextCapture/reality modeling rights in the iTwin/project |
| Synchronization connections/runs | `itwin-platform` | Synchronization management/execute permissions in project scope |
| Storage list/read | `itwin-platform` | Storage read permissions in the selected iTwin |
| Storage create/move/rename/delete | `itwin-platform` | Storage write/delete permissions (for delete operations, API policies such as `storage_delete` may apply) |
| Forms list/details/export | `itwin-platform` | Forms access and export rights in project scope |
| Access Control roles/members | `itwin-platform` | Elevated access-control rights (often admin-level roles for role management) |
| Rooms/Revit backend-assisted flows | `itwin-platform` | iModel + storage/checkpoint access; backend forwards bearer token and enforces auth presence |

### Common Permission Failure Signals

| Symptom | Likely cause | Recommended check |
|---|---|---|
| `401 Unauthorized` | Missing/expired bearer token or malformed auth header | Re-authenticate, verify token issuance and client app config |
| `403 Forbidden` | User authenticated but lacks operation permission | Confirm user role assignment in iTwin/project/org |
| `404` for expected protected resource | Resource not found *or* hidden due access policy | Validate ID + ensure user can see resource in target iTwin |
| Delete/create action fails while list works | Read permission exists but write/delete permission missing | Check project-level write/delete grants for that API family |

### Practical Setup Guidance

- Keep `scope` as `itwin-platform` unless your org has stricter token policies.
- Test access in this order when onboarding a new user:
  1. Sign in and load My iTwins
  2. Open Storage and list top-level
  3. Perform one safe write op (create folder)
  4. Validate feature-specific writes (Reality/Synchronization/Forms exports)
- If one feature fails while others work, treat it as an API-family permission issue first (not global auth).

## Notes

- The app calls Bentley APIs directly from the frontend service layer for most operations.
- Some advanced/room workflows depend on the local backend and RPC endpoints.
- Delete operations use centered in-app confirmation dialogs rather than browser-native confirms.
