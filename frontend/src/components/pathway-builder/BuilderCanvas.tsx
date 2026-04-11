'use client';

import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type Node,
  type Edge,
  type OnConnect,
  type NodeTypes,
  type EdgeTypes,
  ConnectionLineType,
  BackgroundVariant,
  type OnNodesChange,
  type OnEdgesChange,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { StageNode } from './nodes/StageNode';
import { TransitionEdge } from './edges/TransitionEdge';
import { CANVAS_CONFIG, STAGE_TYPE_CONFIG } from './utils/constants';
import { useBuilderStore } from '@/store/builder.store';
import type { StageNodeData, TransitionEdgeData } from '@/types/pathway-builder.types';

const nodeTypes: NodeTypes = {
  stage: StageNode as any,
};

const edgeTypes: EdgeTypes = {
  transition: TransitionEdge as any,
};

const defaultEdgeOptions = {
  type: 'transition',
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
};

interface BuilderCanvasProps {
  initialNodes: Node<StageNodeData>[];
  initialEdges: Edge<TransitionEdgeData>[];
  onNodeSelect: (nodeId: string | null) => void;
  onEdgeSelect: (edgeId: string | null) => void;
  onNewConnection: (connection: Connection) => void;
  onNodesChangeExternal?: (nodes: Node<StageNodeData>[]) => void;
  onEdgesChangeExternal?: (edges: Edge<TransitionEdgeData>[]) => void;
  nodesRef: React.MutableRefObject<Node<StageNodeData>[]>;
  edgesRef: React.MutableRefObject<Edge<TransitionEdgeData>[]>;
}

export function BuilderCanvas({
  initialNodes,
  initialEdges,
  onNodeSelect,
  onEdgeSelect,
  onNewConnection,
  onNodesChangeExternal,
  onEdgesChangeExternal,
  nodesRef,
  edgesRef,
}: BuilderCanvasProps) {
  const { isReadOnly, markDirty } = useBuilderStore();
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  // Keep refs in sync
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const handleNodesChange: OnNodesChange<Node<StageNodeData>> = useCallback(
    (changes) => {
      const nextNodes = applyNodeChanges(changes, nodesRef.current);
      setNodes(nextNodes);
      nodesRef.current = nextNodes;
      // Mark dirty on position changes
      const hasDrag = changes.some((c) => c.type === 'position' && c.dragging === false);
      if (hasDrag) {
        markDirty();
        onNodesChangeExternal?.(nextNodes);
      }
    },
    [markDirty, onNodesChangeExternal, nodesRef, setNodes],
  );

  const handleEdgesChange: OnEdgesChange<Edge<TransitionEdgeData>> = useCallback(
    (changes) => {
      const nextEdges = applyEdgeChanges(changes, edgesRef.current);
      setEdges(nextEdges);
      edgesRef.current = nextEdges;
      const hasStructuralChange = changes.some((c) => c.type === 'remove' || c.type === 'replace');
      if (hasStructuralChange) {
        markDirty();
        onEdgesChangeExternal?.(nextEdges);
      }
    },
    [edgesRef, markDirty, onEdgesChangeExternal, setEdges],
  );

  const handleConnect: OnConnect = useCallback(
    (connection) => {
      if (isReadOnly) return;
      // Prevent self-loops
      if (connection.source === connection.target) return;
      // Prevent duplicate edges
      const exists = edges.some(
        (e) => e.source === connection.source && e.target === connection.target,
      );
      if (exists) return;

      onNewConnection(connection);
    },
    [isReadOnly, edges, onNewConnection],
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<StageNodeData>) => {
      onNodeSelect(node.id);
    },
    [onNodeSelect],
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge<TransitionEdgeData>) => {
      onEdgeSelect(edge.id);
    },
    [onEdgeSelect],
  );

  const handlePaneClick = useCallback(() => {
    onNodeSelect(null);
    onEdgeSelect(null);
  }, [onNodeSelect, onEdgeSelect]);

  return (
    <div className="flex-1 h-full relative">
      {/* SVG defs for arrowhead marker */}
      <svg className="absolute w-0 h-0">
        <defs>
          <marker
            id="arrowhead"
            viewBox="0 0 16 16"
            refX="14"
            refY="8"
            markerWidth="16"
            markerHeight="16"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 16 8 L 0 16 z" fill="#94a3b8" />
          </marker>
        </defs>
      </svg>

      <style>{`
        @keyframes dashdraw {
          to { stroke-dashoffset: -10; }
        }
      `}</style>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        snapToGrid
        snapGrid={CANVAS_CONFIG.snapGrid}
        minZoom={CANVAS_CONFIG.minZoom}
        maxZoom={CANVAS_CONFIG.maxZoom}
        defaultViewport={CANVAS_CONFIG.defaultViewport}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        connectionLineType={ConnectionLineType.SmoothStep}
        nodesDraggable={!isReadOnly}
        nodesConnectable={!isReadOnly}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
        <Controls
          showInteractive={false}
          className="!shadow-md !border-slate-200 !rounded-lg"
        />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(node: any) => {
            const st = node.data?.stage?.stageType;
            return st ? STAGE_TYPE_CONFIG[st as keyof typeof STAGE_TYPE_CONFIG]?.dot ?? '#94a3b8' : '#94a3b8';
          }}
          className="!shadow-md !border-slate-200 !rounded-lg"
          maskColor="rgba(0,0,0,0.08)"
        />
      </ReactFlow>
    </div>
  );
}
