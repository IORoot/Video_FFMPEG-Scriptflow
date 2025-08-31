import React, { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { SimpleNodeEditor, EditorState, EditorNode, CanvasComment } from '../lib/simpleNodeEditor';
import { NodeDefinition, getNodeDefinition } from '../lib/nodeDefinitions';
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
}> = ({ node, onMove, onSelect, onParameterChange, onSocketMouseDown, onDeleteNode, onContextMenu, onAddDynamicInput, onRemoveDynamicInput }) => {
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
          {nodeDefinition && (
            <div className={`w-3 h-3 ${getNodeColor(nodeDefinition.category).dot} rounded-full flex-shrink-0`} />
          )}
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
  onExportReady
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
                const paramSpacing = 32; // mb-2 (8px) + input height (~24px)
                const paramStartY = titleHeight + titleMargin + descHeight + descMargin;
                
                return {
                  x: nodeX + 23, // 8px from left edge (closer to the socket)
                  y: nodeY + (titleMargin + titleHeight + titleMargin) + (descMargin + titleHeight + descHeight + descMargin ) + titleMargin +1// Center of the parameter row + 20px down
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
