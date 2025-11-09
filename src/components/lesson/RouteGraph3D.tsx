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
  x?: number;
  y?: number;
  z?: number;
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
  focusId?: string;
  onSelect?: (id: string) => void;
};

const GROUP_COLORS: Record<RouteGraph3DNode['group'], number> = {
  core: 0x0f172a,
  domain: 0x2563eb,
  vendor: 0xa855f7,
};
const DIM_COLOR = 0xe2e8f0;
const labelCanvasCache = new Map<string, { texture: THREE.CanvasTexture; width: number; height: number }>();

const LABEL_FONT = `600 96px 'Inter', 'Segoe UI', sans-serif`;

function getLabelTexture(text: string, color: string) {
  const cacheKey = `${text}-${color}`;
  const cached = labelCanvasCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to get 2D context for label rendering');
  }

  ctx.font = LABEL_FONT;
  const textWidth = ctx.measureText(text).width;
  canvas.width = Math.ceil(textWidth + 60);
  canvas.height = 120;

  ctx.font = LABEL_FONT;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const payload = { texture, width: canvas.width, height: canvas.height };
  labelCanvasCache.set(cacheKey, payload);
  return payload;
}

export function RouteGraph3D({ nodes, links, selectedId, focusId, onSelect }: RouteGraph3DProps) {
  const fgRef = useRef<ForceGraphMethods<RouteGraph3DNode, RouteGraph3DLink>>(null);
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

  useEffect(() => {
    if (!fgRef.current || width === 0 || height === 0) return;
    const baseDistance = 90;
    fgRef.current.cameraPosition(
      { x: baseDistance, y: baseDistance * 0.25, z: baseDistance },
      { x: 0, y: 0, z: 0 },
      1200
    );
  }, [height, width]);

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
    const focus = focusId ?? selectedId;
    if (!fgRef.current || !focus) return;
    const fg = fgRef.current;
    const graphData = (fg as unknown as { graphData?: () => { nodes: RouteGraph3DNode[] } }).graphData?.();
    if (!graphData) return;
    const node = graphData.nodes.find((item) => item.id === focus);
    if (!node) return;

    const coords = {
      x: node.x ?? 0,
      y: node.y ?? 0,
      z: node.z ?? 0,
    };
    const distance = 90;
    const cameraPos = {
      x: coords.x + distance,
      y: coords.y + distance * 0.2,
      z: coords.z + distance,
    };
    fg.cameraPosition(cameraPos, coords, 1500);
  }, [focusId, nodes, selectedId]);

  useEffect(() => {
    let frame: number;
    const align = () => {
      const fg = fgRef.current;
      if (fg) {
        const camera = fg.camera();
        fg.scene().traverse((obj) => {
          if ((obj as THREE.Object3D).userData?.isLabel) {
            (obj as THREE.Object3D).lookAt(camera.position);
          }
        });
      }
      frame = requestAnimationFrame(align);
    };
    align();
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const scene = fg.scene();
    const guideGroup = new THREE.Group();

    const makeRing = (inner: number, outer: number, opacity: number) => {
      const geometry = new THREE.RingGeometry(inner, outer, 64);
      const material = new THREE.MeshBasicMaterial({
        color: 0xe2e8f0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = Math.PI / 2;
      guideGroup.add(mesh);
    };

    makeRing(25, 27, 0.28);
    makeRing(42, 44, 0.18);

    scene.add(guideGroup);
    return () => {
      scene.remove(guideGroup);
      guideGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    };
  }, []);

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
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={() => 0.004}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={() => '#4f46e5'}
          linkDirectionalArrowLength={8}
          linkDirectionalArrowColor={(link) => link.color as string}
          linkWidth={(link) => {
            const sourceId = typeof link.source === 'string' ? link.source : (link.source as RouteGraph3DNode).id;
            const targetId = typeof link.target === 'string' ? link.target : (link.target as RouteGraph3DNode).id;
            const hoverMatch = hoveredId && (sourceId === hoveredId || targetId === hoveredId);
            return hoverMatch ? 3.2 : link.importance === 'critical' ? 2.4 : 1.1;
          }}
          nodeThreeObject={(node) => {
            const radius = Math.cbrt((node.val as number) || 1) * 2.2;
            const geometry = new THREE.SphereGeometry(radius, 32, 32);
            const baseColor = node.isDimmed ? DIM_COLOR : GROUP_COLORS[node.group];
            const material = new THREE.MeshStandardMaterial({
              color: baseColor,
              emissive: selectedId === node.id ? 0xf97316 : 0x000000,
              emissiveIntensity: selectedId === node.id ? 0.9 : 0,
            });
            const sphere = new THREE.Mesh(geometry, material);

            if (node.isHighlighted || selectedId === node.id) {
              const haloGeometry = new THREE.SphereGeometry(radius * 1.35, 32, 32);
              const haloMaterial = new THREE.MeshBasicMaterial({
                color: baseColor,
                transparent: true,
                opacity: node.isHighlighted ? 0.4 : 0.25,
              });
              const halo = new THREE.Mesh(haloGeometry, haloMaterial);
              sphere.add(halo);
            }

            const { texture, width, height } = getLabelTexture(
              node.label,
              node.isDimmed ? '#94a3b8' : '#0f172a'
            );
            const worldHeight = 2.4;
            const aspect = width / height;
            const geometryLabel = new THREE.PlaneGeometry(worldHeight * aspect, worldHeight);
            const materialLabel = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              depthWrite: false,
            });
            const labelMesh = new THREE.Mesh(geometryLabel, materialLabel);
            const offset = radius + 3;
            labelMesh.position.set(offset, 0, 0);
            labelMesh.rotation.y = Math.PI / 2;
            labelMesh.userData.isLabel = true;

            const group = new THREE.Group();
            group.add(sphere);
            group.add(labelMesh);
            return group;
          }}
          onNodeClick={(node) => {
            if (node?.id) {
              onSelect?.(String(node.id));
            }
          }}
          onNodeHover={(node) => setHoveredId(node?.id ? String(node.id) : null)}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          Preparing 3D map...
        </div>
      )}
    </div>
  );
}
