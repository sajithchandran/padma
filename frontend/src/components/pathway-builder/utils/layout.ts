import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';
import { CANVAS_CONFIG } from './constants';

const elk = new ELK();

export async function autoLayout<TNode extends Node, TEdge extends Edge>(
  nodes: TNode[],
  edges: TEdge[],
): Promise<TNode[]> {
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '80',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: CANVAS_CONFIG.nodeWidth,
      height: CANVAS_CONFIG.nodeHeight,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const layout = await elk.layout(graph);

  return nodes.map((node) => {
    const laid = layout.children?.find((c) => c.id === node.id);
    if (laid) {
      return {
        ...node,
        position: { x: laid.x ?? node.position.x, y: laid.y ?? node.position.y },
      };
    }
    return node;
  });
}
