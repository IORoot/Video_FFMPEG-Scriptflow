import React from 'react';

interface SettingsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  gridSnapEnabled: boolean;
  onToggleGridSnap: () => void;
  simulationMode: boolean;
  onToggleSimulationMode: () => void;
  gridSize: number;
  onGridSizeChange: (size: number) => void;
  onSaveLayout: () => void;
  onLoadLayout: () => void;
}

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  isOpen,
  onClose,
  gridSnapEnabled,
  onToggleGridSnap,
  simulationMode,
  onToggleSimulationMode,
  gridSize,
  onGridSizeChange,
  onSaveLayout,
  onLoadLayout
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-background border border-border rounded-lg shadow-lg z-50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Grid Snap Setting */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Grid Snapping</h3>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Snap nodes and comments to a 32px grid for organized layouts
                </p>
              </div>
              <button
                onClick={onToggleGridSnap}
                className={`relative inline-flex h-6 w-20 items-center rounded-full transition-colors ${
                  gridSnapEnabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    gridSnapEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Grid Size Setting */}
          {gridSnapEnabled && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Grid Size</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Size: {gridSize}px</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="320"
                  step="2"
                  value={gridSize}
                  onChange={(e) => onGridSizeChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>2px</span>
                  <span>320px</span>
                </div>
              </div>
            </div>
          )}

          {/* Simulation Mode Setting */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Execution Mode</h3>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {simulationMode 
                    ? 'Simulation mode: Commands are logged but not executed'
                    : 'Execution mode: Commands will be run on your system'
                  }
                </p>
              </div>
              <button
                onClick={onToggleSimulationMode}
                className={`relative inline-flex h-6 w-20 items-center rounded-full transition-colors ${
                  simulationMode ? 'bg-yellow-600' : 'bg-green-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    simulationMode ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Save/Load Layout Section */}
          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-medium">Layout Management</h3>
            <div className="space-y-2">
              <button
                onClick={onSaveLayout}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                <span>💾</span>
                <span>Save Layout</span>
              </button>
              <button
                onClick={onLoadLayout}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                <span>📁</span>
                <span>Load Layout</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Save and load your complete node layout, including positions, settings, and comments.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
