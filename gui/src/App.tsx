import React, { useState, useEffect, useCallback } from 'react';
// import { motion } from 'framer-motion';
import SimpleNodeEditorComponent, { SimpleNodeEditorHandle } from './components/SimpleNodeEditor';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import LogViewer, { LogToggleButton } from './components/LogViewer';
import { SettingsModal } from './components/SettingsModal';
import { JsonExporter, NodeData } from './lib/jsonExporter';
import { PipelineRunner, PipelineRunStatus } from './lib/pipelineRunner';
import './App.css';

// Toast notification component
const Toast: React.FC<{
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getToastColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className={`fixed top-4 right-4 ${getToastColor()} text-white px-4 py-2 rounded-lg shadow-lg z-50`}>
      <div className="flex items-center justify-between">
        <span className="text-sm">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 text-white hover:text-gray-200"
        >
          ×
        </button>
      </div>
    </div>
  );
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [connections, setConnections] = useState<Array<{ from: string; to: string; output: string; input: string }>>([]);
  const [exporter, setExporter] = useState<JsonExporter>();
  const [runner] = useState(() => new PipelineRunner());
  const [runStatus, setRunStatus] = useState<PipelineRunStatus>({
    isRunning: false,
    logs: []
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [nodeEditorRef, setNodeEditorRef] = useState<SimpleNodeEditorHandle | null>(null);
  const [gridSnapEnabled, setGridSnapEnabled] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Listen for pipeline status changes
  useEffect(() => {
    const handleStatusChange = (status: PipelineRunStatus) => {
      setRunStatus(status);
    };

    runner.onStatusChange(handleStatusChange);

    return () => {
      runner.removeStatusListener(handleStatusChange);
    };
  }, [runner]);

  // Listen for toast events
  useEffect(() => {
    const handleToast = (event: CustomEvent) => {
      setToast(event.detail);
    };

    window.addEventListener('show-toast', handleToast as EventListener);

    return () => {
      window.removeEventListener('show-toast', handleToast as EventListener);
    };
  }, []);

  const handleNodesChange = useCallback((newNodes: NodeData[]) => {
    setNodes(newNodes);
  }, []);

  const handleConnectionsChange = useCallback((newConnections: Array<{ from: string; to: string; output: string; input: string }>) => {
    setConnections(newConnections);
  }, []);

  const handleExporterReady = useCallback((newExporter: JsonExporter) => {
    setExporter(newExporter);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleLogViewer = () => {
    setIsLogViewerOpen(!isLogViewerOpen);
  };

  const handleClearAll = () => {
    nodeEditorRef?.clearAll();
  };

  const handleToggleGridSnap = () => {
    if (nodeEditorRef) {
      const newValue = !gridSnapEnabled;
      setGridSnapEnabled(newValue);
      nodeEditorRef.setGridSnapEnabled(newValue);
    }
  };

  const handleClearLogs = () => {
    runner.clearLogs();
  };

  return (
    <div className="h-screen w-screen bg-background text-foreground overflow-hidden dark">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FF</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold">Video FFMPEG Scriptflow</h1>
              <p className="text-xs text-muted-foreground">Node-based video pipeline editor</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors"
              title="Settings"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex h-full">
        {/* Sidebar */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          onToggle={toggleSidebar}
        />

        {/* Main editor area */}
        <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-0' : 'ml-0'}`}>
          <div className="h-full pb-16"> {/* Account for toolbar height */}
            <SimpleNodeEditorComponent
              onNodesChange={handleNodesChange}
              onConnectionsChange={handleConnectionsChange}
              onExportReady={handleExporterReady}
              ref={setNodeEditorRef}
            />
          </div>
        </div>
      </div>

      {/* Sidebar overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Toolbar */}
      <Toolbar
        onToggleSidebar={toggleSidebar}
        onClearAll={handleClearAll}
        exporter={exporter}
        runner={runner}
        runStatus={runStatus}
        nodeCount={nodes.length}
        connectionCount={connections.length}
      />

      {/* Log viewer toggle button */}
      <LogToggleButton
        hasLogs={runStatus.logs.length > 0}
        isRunning={runStatus.isRunning}
        onToggle={toggleLogViewer}
      />

      {/* Log viewer */}
      <LogViewer
        status={runStatus}
        isVisible={isLogViewerOpen}
        onToggle={toggleLogViewer}
        onClearLogs={handleClearLogs}
      />

      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        gridSnapEnabled={gridSnapEnabled}
        onToggleGridSnap={handleToggleGridSnap}
        simulationMode={runner.getSimulationMode()}
        onToggleSimulationMode={() => {
          runner.setSimulationMode(!runner.getSimulationMode());
        }}
      />

      {/* Loading overlay for initial setup - commented out for now */}
      {/* <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50" style={{ pointerEvents: 'none' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading FFMPEG Scriptflow GUI...</p>
        </div>
      </div> */}
    </div>
  );
}

export default App;