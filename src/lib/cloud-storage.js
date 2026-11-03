/**
 * Local Media Storage & MySQL Uploader
 * Supports high-resolution JPG, PNG, WEBP, and MP4 files.
 * Preserves lossless high-resolution quality on local disk (public/media/uploads),
 * indexed automatically in MySQL, and 100% exportable to online web hosting.
 */

export function getStorageMode() {
  return 'mysql-local';
}

/**
 * Upload a media file (Image or Video) to Local Disk and index into MySQL.
 * @param {File} file - The File object to upload
 * @param {Object} options - { folder: 'projects' | 'updates', onProgress: fn }
 * @returns {Promise<{ url: string, name: string, type: string, size: number, provider: string }>}
 */
export async function uploadMediaFile(file, options = {}) {
  if (!file) throw new Error('No file selected for upload.');

  // Validate allowed extensions (jpg, png, webp, mp4)
  const validTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ];

  const ext = file.name.split('.').pop()?.toLowerCase();
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif', 'mp4', 'webm', 'mov'];

  if (!allowedExts.includes(ext) && !validTypes.includes(file.type)) {
    throw new Error(`File type .${ext} is not supported. Please upload high-res JPG, PNG, WEBP, or MP4 files.`);
  }

  let res;
  let uploadError = null;

  // Attempt 1: Vite Dev Server Middleware (/api/upload-media)
  try {
    res = await fetch('/api/upload-media', {
      method: 'POST',
      headers: {
        'x-filename': encodeURIComponent(file.name),
        'Content-Type': file.type || 'application/octet-stream',
        'x-folder': options.folder || 'projects'
      },
      body: file
    });
  } catch (err) {
    uploadError = err;
  }

  // Attempt 2: If 404 or network failure, fallback to PHP endpoint (/api/upload.php) for XAMPP / Apache / cPanel
  if (!res || !res.ok) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', options.folder || 'projects');

      const phpRes = await fetch('/api/upload.php', {
        method: 'POST',
        headers: {
          'x-filename': encodeURIComponent(file.name),
          'x-folder': options.folder || 'projects'
        },
        body: formData
      });

      if (phpRes.ok) {
        res = phpRes;
      } else if (!res) {
        res = phpRes;
      }
    } catch (phpErr) {
      if (!res) uploadError = phpErr;
    }
  }

  if (!res || !res.ok) {
    let errorMsg = `Upload failed with status ${res?.status || 'network error'}`;
    if (res) {
      const errorData = await res.json().catch(() => ({}));
      errorMsg = errorData.error || errorMsg;
    } else if (uploadError) {
      errorMsg = uploadError.message;
    }
    throw new Error(errorMsg);
  }

  const data = await res.json();
  return {
    url: data.url,
    name: data.filename || file.name,
    type: file.type.startsWith('video') ? 'video' : 'image',
    size: file.size,
    provider: data.provider || 'Local Disk + MySQL'
  };
}

/**
 * Helper to format bytes to human readable string
 */
export function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Deprecated Cloudflare R2 stubs preserved for legacy interface compatibility
export function getR2Config() {
  return { accountId: '', accessKeyId: '', secretAccessKey: '', bucketName: '', publicDomain: '', isConfigured: false };
}
export function saveR2Config() {
  return {};
}
