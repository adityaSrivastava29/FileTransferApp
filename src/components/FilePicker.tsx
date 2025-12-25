/**
 * FilePicker - File selection with drag and drop support
 */

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { formatBytes } from '../utils/format';

interface FilePickerProps {
  onFilesSelected: (files: File[]) => void;
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
  maxFiles?: number;
  className?: string;
}

export function FilePicker({
  onFilesSelected,
  selectedFiles,
  onRemoveFile,
  maxFiles = 50,
  className = '',
}: FilePickerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const remainingSlots = maxFiles - selectedFiles.length;
    const filesToAdd = fileArray.slice(0, remainingSlots);
    
    if (filesToAdd.length > 0) {
      onFilesSelected([...selectedFiles, ...filesToAdd]);
    }
  }, [selectedFiles, maxFiles, onFilesSelected]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input so same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [handleFiles]);

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className={className}>
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFilePicker}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${isDragging 
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' 
            : 'border-[var(--color-text-muted)] hover:border-[var(--color-primary-light)]'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="font-medium">
              {isDragging ? 'Drop files here' : 'Tap to select files'}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              or drag and drop
            </p>
          </div>
        </div>
      </div>

      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-[var(--color-text-secondary)]">
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
            </span>
            <span className="font-medium">{formatBytes(totalSize)}</span>
          </div>
          
          <div className="max-h-48 overflow-y-auto space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="file-item">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {formatBytes(file.size)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(index);
                  }}
                  className="p-2 rounded-full hover:bg-red-500/20 transition-colors"
                  aria-label="Remove file"
                >
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
