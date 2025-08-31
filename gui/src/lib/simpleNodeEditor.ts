// Simple node editor implementation without Rete.js dependency issues
export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeSocket {
  id: string;
  type: 'input' | 'output';
  dataType: 'video' | 'audio' | 'image' | 'text' | 'number';
  name: string;
}

export interface NodeConnection {
  id: string;
  from: { nodeId: string; socketId: string };
  to: { nodeId: string; socketId: string };
}

export interface EditorNode {
  id: string;
  type: string;
  name: string;
  position: NodePosition;
  inputs: NodeSocket[];
  outputs: NodeSocket[];
  parameters: { [key: string]: any };
  selected: boolean;
}

export interface CanvasComment {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  backgroundColor: string;
  fontColor: string;
  fontSize: number;
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  selected: boolean;
}

export interface EditorState {
  nodes: EditorNode[];
  connections: NodeConnection[];
  selectedNodes: string[];
  comments: CanvasComment[];
  dragState: {
    isDragging: boolean;
    draggedNode?: string;
    offset?: { x: number; y: number };
  };
  connectionState: {
    isConnecting: boolean;
    fromSocket?: { nodeId: string; socketId: string };
  };
  gridSnapEnabled: boolean;
}

export class SimpleNodeEditor {
  private state: EditorState = {
    nodes: [],
    connections: [],
    selectedNodes: [],
    comments: [],
    dragState: { isDragging: false },
    connectionState: { isConnecting: false },
    gridSnapEnabled: true
  };

  private listeners: Array<(state: EditorState) => void> = [];

  onStateChange(listener: (state: EditorState) => void) {
    this.listeners.push(listener);
  }

  removeListener(listener: (state: EditorState) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  getState(): EditorState {
    return { ...this.state };
  }

  addNode(nodeType: string, position: NodePosition): string {
    const nodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Import nodeDefinitions here to avoid circular imports
    const { getNodeDefinition } = require('./nodeDefinitions');
    const nodeDefinition = getNodeDefinition(nodeType);
    
    if (!nodeDefinition) {
      console.error(`Unknown node type: ${nodeType}`);
      return nodeId;
    }
    
    // Create inputs based on node definition
    const inputs = nodeDefinition.inputs.map((inputDef: any) => ({
      id: inputDef.name,
      type: 'input' as const,
      dataType: inputDef.type === 'file' ? 'video' as const : 'text' as const,
      name: inputDef.name
    }));
    
    // Create outputs based on node definition
    const outputs = nodeDefinition.outputs.map((outputDef: any) => ({
      id: outputDef.name,
      type: 'output' as const,
      dataType: outputDef.type as 'video' | 'audio' | 'image' | 'text' | 'number',
      name: outputDef.name
    }));
    
    // Set default parameters
    const parameters: { [key: string]: any } = {};
    nodeDefinition.inputs.forEach((inputDef: any) => {
      if (inputDef.default !== undefined) {
        parameters[inputDef.name] = inputDef.default;
      }
    });
    
    const newNode: EditorNode = {
      id: nodeId,
      type: nodeType,
      name: nodeDefinition.name,
      position,
      inputs,
      outputs,
      parameters,
      selected: false
    };

    this.state.nodes.push(newNode);
    this.notifyListeners();
    return nodeId;
  }

  removeNode(nodeId: string) {
    // Remove node
    this.state.nodes = this.state.nodes.filter(n => n.id !== nodeId);
    
    // Remove connections involving this node
    this.state.connections = this.state.connections.filter(
      c => c.from.nodeId !== nodeId && c.to.nodeId !== nodeId
    );

    this.notifyListeners();
  }

  moveNode(nodeId: string, position: NodePosition) {
    const node = this.state.nodes.find(n => n.id === nodeId);
    if (node) {
      node.position = {
        x: this.snapToGrid(position.x),
        y: this.snapToGrid(position.y)
      };
      this.notifyListeners();
    }
  }

  selectNode(nodeId: string, addToSelection = false) {
    if (!addToSelection) {
      this.state.nodes.forEach(n => n.selected = false);
      this.state.selectedNodes = [];
    }

    const node = this.state.nodes.find(n => n.id === nodeId);
    if (node) {
      node.selected = true;
      if (!this.state.selectedNodes.includes(nodeId)) {
        this.state.selectedNodes.push(nodeId);
      }
    }

    this.notifyListeners();
  }

  clearSelection() {
    this.state.nodes.forEach(n => n.selected = false);
    this.state.selectedNodes = [];
    this.notifyListeners();
  }

  startConnection(nodeId: string, socketId: string) {
    this.state.connectionState = {
      isConnecting: true,
      fromSocket: { nodeId, socketId }
    };
    this.notifyListeners();
  }

  completeConnection(nodeId: string, socketId: string): boolean {
    if (!this.state.connectionState.fromSocket) return false;

    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newConnection: NodeConnection = {
      id: connectionId,
      from: this.state.connectionState.fromSocket,
      to: { nodeId, socketId }
    };

    this.state.connections.push(newConnection);
    this.state.connectionState = { isConnecting: false };
    this.notifyListeners();
    return true;
  }

  cancelConnection() {
    this.state.connectionState = { isConnecting: false };
    this.notifyListeners();
  }



  updateNodeParameter(nodeId: string, paramName: string, value: any) {
    const node = this.state.nodes.find(n => n.id === nodeId);
    if (node) {
      node.parameters[paramName] = value;
      this.notifyListeners();
    }
  }

  addDynamicInput(nodeId: string, baseInputName: string) {
    const node = this.state.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Import nodeDefinitions here to avoid circular imports
    const { getNodeDefinition } = require('./nodeDefinitions');
    const nodeDefinition = getNodeDefinition(node.type);
    if (!nodeDefinition) return;

    // Find the base input definition
    const baseInput = nodeDefinition.inputs.find((input: any) => input.name === baseInputName);
    if (!baseInput || !baseInput.dynamic) return;

    // Count existing dynamic inputs
    const dynamicInputs = Object.keys(node.parameters).filter(key => 
      key.startsWith(baseInputName.replace(/\d+$/, '')) && key !== baseInputName
    );
    
    const nextNumber = dynamicInputs.length + 4; // Start from input4, input5, etc.
    const newInputName = baseInput.dynamicPattern?.replace('%d', nextNumber.toString()) || `${baseInputName.replace(/\d+$/, '')}${nextNumber}`;

    // Check max limit
    if (baseInput.maxDynamic && dynamicInputs.length >= baseInput.maxDynamic) return;

    // Add the new input parameter
    node.parameters[newInputName] = baseInput.default || '';

    // Add the input socket
    const newSocket = {
      id: newInputName,
      type: 'input' as const,
      dataType: baseInput.type === 'file' ? 'video' as const : 'text' as const,
      name: newInputName
    };
    node.inputs.push(newSocket);

    this.notifyListeners();
  }

  removeDynamicInput(nodeId: string, inputName: string) {
    const node = this.state.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Don't remove required inputs
    const { getNodeDefinition } = require('./nodeDefinitions');
    const nodeDefinition = getNodeDefinition(node.type);
    if (!nodeDefinition) return;

    const inputDef = nodeDefinition.inputs.find((input: any) => input.name === inputName);
    if (inputDef && inputDef.required) return;

    // Remove the parameter
    delete node.parameters[inputName];

    // Remove the input socket
    node.inputs = node.inputs.filter(input => input.id !== inputName);

    // Remove any connections to this input
    this.state.connections = this.state.connections.filter(
      conn => !(conn.to.nodeId === nodeId && conn.to.socketId === inputName)
    );

    this.notifyListeners();
  }

  clearAll() {
    this.state = {
      nodes: [],
      connections: [],
      selectedNodes: [],
      comments: [],
      dragState: { isDragging: false },
      connectionState: { isConnecting: false },
      gridSnapEnabled: this.state.gridSnapEnabled
    };
    this.notifyListeners();
  }

  // Grid snapping methods
  setGridSnapEnabled(enabled: boolean) {
    this.state.gridSnapEnabled = enabled;
    this.notifyListeners();
  }

  getGridSnapEnabled(): boolean {
    return this.state.gridSnapEnabled;
  }

  private gridSize: number = 32;

  setGridSize(size: number) {
    this.gridSize = size;
    this.notifyListeners();
  }

  getGridSize(): number {
    return this.gridSize;
  }

  saveLayout(): string {
    const layoutData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      settings: {
        gridSnapEnabled: this.state.gridSnapEnabled,
        gridSize: this.gridSize
      },
      nodes: this.state.nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        parameters: node.parameters,
        inputs: node.inputs,
        outputs: node.outputs
      })),
      connections: this.state.connections,
      comments: this.state.comments.map(comment => ({
        id: comment.id,
        text: comment.text,
        x: comment.x,
        y: comment.y,
        width: comment.width,
        height: comment.height,
        backgroundColor: comment.backgroundColor,
        fontColor: comment.fontColor,
        fontSize: comment.fontSize,
        textAlign: comment.textAlign,
        verticalAlign: comment.verticalAlign,
        selected: false // Don't save selection state
      }))
    };
    return JSON.stringify(layoutData, null, 2);
  }

  loadLayout(layoutJson: string): boolean {
    try {
      const layoutData = JSON.parse(layoutJson);
      
      // Validate the layout data structure
      if (!layoutData.nodes || !Array.isArray(layoutData.nodes)) {
        throw new Error("Invalid layout: missing or invalid nodes array");
      }
      if (!layoutData.connections || !Array.isArray(layoutData.connections)) {
        throw new Error("Invalid layout: missing or invalid connections array");
      }
      if (!layoutData.comments || !Array.isArray(layoutData.comments)) {
        throw new Error("Invalid layout: missing or invalid comments array");
      }

      // Load settings
      if (layoutData.settings) {
        if (typeof layoutData.settings.gridSnapEnabled === 'boolean') {
          this.state.gridSnapEnabled = layoutData.settings.gridSnapEnabled;
        }
        if (typeof layoutData.settings.gridSize === 'number' && layoutData.settings.gridSize >= 2 && layoutData.settings.gridSize <= 320) {
          this.gridSize = layoutData.settings.gridSize;
        }
      }

      // Load nodes
      this.state.nodes = layoutData.nodes.map((nodeData: any) => ({
        id: nodeData.id,
        type: nodeData.type,
        position: nodeData.position || { x: 0, y: 0 },
        parameters: nodeData.parameters || {},
        inputs: nodeData.inputs || [],
        outputs: nodeData.outputs || []
      }));

      // Load connections
      this.state.connections = layoutData.connections;

      // Load comments
      this.state.comments = layoutData.comments.map((commentData: any) => ({
        id: commentData.id,
        text: commentData.text || '',
        x: commentData.x || 0,
        y: commentData.y || 0,
        width: commentData.width || 200,
        height: commentData.height || 100,
        backgroundColor: commentData.backgroundColor || 'rgba(255, 255, 255, 0.8)',
        fontColor: commentData.fontColor || 'rgba(0, 0, 0, 1)',
        fontSize: commentData.fontSize || 14,
        textAlign: commentData.textAlign || 'left',
        verticalAlign: commentData.verticalAlign || 'top',
        selected: false
      }));

      // Clear selections
      this.state.selectedNodes = [];
      this.state.dragState = { isDragging: false };
      this.state.connectionState = { isConnecting: false };

      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Failed to load layout:', error);
      return false;
    }
  }

  private snapToGrid(value: number): number {
    if (!this.state.gridSnapEnabled) {
      return value;
    }
    return Math.round(value / this.gridSize) * this.gridSize;
  }

  addConnection(fromNodeId: string, fromSocket: string, toNodeId: string, toSocket: string): void {
    // Check if connection already exists
    const exists = this.state.connections.some(
      conn => conn.from.nodeId === fromNodeId && conn.to.nodeId === toNodeId && 
               conn.from.socketId === fromSocket && conn.to.socketId === toSocket
    );
    
    if (!exists) {
      const newConnection: NodeConnection = {
        id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        from: { nodeId: fromNodeId, socketId: fromSocket },
        to: { nodeId: toNodeId, socketId: toSocket }
      };
      
      this.state.connections.push(newConnection);
      this.notifyListeners();
    }
  }

  removeConnection(connectionId: string): void {
    const index = this.state.connections.findIndex(conn => conn.id === connectionId);
    if (index !== -1) {
      this.state.connections.splice(index, 1);
      this.notifyListeners();
    }
  }

  // Comment management methods
  addComment(x: number, y: number, text: string = '', backgroundColor: string = 'rgba(254, 243, 199, 0.8)', fontColor: string = 'rgba(0, 0, 0, 1)', fontSize: number = 14, textAlign: 'left' | 'center' | 'right' = 'left', verticalAlign: 'top' | 'middle' | 'bottom' = 'top'): string {
    const comment: CanvasComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x,
      y,
      width: 200,
      height: 100,
      text,
      backgroundColor,
      fontColor,
      fontSize,
      textAlign,
      verticalAlign,
      selected: false
    };
    
    this.state.comments.push(comment);
    this.notifyListeners();
    return comment.id;
  }

  updateComment(commentId: string, updates: Partial<CanvasComment>): void {
    const comment = this.state.comments.find(c => c.id === commentId);
    if (comment) {
      // Apply grid snapping to position and size if they're being updated
      if (updates.x !== undefined) {
        updates.x = this.snapToGrid(updates.x);
      }
      if (updates.y !== undefined) {
        updates.y = this.snapToGrid(updates.y);
      }
      if (updates.width !== undefined) {
        updates.width = this.snapToGrid(updates.width);
      }
      if (updates.height !== undefined) {
        updates.height = this.snapToGrid(updates.height);
      }
      
      Object.assign(comment, updates);
      this.notifyListeners();
    }
  }

  deleteComment(commentId: string): void {
    const index = this.state.comments.findIndex(c => c.id === commentId);
    if (index !== -1) {
      this.state.comments.splice(index, 1);
      this.notifyListeners();
    }
  }

  selectComment(commentId: string): void {
    // Deselect all comments first
    this.state.comments.forEach(comment => comment.selected = false);
    
    // Select the specified comment
    const comment = this.state.comments.find(c => c.id === commentId);
    if (comment) {
      comment.selected = true;
      this.notifyListeners();
    }
  }

  clearCommentSelection(): void {
    this.state.comments.forEach(comment => comment.selected = false);
    this.notifyListeners();
  }

  // Export data for JSON generation
  exportData() {
    return {
      nodes: this.state.nodes.map(node => ({
        id: node.id,
        name: node.type,
        data: node.parameters
      })),
      connections: this.state.connections.map(conn => ({
        from: conn.from.nodeId,
        to: conn.to.nodeId,
        output: conn.from.socketId,
        input: conn.to.socketId
      }))
    };
  }
}
