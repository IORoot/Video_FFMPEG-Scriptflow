import React, { useState, useEffect, useCallback } from 'react';
// import { motion } from 'framer-motion';
import SimpleNodeEditorComponent, { SimpleNodeEditorHandle } from './components/SimpleNodeEditor';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import LogViewer, { LogToggleButton } from './components/LogViewer';
import { SettingsDropdown } from './components/SettingsModal';
import { LayoutManager } from './components/LayoutManager';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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

function AppContent() {
  const { isAuthenticated, user, logout, login } = useAuth();
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
  const [gridSize, setGridSize] = useState(32);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLayoutManager, setShowLayoutManager] = useState(false);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSettingsModal) {
        const target = event.target as Element;
        if (!target.closest('.settings-container')) {
          setShowSettingsModal(false);
        }
      }
    };

    if (showSettingsModal) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSettingsModal]);

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

  const handleGridSizeChange = (size: number) => {
    setGridSize(size);
    if (nodeEditorRef) {
      nodeEditorRef.setGridSize(size);
    }
  };

  const handleTogglePreview = () => {
    setPreviewEnabled(!previewEnabled);
  };

  const handleSaveLayout = () => {
    if (nodeEditorRef) {
      try {
        const layoutJson = nodeEditorRef.saveLayout();
        const blob = new Blob([layoutJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `node-layout-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setToast({ message: 'Layout saved successfully!', type: 'success' });
      } catch (error) {
        console.error('Failed to save layout:', error);
        setToast({ message: 'Failed to save layout', type: 'error' });
      }
    }
  };

  const handleLoadLayout = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && nodeEditorRef) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const layoutJson = e.target?.result as string;
            const success = nodeEditorRef.loadLayout(layoutJson);
            if (success) {
              // Update settings state from loaded layout
              const layoutData = JSON.parse(layoutJson);
              if (layoutData.settings) {
                if (typeof layoutData.settings.gridSnapEnabled === 'boolean') {
                  setGridSnapEnabled(layoutData.settings.gridSnapEnabled);
                }
                if (typeof layoutData.settings.gridSize === 'number') {
                  setGridSize(layoutData.settings.gridSize);
                }
              }
              setToast({ message: 'Layout loaded successfully!', type: 'success' });
            } else {
              setToast({ message: 'Failed to load layout - invalid file format', type: 'error' });
            }
          } catch (error) {
            console.error('Failed to load layout:', error);
            setToast({ message: 'Failed to load layout - invalid file', type: 'error' });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleSaveLayoutToCloud = () => {
    if (!isAuthenticated) {
      login();
      return;
    }
    setShowLayoutManager(true);
  };

  const handleLoadLayoutFromCloud = () => {
    if (!isAuthenticated) {
      login();
      return;
    }
    setShowLayoutManager(true);
  };

  const handleLoadLayoutFromManager = (layout: any) => {
    if (nodeEditorRef) {
      const success = nodeEditorRef.loadLayout(JSON.stringify(layout));
      if (success) {
        setToast({ message: 'Layout loaded successfully!', type: 'success' });
      } else {
        setToast({ message: 'Failed to load layout', type: 'error' });
      }
    }
  };

  const handleSaveLayoutFromManager = () => {
    if (nodeEditorRef) {
      try {
        const layoutJson = nodeEditorRef.saveLayout();
        return JSON.parse(layoutJson);
      } catch (error) {
        console.error('Failed to save layout:', error);
        return null;
      }
    }
    return null;
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
            {/* Sign In Button */}
            {!isAuthenticated ? (
              <button
                onClick={login}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                title="Sign in with Google"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="hidden sm:inline">Sign In</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                  {user?.picture ? (
                    <img 
                      src={user.picture} 
                      alt={user?.name || 'User'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) {
                          fallback.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div 
                    className="w-full h-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium"
                    style={{ display: user?.picture ? 'none' : 'flex' }}
                  >
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                </div>
                <span className="hidden sm:inline text-sm font-medium text-white">{user?.name}</span>
                <button
                  onClick={logout}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                  title="Sign out"
                >
                  Sign Out
                </button>
              </div>
            )}

            {/* Settings Button */}
            <div className="relative settings-container">
              <button
                onClick={() => setShowSettingsModal(!showSettingsModal)}
                className="flex items-center space-x-2 px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors"
                title="Settings"
              >
                <span>⚙️</span>
                <span className="hidden sm:inline">Settings</span>
              </button>
              
              <SettingsDropdown
              isOpen={showSettingsModal}
              onClose={() => setShowSettingsModal(false)}
              gridSnapEnabled={gridSnapEnabled}
              onToggleGridSnap={handleToggleGridSnap}
              simulationMode={runner.getSimulationMode()}
              onToggleSimulationMode={() => {
                runner.setSimulationMode(!runner.getSimulationMode());
              }}
              gridSize={gridSize}
              onGridSizeChange={handleGridSizeChange}
              previewEnabled={previewEnabled}
              onTogglePreview={handleTogglePreview}
              onSaveLayout={handleSaveLayout}
              onLoadLayout={handleLoadLayout}
              onSaveLayoutToCloud={handleSaveLayoutToCloud}
              onLoadLayoutFromCloud={handleLoadLayoutFromCloud}
              isAuthenticated={isAuthenticated}
              user={user}
              onLogout={logout}
              />
            </div>
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
              previewEnabled={previewEnabled}
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



      {/* Loading overlay for initial setup - commented out for now */}
      {/* <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50" style={{ pointerEvents: 'none' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading FFMPEG Scriptflow GUI...</p>
        </div>
      </div> */}

      {/* Modals */}
      <LayoutManager 
        isOpen={showLayoutManager} 
        onClose={() => setShowLayoutManager(false)}
        onLoadLayout={handleLoadLayoutFromManager}
        onSaveLayout={handleSaveLayoutFromManager}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;