/**
 * ZIP Worker - Off-main-thread ZIP creation
 * Uses JSZip to create archives without blocking the UI
 */

import JSZip from 'jszip';

interface ZipRequest {
  type: 'add-file' | 'generate-zip' | 'reset';
  fileName?: string;
  data?: ArrayBuffer;
}

interface ZipResponse {
  type: 'file-added' | 'zip-ready' | 'zip-error' | 'zip-progress';
  progress?: number;
  data?: Blob;
  error?: string;
}

let zip = new JSZip();

self.onmessage = async (event: MessageEvent<ZipRequest>) => {
  const { type, fileName, data } = event.data;

  try {
    switch (type) {
      case 'add-file':
        if (fileName && data) {
          zip.file(fileName, data);
          const response: ZipResponse = { type: 'file-added' };
          self.postMessage(response);
        }
        break;

      case 'generate-zip':
        const blob = await zip.generateAsync(
          { 
            type: 'blob',
            compression: 'STORE', // No compression for speed
          },
          (metadata) => {
            const progressResponse: ZipResponse = {
              type: 'zip-progress',
              progress: metadata.percent,
            };
            self.postMessage(progressResponse);
          }
        );
        
        const readyResponse: ZipResponse = {
          type: 'zip-ready',
          data: blob,
        };
        self.postMessage(readyResponse);
        break;

      case 'reset':
        zip = new JSZip();
        break;
    }
  } catch (error) {
    const errorResponse: ZipResponse = {
      type: 'zip-error',
      error: error instanceof Error ? error.message : 'ZIP creation failed',
    };
    self.postMessage(errorResponse);
  }
};

export {};
