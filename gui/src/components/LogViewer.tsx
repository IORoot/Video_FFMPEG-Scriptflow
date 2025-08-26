import React, { useEffect, useRef, useState } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// Using simple text icons instead of lucide-react for now
// import { Terminal, X, Copy, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { PipelineRunStatus } from '../lib/pipelineRunner';

interface LogViewerProps {
  status: PipelineRunStatus;
  isVisible: boolean;
  onToggle: () => void;
  onClearLogs: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  status,
  isVisible,
  onToggle,
  onClearLogs
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [status.logs, autoScroll]);

  // Check if user has scrolled up to disable auto-scroll
  const handleScroll = () => {
    if (!logContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;
    setAutoScroll(isAtBottom);
  };

  const copyLogsToClipboard = async () => {
    const logsText = status.logs.join('\n');
    try {
      await navigator.clipboard.writeText(logsText);
      // Show toast
      const event = new CustomEvent('show-toast', {
        detail: { message: 'Logs copied to clipboard!', type: 'success' }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Failed to copy logs:', error);
    }
  };

  const getLogLevel = (log: string): 'info' | 'warning' | 'error' | 'success' => {
    if (log.includes('❌') || log.includes('Error') || log.includes('Failed')) {
      return 'error';
    }
    if (log.includes('⚠️') || log.includes('Warning')) {
      return 'warning';
    }
    if (log.includes('✅') || log.includes('Success') || log.includes('completed')) {
      return 'success';
    }
    return 'info';
  };

  const getLogLevelColor = (level: string): string => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'success':
        return 'text-green-400';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <>
      {isVisible && (
        <div className="fixed bottom-16 right-4 w-96 h-80 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-30 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-700">
            <div className="flex items-center space-x-2">
              <span className="text-green-400">💻</span>
              <span className="text-sm font-medium text-white">Pipeline Logs</span>
              {status.logs.length > 0 && (
                <span className="text-xs text-gray-400">({status.logs.length})</span>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={copyLogsToClipboard}
                disabled={status.logs.length === 0}
                className="p-1 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-white rounded transition-colors"
                title="Copy logs"
              >
                <span>📋</span>
              </button>
              
              <button
                onClick={onClearLogs}
                disabled={status.logs.length === 0 || status.isRunning}
                className="p-1 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-white rounded transition-colors"
                title="Clear logs"
              >
                <span>🗑️</span>
              </button>
              
              <div className="w-px h-4 bg-gray-700 mx-1" />
              
              <button
                onClick={onToggle}
                className="p-1 hover:bg-gray-700 text-gray-400 hover:text-white rounded transition-colors"
                title="Close logs"
              >
                <span>×</span>
              </button>
            </div>
          </div>

          {/* Status bar */}
          {status.isRunning && (
            <div className="px-3 py-2 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center justify-between text-xs">
                <span className="text-yellow-400">
                  {status.currentStep || 'Running...'}
                </span>
                {status.progress !== undefined && (
                  <span className="text-gray-400">
                    {Math.round(status.progress)}%
                  </span>
                )}
              </div>
              {status.progress !== undefined && (
                <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                  <div 
                    className="bg-yellow-400 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${status.progress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Logs container */}
          <div className="flex-1 flex flex-col min-h-0">
            <div 
              ref={logContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs"
            >
              {status.logs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <span className="text-4xl mx-auto mb-2 opacity-50">💻</span>
                    <p>No logs yet</p>
                    <p className="text-xs mt-1">Run a pipeline to see logs here</p>
                  </div>
                </div>
              ) : (
                status.logs.map((log, index) => {
                  const level = getLogLevel(log);
                  const colorClass = getLogLevelColor(level);
                  
                  return (
                    <div
                      key={index}
                      className={`${colorClass} leading-relaxed`}
                    >
                      {log}
                    </div>
                  );
                })
              )}
            </div>

            {/* Auto-scroll indicator */}
            {!autoScroll && status.logs.length > 0 && (
              <div className="p-2 border-t border-gray-700">
                <button
                  onClick={() => {
                    setAutoScroll(true);
                    if (logContainerRef.current) {
                      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
                    }
                  }}
                  className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <span>⬇️</span>
                  <span>Scroll to bottom</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// Floating log toggle button
export const LogToggleButton: React.FC<{
  hasLogs: boolean;
  isRunning: boolean;
  onToggle: () => void;
}> = ({ hasLogs, isRunning, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`fixed bottom-20 right-4 p-3 rounded-full shadow-lg z-20 transition-colors ${
        isRunning
          ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
          : hasLogs
          ? 'bg-green-500 hover:bg-green-600 text-white'
          : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
      }`}
      title="View logs"
    >
      <span className="text-lg">💻</span>
      {hasLogs && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
      )}
    </button>
  );
};

export default LogViewer;
