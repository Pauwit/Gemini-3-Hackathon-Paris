// ============================================================
// app/memory/components/KnowledgeGraph.tsx — D3 Knowledge Graph
// ============================================================
//
// PURPOSE:
// Interactive force-directed graph visualization using D3.js.
// Renders nodes (people, companies, topics, decisions) and edges.
// Nodes are color-coded by type. Hovering shows entity details.
// Clicking focuses a node and highlights its connections.
//
// DATA FLOW:
// GET /api/memory/graph → { nodes, edges, stats } → D3 simulation
//
// PROTOCOL REFERENCE: PROTOCOL.md section 4 (GET /api/memory/graph)
// DEPENDENCIES: d3, GraphNode, GraphEdge types, mock-memory-graph.json
// ============================================================

'use client';

import { useEffect, useRef } from 'react';
import type { GraphNode, GraphEdge } from '../../../lib/types';

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export default function KnowledgeGraph({ nodes, edges }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;
    // TODO: Initialize D3 force simulation
    // TODO: Create SVG links for edges
    // TODO: Create SVG circles + labels for nodes
    // TODO: Color nodes by type: person=#4285F4, company=#34A853, topic=#FBBC04, decision=#EA4335
    // TODO: Bind D3 tick to update positions
    // TODO: Add zoom behavior
    // TODO: Add hover tooltip with node.data
  }, [nodes, edges]);

  return (
    <div className="w-full h-96 bg-gray-50 rounded-xl border border-gray-200 relative overflow-hidden">
      <svg ref={svgRef} className="w-full h-full" />
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-300 text-sm">Knowledge graph — TODO: implement D3 visualization</p>
        </div>
      )}
    </div>
  );
}
