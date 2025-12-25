/**
 * Chunk Worker - Off-main-thread file slicing
 * Reads file in chunks and posts ArrayBuffer data back
 */

interface ChunkRequest {
  type: 'chunk-file';
  file: File;
  fileId: string;
  chunkSize: number;
}

interface ChunkResponse {
  type: 'chunk-ready' | 'chunk-complete' | 'chunk-error';
  fileId: string;
  chunkIndex?: number;
  totalChunks?: number;
  data?: ArrayBuffer;
  error?: string;
}

self.onmessage = async (event: MessageEvent<ChunkRequest>) => {
  const { type, file, fileId, chunkSize } = event.data;

  if (type !== 'chunk-file') return;

  try {
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const slice = file.slice(start, end);
      
      const arrayBuffer = await slice.arrayBuffer();
      
      const response: ChunkResponse = {
        type: 'chunk-ready',
        fileId,
        chunkIndex: i,
        totalChunks,
        data: arrayBuffer,
      };
      
      self.postMessage(response, { transfer: [arrayBuffer] });
    }
    
    const completeResponse: ChunkResponse = {
      type: 'chunk-complete',
      fileId,
    };
    self.postMessage(completeResponse);
    
  } catch (error) {
    const errorResponse: ChunkResponse = {
      type: 'chunk-error',
      fileId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    self.postMessage(errorResponse);
  }
};

export {};
