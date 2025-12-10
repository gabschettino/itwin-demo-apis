// Utility to build a CCOrientations BlocksExchange XML file and zip it as Orientations.xmlz
// Minimal subset needed for linking photos in a CCImageCollection to create CCOrientations reality data.
// The caller is responsible for supplying the imageCollectionId and the ordered list of image file names.

import JSZip from 'jszip';

export interface BuildOrientationsOptions {
  blockName?: string;
  srsId?: number; // internal numeric id (defaults to 0 matching provided SRS)
  srsName?: string;
  srsDefinition?: string;
}

const DEFAULT_SRS_NAME = 'WGS 84 - World Geodetic System 1984 (EPSG:4326) + EGM96 geoid height (EPSG:5773)';
const DEFAULT_SRS_DEFINITION = 'EPSG:4326+5773';

export function buildOrientationsXml(imageCollectionId: string, imageFileNames: string[], opts: BuildOrientationsOptions = {}): string {
  const blockName = opts.blockName || 'Image Collection Block';
  const srsId = opts.srsId ?? 0;
  const srsName = opts.srsName || DEFAULT_SRS_NAME;
  const srsDefinition = opts.srsDefinition || DEFAULT_SRS_DEFINITION;

  const photosXml = imageFileNames.map((fname, idx) => `            <Photo>\n                <Id>${idx}</Id>\n                <ImagePath>${imageCollectionId}/${fname}</ImagePath>\n            </Photo>`).join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>\n<BlocksExchange version="3.2">\n    <SpatialReferenceSystems>\n        <SRS>\n            <Id>${srsId}</Id>\n            <Name>${srsName}</Name>\n            <Definition>${srsDefinition}</Definition>\n        </SRS>\n    </SpatialReferenceSystems>\n    <Block>\n        <Name>${escapeXml(blockName)}</Name>\n        <SRSId>${srsId}</SRSId>\n        <BulkPhotos>\n${photosXml}\n        </BulkPhotos>\n        <ControlPoints/>\n        <PositioningConstraints/>\n    </Block>\n</BlocksExchange>`;
}

export async function buildOrientationsZip(xml: string): Promise<Blob> {
  const zip = new JSZip();
  // The zipped file convention: a single XML file inside; we'll name it Orientations.xml
  zip.file('Orientations.xml', xml);
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  return blob;
}

function escapeXml(str: string): string {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
