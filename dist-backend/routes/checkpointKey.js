import { Router } from "express";
import { ensureIModelHostStarted } from "../imodelHost.js";
import { ensureCheckpointFile } from "../lib/checkpoint.js";
function getBearerToken(req) {
    const header = req.header("authorization") ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match)
        throw new Error("Missing Authorization: Bearer <token>");
    return match[1];
}
export const checkpointKeyRouter = Router();
checkpointKeyRouter.post("/checkpoint-key", async (req, res) => {
    try {
        await ensureIModelHostStarted();
        const token = getBearerToken(req);
        const body = (req.body ?? {});
        if (!body.iModelId)
            return res.status(400).json({ error: "Missing iModelId" });
        const { fileKey, filePath, changesetIndex } = await ensureCheckpointFile(token, body.iModelId);
        return res.json({ fileKey, filePath, changesetIndex });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
});
//# sourceMappingURL=checkpointKey.js.map