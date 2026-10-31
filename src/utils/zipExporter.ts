import JSZip from 'jszip';
import { DocumentaryPhoto, ProjectSettings, DocumentaryStyleConfig } from '../types/documentary';

interface ExportZipOptions {
  photos: DocumentaryPhoto[];
  settings?: ProjectSettings;
  activeStyle?: DocumentaryStyleConfig;
  videoBlobUrl?: string | null;
  onProgress?: (percent: number, status: string) => void;
}

export async function exportProjectAsZip({
  photos,
  settings,
  activeStyle,
  videoBlobUrl,
  onProgress,
}: ExportZipOptions): Promise<void> {
  const zip = new JSZip();
  onProgress?.(5, 'Initializing ZIP package...');

  // 1. Create a photos folder
  const photosFolder = zip.folder('photos');

  // Convert photos into files
  const totalPhotos = photos.length;
  for (let i = 0; i < totalPhotos; i++) {
    const photo = photos[i];
    const progressPercent = Math.round(5 + ((i + 1) / totalPhotos) * 55);
    onProgress?.(progressPercent, `Adding photo ${i + 1} of ${totalPhotos} (${photo.name})...`);

    try {
      let blob: Blob;
      if (photo.url.startsWith('data:')) {
        // Data URL
        const res = await fetch(photo.url);
        blob = await res.blob();
      } else {
        // Remote or local URL
        const res = await fetch(photo.url, { mode: 'cors' });
        blob = await res.blob();
      }

      // Safe clean filename
      const ext = blob.type === 'image/png' ? 'png' : 'jpg';
      const cleanName = photo.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `scene_${String(i + 1).padStart(2, '0')}_${cleanName}.${ext}`;
      photosFolder?.file(filename, blob);
    } catch (e) {
      console.warn(`Could not add photo ${photo.id} to zip directly:`, e);
    }
  }

  // 2. Add Project Metadata JSON
  onProgress?.(65, 'Generating project configuration JSON...');
  const metadata = {
    projectName: settings?.projectName || 'DocuMotion Documentary Project',
    createdAt: new Date().toISOString(),
    totalScenes: photos.length,
    totalDurationSeconds: photos.reduce((acc, p) => acc + p.duration, 0),
    settings: settings || null,
    style: activeStyle ? { id: activeStyle.id, name: activeStyle.name } : null,
    scenes: photos.map((p, idx) => ({
      sceneNumber: idx + 1,
      id: p.id,
      name: p.name,
      duration: p.duration,
      aspectRatio: p.aspectRatio,
      framingMode: p.framingMode || 'smart-headroom',
      headroomOffset: p.headroomOffset || 0,
      cameraPreset: p.analysis?.recommendedCamera || 'cinematic-slow-zoom',
      vfx: p.vfx,
      procedural: p.procedural,
      keyframes: p.keyframes,
    })),
  };

  zip.file('documentary_project.json', JSON.stringify(metadata, null, 2));

  // 3. Add Master Video if rendered
  if (videoBlobUrl) {
    onProgress?.(75, 'Embedding rendered Master MP4 video into ZIP...');
    try {
      const vidRes = await fetch(videoBlobUrl);
      const vidBlob = await vidRes.blob();
      zip.file('Master_Documentary_Video.mp4', vidBlob);
    } catch (e) {
      console.warn('Could not add video blob to zip:', e);
    }
  }

  // 4. Add README
  const readmeContent = `======================================================================
DOCUMOTION PRO - DOCUMENTARY PROJECT ARCHIVE (.ZIP)
======================================================================

Project Name: ${settings?.projectName || 'Master Documentary'}
Export Date: ${new Date().toLocaleString()}
Total Scenes: ${photos.length}
Total Runtime: ${photos.reduce((acc, p) => acc + p.duration, 0).toFixed(1)} seconds

CONTENTS OF THIS ZIP ARCHIVE:
-----------------------------
1. /photos/
   Contains all ${photos.length} original, uncropped high-resolution documentary stills
   used in the project.

2. documentary_project.json
   Complete After Effects / Premiere-style scene layout, camera moves,
   bezier keyframe timing, lighting VFX, and smart headroom protection data.

3. Master_Documentary_Video.mp4 (included if rendered)
   Broadcast-ready rendered documentary video without cutouts or burned-in text.

THANK YOU FOR USING DOCUMOTION PRO!
`;
  zip.file('README_PROJECT.txt', readmeContent);

  // 5. Generate ZIP file
  onProgress?.(85, 'Compressing project ZIP archive...');
  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.(
        Math.round(85 + (metadata.percent / 100) * 14),
        `Compressing: ${Math.round(metadata.percent)}%`
      );
    }
  );

  onProgress?.(100, 'Download starting...');

  // 6. Trigger download
  const downloadUrl = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  const projectSlug = (settings?.projectName || 'Documentary_Project')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 30);
  a.download = `${projectSlug}_bundle.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
}
