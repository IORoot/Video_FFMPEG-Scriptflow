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

export interface EditorState {
  nodes: EditorNode[];
  connections: NodeConnection[];
  selectedNodes: string[];
  dragState: {
    isDragging: boolean;
    draggedNode?: string;
    offset?: { x: number; y: number };
  };
  connectionState: {
    isConnecting: boolean;
    fromSocket?: { nodeId: string; socketId: string };
  };
}

export class SimpleNodeEditor {
  private state: EditorState = {
    nodes: [],
    connections: [],
    selectedNodes: [],
    dragState: { isDragging: false },
    connectionState: { isConnecting: false }
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
      node.position = position;
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

  removeConnection(connectionId: string) {
    this.state.connections = this.state.connections.filter(c => c.id !== connectionId);
    this.notifyListeners();
  }

  updateNodeParameter(nodeId: string, paramName: string, value: any) {
    const node = this.state.nodes.find(n => n.id === nodeId);
    if (node) {
      node.parameters[paramName] = value;
      this.notifyListeners();
    }
  }

  clearAll() {
    this.state = {
      nodes: [],
      connections: [],
      selectedNodes: [],
      dragState: { isDragging: false },
      connectionState: { isConnecting: false }
    };
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
