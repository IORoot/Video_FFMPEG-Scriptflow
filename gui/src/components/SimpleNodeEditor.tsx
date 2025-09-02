import React, { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { SimpleNodeEditor, EditorState, EditorNode, CanvasComment } from '../lib/simpleNodeEditor';
import { NodeDefinition, getNodeDefinition, getNodeIcon } from '../lib/nodeDefinitions';
import { JsonExporter, NodeData } from '../lib/jsonExporter';

// Function to get node color based on category
const getNodeColor = (category: string): { bg: string; dot: string } => {
  switch (category) {
    case 'input':
      return { bg: 'bg-green-100', dot: 'bg-green-500' }; // Green for inputs
    case 'size':
      return { bg: 'bg-blue-100', dot: 'bg-blue-500' }; // Blue for size operations
    case 'effects':
      return { bg: 'bg-purple-100', dot: 'bg-purple-500' }; // Purple for effects
    case 'composition':
      return { bg: 'bg-yellow-100', dot: 'bg-yellow-500' }; // Yellow for composition
    case 'format':
      return { bg: 'bg-red-100', dot: 'bg-red-500' }; // Red for format operations
    case 'timing':
      return { bg: 'bg-cyan-100', dot: 'bg-cyan-500' }; // Cyan for timing operations
    case 'assembly':
      return { bg: 'bg-lime-100', dot: 'bg-lime-500' }; // Lime green for assembly
    case 'utilities':
      return { bg: 'bg-gray-100', dot: 'bg-gray-500' }; // Gray for utilities
    case 'custom':
      return { bg: 'bg-pink-100', dot: 'bg-pink-500' }; // Pink for custom operations
    default:
      return { bg: 'bg-gray-100', dot: 'bg-gray-500' }; // Gray for unknown
  }
};

const CommentComponent: React.FC<{
  comment: CanvasComment;
  onMove: (commentId: string, x: number, y: number) => void;
  onSelect: (commentId: string) => void;
  onUpdate: (commentId: string, updates: Partial<CanvasComment>) => void;
  onDelete: (commentId: string) => void;
}> = ({ comment, onMove, onSelect, onUpdate, onDelete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [showSettings, setShowSettings] = useState(false);
  const [colorType, setColorType] = useState<'background' | 'font'>('background');

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent canvas panning when dragging comment
    setDragOffset({
      x: e.clientX - comment.x,
      y: e.clientY - comment.y
    });
    setIsDragging(true);
    onSelect(comment.id);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      onMove(comment.id, newX, newY);
    } else if (isResizing) {
      const newWidth = Math.max(100, resizeStart.width + (e.clientX - resizeStart.x));
      const newHeight = Math.max(60, resizeStart.height + (e.clientY - resizeStart.y));
      onUpdate(comment.id, { width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, dragOffset, resizeStart, comment.id, onMove, onUpdate]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Close settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showSettings) {
        setShowSettings(false);
      }
    };

    if (showSettings) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSettings]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditText(comment.text);
  };

  const handleTextSubmit = () => {
    onUpdate(comment.id, { text: editText });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      setEditText(comment.text);
      setIsEditing(false);
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: comment.width,
      height: comment.height
    });
    setIsResizing(true);
    onSelect(comment.id);
  };

  return (
    <div
      className={`absolute rounded-lg shadow-lg cursor-move select-none ${
        comment.selected ? 'border-2 border-blue-500' : ''
      }`}
      style={{
        left: comment.x,
        top: comment.y,
        width: comment.width,
        height: comment.height,
        backgroundColor: comment.backgroundColor,
        opacity: 0.8
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Comment content */}
      <div className="p-2 h-full flex flex-col">
        {isEditing ? (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleTextSubmit}
            onKeyDown={handleKeyDown}
            className="flex-1 w-full bg-transparent border-none outline-none resize-none"
            style={{ 
              color: comment.fontColor, 
              fontSize: `${comment.fontSize}px`,
              textAlign: comment.textAlign,
              display: 'block',
              height: '100%'
            }}
            autoFocus
            placeholder="Enter comment..."
          />
        ) : (
          <div 
            className="flex-1 whitespace-pre-wrap h-full flex flex-col"
            style={{ 
              color: comment.fontColor, 
              fontSize: `${comment.fontSize}px`,
              textAlign: comment.textAlign
            }}
          >
            <div 
              className="flex-1"
              style={{
                display: 'flex',
                alignItems: comment.verticalAlign === 'top' ? 'flex-start' : 
                           comment.verticalAlign === 'middle' ? 'center' : 'flex-end',
                justifyContent: comment.textAlign === 'left' ? 'flex-start' : 
                               comment.textAlign === 'center' ? 'center' : 'flex-end'
              }}
            >
              {comment.text || 'Double-click to edit'}
            </div>
          </div>
        )}
        
        {/* Settings and Delete buttons */}
        {comment.selected && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSettings(!showSettings);
              }}
              className="absolute -top-2 -right-8 w-5 h-5 bg-gray-500 text-white rounded-full text-xs hover:bg-gray-600 transition-colors"
              title="Comment settings"
            >
              ⚙️
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(comment.id);
              }}
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors"
              title="Delete comment"
            >
              ✕
            </button>
          </>
        )}
        
        {/* Resize handle */}
        {comment.selected && (
          <div
            className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 cursor-se-resize opacity-75 hover:opacity-100 transition-opacity"
            onMouseDown={handleResizeMouseDown}
            title="Resize comment"
            style={{
              clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)'
            }}
          />
        )}
        
        {/* Settings Modal */}
        {showSettings && (
          <div 
            className="absolute top-8 right-0 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 min-w-64"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Comment Settings</h3>
              
              {/* Color Type Toggle */}
              <div>
                <label className="block text-xs text-gray-700 mb-2">Color Type</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setColorType('background')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      colorType === 'background' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Background
                  </button>
                  <button
                    onClick={() => setColorType('font')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      colorType === 'font' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Font
                  </button>
                </div>
              </div>
              
              {/* Color Palette */}
              <div>
                <label className="block text-xs text-gray-700 mb-2">
                  {colorType === 'background' ? 'Background Color' : 'Font Color'}
                </label>
                <div className="grid grid-cols-6 gap-1 mb-2">
                  {[
                    'rgba(254, 243, 199, 0.8)', 'rgba(253, 230, 138, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(217, 119, 6, 0.8)', 'rgba(146, 64, 14, 0.8)', 'rgba(120, 53, 15, 0.8)', // Yellow/Orange
                    'rgba(219, 234, 254, 0.8)', 'rgba(147, 197, 253, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(29, 78, 216, 0.8)', 'rgba(30, 64, 175, 0.8)', 'rgba(30, 58, 138, 0.8)', // Blue
                    'rgba(252, 231, 243, 0.8)', 'rgba(249, 168, 212, 0.8)', 'rgba(236, 72, 153, 0.8)', 'rgba(219, 39, 119, 0.8)', 'rgba(190, 24, 93, 0.8)', 'rgba(157, 23, 77, 0.8)', // Pink
                    'rgba(220, 252, 231, 0.8)', 'rgba(134, 239, 172, 0.8)', 'rgba(34, 197, 94, 0.8)', 'rgba(22, 163, 74, 0.8)', 'rgba(21, 128, 61, 0.8)', 'rgba(22, 101, 52, 0.8)', // Green
                    'rgba(243, 232, 255, 0.8)', 'rgba(196, 181, 253, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(124, 58, 237, 0.8)', 'rgba(109, 40, 217, 0.8)', 'rgba(91, 33, 182, 0.8)', // Purple
                    'rgba(254, 202, 202, 0.8)', 'rgba(252, 165, 165, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(220, 38, 38, 0.8)', 'rgba(185, 28, 28, 0.8)', 'rgba(153, 27, 27, 0.8)', // Red
                    'rgba(229, 231, 235, 0.8)', 'rgba(209, 213, 219, 0.8)', 'rgba(156, 163, 175, 0.8)', 'rgba(107, 114, 128, 0.8)', 'rgba(75, 85, 99, 0.8)', 'rgba(55, 65, 81, 0.8)'  // Gray
                  ].map((color) => {
                    // Convert to the appropriate format based on color type
                    const baseColor = color.replace(/,\s*[\d.]+\)/, ')'); // Remove alpha
                    const finalColor = colorType === 'background' ? color : baseColor.replace(')', ', 1)');
                    
                    return (
                    <button
                      key={color}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (colorType === 'background') {
                          onUpdate(comment.id, { backgroundColor: finalColor });
                        } else {
                          onUpdate(comment.id, { fontColor: finalColor });
                        }
                        setShowSettings(false);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: finalColor }}
                      title={finalColor}
                    />
                    );
                  })}
                </div>
              </div>
              
              {/* Custom Color Input */}
              <div>
                <label className="block text-xs text-gray-700 mb-1">Custom Color</label>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    value={(colorType === 'background' ? comment.backgroundColor : comment.fontColor).includes('rgba') ? 
                      `#${(colorType === 'background' ? comment.backgroundColor : comment.fontColor).match(/\d+/g)?.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('') || 'fef3c7'}` : 
                      (colorType === 'background' ? comment.backgroundColor : comment.fontColor).startsWith('#') ? (colorType === 'background' ? comment.backgroundColor : comment.fontColor) : '#fef3c7'}
                    onChange={(e) => {
                      const hex = e.target.value;
                      const r = parseInt(hex.slice(1, 3), 16);
                      const g = parseInt(hex.slice(3, 5), 16);
                      const b = parseInt(hex.slice(5, 7), 16);
                      const currentColor = colorType === 'background' ? comment.backgroundColor : comment.fontColor;
                      const alpha = currentColor.includes('rgba') ? 
                        parseFloat(currentColor.split(',')[3]?.replace(')', '') || (colorType === 'background' ? '0.8' : '1')) : (colorType === 'background' ? 0.8 : 1);
                      const newColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                      if (colorType === 'background') {
                        onUpdate(comment.id, { backgroundColor: newColor });
                      } else {
                        onUpdate(comment.id, { fontColor: newColor });
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={colorType === 'background' ? comment.backgroundColor : comment.fontColor}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Validate and format the input
                      if (value.startsWith('#') && value.length === 7) {
                        // Convert hex to rgba
                        const hex = value.replace('#', '');
                        const r = parseInt(hex.substr(0, 2), 16);
                        const g = parseInt(hex.substr(2, 2), 16);
                        const b = parseInt(hex.substr(4, 2), 16);
                        const currentColor = colorType === 'background' ? comment.backgroundColor : comment.fontColor;
                        const alpha = currentColor.includes('rgba') ? 
                          parseFloat(currentColor.split(',')[3]?.replace(')', '') || (colorType === 'background' ? '0.8' : '1')) : (colorType === 'background' ? 0.8 : 1);
                        const newColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                        if (colorType === 'background') {
                          onUpdate(comment.id, { backgroundColor: newColor });
                        } else {
                          onUpdate(comment.id, { fontColor: newColor });
                        }
                      } else if (value.startsWith('rgba(') && value.endsWith(')')) {
                        // Use rgba as-is
                        if (colorType === 'background') {
                          onUpdate(comment.id, { backgroundColor: value });
                        } else {
                          onUpdate(comment.id, { fontColor: value });
                        }
                      } else {
                        // Update anyway for partial typing
                        if (colorType === 'background') {
                          onUpdate(comment.id, { backgroundColor: value });
                        } else {
                          onUpdate(comment.id, { fontColor: value });
                        }
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder={colorType === 'background' ? "rgba(254, 243, 199, 0.8) or #fef3c7" : "rgba(0, 0, 0, 1) or #000000"}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded text-gray-900"
                  />
                </div>
              </div>
              
              {/* Transparency Slider - Only for background colors */}
              {colorType === 'background' && (
                <div>
                  <label className="block text-xs text-gray-700 mb-1">
                    Transparency: {Math.round((1 - (comment.backgroundColor.includes('rgba') ? parseFloat(comment.backgroundColor.split(',')[3]?.replace(')', '') || '0.8') : 0.8)) * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={comment.backgroundColor.includes('rgba') ? parseFloat(comment.backgroundColor.split(',')[3]?.replace(')', '') || '0.8') : 0.8}
                    onChange={(e) => {
                      const alpha = parseFloat(e.target.value);
                      if (comment.backgroundColor.includes('rgba')) {
                        // Extract RGB values and update alpha
                        const rgbMatch = comment.backgroundColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),/);
                        if (rgbMatch) {
                          const [, r, g, b] = rgbMatch;
                          const newColor = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(1)})`;
                          onUpdate(comment.id, { backgroundColor: newColor });
                        }
                      } else {
                        // Convert hex to rgba
                        const hex = comment.backgroundColor.replace('#', '');
                        if (hex.length === 6) {
                          const r = parseInt(hex.substr(0, 2), 16);
                          const g = parseInt(hex.substr(2, 2), 16);
                          const b = parseInt(hex.substr(4, 2), 16);
                          const newColor = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(1)})`;
                          onUpdate(comment.id, { backgroundColor: newColor });
                        }
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full"
                  />
                </div>
              )}
              
              {/* Font Size Slider */}
              <div>
                <label className="block text-xs text-gray-700 mb-1">
                  Font Size: {comment.fontSize}px
                </label>
                <input
                  type="range"
                  min="8"
                  max="100"
                  step="1"
                  value={comment.fontSize}
                  onChange={(e) => {
                    const fontSize = parseInt(e.target.value);
                    onUpdate(comment.id, { fontSize });
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full"
                />
              </div>

              {/* Text Alignment */}
              <div>
                <label className="block text-xs text-gray-700 mb-2">Text Alignment</label>
                
                {/* Horizontal Alignment */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-1">Horizontal</label>
                  <div className="flex space-x-1">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <button
                        key={align}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate(comment.id, { textAlign: align });
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                          comment.textAlign === align
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                        title={`Align ${align}`}
                      >
                        {align === 'left' && '⬅️'}
                        {align === 'center' && '↔️'}
                        {align === 'right' && '➡️'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vertical Alignment */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Vertical</label>
                  <div className="flex space-x-1">
                    {(['top', 'middle', 'bottom'] as const).map((align) => (
                      <button
                        key={align}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate(comment.id, { verticalAlign: align });
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                          comment.verticalAlign === align
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                        title={`Align ${align}`}
                      >
                        {align === 'top' && '⬆️'}
                        {align === 'middle' && '↕️'}
                        {align === 'bottom' && '⬇️'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface SimpleNodeEditorProps {
  onNodesChange?: (nodes: NodeData[]) => void;
  onConnectionsChange?: (connections: Array<{ from: string; to: string; output: string; input: string }>) => void;
  onExportReady?: (exporter: JsonExporter) => void;
  previewEnabled?: boolean;
}

const NodeComponent: React.FC<{
  node: EditorNode;
  onMove: (nodeId: string, x: number, y: number) => void;
  onSelect: (nodeId: string) => void;
  onParameterChange: (nodeId: string, param: string, value: any) => void;
  onSocketMouseDown: (nodeId: string, socketId: string, type: 'input' | 'output', e: React.MouseEvent) => void;
  onDeleteNode: (nodeId: string) => void;
  onContextMenu: (nodeId: string, x: number, y: number) => void;
  onAddDynamicInput: (nodeId: string, baseInputName: string) => void;
  onRemoveDynamicInput: (nodeId: string, inputName: string) => void;
  previewEnabled: boolean;
}> = ({ node, onMove, onSelect, onParameterChange, onSocketMouseDown, onDeleteNode, onContextMenu, onAddDynamicInput, onRemoveDynamicInput, previewEnabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const nodeDefinition = getNodeDefinition(node.type);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't prevent default for input fields - let them handle focus/selection
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
      return;
    }
    
    e.preventDefault();
    setDragOffset({
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y
    });
    setIsDragging(true);
    onSelect(node.id);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      onMove(node.id, newX, newY);
    }
  }, [isDragging, dragOffset, node.id, onMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={`absolute bg-card border rounded-lg p-3 min-w-48 cursor-move select-none ${
        node.selected ? 'border-primary shadow-lg' : 'border-border'
      }`}
      style={{
        left: node.position.x,
        top: node.position.y,
        zIndex: node.selected ? 10 : 1
      }}
      data-node-id={node.id}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(node.id, e.clientX, e.clientY);
      }}
    >
      <div className="flex items-center justify-between mb-2 h-5">
        <div className="flex items-center space-x-2">
          {nodeDefinition && (() => {
            const iconPath = getNodeIcon(nodeDefinition.id);
            const categoryColor = getNodeColor(nodeDefinition.category).dot.replace('bg-', '').replace('-500', '');
            const hexColor = {
              'green-500': '#22c55e',
              'blue-500': '#3b82f6', 
              'purple-500': '#8b5cf6',
              'yellow-500': '#f59e0b',
              'red-500': '#ef4444',
              'cyan-500': '#06b6d4',
              'lime-500': '#84cc16',
              'gray-500': '#6b7280',
              'pink-500': '#ec4899'
            }[getNodeColor(nodeDefinition.category).dot] || '#6b7280';
            
            return iconPath ? (
              <img 
                src={iconPath} 
                alt={nodeDefinition.name}
                className="w-4 h-4 flex-shrink-0"
                style={{ 
                  filter: `brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%)`,
                  // Apply category color using CSS filter
                  ...(nodeDefinition.category === 'input' && { filter: 'brightness(0) saturate(100%) invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(118%) contrast(119%)' }),
                  ...(nodeDefinition.category === 'size' && { filter: 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%)' }),
                  ...(nodeDefinition.category === 'effects' && { filter: 'brightness(0) saturate(100%) invert(20%) sepia(100%) saturate(7500%) hue-rotate(267deg) brightness(101%) contrast(101%)' }),
                  ...(nodeDefinition.category === 'composition' && { filter: 'brightness(0) saturate(100%) invert(70%) sepia(98%) saturate(1552%) hue-rotate(1deg) brightness(101%) contrast(101%)' }),
                  ...(nodeDefinition.category === 'format' && { filter: 'brightness(0) saturate(100%) invert(17%) sepia(94%) saturate(7491%) hue-rotate(359deg) brightness(95%) contrast(118%)' }),
                  ...(nodeDefinition.category === 'timing' && { filter: 'brightness(0) saturate(100%) invert(70%) sepia(98%) saturate(1552%) hue-rotate(1deg) brightness(101%) contrast(101%)' }),
                  ...(nodeDefinition.category === 'assembly' && { filter: 'brightness(0) saturate(100%) invert(70%) sepia(98%) saturate(1552%) hue-rotate(1deg) brightness(101%) contrast(101%)' }),
                  ...(nodeDefinition.category === 'utilities' && { filter: 'brightness(0) saturate(100%) invert(20%) sepia(100%) saturate(7500%) hue-rotate(267deg) brightness(101%) contrast(101%)' }),
                  ...(nodeDefinition.category === 'custom' && { filter: 'brightness(0) saturate(100%) invert(70%) sepia(98%) saturate(1552%) hue-rotate(1deg) brightness(101%) contrast(101%)' })
                }}
              />
            ) : (
              <div className={`w-3 h-3 ${getNodeColor(nodeDefinition.category).dot} rounded-full flex-shrink-0`} />
            );
          })()}
          <div className="text-sm font-medium text-card-foreground">
            {nodeDefinition?.name || node.name}
          </div>
        </div>
        {node.selected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNode(node.id);
            }}
            className="text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded p-1 transition-colors"
            title="Delete node (or press Delete key)"
          >
            ✕
          </button>
        )}
      </div>
      
      {/* Preview Section */}
      {nodeDefinition?.preview && previewEnabled && (
        <div className="mb-3 w-80 h-[180px]">
          <div className="w-full h-full bg-black rounded border border-border overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
            {nodeDefinition.id !== 'ff_stack' && (
              <img 
                src="/test-image.jpg" 
                alt="Preview"
                className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                  nodeDefinition.id === 'ff_scale' ? 'animate-scale-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_crop' ? 'animate-crop-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_pad' ? 'animate-pad-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_aspect_ratio' ? 'animate-aspect-ratio-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_rotate' ? 'animate-rotate-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_flip' ? 'animate-flip-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_to_landscape' ? 'animate-to-landscape-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_to_portrait' ? 'animate-to-portrait-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_blur' ? 'animate-blur-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_sharpen' ? 'animate-sharpen-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_unsharp' ? 'animate-unsharp-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_colour' ? 'animate-colour-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_lut' ? 'animate-lut-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_watermark' ? 'animate-watermark-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_text' ? 'animate-text-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_subtitles' ? 'animate-subtitles-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_audio' ? 'animate-audio-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_convert' ? 'animate-convert-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_transcode' ? 'animate-transcode-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_social_media' ? 'animate-social-media-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_cut' ? 'animate-cut-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_fps' ? 'animate-fps-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_middle' ? 'animate-middle-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_grouptime' ? 'animate-grouptime-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_concat' ? 'animate-concat-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_append' ? 'animate-append-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_transition' ? 'animate-transition-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_image' ? 'animate-image-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_kenburns' ? 'animate-kenburns-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_thumbnail' ? 'animate-thumbnail-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_proxy' ? 'animate-proxy-loop' : ''
                } ${
                  nodeDefinition.id === 'ff_download' ? 'animate-download-loop' : ''
                }`}
                style={{
                objectFit: 'cover',
                objectPosition: 'center',
                transform: (() => {
                  // Base transform for centering
                  let transform = 'translate(-50%, -50%)';
                  
                  // Apply node-specific transforms
                  if (nodeDefinition.id === 'ff_scale') {
                    const width = node.parameters.width || '1920';
                    const height = node.parameters.height || '1080';
                    
                    // Calculate scale factors (assuming original is 320x180)
                    const originalWidth = 320;
                    const originalHeight = 180;
                    
                    let scaleX = 1;
                    let scaleY = 1;
                    
                    // Parse width and height values
                    if (width !== '-1' && !isNaN(Number(width))) {
                      scaleX = Number(width) / originalWidth;
                    }
                    if (height !== '-1' && !isNaN(Number(height))) {
                      scaleY = Number(height) / originalHeight;
                    }
                    
                    // Apply scale transform
                    transform += ` scale(${scaleX}, ${scaleY})`;
                  } else if (nodeDefinition.id === 'ff_crop') {
                    const width = node.parameters.width || '300';
                    const height = node.parameters.height || '300';
                    const xpixels = node.parameters.xpixels || '(iw-ow)/2';
                    const ypixels = node.parameters.ypixels || '(ih-oh)/2';
                    
                    // For crop animation, we'll use a clipping effect
                    // The animation will show the crop area expanding and contracting
                    transform += ' scale(1.2)'; // Slightly larger to show crop effect
                  } else if (nodeDefinition.id === 'ff_pad') {
                    const width = node.parameters.width || '0';
                    const height = node.parameters.height || '2*ih';
                    const colour = node.parameters.colour || 'black';
                    
                    // For pad animation, we only need centering transform
                    // The padding effect is handled by CSS animation
                  } else if (nodeDefinition.id === 'ff_aspect_ratio') {
                    const aspect = node.parameters.aspect || '1:1';
                    
                    // For aspect ratio animation, we'll use CSS to show aspect ratio changes
                    // The animation will show different aspect ratios
                  } else if (nodeDefinition.id === 'ff_rotate') {
                    const rotation = node.parameters.rotation || '90';
                    
                    // For rotate animation, we'll use CSS to show rotation changes
                    // The animation will show different rotation angles
                  } else if (nodeDefinition.id === 'ff_flip') {
                    const horizontal = node.parameters.horizontal || false;
                    const vertical = node.parameters.vertical || false;
                    
                    // For flip animation, we'll use CSS to show flip changes
                    // The animation will show different flip combinations
                  } else if (nodeDefinition.id === 'ff_to_landscape') {
                    const rotate = node.parameters.rotate || false;
                    
                    // For to_landscape animation, we'll use CSS to show landscape conversion
                    // The animation will show portrait to landscape transformation
                  } else if (nodeDefinition.id === 'ff_to_portrait') {
                    const rotate = node.parameters.rotate || false;
                    
                    // For to_portrait animation, we'll use CSS to show portrait conversion
                    // The animation will show landscape to portrait transformation
                  } else if (nodeDefinition.id === 'ff_blur') {
                    const strength = node.parameters.strength || '5';
                    const steps = node.parameters.steps || '1';
                    
                    // For blur animation, we'll use CSS to show blur effect
                    // The animation will show different blur intensities
                  } else if (nodeDefinition.id === 'ff_sharpen') {
                    const pixel = node.parameters.pixel || '5';
                    const sharpen = node.parameters.sharpen || '1.0';
                    
                    // For sharpen animation, we'll use CSS to show sharpen effect
                    // The animation will show different sharpen intensities
                  } else if (nodeDefinition.id === 'ff_unsharp') {
                    const luma_x = node.parameters.luma_x || '5';
                    const luma_y = node.parameters.luma_y || '5';
                    const luma_amount = node.parameters.luma_amount || '1.0';
                    
                    // For unsharp mask animation, we'll use CSS to show unsharp mask effect
                    // The animation will show different unsharp mask intensities
                  } else if (nodeDefinition.id === 'ff_colour') {
                    const brightness = node.parameters.brightness || '0';
                    const contrast = node.parameters.contrast || '1';
                    const gamma = node.parameters.gamma || '1';
                    const saturation = node.parameters.saturation || '1';
                    
                    // For colour animation, we'll use CSS to show color adjustment effects
                    // The animation will show different color adjustments
                  } else if (nodeDefinition.id === 'ff_lut') {
                    const lut = node.parameters.lut || './lib/lut/Andromeda.cube';
                    
                    // For LUT animation, we'll use CSS to show color grading effects
                    // The animation will show different cinematic color grades
                  } else if (nodeDefinition.id === 'ff_overlay') {
                    const start = node.parameters.start || '0';
                    const end = node.parameters.end || '0';
                    const fit = node.parameters.fit || false;
                    
                    // For overlay animation, we'll use CSS to show overlay effect
                    // The animation will show overlay positioning and opacity
                  } else if (nodeDefinition.id === 'ff_stack') {
                    const vertical = node.parameters.vertical || false;
                    const horizontal = node.parameters.horizontal || false;
                    const grid = node.parameters.grid || false;
                    
                    // For stack animation, we'll use CSS to show stacking effect
                    // The animation will show different stacking arrangements
                  } else if (nodeDefinition.id === 'ff_watermark') {
                    const xpixels = node.parameters.xpixels || '10';
                    const ypixels = node.parameters.ypixels || '10';
                    const scale = node.parameters.scale || '1';
                    const alpha = node.parameters.alpha || '1';
                    const duration = node.parameters.duration || '0';
                    
                    // For watermark animation, we'll use CSS to show watermark effect
                    // The animation will show watermark positioning and opacity
                  } else if (nodeDefinition.id === 'ff_text') {
                    const text = node.parameters.text || 'Hello';
                    const font = node.parameters.font || 'Arial';
                    const size = node.parameters.size || '24';
                    const colour = node.parameters.colour || 'white';
                    
                    // For text animation, we'll use CSS to show text typing effect
                    // The animation will show text appearing character by character
                  } else if (nodeDefinition.id === 'ff_subtitles') {
                    const subtitles = node.parameters.subtitles || 'sample_subtitle.srt';
                    const styles = node.parameters.styles || '';
                    const removedupes = node.parameters.removedupes || false;
                    const dynamictext = node.parameters.dynamictext || false;
                    
                    // For subtitles animation, we'll use CSS to show subtitle typing effect
                    // The animation will show subtitles appearing character by character at bottom center
                  } else if (nodeDefinition.id === 'ff_audio') {
                    const audio = node.parameters.audio || 'sample_voice.mp3';
                    const remove = node.parameters.remove || false;
                    const start = node.parameters.start || 0;
                    const speed = node.parameters.speed || 1.0;
                    const shortest = node.parameters.shortest || false;
                    
                    // For audio animation, we'll use CSS to show animated waveform
                    // The animation will show audio bars moving up and down
                  } else if (nodeDefinition.id === 'ff_convert') {
                    const format = node.parameters.format || 'mp4';
                    const grep = node.parameters.grep || '';
                    
                    // For convert animation, we'll use CSS to show format conversion effect
                    // The animation will show the image transitioning between formats
                  } else if (nodeDefinition.id === 'ff_transcode') {
                    const video = node.parameters.video || 'libx264';
                    const audio = node.parameters.audio || 'aac';
                    const fps = node.parameters.fps || 30;
                    const width = node.parameters.width || 1920;
                    const height = node.parameters.height || 1080;
                    
                    // For transcode animation, we'll use CSS to show codec processing effect
                    // The animation will show the image being processed with different codecs
                  } else if (nodeDefinition.id === 'ff_social_media') {
                    const instagram = node.parameters.instagram || false;
                    
                    // For social media animation, we'll use CSS to show social media optimization
                    // The animation will show the image being converted to portrait and scaled down
                  } else if (nodeDefinition.id === 'ff_cut') {
                    const start = node.parameters.start || '00:00:00';
                    const end = node.parameters.end || '00:00:10';
                    const grep = node.parameters.grep || '';
                    
                    // For cut animation, we'll use CSS to show timeline cutting effect
                    // The animation will show scissors cutting parts of the timeline
                  } else if (nodeDefinition.id === 'ff_fps') {
                    const fps = node.parameters.fps || 30;
                    
                    // For fps animation, we'll use CSS to show frame rate flickering effect
                    // The animation will show the image flickering at different rates
                  } else if (nodeDefinition.id === 'ff_middle') {
                    const trim = node.parameters.trim || 1;
                    const grep = node.parameters.grep || '';
                    
                    // For middle animation, we'll use CSS to show trimming from both ends
                    // The animation will show scissors cutting from both sides of the timeline
                  } else if (nodeDefinition.id === 'ff_grouptime') {
                    const duration = node.parameters.duration || 10;
                    const arrangement = node.parameters.arrangement || 'standard';
                    const grep = node.parameters.grep || '';
                    
                    // For grouptime animation, we'll use CSS to show multiple videos being trimmed
                    // The animation will show two timelines being cut from both ends simultaneously
                  } else if (nodeDefinition.id === 'ff_concat') {
                    const input1 = node.parameters.input1 || 'video1.mp4';
                    const input2 = node.parameters.input2 || 'video2.mp4';
                    const input3 = node.parameters.input3 || '';
                    
                    // For concat animation, we'll use CSS to show video segments being joined
                    // The animation will show three segments being concatenated together
                  } else if (nodeDefinition.id === 'ff_append') {
                    const first = node.parameters.first || 'video1.mp4';
                    const second = node.parameters.second || 'video2.mp4';
                    
                    // For append animation, we'll use CSS to show two files being appended
                    // The animation will show two segments being joined with re-encoding
                  } else if (nodeDefinition.id === 'ff_transition') {
                    const duration = node.parameters.duration || 1;
                    const effects = node.parameters.effects || 'fade';
                    const sort = node.parameters.sort || '';
                    
                    // For transition animation, we'll use CSS to show videos with transition effects
                    // The animation will show segments with a transition effect between them
                  } else if (nodeDefinition.id === 'ff_image') {
                    const duration = node.parameters.duration || 5;
                    
                    // For image to video animation, we'll use CSS to show image becoming video
                    // The animation will show one static image and one moving image
                  } else if (nodeDefinition.id === 'ff_kenburns') {
                    const target = node.parameters.target || 'Random';
                    const duration = node.parameters.duration || 5;
                    const speed = node.parameters.speed || 1;
                    
                    // For ken burns animation, we'll use CSS to show slow zoom effect
                    // The animation will show the image slowly zooming in
                  } else if (nodeDefinition.id === 'ff_thumbnail') {
                    const count = node.parameters.count || 1;
                    const sample = node.parameters.sample || '';
                    
                    // For thumbnail animation, we'll use CSS to show thumbnail generation
                    // The animation will show a flash and then a shrinking copy of the image
                  } else if (nodeDefinition.id === 'ff_proxy') {
                    const scalex = node.parameters.scalex || 0.5;
                    const scaley = node.parameters.scaley || 0.5;
                    const fps = node.parameters.fps || 15;
                    const crf = node.parameters.crf || 25;
                    const codec = node.parameters.codec || 'libx264';
                    
                    // For proxy animation, we'll use CSS to show low-resolution proxy generation
                    // The animation will show the image being scaled down and pixelated
                  } else if (nodeDefinition.id === 'ff_download') {
                    const input = node.parameters.input || 'https://example.com/video.mp4';
                    const strategy = node.parameters.strategy || '1';
                    const urlsource = node.parameters.urlsource || '';
                    
                    // For download animation, we'll use CSS to show download effect
                    // The animation will show the image starting small at top and expanding while panning down
                  }
                  
                  return transform;
                })(),
                left: '50%',
                top: '50%'
              }}
            />
                         )}
             {/* Text overlay for ff_text preview */}
             {nodeDefinition.id === 'ff_text' && (
               <div 
                 className="absolute top-4 left-4 text-white text-2xl font-bold z-20"
                 style={{
                   textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                   fontSize: '24px'
                 }}
               >
                 <span className="animate-text-loop"></span>
               </div>
             )}
             {/* Subtitles overlay for ff_subtitles preview */}
             {nodeDefinition.id === 'ff_subtitles' && (
               <div 
                 className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-xl font-bold z-20"
                 style={{
                   textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                   fontSize: '20px'
                 }}
               >
                 <span className="animate-subtitles-loop"></span>
               </div>
             )}
             {/* Audio waveform overlay for ff_audio preview */}
             {nodeDefinition.id === 'ff_audio' && (
               <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
                 <svg width="200" height="40" viewBox="0 0 200 40" className="animate-audio-waveform">
                   <rect x="0" y="0" width="200" height="40" fill="rgba(0,0,0,0.7)" rx="5"/>
                   <g className="waveform-bars">
                     <rect x="10" y="15" width="4" height="10" fill="#00ff00" className="audio-bar-1"/>
                     <rect x="20" y="10" width="4" height="20" fill="#00ff00" className="audio-bar-2"/>
                     <rect x="30" y="18" width="4" height="4" fill="#00ff00" className="audio-bar-3"/>
                     <rect x="40" y="5" width="4" height="30" fill="#00ff00" className="audio-bar-4"/>
                     <rect x="50" y="12" width="4" height="16" fill="#00ff00" className="audio-bar-5"/>
                     <rect x="60" y="8" width="4" height="24" fill="#00ff00" className="audio-bar-6"/>
                     <rect x="70" y="16" width="4" height="8" fill="#00ff00" className="audio-bar-7"/>
                     <rect x="80" y="3" width="4" height="34" fill="#00ff00" className="audio-bar-8"/>
                     <rect x="90" y="14" width="4" height="12" fill="#00ff00" className="audio-bar-9"/>
                     <rect x="100" y="6" width="4" height="28" fill="#00ff00" className="audio-bar-10"/>
                     <rect x="110" y="17" width="4" height="6" fill="#00ff00" className="audio-bar-11"/>
                     <rect x="120" y="9" width="4" height="22" fill="#00ff00" className="audio-bar-12"/>
                     <rect x="130" y="13" width="4" height="14" fill="#00ff00" className="audio-bar-13"/>
                     <rect x="140" y="7" width="4" height="26" fill="#00ff00" className="audio-bar-14"/>
                     <rect x="150" y="11" width="4" height="18" fill="#00ff00" className="audio-bar-15"/>
                     <rect x="160" y="4" width="4" height="32" fill="#00ff00" className="audio-bar-16"/>
                     <rect x="170" y="15" width="4" height="10" fill="#00ff00" className="audio-bar-17"/>
                     <rect x="180" y="2" width="4" height="36" fill="#00ff00" className="audio-bar-18"/>
                     <rect x="190" y="12" width="4" height="16" fill="#00ff00" className="audio-bar-19"/>
                   </g>
                 </svg>
               </div>
             )}
             {/* Timeline cut overlay for ff_cut preview */}
             {nodeDefinition.id === 'ff_cut' && (
               <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
                 <div className="relative">
                   <div className="w-64 h-6 bg-gray-800 rounded-full border-2 border-gray-600">
                     <div className="animate-cut-timeline h-full bg-blue-500 rounded-full"></div>
                   </div>
                   <div className="absolute top-0 left-0 w-full h-full">
                     <div className="animate-cut-left-scissors absolute top-0 left-0 w-4 h-6 text-red-500">
                       ✂️
                     </div>
                     <div className="animate-cut-right-scissors absolute top-0 right-0 w-4 h-6 text-red-500">
                       ✂️
                     </div>
                   </div>
                 </div>
               </div>
             )}
             {/* Timeline middle cut overlay for ff_middle preview */}
             {nodeDefinition.id === 'ff_middle' && (
               <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
                 <div className="relative">
                   <div className="w-64 h-6 bg-gray-800 rounded-full border-2 border-gray-600">
                     <div className="animate-middle-timeline h-full bg-green-500 rounded-full"></div>
                   </div>
                   <div className="absolute top-0 left-0 w-full h-full">
                     <div className="animate-middle-left-scissors absolute top-0 left-0 w-4 h-6 text-red-500">
                       ✂️
                     </div>
                     <div className="animate-middle-right-scissors absolute top-0 right-0 w-4 h-6 text-red-500">
                       ✂️
                     </div>
                   </div>
                 </div>
               </div>
             )}
             {/* Dual timeline grouptime cut overlay for ff_grouptime preview */}
             {nodeDefinition.id === 'ff_grouptime' && (
               <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
                 <div className="relative flex gap-2">
                   <div className="relative">
                     <div className="w-32 h-6 bg-gray-800 rounded-full border-2 border-gray-600">
                       <div className="animate-grouptime-timeline-1 h-full bg-purple-500 rounded-full"></div>
                     </div>
                     <div className="absolute top-0 left-0 w-full h-full">
                       <div className="animate-grouptime-left-scissors-1 absolute top-0 left-0 w-4 h-6 text-red-500">
                         ✂️
                       </div>
                       <div className="animate-grouptime-right-scissors-1 absolute top-0 right-0 w-4 h-6 text-red-500">
                         ✂️
                       </div>
                     </div>
                   </div>
                   <div className="relative">
                     <div className="w-32 h-6 bg-gray-800 rounded-full border-2 border-gray-600">
                       <div className="animate-grouptime-timeline-2 h-full bg-orange-500 rounded-full"></div>
                     </div>
                     <div className="absolute top-0 left-0 w-full h-full">
                       <div className="animate-grouptime-left-scissors-2 absolute top-0 left-0 w-4 h-6 text-red-500">
                         ✂️
                       </div>
                       <div className="animate-grouptime-right-scissors-2 absolute top-0 right-0 w-4 h-6 text-red-500">
                         ✂️
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             )}
             {/* Concatenation overlay for ff_concat preview */}
             {nodeDefinition.id === 'ff_concat' && (
               <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
                 <div className="relative flex gap-1">
                   <div className="animate-concat-segment-1 w-20 h-6 bg-blue-500 rounded-l-full border-2 border-blue-600"></div>
                   <div className="animate-concat-segment-2 w-20 h-6 bg-green-500 border-2 border-green-600"></div>
                   <div className="animate-concat-segment-3 w-20 h-6 bg-purple-500 rounded-r-full border-2 border-purple-600"></div>
                   <div className="absolute top-0 left-0 w-full h-full">
                     <div className="animate-concat-arrow-1 absolute top-0 left-1/4 transform -translate-x-1/2 text-yellow-400 text-lg">
                       →
                     </div>
                     <div className="animate-concat-arrow-2 absolute top-0 right-1/4 transform translate-x-1/2 text-yellow-400 text-lg">
                       →
                     </div>
                   </div>
                 </div>
               </div>
             )}
             {/* Append overlay for ff_append preview */}
             {nodeDefinition.id === 'ff_append' && (
               <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
                 <div className="relative flex gap-2">
                   <div className="animate-append-first w-24 h-6 bg-red-500 rounded-l-full border-2 border-red-600"></div>
                   <div className="animate-append-second w-24 h-6 bg-blue-500 rounded-r-full border-2 border-blue-600"></div>
                   <div className="absolute top-0 left-0 w-full h-full">
                     <div className="animate-append-arrow absolute top-0 left-1/2 transform -translate-x-1/2 text-yellow-400 text-lg">
                       ⚡
                     </div>
                   </div>
                 </div>
               </div>
             )}
             {/* Transition overlay for ff_transition preview */}
             {nodeDefinition.id === 'ff_transition' && (
               <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
                 <div className="relative flex gap-1">
                   <div className="animate-transition-first w-20 h-6 bg-purple-500 rounded-l-full border-2 border-purple-600"></div>
                   <div className="animate-transition-effect w-8 h-6 bg-gradient-to-r from-purple-500 to-orange-500 border-2 border-gray-600"></div>
                   <div className="animate-transition-second w-20 h-6 bg-orange-500 rounded-r-full border-2 border-orange-600"></div>
                   <div className="absolute top-0 left-0 w-full h-full">
                     <div className="animate-transition-sparkle absolute top-0 left-1/2 transform -translate-x-1/2 text-yellow-300 text-lg">
                       ✨
                     </div>
                   </div>
                 </div>
               </div>
             )}
             {/* Image to video overlay for ff_image preview */}
             {nodeDefinition.id === 'ff_image' && (
               <div className="absolute inset-0 z-20">
                 {/* Moving image in bottom half */}
                 <img 
                   src="/test-image.jpg" 
                   alt="Moving image"
                   className="absolute bottom-4 left-0 w-40 h-20 object-cover border-2 border-gray-500 rounded animate-image-move"
                 />
               </div>
             )}
             {/* Thumbnail overlay for ff_thumbnail preview */}
             {nodeDefinition.id === 'ff_thumbnail' && (
               <div className="absolute inset-0 z-20">
                 {/* Flash overlay */}
                 <div className="animate-thumbnail-flash absolute inset-0 bg-white opacity-0"></div>
                 {/* Shrinking thumbnail copy */}
                 <img 
                   src="/test-image.jpg" 
                   alt="Thumbnail copy"
                   className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-20 object-cover border-2 border-blue-500 rounded animate-thumbnail-shrink"
                 />
               </div>
             )}
             {/* Overlay image for ff_overlay preview */}
            {nodeDefinition.id === 'ff_overlay' && (
              <img 
                src="/test-image.jpg" 
                alt="Overlay"
                className="absolute inset-0 w-full h-full object-cover animate-overlay-loop"
                style={{
                  objectFit: 'cover',
                  objectPosition: 'center',
                  transform: 'translate(-50%, -50%)',
                  left: '50%',
                  top: '50%',
                  opacity: 1,
                  zIndex: 10
                }}
              />
            )}
            {/* Stack grid images for ff_stack preview */}
            {nodeDefinition.id === 'ff_stack' && (
              <>
                <img 
                  src="/test-image.jpg" 
                  alt="Stack 1"
                  className="absolute inset-0 w-full h-full object-cover animate-stack-loop"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'center',
                    transform: 'translate(-50%, -50%)',
                    left: '25%',
                    top: '25%',
                    width: '50%',
                    height: '50%',
                    opacity: 0.8,
                    zIndex: 10
                  }}
                />
                <img 
                  src="/test-image.jpg" 
                  alt="Stack 2"
                  className="absolute inset-0 w-full h-full object-cover animate-stack-loop"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'center',
                    transform: 'translate(-50%, -50%)',
                    left: '75%',
                    top: '25%',
                    width: '50%',
                    height: '50%',
                    opacity: 0.8,
                    zIndex: 10
                  }}
                />
                <img 
                  src="/test-image.jpg" 
                  alt="Stack 3"
                  className="absolute inset-0 w-full h-full object-cover animate-stack-loop"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'center',
                    transform: 'translate(-50%, -50%)',
                    left: '25%',
                    top: '75%',
                    width: '50%',
                    height: '50%',
                    opacity: 0.8,
                    zIndex: 10
                  }}
                />
                <img 
                  src="/test-image.jpg" 
                  alt="Stack 4"
                  className="absolute inset-0 w-full h-full object-cover animate-stack-loop"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'center',
                    transform: 'translate(-50%, -50%)',
                    left: '75%',
                    top: '75%',
                    width: '50%',
                    height: '50%',
                    opacity: 0.8,
                    zIndex: 10
                  }}
                />
              </>
            )}


          </div>
        </div>
      )}
      
      <div className="mb-3">
        <label className="text-xs text-muted-foreground block mb-1">
          Description
        </label>
        <textarea
          value={node.parameters.description || nodeDefinition?.description || ''}
          onChange={(e) => onParameterChange(node.id, 'description', e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-full px-2 py-1 text-xs bg-input border border-border rounded resize-none"
          placeholder="Enter description..."
          rows={2}
        />
      </div>

      {/* All Input Parameters */}
      {(() => {
        // Get all inputs (static + dynamic)
        const allInputs = [...(nodeDefinition?.inputs || [])];
        
        // Add dynamic inputs that exist in the node
        const dynamicInputs = Object.keys(node.parameters).filter(key => {
          const baseInput = nodeDefinition?.inputs.find(input => input.dynamic && key.startsWith(input.name.replace(/\d+$/, '')));
          return baseInput && !allInputs.find(input => input.name === key);
        });
        
        dynamicInputs.forEach(inputName => {
          const baseInput = nodeDefinition?.inputs.find(input => input.dynamic && inputName.startsWith(input.name.replace(/\d+$/, '')));
          if (baseInput) {
            allInputs.push({
              ...baseInput,
              name: inputName,
              required: false // Dynamic inputs are never required
            });
          }
        });

        return allInputs.map((inputDef: any) => {
          const isDynamic = inputDef.dynamic && inputDef.name !== nodeDefinition?.inputs.find(input => input.dynamic && inputDef.name.startsWith(input.name.replace(/\d+$/, '')))?.name;
          const baseInputName = nodeDefinition?.inputs.find(input => input.dynamic && inputDef.name.startsWith(input.name.replace(/\d+$/, '')))?.name;
          
          return (
            <div key={inputDef.name} className="mb-2">
              <div className="flex items-center space-x-2 mb-1">
                {inputDef.type === 'file' && (
                  <div 
                    className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white cursor-pointer hover:bg-orange-400 transition-colors shadow-sm flex-shrink-0"
                    data-socket-type="input"
                    data-node-id={node.id}
                    data-socket-id={inputDef.name}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onSocketMouseDown(node.id, inputDef.name, 'input', e);
                    }}
                    title={`Connect to: ${inputDef.name}`}
                  />
                )}
                <label className="text-xs text-muted-foreground flex-1">
                  {inputDef.name}
                  {inputDef.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                
                {/* Dynamic input controls */}
                {inputDef.dynamic && baseInputName && (
                  <div className="flex items-center space-x-1">
                    {isDynamic && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveDynamicInput(node.id, inputDef.name);
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded p-1 transition-colors"
                        title="Remove input"
                      >
                        −
                      </button>
                    )}
                    {inputDef.name === baseInputName && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddDynamicInput(node.id, baseInputName);
                        }}
                        className="text-green-500 hover:text-green-700 hover:bg-green-500/10 rounded p-1 transition-colors"
                        title="Add input"
                      >
                        +
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {inputDef.type === 'select' ? (
                <select
                  value={node.parameters[inputDef.name] || inputDef.default || ''}
                  onChange={(e) => onParameterChange(node.id, inputDef.name, e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full px-2 py-1 text-xs bg-input border border-border rounded"
                >
                  {inputDef.options?.map((option: string) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : inputDef.type === 'boolean' ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={node.parameters[inputDef.name] || inputDef.default || false}
                    onChange={(e) => onParameterChange(node.id, inputDef.name, e.target.checked)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="rounded"
                  />
                  <span className="text-xs text-muted-foreground">
                    {node.parameters[inputDef.name] || inputDef.default ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ) : inputDef.transitionOptions ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={node.parameters[inputDef.name] || inputDef.default || ''}
                    onChange={(e) => onParameterChange(node.id, inputDef.name, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1 text-xs bg-input border border-border rounded"
                    placeholder="Click buttons below to add transitions (comma-separated)"
                  />
                  <div className="grid grid-cols-4 gap-1 max-h-32 overflow-y-auto">
                    {inputDef.transitionOptions.map((transition: string) => {
                      const currentValue = node.parameters[inputDef.name] || inputDef.default || '';
                      const isSelected = currentValue.split(',').map((t: string) => t.trim()).includes(transition);
                      
                      return (
                        <button
                          key={transition}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const currentTransitions = currentValue.split(',').map((t: string) => t.trim()).filter((t: string) => t);
                            let newTransitions;
                            
                            if (isSelected) {
                              // Remove transition
                              newTransitions = currentTransitions.filter((t: string) => t !== transition);
                            } else {
                              // Add transition
                              newTransitions = [...currentTransitions, transition];
                            }
                            
                            onParameterChange(node.id, inputDef.name, newTransitions.join(', '));
                          }}
                          className={`px-2 py-1 text-xs rounded border transition-colors ${
                            isSelected 
                              ? 'bg-blue-500 text-white border-blue-600' 
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                          }`}
                          title={transition}
                        >
                          {transition}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <input
                  type={inputDef.type === 'number' ? 'number' : 'text'}
                  value={node.parameters[inputDef.name] || inputDef.default || ''}
                  onChange={(e) => onParameterChange(node.id, inputDef.name, e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full px-2 py-1 text-xs bg-input border border-border rounded"
                  placeholder={inputDef.description || `Enter ${inputDef.name}`}
                />
              )}
              
              {inputDef.description && (
                <div className="text-xs text-muted-foreground mt-1 opacity-75">
                  {inputDef.description}
                </div>
              )}
            </div>
          );
        });
      })()}

      {/* Output sockets */}
      <div className="space-y-1 mt-2">
        {node.outputs.map((output) => (
          <div key={output.id} className="flex items-center justify-end space-x-2">
            <span className="text-xs">{output.name}</span>
            <div 
              className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white cursor-pointer hover:bg-blue-400 transition-colors shadow-sm"
              data-socket-type="output"
              data-node-id={node.id}
              data-socket-id={output.id}
              onMouseDown={(e) => {
                e.stopPropagation();
                onSocketMouseDown(node.id, output.id, 'output', e);
              }}
              title={`Output: ${output.name}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export interface SimpleNodeEditorHandle {
  addNode: (nodeDefinition: NodeDefinition, position?: { x: number; y: number }) => string;
  removeSelectedNodes: () => void;
  clearAll: () => void;
  getEditor: () => SimpleNodeEditor;
  setGridSnapEnabled: (enabled: boolean) => void;
  setGridSize: (size: number) => void;
  getGridSize: () => number;
  saveLayout: () => string;
  loadLayout: (layoutJson: string) => boolean;
  setPanOffset: (x: number, y: number) => void;
  getPanOffset: () => { x: number; y: number };
  setIsPanning: (isPanning: boolean) => void;
  getIsPanning: () => boolean;
}

export const SimpleNodeEditorComponent = forwardRef<SimpleNodeEditorHandle, SimpleNodeEditorProps>(({
  onNodesChange,
  onConnectionsChange,
  onExportReady,
  previewEnabled = true
}, ref) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editor] = useState(() => new SimpleNodeEditor());
  const [editorState, setEditorState] = useState<EditorState>(editor.getState());
  const [connectionDrag, setConnectionDrag] = useState<{
    from: { nodeId: string; socketId: string; type: 'input' | 'output' };
    fromPos: { x: number; y: number };
    to: { x: number; y: number };
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleStateChange = (state: EditorState) => {
      setEditorState(state);
      
      // Update parent components
      if (onNodesChange) {
        const nodes = state.nodes.map(node => ({
          id: node.id,
          name: node.type,
          data: node.parameters
        }));
        onNodesChange(nodes);
      }

      if (onConnectionsChange) {
        const connections = state.connections.map(conn => ({
          from: conn.from.nodeId,
          to: conn.to.nodeId,
          output: conn.from.socketId,
          input: conn.to.socketId
        }));
        onConnectionsChange(connections);
      }

      if (onExportReady) {
        const exportData = editor.exportData();
        const exporter = new JsonExporter();
        exporter.setNodes(exportData.nodes);
        exporter.setConnections(exportData.connections);
        onExportReady(exporter);
      }
    };

    editor.onStateChange(handleStateChange);
    return () => editor.removeListener(handleStateChange);
  }, [editor, onNodesChange, onConnectionsChange, onExportReady]);

  // Handle keyboard events for node deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle delete if we're not typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConnection) {
          e.preventDefault();
          editor.removeConnection(selectedConnection);
          setSelectedConnection(null);
        } else if (editorState.selectedNodes.length > 0) {
          e.preventDefault();
          editorState.selectedNodes.forEach(nodeId => {
            editor.removeNode(nodeId);
          });
        } else {
          // Check for selected comments
          const selectedComments = editorState.comments.filter(comment => comment.selected);
          if (selectedComments.length > 0) {
            e.preventDefault();
            selectedComments.forEach(comment => {
              editor.deleteComment(comment.id);
            });
          }
        }
      }

      // Close context menu on Escape
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };

    const handleClickOutside = () => {
      setContextMenu(null);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [editor, editorState.selectedNodes, selectedConnection]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only handle clicks directly on the canvas div, not on child elements
    if (e.target === canvasRef.current && !editorState.isPanning) {
      editor.clearSelection();
      editor.clearCommentSelection();
      setContextMenu(null);
      setSelectedConnection(null);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Check if we're clicking on empty space (not on nodes, comments, or other interactive elements)
    const target = e.target as HTMLElement;
    const isInteractiveElement = target.closest('[data-node-id], [data-comment-id], [data-socket-type], .node-component, .comment-component, .resize-handle');
    
    if (!isInteractiveElement && e.button === 0) { // Left mouse button and not on interactive elements
      // Start panning
      editor.setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault(); // Prevent default behavior
    }
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    // Check if we're clicking on empty space (not on nodes, comments, or other interactive elements)
    const target = e.target as HTMLElement;
    const isInteractiveElement = target.closest('[data-node-id], [data-comment-id], [data-socket-type], .node-component, .comment-component, .resize-handle');
    
    if (!isInteractiveElement) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const panOffset = editor.getPanOffset();
        const x = e.clientX - rect.left - panOffset.x;
        const y = e.clientY - rect.top - panOffset.y;
        
        // Create a new comment at the click position
        editor.addComment(x, y, 'New comment');
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const nodeDefinitionId = e.dataTransfer.getData('application/node-definition');
    if (!nodeDefinitionId || !canvasRef.current) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const panOffset = editor.getPanOffset();
    const position = {
      x: e.clientX - rect.left - 100 - panOffset.x, // Account for pan offset
      y: e.clientY - rect.top - 50 - panOffset.y
    };

    editor.addNode(nodeDefinitionId, position);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleSocketMouseDown = (nodeId: string, socketId: string, type: 'input' | 'output', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (type === 'output') {
      // Start connection drag from output socket - use dynamic positioning
      const fromNode = editorState.nodes.find(n => n.id === nodeId);
      if (fromNode && canvasRef.current) {
        // Use the same socket element-based calculation as connection lines
        const calculateSocketPosition = (node: EditorNode, socketType: 'input' | 'output', socketId: string) => {
          if (socketType === 'output') {
            const canvasElement = canvasRef.current;
            
            if (canvasElement) {
              // Try to find the actual socket element
              const socketElement = document.querySelector(`[data-node-id="${node.id}"][data-socket-id="${socketId}"][data-socket-type="${socketType}"]`);
              
              if (socketElement) {
                const socketRect = socketElement.getBoundingClientRect();
                const canvasRect = canvasElement.getBoundingClientRect();
                
                // Get the center of the socket element
                return {
                  x: socketRect.left - canvasRect.left + socketRect.width / 2,
                  y: socketRect.top - canvasRect.top + socketRect.height / 2
                };
              }
            }
            
            // Fallback to calculated position if socket element not found
            const nodeElement = document.querySelector(`[data-node-id="${node.id}"]`);
            
            if (nodeElement && canvasElement) {
              const nodeRect = nodeElement.getBoundingClientRect();
              const canvasRect = canvasElement.getBoundingClientRect();
              
              // Convert to canvas-relative coordinates
              const relativeX = nodeRect.left - canvasRect.left;
              const relativeY = nodeRect.top - canvasRect.top;
              const nodeWidth = nodeRect.width;
              const nodeHeight = nodeRect.height;
              
              return {
                x: relativeX + nodeWidth - 16, // 16px from right edge
                y: relativeY + nodeHeight - 16 // 16px from bottom edge
              };
            }
          }
          return { x: 0, y: 0 };
        };
        
        const socketPos = calculateSocketPosition(fromNode, 'output', socketId);
        
        const dragData = {
          from: { nodeId, socketId, type },
          fromPos: { x: socketPos.x, y: socketPos.y }, // Store the original socket position
          to: { x: socketPos.x, y: socketPos.y } // Start at the same position
        };
        setConnectionDrag(dragData);
      }
    } else {
      console.log('Clicked on input socket - connections start from outputs');
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (connectionDrag && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const panOffset = editor.getPanOffset();
      const newPos = { 
        x: e.clientX - rect.left - panOffset.x, 
        y: e.clientY - rect.top - panOffset.y 
      };
      console.log('Canvas mouse move - updating drag to:', newPos);
      setConnectionDrag({
        ...connectionDrag,
        to: newPos
      });
    }
    
    // Handle panning
    if (panStart && editorState.isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      const currentOffset = editor.getPanOffset();
      const newOffset = { x: currentOffset.x + deltaX, y: currentOffset.y + deltaY };
      editor.setPanOffset(newOffset.x, newOffset.y);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    // Stop panning
    if (editorState.isPanning) {
      editor.setIsPanning(false);
      setPanStart(null);
    }
    if (connectionDrag) {
      // Check if we're over an input socket
      const target = e.target as HTMLElement;
      const socketElement = target.closest('[data-socket-type="input"]');
      
      if (socketElement) {
        const targetNodeId = socketElement.getAttribute('data-node-id');
        const targetSocketId = socketElement.getAttribute('data-socket-id');
        
        if (targetNodeId && targetSocketId) {
          // Create connection
          editor.addConnection(
            connectionDrag.from.nodeId,
            connectionDrag.from.socketId,
            targetNodeId,
            targetSocketId
          );
        }
      }
      
      setConnectionDrag(null);
    }
  };

  const handleNodeMove = (nodeId: string, x: number, y: number) => {
    editor.moveNode(nodeId, { x, y });
  };

  const handleNodeSelect = (nodeId: string) => {
    editor.selectNode(nodeId);
  };

  const handleParameterChange = (nodeId: string, param: string, value: any) => {
    editor.updateNodeParameter(nodeId, param, value);
  };

  const handleDeleteNode = (nodeId: string) => {
    editor.removeNode(nodeId);
  };

  const handleNodeContextMenu = (nodeId: string, x: number, y: number) => {
    setContextMenu({ x, y, nodeId });
  };

  const handleAddDynamicInput = (nodeId: string, baseInputName: string) => {
    editor.addDynamicInput(nodeId, baseInputName);
  };

  const handleRemoveDynamicInput = (nodeId: string, inputName: string) => {
    editor.removeDynamicInput(nodeId, inputName);
  };

  // Comment handlers
  const handleCommentMove = useCallback((commentId: string, x: number, y: number) => {
    editor.updateComment(commentId, { x, y });
  }, [editor]);

  const handleCommentSelect = useCallback((commentId: string) => {
    editor.selectComment(commentId);
  }, [editor]);

  const handleCommentUpdate = useCallback((commentId: string, updates: Partial<CanvasComment>) => {
    editor.updateComment(commentId, updates);
  }, [editor]);

  const handleCommentDelete = useCallback((commentId: string) => {
    editor.deleteComment(commentId);
  }, [editor]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    addNode: (nodeDefinition: NodeDefinition, position?: { x: number; y: number }) => {
      const pos = position || { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 };
      return editor.addNode(nodeDefinition.id, pos);
    },
    removeSelectedNodes: () => {
      editorState.selectedNodes.forEach(nodeId => {
        editor.removeNode(nodeId);
      });
    },
    clearAll: () => {
      editor.clearAll();
    },
    getEditor: () => editor,
    setGridSnapEnabled: (enabled: boolean) => {
      editor.setGridSnapEnabled(enabled);
    },
    setGridSize: (size: number) => {
      editor.setGridSize(size);
    },
    getGridSize: () => {
      return editor.getGridSize();
    },
    saveLayout: () => {
      return editor.saveLayout();
    },
    loadLayout: (layoutJson: string) => {
      return editor.loadLayout(layoutJson);
    },
    setPanOffset: (x: number, y: number) => {
      editor.setPanOffset(x, y);
    },
    getPanOffset: () => {
      return editor.getPanOffset();
    },
    setIsPanning: (isPanning: boolean) => {
      editor.setIsPanning(isPanning);
    },
    getIsPanning: () => {
      return editor.getIsPanning();
    }
  }), [editor, editorState.selectedNodes]);

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full bg-background border border-border rounded-lg overflow-hidden"
      onClick={handleCanvasClick}
      onDoubleClick={handleCanvasDoubleClick}
      onMouseDown={handleCanvasMouseDown}
      onMouseUp={handleCanvasMouseUp}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={(e) => {
        e.preventDefault();
        console.log('Drag enter canvas');
      }}
      onMouseMove={handleCanvasMouseMove}
      style={{ 
        minHeight: '600px',
        cursor: editorState.isPanning ? 'grabbing' : 'grab'
      }}
    >
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />

      {/* Canvas content with pan transform */}
      <div 
        className="absolute inset-0"
        style={{
          transform: `translate(${editorState.panOffset.x}px, ${editorState.panOffset.y}px)`,
          transformOrigin: '0 0'
        }}
      >

        {/* Nodes */}
        {editorState.nodes.map((node) => (
        <NodeComponent
          key={node.id}
          node={node}
          onMove={handleNodeMove}
          onSelect={handleNodeSelect}
          onParameterChange={handleParameterChange}
          onSocketMouseDown={handleSocketMouseDown}
          onDeleteNode={handleDeleteNode}
          onContextMenu={handleNodeContextMenu}
          onAddDynamicInput={handleAddDynamicInput}
          onRemoveDynamicInput={handleRemoveDynamicInput}
          previewEnabled={previewEnabled}
        />
      ))}

        {/* Comments */}
        {editorState.comments.map((comment) => (
          <CommentComponent
            key={comment.id}
            comment={comment}
            onMove={handleCommentMove}
            onSelect={handleCommentSelect}
            onUpdate={handleCommentUpdate}
            onDelete={handleCommentDelete}
          />
        ))}

        {/* Connections - Simple and Visible (inside pan transform) */}
        <svg 
          className="absolute inset-0 pointer-events-none" 
          style={{ zIndex: 10, width: '100%', height: '100%' }}
          viewBox={`0 0 ${canvasRef.current?.offsetWidth || 1200} ${canvasRef.current?.offsetHeight || 800}`}
        >


        
        {editorState.connections.map((connection, index) => {
          console.log(`Rendering connection ${index}:`, connection);
          const fromNode = editorState.nodes.find(n => n.id === connection.from.nodeId);
          const toNode = editorState.nodes.find(n => n.id === connection.to.nodeId);
          
          if (!fromNode || !toNode) {
            console.log('Missing nodes for connection:', { fromNode, toNode, connection });
            return null;
          }

          // Calculate socket positions in original coordinate space (before pan transform)
          const calculateSocketPosition = (node: EditorNode, socketType: 'input' | 'output', socketId: string) => {
            const nodeX = node.position.x;
            const nodeY = node.position.y;
            
            if (socketType === 'input') {
              // Input sockets are positioned next to their input fields
              const nodeDefinition = getNodeDefinition(node.type);
              if (!nodeDefinition) return { x: 0, y: 0 };
              
              // Find the input parameter index
              const inputIndex = nodeDefinition.inputs.findIndex(input => input.name === socketId);
              
              if (inputIndex >= 0) {
                // Calculate position based on the actual node layout
                const titleHeight = 20; // Title section height
                const titleMargin = 8; // mb-2
                const descHeight = 40; // Description textarea height
                const descMargin = 12; // mb-3
                const previewHeight = previewEnabled ? 194 : 1; // Preview section height (dynamic based on setting)
                const paramSpacing = 32; // mb-2 (8px) + input height (~24px)
                const paramStartY = titleHeight + titleMargin + descHeight + descMargin;
                
                return {
                  x: nodeX + 22, // 8px from left edge (closer to the socket)
                  y: nodeY + (titleMargin + titleHeight + titleMargin) + (descMargin + titleHeight + descHeight + descMargin ) + titleMargin + previewHeight// Y-Position of the out dot.
                };
              }
            } else {
              // Output sockets are at the bottom right corner
              const nodeDefinition = getNodeDefinition(node.type);
              if (!nodeDefinition) return { x: 0, y: 0 };
              
              // Output sockets are positioned on the right side, not at the bottom
              const titleHeight = 20;
              const titleMargin = 8; // mb-2
              const descHeight = 40;
              const descMargin = 12; // mb-3
              const paramSpacing = 32; // mb-2 (8px) + input height (~24px)
              const paramStartY = titleHeight + titleMargin + descHeight + descMargin;
              const inputsHeight = nodeDefinition.inputs.length * paramSpacing;
              const outputMargin = 8; // mt-2
              const outputHeight = 20; // Output section height
              
              // Get actual node width for dynamic positioning
              const nodeElement = document.querySelector(`[data-node-id="${node.id}"]`);
              const nodeWidth = nodeElement ? nodeElement.getBoundingClientRect().width : 200;
              const nodeHeight = nodeElement ? nodeElement.getBoundingClientRect().height : 200;

              console.log('titleHeight:', titleHeight);
              console.log('titleMargin:', titleMargin);
              console.log('descHeight:', descHeight);
              console.log('descMargin:', descMargin);
              console.log('inputsHeight:', inputsHeight);
              console.log('paramStartY:', paramStartY);
              console.log('nodeY:', nodeY);
              console.log('nodeHeight:', nodeHeight);

              
              // Output socket is positioned on the right side, at the bottom of the node
              return {
                x: nodeX + nodeWidth - 20, // 8px from right edge (using actual node width)
                y: nodeY + nodeHeight - 20 // Bottom of output section
              };
            }
            
            return { x: 0, y: 0 };
          };
          
          // Calculate exact positions for both sockets
          const fromPos = calculateSocketPosition(fromNode, 'output', connection.from.socketId);
          const toPos = calculateSocketPosition(toNode, 'input', connection.to.socketId);
          
          const fromX = fromPos.x;
          const fromY = fromPos.y;
          const toX = toPos.x;
          const toY = toPos.y;

          console.log(`Connection ${index} coordinates:`, { fromX, fromY, toX, toY });

          return (
            <g key={connection.id || `conn-${index}`}>
              {/* Clickable connection line with wider hit area */}
              <path
                d={`M ${fromX} ${fromY} C ${fromX + 80} ${fromY} ${toX - 80} ${toY} ${toX} ${toY}`}
                stroke="transparent"
                strokeWidth="20"
                fill="none"
                className="cursor-pointer"
                style={{ pointerEvents: 'auto' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedConnection(connection.id);
                  setContextMenu(null); // Close any open context menu
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (window.confirm('Delete this connection?')) {
                    editor.removeConnection(connection.id);
                  }
                }}
              />
              {/* Visible connection line */}
              <path
                d={`M ${fromX} ${fromY} C ${fromX + 80} ${fromY} ${toX - 80} ${toY} ${toX} ${toY}`}
                stroke={selectedConnection === connection.id ? "#ef4444" : "#3b82f6"}
                strokeWidth={selectedConnection === connection.id ? "4" : "3"}
                fill="none"
                opacity="0.9"
                className="pointer-events-none"
              />
              {/* Socket connection points - larger for debugging */}
              <circle cx={fromX} cy={fromY} r="6" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
              <circle cx={toX} cy={toY} r="6" fill="#f97316" stroke="#fff" strokeWidth="2" />
              

            </g>
          );
        })}
        
        {/* Connection drag line */}
        {connectionDrag && (() => {
          const fromNode = editorState.nodes.find(n => n.id === connectionDrag.from.nodeId);
          if (!fromNode) return null;
          
          // Calculate the actual socket position dynamically
          const nodeX = fromNode.position.x;
          const nodeY = fromNode.position.y;
          const nodeDefinition = getNodeDefinition(fromNode.type);
          if (!nodeDefinition) return null;
          
          // Get actual node width for dynamic positioning
          const nodeElement = document.querySelector(`[data-node-id="${fromNode.id}"]`);
          const nodeWidth = nodeElement ? nodeElement.getBoundingClientRect().width : 200;
          const nodeHeight = nodeElement ? nodeElement.getBoundingClientRect().height : 200;

          const fromX = nodeX + nodeWidth - 20; // Output socket X position
          const fromY = nodeY + nodeHeight - 20; // Output socket Y position
          const toX = connectionDrag.to.x;
          const toY = connectionDrag.to.y;
          
          return (
            <path
              d={`M ${fromX} ${fromY} Q ${(fromX + toX) / 2} ${fromY} ${toX} ${toY}`}
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
            />
          );
        })()}
        </svg>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-card border border-border rounded-lg shadow-lg z-50 py-1 min-w-32"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            onClick={() => {
              editor.removeNode(contextMenu.nodeId);
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 transition-colors"
          >
            🗑️ Delete Node
          </button>
          <button
            onClick={() => {
              editor.selectNode(contextMenu.nodeId);
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors"
          >
            ✅ Select Node
          </button>
        </div>
      )}

      {/* Help text */}
      {editorState.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="text-lg mb-2">Drag nodes from the sidebar to get started</p>
            <p className="text-sm mb-4">Create your video processing pipeline visually</p>
            {/* Test buttons to create a demo pipeline */}
            <div className="space-x-2">
              <button
                onClick={() => {
                  // Create a demo pipeline: Download -> Scale -> Crop
                  const downloadId = editor.addNode('ff_download', { x: 100, y: 200 });
                  const scaleId = editor.addNode('ff_scale', { x: 400, y: 200 });
                  const cropId = editor.addNode('ff_crop', { x: 700, y: 200 });
                  
                  // Add connections after a small delay to ensure nodes are created
                  setTimeout(() => {
                    editor.addConnection(downloadId, 'video', scaleId, 'input');
                    editor.addConnection(scaleId, 'video', cropId, 'input');
                  }, 100);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
              >
                🎬 Create Demo Pipeline
              </button>
              <button
                onClick={() => {
                  // Create just two nodes for manual connection testing
                  editor.addNode('ff_download', { x: 150, y: 150 });
                  editor.addNode('ff_scale', { x: 450, y: 150 });
                }}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors text-sm"
              >
                ⚡ Create Test Nodes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
});

SimpleNodeEditorComponent.displayName = 'SimpleNodeEditorComponent';

export default SimpleNodeEditorComponent;
