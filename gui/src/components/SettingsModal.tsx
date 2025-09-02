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
  previewEnabled: boolean;
  onTogglePreview: () => void;
  onSaveLayout: () => void;
  onLoadLayout: () => void;
  onSaveLayoutToCloud: () => void;
  onLoadLayoutFromCloud: () => void;
  isAuthenticated: boolean;
  user: any;
  onLogout: () => void;
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
  previewEnabled,
  onTogglePreview,
  onSaveLayout,
  onLoadLayout,
  onSaveLayoutToCloud,
  onLoadLayoutFromCloud,
  isAuthenticated,
  user,
  onLogout
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

          {/* Preview Windows Setting */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Preview Windows</h3>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {previewEnabled 
                    ? 'Preview animations are shown for supported nodes'
                    : 'Preview animations are hidden for all nodes'
                  }
                </p>
              </div>
              <button
                onClick={onTogglePreview}
                className={`relative inline-flex h-6 w-20 items-center rounded-full transition-colors ${
                  previewEnabled ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    previewEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Authentication Section */}
          {isAuthenticated ? (
            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-medium">Account</h3>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
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
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-medium">Account</h3>
              <p className="text-xs text-muted-foreground">
                Sign in to save and manage your layouts in the cloud.
              </p>
            </div>
          )}

          {/* Save/Load Layout Section */}
          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-medium">Layout Management</h3>
            <div className="space-y-2">
              <button
                onClick={onSaveLayout}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                <span>💾</span>
                <span>Save Layout (Local)</span>
              </button>
              <button
                onClick={onLoadLayout}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                <span>📁</span>
                <span>Load Layout (Local)</span>
              </button>
              {isAuthenticated && (
                <>
                  <button
                    onClick={onSaveLayoutToCloud}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                  >
                    <span>☁️</span>
                    <span>Save to Cloud</span>
                  </button>
                  <button
                    onClick={onLoadLayoutFromCloud}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
                  >
                    <span>☁️</span>
                    <span>Load from Cloud</span>
                  </button>
                </>
              )}
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
