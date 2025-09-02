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
    // Strip ANSI codes when copying to clipboard
    const cleanLogs = status.logs.map(log => 
      log.replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
    );
    const logsText = cleanLogs.join('\n');
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

  // Function to parse ANSI color codes and convert to HTML
  const parseAnsiToHtml = (text: string): string => {
    // ANSI color code patterns
    const ansiRegex = /\x1b\[([0-9;]+)m/g;
    
    // Color mappings for common ANSI codes
    const colorMap: { [key: string]: string } = {
      '30': 'color: #000000', // black
      '31': 'color: #ff0000', // red
      '32': 'color: #00ff00', // green
      '33': 'color: #ffff00', // yellow
      '34': 'color: #0000ff', // blue
      '35': 'color: #ff00ff', // magenta
      '36': 'color: #00ffff', // cyan
      '37': 'color: #ffffff', // white
      '38;2;249;115;22': 'color: #f97316', // orange
      '38;2;37;99;235': 'color: #2563eb', // blue
      '38;2;74;222;128': 'color: #4ade80', // green
      '38;2;168;85;247': 'color: #a855f7', // purple
      '39': 'color: inherit', // default
      '0': 'color: inherit', // reset
    };

    let html = text;
    
    // Replace ANSI codes with HTML spans
    html = html.replace(ansiRegex, (match, codes) => {
      const codeArray = codes.split(';');
      const styles: string[] = [];
      
      for (const code of codeArray) {
        if (colorMap[code]) {
          styles.push(colorMap[code]);
        } else if (code === '38' && codeArray.length >= 3) {
          // Handle RGB color codes like 38;2;r;g;b
          const rgbCode = codeArray.slice(0, 3).join(';');
          if (colorMap[rgbCode]) {
            styles.push(colorMap[rgbCode]);
          }
        }
      }
      
      if (styles.length > 0) {
        return `<span style="${styles.join('; ')}">`;
      }
      return '';
    });

    // Handle reset codes (0m) by closing spans
    html = html.replace(/\x1b\[0m/g, '</span>');
    
    // Handle newlines and make them visible
    html = html.replace(/\n/g, '<br>');
    
    return html;
  };

  return (
    <>
      {isVisible && (
        <div className="fixed top-16 right-0 w-96 h-[calc(100vh-4rem)] bg-gray-900 border-l border-gray-700 shadow-2xl z-30 flex flex-col">
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
                  const parsedHtml = parseAnsiToHtml(log);
                  
                  return (
                    <div
                      key={index}
                      className={`${colorClass} leading-relaxed`}
                      dangerouslySetInnerHTML={{ __html: parsedHtml }}
                    />
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
