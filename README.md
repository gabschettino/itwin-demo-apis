# iTwin Demo Portal

A simple demo application integrating iTwin Platform APIs including Reality Modeling and Access Control.

## Setup

1. **Register App**: Create a Single Page Application at [iTwin Developer Portal](https://developer.bentley.com/)
   - Redirect URI: `http://localhost:5173/`
   - Post-logout URI: `http://localhost:5173/`

2. **Environment**: Create `.env` file:
   ```
   VITE_CLIENT_ID="your-client-id-here"
   ```

3. **Run**:
   ```bash
   npm install
   npm run dev
   ```

Open `http://localhost:5173` in your browser.

## Reality Modeling Workflow

The portal implements an end-to-end (simplified) ContextCapture reconstruction workflow:

1. Create or select CCImageCollection reality data and upload images.
2. (Optional) Generate CCOrientations automatically from an image collection (creates an Orientations.xmlz referencing each image).
3. Create a ContextCapture Workspace.
4. Configure and submit a Reconstruction Job in that workspace.

### 3. Create a Workspace

Workspaces are created via the ContextCapture API endpoint:

`POST https://api.bentley.com/contextcapture/workspaces`

Request body:
```json
{
   "name": "CesiumBridgeDataSet-WS",
   "iTwinId": "<your iTwin id>"
}
```

In the UI:
* Click "New Reconstruction".
* Step 1 lets you enter a workspace name and select an iTwin.
* Press "Create Workspace". On success the workflow advances to job configuration.
 * Or reuse an existing workspace: select it from the list (filtered by iTwin) and click "Use Selected".
 * Delete a workspace you no longer need via the Del button (irreversible).

Displayed fields include the ContextCapture engine version associated with each workspace.

On the API layer this maps to `RealityModelingService.createWorkspace(name, iTwinId)` which returns the created `Workspace` object (id, name, iTwinId, createdDateTime, ContextCapture version, etc.).

### Notes & Next Steps
* After workspace creation or selection, the component loads existing reality data (image / scan collections and orientations) for input selection.
* Cost Estimation: In Step 2 you can enter optional GigaPixels / MegaPoints and press "Estimate Cost". This creates a provisional job and reads `estimatedCost` (if returned by the API) so you can adjust parameters before creating the actual job.
* Recalculate cost any time by modifying parameters (quality, engines, outputs, pixel/point counts) then pressing "Estimate Cost" again.
* Archiving workspaces is not currently supported (no archive endpoint found); deletion is available instead.
