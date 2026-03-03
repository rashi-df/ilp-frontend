import { useRef, useState, useCallback } from 'react';
import { Upload, File, X } from 'lucide-react';
import { formatFileSize } from '../../utils/formatters';

export default function FileUpload({
  onFileSelect,
  accept = 'video/*',
  maxSize,
  uploading = false,
  progress = 0,
}) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const handleFile = useCallback(
    (selectedFile) => {
      setError('');

      if (!selectedFile) return;

      if (maxSize && selectedFile.size > maxSize) {
        setError(`File size exceeds ${formatFileSize(maxSize)} limit`);
        return;
      }

      setFile(selectedFile);
      onFileSelect(selectedFile);
    },
    [maxSize, onFileSelect]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleInputChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setError('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!uploading) {
      inputRef.current?.click();
    }
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {!file ? (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative flex flex-col items-center justify-center w-full py-10 px-4
            border-2 border-dashed rounded-xl cursor-pointer transition-colors
            ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-surface-border hover:border-primary/50 hover:bg-surface-alt'
            }`}
        >
          <Upload className="w-10 h-10 text-text-muted mb-3" />
          <p className="text-sm font-medium text-text-primary">
            Drag & drop or click to upload
          </p>
          <p className="text-xs text-text-muted mt-1">
            {accept === 'video/*' ? 'Supports MP4, MOV, AVI, MKV' : accept}
            {maxSize && ` (max ${formatFileSize(maxSize)})`}
          </p>
        </div>
      ) : (
        <div className="border border-surface-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <File className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-primary truncate">
                {file.name}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {formatFileSize(file.size)}
              </p>
            </div>
            {!uploading && (
              <button
                onClick={handleRemove}
                className="p-1 rounded-lg text-text-muted hover:text-danger hover:bg-danger/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {uploading && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
                <span>Uploading...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-2 bg-surface-alt rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-danger">{error}</p>
      )}
    </div>
  );
}
