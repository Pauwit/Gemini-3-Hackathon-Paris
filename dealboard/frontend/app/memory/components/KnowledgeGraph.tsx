// ============================================================
// app/memory/components/KnowledgeGraph.tsx — D3 Force-Directed Graph
// ============================================================
//
// PURPOSE:
// Interactive knowledge graph visualization using D3 v7 force simulation.
// Nodes represent entities (person, company, topic, decision).
// Edges represent relationships with labels.
//
// NODE COLORS:
//   person   → #4285F4 (Google Blue)
//   company  → #34A853 (Google Green)
//   topic    → #FBBC04 (Google Yellow)
//   decision → #EA4335 (Google Red)
//
// INTERACTIONS:
//   - Drag nodes to reposition
//   - Hover node → show tooltip with entity details
//   - Click node → highlight connected edges and nodes
//   - Scroll/pinch → zoom (d3.zoom)
//   - Double-click background → reset zoom
//
// DEPENDENCIES: d3, GraphNode, GraphEdge types
// PROTOCOL REFERENCE: PROTOCOL.md section 4 (GET /api/memory/graph)
// ============================================================

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { GraphNode, GraphEdge } from '../../../lib/types';

// ── Node color map ────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  person:   '#4285F4',
  company:  '#34A853',
  topic:    '#FBBC04',
  decision: '#EA4335',
};

const NODE_RADIUS: Record<string, number> = {
  person:   14,
  company:  18,
  topic:    12,
  decision: 13,
};

// ── Tooltip state ─────────────────────────────────────────

interface TooltipState {
  x:     number;
  y:     number;
  node:  GraphNode;
}

// ── Component ─────────────────────────────────────────────

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * KnowledgeGraph
 * D3 force-directed graph. Renders nodes as colored circles with
 * labels, and edges as lines. Supports drag, zoom, and hover tooltips.
 *
 * @param nodes - GraphNode array
 * @param edges - GraphEdge array
 */
export function KnowledgeGraph({ nodes, edges }: KnowledgeGraphProps) {
  const svgRef      = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const simulationRef = useRef<unknown>(null);

  const initGraph = useCallback(async () => {
    if (!svgRef.current || nodes.length === 0) return;

    // Dynamically import d3 to avoid SSR issues
    const d3 = await import('d3');

    const svg    = d3.select(svgRef.current);
    const width  = svgRef.current.clientWidth  || 600;
    const height = svgRef.current.clientHeight || 400;

    svg.selectAll('*').remove();

    // ── Zoom behavior ──────────────────────────────────
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as never);
    svg.on('dblclick.zoom', () => svg.transition().duration(500).call(zoom.transform as never, d3.zoomIdentity));

    const g = svg.append('g');

    // ── Simulate ────────────────────────────────────────
    type SimNode = GraphNode & d3.SimulationNodeDatum;
    type SimLink = { source: SimNode; target: SimNode; type: string; id: string };

    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks: SimLink[] = edges
      .map((e) => ({
        ...e,
        source: nodeById.get(e.source)!,
        target: nodeById.get(e.target)!,
      }))
      .filter((l) => l.source && l.target);

    const simulation = d3.forceSimulation<SimNode>(simNodes)
      .force('link',   d3.forceLink<SimNode, SimLink>(simLinks).id((d) => d.id).distance(90).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x',      d3.forceX(width / 2).strength(0.04))
      .force('y',      d3.forceY(height / 2).strength(0.04))
      .force('collision', d3.forceCollide<SimNode>().radius((d) => (NODE_RADIUS[d.type] ?? 12) + 6));

    simulationRef.current = simulation;

    // ── Edges ────────────────────────────────────────────
    const link = g.append('g').attr('class', 'links')
      .selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', '#DADCE0')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.7);

    // Edge labels
    const linkLabel = g.append('g').attr('class', 'link-labels')
      .selectAll('text')
      .data(simLinks)
      .join('text')
      .attr('font-size', 8)
      .attr('fill', '#9AA0A6')
      .attr('text-anchor', 'middle')
      .text((d) => d.type);

    // ── Nodes ─────────────────────────────────────────────
    const node = g.append('g').attr('class', 'nodes')
      .selectAll('g')
      .data(simNodes)
      .join('g')
      .attr('cursor', 'grab')
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          }) as never
      );

    // Node circle
    node.append('circle')
      .attr('r', (d) => NODE_RADIUS[d.type] ?? 12)
      .attr('fill', (d) => NODE_COLORS[d.type] ?? '#9AA0A6')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .on('mouseenter', (event, d) => {
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip({ x: event.clientX - rect.left + 8, y: event.clientY - rect.top - 8, node: d });
      })
      .on('mouseleave', () => setTooltip(null));

    // Node initials label
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', 9)
      .attr('font-weight', '700')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .text((d) => d.label.slice(0, 2).toUpperCase());

    // Node name label below circle
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (NODE_RADIUS[d.type] ?? 12) + 12)
      .attr('font-size', 9)
      .attr('fill', '#5F6368')
      .attr('pointer-events', 'none')
      .text((d) => d.label.length > 12 ? d.label.slice(0, 11) + '…' : d.label);

    // ── Tick ──────────────────────────────────────────────
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimNode).y ?? 0);

      linkLabel
        .attr('x', (d) => (((d.source as SimNode).x ?? 0) + ((d.target as SimNode).x ?? 0)) / 2)
        .attr('y', (d) => (((d.source as SimNode).y ?? 0) + ((d.target as SimNode).y ?? 0)) / 2);

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => simulation.stop();
  }, [nodes, edges]);

  useEffect(() => {
    initGraph();
    return () => {
      (simulationRef.current as { stop?: () => void })?.stop?.();
    };
  }, [initGraph]);

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden"
      style={{ height: 420, border: '1px solid #E8EAED', backgroundColor: '#FAFBFC' }}
    >
      <svg ref={svgRef} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: color, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            <span className="text-[10px] font-medium capitalize" style={{ color: '#5F6368' }}>{type}</span>
          </div>
        ))}
      </div>

      {/* Hint */}
      <div
        className="absolute bottom-3 right-3 px-2 py-1 rounded text-[10px]"
        style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#9AA0A6', border: '1px solid #E8EAED' }}
      >
        Drag nodes · Scroll to zoom · Double-click to reset
      </div>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm" style={{ color: '#9AA0A6' }}>No graph data yet</p>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none px-3 py-2 rounded-xl text-xs"
          style={{
            left:            tooltip.x,
            top:             tooltip.y,
            backgroundColor: '#202124',
            color:           '#fff',
            boxShadow:       '0 4px 16px rgba(0,0,0,0.25)',
            maxWidth:        220,
          }}
        >
          <p className="font-semibold mb-1">{tooltip.node.label}</p>
          <p className="opacity-70 capitalize">{tooltip.node.type}</p>
          {Object.entries(tooltip.node.data ?? {}).slice(0, 3).map(([k, v]) => (
            <p key={k} className="opacity-60">
              {k}: {String(v)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default KnowledgeGraph;
