import React, { useState } from 'react';
// import { motion } from 'framer-motion';
// Using simple text icons instead of lucide-react for now
// import { Play, Download, Trash2, Menu, Save, FolderOpen, Settings, AlertTriangle, CheckCircle, Loader2, Square } from 'lucide-react';
import { JsonExporter } from '../lib/jsonExporter';
import { PipelineRunner, PipelineRunStatus } from '../lib/pipelineRunner';
import { JsonModal } from './JsonModal';

interface ToolbarProps {
  onToggleSidebar: () => void;
  onClearAll: () => void;
  exporter?: JsonExporter;
  runner: PipelineRunner;
  runStatus: PipelineRunStatus;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onToggleSidebar,
  onClearAll,
  exporter,
  runner,
  runStatus
}) => {
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[] } | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);

  const handleExportJSON = async () => {
    if (!exporter) {
      alert('No pipeline to export');
      return;
    }

    try {
      const validation = exporter.validate();
      setValidationResult(validation);

      if (!validation.isValid) {
        setShowValidationErrors(true);
        return;
      }

      const jsonString = exporter.exportAsString();
      
      // Create and download file
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pipeline_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show success message
      const event = new CustomEvent('show-toast', {
        detail: { message: 'Pipeline exported successfully!', type: 'success' }
      });
      window.dispatchEvent(event);

    } catch (error) {
      console.error('Export failed:', error);
      const event = new CustomEvent('show-toast', {
        detail: { message: 'Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'), type: 'error' }
      });
      window.dispatchEvent(event);
    }
  };

  const handleRunPipeline = async () => {
    if (!exporter) {
      alert('No pipeline to run');
      return;
    }

    try {
      const validation = exporter.validate();
      setValidationResult(validation);

      if (!validation.isValid) {
        setShowValidationErrors(true);
        return;
      }

      const config = exporter.export();
      await runner.runPipeline(config);

    } catch (error) {
      console.error('Pipeline run failed:', error);
    }
  };

  const handleStopPipeline = () => {
    runner.stopPipeline();
  };

  const handleClearAll = () => {
    if (runStatus.isRunning) {
      const event = new CustomEvent('show-toast', {
        detail: { message: 'Cannot clear pipeline while running', type: 'warning' }
      });
      window.dispatchEvent(event);
      return;
    }

    if (window.confirm('Are you sure you want to clear all nodes? This action cannot be undone.')) {
      onClearAll();
      runner.clearLogs();
    }
  };

  const handleSavePipeline = () => {
    // TODO: Implement save to localStorage or file
    const event = new CustomEvent('show-toast', {
      detail: { message: 'Save functionality coming soon!', type: 'info' }
    });
    window.dispatchEvent(event);
  };

  const handleLoadPipeline = () => {
    // TODO: Implement load from localStorage or file
    const event = new CustomEvent('show-toast', {
      detail: { message: 'Load functionality coming soon!', type: 'info' }
    });
    window.dispatchEvent(event);
  };

  const handleViewJSON = () => {
    if (!exporter) {
      alert('No pipeline to view');
      return;
    }

    try {
      const validation = exporter.validate();
      setValidationResult(validation);

      if (!validation.isValid) {
        setShowValidationErrors(true);
        return;
      }

      setShowJsonModal(true);
    } catch (error) {
      console.error('Failed to generate JSON:', error);
      const event = new CustomEvent('show-toast', {
        detail: { message: 'Failed to generate JSON: ' + (error instanceof Error ? error.message : 'Unknown error'), type: 'error' }
      });
      window.dispatchEvent(event);
    }
  };

  const getRunButtonContent = () => {
    if (runStatus.isRunning) {
      return (
        <>
          <span className="animate-spin">⟳</span>
          Running...
        </>
      );
    }
    return (
      <>
        <span>▶️</span>
        Run Pipeline
      </>
    );
  };

  const getRunButtonColor = () => {
    if (runStatus.isRunning) {
      return 'bg-yellow-600 hover:bg-yellow-700 text-white';
    }
    return 'bg-green-600 hover:bg-green-700 text-white';
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-40">
        <div className="flex items-center justify-between p-4">
          {/* Left section */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleSidebar}
              className="flex items-center space-x-2 px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors"
            >
              <span>☰</span>
              <span>Nodes</span>
            </button>

            <div className="h-6 w-px bg-border" />

            <button
              onClick={handleSavePipeline}
              className="flex items-center space-x-2 px-3 py-2 hover:bg-accent text-accent-foreground rounded-md transition-colors"
              title="Save Pipeline"
            >
              <span>💾</span>
              <span className="hidden sm:inline">Save</span>
            </button>

            <button
              onClick={handleLoadPipeline}
              className="flex items-center space-x-2 px-3 py-2 hover:bg-accent text-accent-foreground rounded-md transition-colors"
              title="Load Pipeline"
            >
              <span>📁</span>
              <span className="hidden sm:inline">Load</span>
            </button>
          </div>

          {/* Center section - Status */}
          {runStatus.isRunning && (
            <div className="flex items-center space-x-3 text-sm">
              <div className="flex items-center space-x-2">
                <span className="animate-spin text-yellow-500">⟳</span>
                <span className="text-foreground">{runStatus.currentStep}</span>
              </div>
              {runStatus.progress !== undefined && (
                <div className="w-32 bg-secondary rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${runStatus.progress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Right section */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleViewJSON}
              disabled={runStatus.isRunning}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md transition-colors"
            >
              <span>👁️</span>
              <span>View JSON</span>
            </button>

            <button
              onClick={handleExportJSON}
              disabled={runStatus.isRunning}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md transition-colors"
            >
              <span>⬇️</span>
              <span>Export JSON</span>
            </button>

            {runStatus.isRunning ? (
              <button
                onClick={handleStopPipeline}
                className="flex items-center space-x-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                <span>⏹️</span>
                Stop
              </button>
            ) : (
              <button
                onClick={handleRunPipeline}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${getRunButtonColor()}`}
              >
                {getRunButtonContent()}
              </button>
            )}

            <div className="h-6 w-px bg-border" />

            <button
              onClick={handleClearAll}
              disabled={runStatus.isRunning}
              className="flex items-center space-x-2 px-3 py-2 hover:bg-red-500/10 disabled:bg-gray-400/10 disabled:cursor-not-allowed text-red-500 disabled:text-gray-400 rounded-md transition-colors"
              title="Clear All Nodes"
            >
              <span>🗑️</span>
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>

        {/* Progress bar for running pipeline */}
        {runStatus.isRunning && runStatus.progress !== undefined && (
          <div className="w-full bg-secondary h-1">
            <div 
              className="bg-yellow-500 h-1 transition-all duration-300"
              style={{ width: `${runStatus.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Validation Errors Modal */}
      {showValidationErrors && validationResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-start space-x-3">
              <span className="text-yellow-500 flex-shrink-0 mt-0.5">⚠️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-2">
                  Pipeline Validation Failed
                </h3>
                <div className="space-y-2">
                  {validationResult.errors.map((error, index) => (
                    <p key={index} className="text-sm text-muted-foreground">
                      • {error}
                    </p>
                  ))}
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    onClick={() => setShowValidationErrors(false)}
                    className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JSON Modal */}
      <JsonModal
        isOpen={showJsonModal}
        onClose={() => setShowJsonModal(false)}
        jsonData={exporter?.exportAsString() || ''}
      />
    </>
  );
};

export default Toolbar;
