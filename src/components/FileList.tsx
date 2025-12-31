import { X, FileIcon } from 'lucide-react';
import type { FileMetadata, FileWithMetadata } from '../types';
import { formatFileSize, getFileIcon } from '../utils/fileUtils';

interface FileListProps {
  files: FileMetadata[] | FileWithMetadata[];
  onRemove?: (fileId: string) => void;
  showRemove?: boolean;
  className?: string;
}

function isFileWithMetadata(file: FileMetadata | FileWithMetadata): file is FileWithMetadata {
  return 'file' in file && 'metadata' in file;
}

export function FileList({
  files,
  onRemove,
  showRemove = true,
  className = '',
}: FileListProps) {
  if (files.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <FileIcon className="w-12 h-12 text-surface-600 mx-auto mb-2" />
        <p className="text-surface-500">No files selected</p>
      </div>
    );
  }
  
  const totalSize = files.reduce((sum, f) => {
    const metadata = isFileWithMetadata(f) ? f.metadata : f;
    return sum + metadata.size;
  }, 0);
  
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-surface-400">
          {files.length} file{files.length !== 1 ? 's' : ''}
        </span>
        <span className="text-sm text-surface-400">
          Total: {formatFileSize(totalSize)}
        </span>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {files.map((file) => {
          const metadata = isFileWithMetadata(file) ? file.metadata : file;
          
          return (
            <div
              key={metadata.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50 hover:bg-surface-800 transition-colors"
            >
              {/* File icon */}
              <span className="text-2xl">{getFileIcon(metadata.type)}</span>
              
              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-surface-200 font-medium truncate">
                  {metadata.name}
                </p>
                <p className="text-surface-500 text-sm">
                  {formatFileSize(metadata.size)}
                </p>
              </div>
              
              {/* Remove button */}
              {showRemove && onRemove && (
                <button
                  onClick={() => onRemove(metadata.id)}
                  className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-error-400 transition-colors"
                  aria-label={`Remove ${metadata.name}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
