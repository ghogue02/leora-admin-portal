'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type RouteGraphNode = {
  id: string;
  label: string;
  group: 'core' | 'domain' | 'vendor';
  requestsPerDay: number;
  vendorCount?: number;
  isHighlighted?: boolean;
  isDimmed?: boolean;
};

export type RouteGraphLink = {
  source: string;
  target: string;
  importance: 'critical' | 'supporting';
  reason: string;
  isDimmed?: boolean;
};

export type RouteGraph2DProps = {
  nodes: RouteGraphNode[];
  links: RouteGraphLink[];
  selectedId?: string;
  focusId?: string;
  onSelect?: (id: string) => void;
};

type PositionedNode = RouteGraphNode & {
  x: number;
  y: number;
  radius: number;
};

const GROUP_COLORS: Record<RouteGraphNode['group'], string> = {
  core: '#0f172a',
  domain: '#2563eb',
  vendor: '#a855f7',
};

const DIM_NODE_COLOR = '#dbeafe';
const DIM_TEXT_COLOR = '#94a3b8';
const TEXT_COLOR = '#0f172a';
const FONT_FAMILY = "'Inter', 'Segoe UI', sans-serif";

const getNodeRadius = (node: RouteGraphNode) => {
  if (node.group === 'vendor') {
    return 18 + Math.min(node.vendorCount ?? 1, 10) * 1.2;
  }
  return 20 + Math.min(node.requestsPerDay / 3000, 16);
};

const shrinkToCircle = (source: PositionedNode, target: PositionedNode) => {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const startOffset = source.radius + 6;
  const endOffset = target.radius + 6;
  const sx = source.x + (dx / dist) * startOffset;
  const sy = source.y + (dy / dist) * startOffset;
  const tx = target.x - (dx / dist) * endOffset;
  const ty = target.y - (dy / dist) * endOffset;
  return { sx, sy, tx, ty };
};

type RingSize = number | { rx: number; ry: number };

const resolveRadii = (value: RingSize): { rx: number; ry: number } =>
  typeof value === 'number' ? { rx: value, ry: value } : value;

const buildRing = (
  entries: RouteGraphNode[],
  centerX: number,
  centerY: number,
  ringSize: RingSize,
  startAngle = -Math.PI / 2
): PositionedNode[] => {
  if (entries.length === 0) return [];
  const { rx, ry } = resolveRadii(ringSize);

  if (entries.length === 1 && rx === 0 && ry === 0) {
    const node = entries[0];
    return [{ ...node, x: centerX, y: centerY, radius: getNodeRadius(node) }];
  }

  return entries.map((node, index) => {
    const angle = startAngle + (index / entries.length) * Math.PI * 2;
    return {
      ...node,
      x: centerX + rx * Math.cos(angle),
      y: centerY + ry * Math.sin(angle),
      radius: getNodeRadius(node),
    };
  });
};

export function RouteGraph2D({ nodes, links, selectedId, focusId, onSelect }: RouteGraph2DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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

  const positioned = useMemo(() => {
    if (width === 0 || height === 0) {
      return { list: [] as PositionedNode[], map: new Map<string, PositionedNode>() };
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const margin = 72;
    const rx = Math.max(width / 2 - margin, 200);
    const ry = Math.max(height / 2 - margin, 140);
    const vendorRing: RingSize = { rx, ry };
    const domainRing: RingSize = { rx: rx * 0.65, ry: ry * 0.65 };
    const coreRing: RingSize = { rx: Math.min(domainRing.rx * 0.45, 140), ry: Math.min(domainRing.ry * 0.45, 100) };

    const grouped = {
      core: nodes.filter((node) => node.group === 'core'),
      domain: nodes.filter((node) => node.group === 'domain'),
      vendor: nodes.filter((node) => node.group === 'vendor'),
    };

    const coreNodes =
      grouped.core.length <= 1
        ? buildRing(grouped.core, centerX, centerY, 0)
        : buildRing(grouped.core, centerX, centerY, coreRing);
    const domainNodes = buildRing(grouped.domain, centerX, centerY, domainRing, -Math.PI / 2);
    const vendorNodes = buildRing(grouped.vendor, centerX, centerY, vendorRing, -Math.PI / 2);

    const list = [...coreNodes, ...domainNodes, ...vendorNodes];
    const map = new Map(list.map((node) => [node.id, node]));
    return { list, map };
  }, [height, nodes, width]);

  const activeId = hoveredId ?? focusId ?? selectedId ?? null;

  return (
    <div ref={containerRef} className="h-[560px] w-full">
      {width > 0 && height > 0 ? (
        <svg
          width={width}
          height={height}
          className="rounded-2xl bg-slate-50"
          role="presentation"
          aria-label="API route relationship map"
        >
          <defs>
            <linearGradient id="link-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.75" />
            </linearGradient>
          </defs>

          {links.map((link) => {
            const source = positioned.map.get(link.source);
            const target = positioned.map.get(link.target);
            if (!source || !target) return null;
            const { sx, sy, tx, ty } = shrinkToCircle(source, target);
            const hovered =
              activeId && (source.id === activeId || target.id === activeId) && !link.isDimmed;
            const stroke = link.isDimmed ? '#d5d9eb' : link.importance === 'critical' ? '#0f172a' : '#94a3b8';
            const width = hovered ? 3.2 : link.importance === 'critical' ? 2.4 : 1.2;
            return (
              <line
                key={`${link.source}-${link.target}-${link.reason}`}
                x1={sx}
                y1={sy}
                x2={tx}
                y2={ty}
                stroke={hovered ? 'url(#link-gradient)' : stroke}
                strokeWidth={width}
                strokeLinecap="round"
                opacity={link.isDimmed ? 0.25 : 0.85}
              >
                <title>{link.reason}</title>
              </line>
            );
          })}

          {positioned.list.map((node) => {
            const fill = node.isDimmed ? DIM_NODE_COLOR : GROUP_COLORS[node.group];
            const stroke =
              selectedId === node.id
                ? '#fb923c'
                : node.isHighlighted
                  ? '#0f172a'
                  : '#e2e8f0';
            const strokeWidth = selectedId === node.id ? 4 : node.isHighlighted ? 3 : 1.5;
            const textColor = node.isDimmed ? DIM_TEXT_COLOR : TEXT_COLOR;
            const secondaryLabel =
              node.group === 'vendor'
                ? `${node.vendorCount ?? 0} vendors`
                : `${node.requestsPerDay.toLocaleString()} req/day`;
            return (
              <g
                key={node.id}
                className="cursor-pointer transition-[transform]"
                onClick={() => onSelect?.(node.id)}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId((current) => (current === node.id ? null : current))}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.radius}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  opacity={node.isDimmed ? 0.65 : 1}
                >
                  <title>
                    {node.label} · {secondaryLabel}
                  </title>
                </circle>
                <text
                  x={node.x}
                  y={node.y + node.radius + 16}
                  fontFamily={FONT_FAMILY}
                  fontSize={14}
                  fill={textColor}
                  textAnchor="middle"
                  fontWeight={600}
                >
                  {node.label}
                </text>
                <text
                  x={node.x}
                  y={node.y + node.radius + 32}
                  fontFamily={FONT_FAMILY}
                  fontSize={12}
                  fill="#475569"
                  textAnchor="middle"
                >
                  {secondaryLabel}
                </text>
              </g>
            );
          })}
        </svg>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">Preparing map…</div>
      )}
    </div>
  );
}
