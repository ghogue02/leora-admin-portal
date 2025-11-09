'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three';

export type RouteGraph3DNode = {
  id: string;
  label: string;
  group: 'core' | 'domain' | 'vendor';
  requestsPerDay: number;
  vendorCount?: number;
  isHighlighted?: boolean;
  isDimmed?: boolean;
};

export type RouteGraph3DLink = {
  source: string;
  target: string;
  importance: 'critical' | 'supporting';
  reason: string;
  isDimmed?: boolean;
};

export type RouteGraph3DProps = {
  nodes: RouteGraph3DNode[];
  links: RouteGraph3DLink[];
  selectedId?: string;
  onSelect?: (id: string) => void;
};

const GROUP_COLORS: Record<RouteGraph3DNode['group'], number> = {
  core: 0x0f172a,
  domain: 0x2563eb,
  vendor: 0xa855f7,
};
const DIM_COLOR = 0xe2e8f0;

export function RouteGraph3D({ nodes, links, selectedId, onSelect }: RouteGraph3DProps) {
  const fgRef = useRef<ForceGraphMethods<RouteGraph3DNode, RouteGraph3DLink>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width: w, height: h } = entry.contentRect;
        setSize({ width: w, height: h });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(() => {
    return {
      nodes: nodes.map((node) => ({
        ...node,
        val: node.group === 'vendor'
          ? (node.vendorCount ?? 1) * 2.5
          : Math.max(node.requestsPerDay / 4000, 1),
        color: node.isDimmed ? '#CBD5F5' : undefined,
      })),
      links: links.map((link) => ({
        ...link,
        color: link.isDimmed ? '#d5d9eb' : link.importance === 'critical' ? '#0f172a' : '#94a3b8',
      })),
    };
  }, [links, nodes]);

  useEffect(() => {
    if (!fgRef.current || !selectedId) return;
    const node = nodes.find((item) => item.id === selectedId);
    if (node && fgRef.current) {
      fgRef.current.zoomToFit(600, 100);
    }
  }, [nodes, selectedId]);

  return (
    <div ref={containerRef} className="h-[560px] w-full">
      {width > 0 && height > 0 ? (
        <ForceGraph3D
          ref={fgRef}
          width={width}
          height={height}
          graphData={graphData}
          backgroundColor="#f8fafc"
          nodeLabel={(node) =>
            `<strong>${node.label}</strong><br />${node.group === 'vendor' ? `${node.vendorCount ?? 0} vendors` : `${node.requestsPerDay.toLocaleString()} req/day`}`
          }
          nodeAutoColorBy="group"
          linkOpacity={0.65}
          linkWidth={(link) => (link.importance === 'critical' ? 2.4 : 1.1)}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={() => 0.004}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={() => '#4f46e5'}
          linkDirectionalArrowLength={8}
          linkDirectionalArrowColor={(link) => link.color as string}
          nodeThreeObject={(node) => {
            const radius = Math.cbrt((node.val as number) || 1) * 2.4;
            const geometry = new THREE.SphereGeometry(radius, 32, 32);
            const baseColor = node.isDimmed ? DIM_COLOR : GROUP_COLORS[node.group];
            const material = new THREE.MeshStandardMaterial({
              color: baseColor,
              emissive: selectedId === node.id ? 0xf97316 : 0x000000,
              emissiveIntensity: selectedId === node.id ? 0.8 : 0,
            });
            return new THREE.Mesh(geometry, material);
          }}
          onNodeClick={(node) => {
            if (node?.id) {
              onSelect?.(String(node.id));
            }
          }}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          Preparing 3D map...
        </div>
      )}
    </div>
  );
}
