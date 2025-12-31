import React, { useRef, useCallback } from 'react';
import { Upload, FolderOpen } from 'lucide-react';
import { Button } from './ui/Button';

interface FilePickerProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  className?: string;
}

export function FilePicker({
  onFilesSelected,
  accept,
  multiple = true,
  className = '',
}: FilePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  
  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    onFilesSelected(files);
  }, [onFilesSelected]);
  
  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };
  
  return (
    <div className={className}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      
      {/* Drop zone */}
      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          drop-zone rounded-2xl p-8
          flex flex-col items-center justify-center gap-4
          cursor-pointer
          min-h-[200px]
          ${isDragging ? 'active' : ''}
        `}
      >
        <div className={`
          w-16 h-16 rounded-full
          bg-primary-500/20
          flex items-center justify-center
          transition-transform duration-300
          ${isDragging ? 'scale-110' : ''}
        `}>
          <Upload className={`w-8 h-8 text-primary-400 ${isDragging ? 'animate-bounce' : ''}`} />
        </div>
        
        <div className="text-center">
          <p className="text-surface-200 font-medium mb-1">
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-surface-500 text-sm">
            or click to browse
          </p>
        </div>
      </div>
      
      {/* Alternative: Select Folder button (for browsers that support it) */}
      {'webkitdirectory' in document.createElement('input') && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            icon={<FolderOpen className="w-4 h-4" />}
            onClick={(e) => {
              e.stopPropagation();
              const input = document.createElement('input');
              input.type = 'file';
              input.webkitdirectory = true;
              input.onchange = () => handleFiles(input.files);
              input.click();
            }}
          >
            Select Folder
          </Button>
        </div>
      )}
    </div>
  );
}
