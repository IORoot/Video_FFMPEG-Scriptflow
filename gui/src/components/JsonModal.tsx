import React, { useState } from 'react';

interface JsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  jsonData: string;
}

export const JsonModal: React.FC<JsonModalProps> = ({ isOpen, onClose, jsonData }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-card-foreground">Generated JSON</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
            <button
              onClick={onClose}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <pre className="h-full overflow-auto p-4 text-sm bg-muted/50 text-foreground font-mono whitespace-pre-wrap">
            {jsonData}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            This JSON can be used with the scriptflow.sh runner to execute your video processing pipeline.
          </p>
        </div>
      </div>
    </div>
  );
};
