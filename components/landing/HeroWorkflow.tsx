"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  FileText,
  Image as ImageIcon,
  MessageCircle,
  BarChart3,
  Search,
} from "@/components/shared/Icon";

// ─────────────────────────────────────────────────────────────────────────────
// Anchor data — the resting positions of the five tool bubbles.
// Coordinates are ratios (0–1) of the workflow container, so the layout
// scales with the hero. Container is offset below the nav (top-16) so
// percentages are computed relative to the safe area.
// ─────────────────────────────────────────────────────────────────────────────
type Anchor = {
  id: string;
  Icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  label: string;
  x: number;
  y: number;
};
type Pos = { x: number; y: number };

const ANCHORS: Anchor[] = [
  { id: "desc",   Icon: FileText,      label: "Descriptions", x: 0.06, y: 0.18 },
  { id: "shots",  Icon: ImageIcon,     label: "Screenshots",  x: 0.13, y: 0.68 },
  { id: "reddit", Icon: MessageCircle, label: "Reddit",       x: 0.50, y: 0.08 },
  { id: "comp",   Icon: BarChart3,     label: "Competitor",   x: 0.87, y: 0.68 },
  { id: "kw",     Icon: Search,        label: "Keywords",     x: 0.94, y: 0.18 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tuning knobs for the magnetic + return animation.
// ─────────────────────────────────────────────────────────────────────────────
const MAGNET_RADIUS = 200;     // proximity in px before a bubble starts being pulled
const MAGNET_STRENGTH = 0.5;   // max pull = MAGNET_STRENGTH * (cursor − anchor)
const LERP = 0.18;             // per-frame easing toward target. Lower = floatier.

// ─────────────────────────────────────────────────────────────────────────────
// Catmull-Rom spline → cubic Bezier "d" string.
// Produces a single smooth thread through every point in order.
// ─────────────────────────────────────────────────────────────────────────────
function smoothPath(points: Pos[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? points[i + 1];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// HeroWorkflow — interactive bubble + string layer behind the headline.
// Each bubble is draggable (snaps back on release) and gets pulled toward
// the cursor when within MAGNET_RADIUS. The connecting thread is a single
// smooth spline that re-renders each frame as positions update.
// ─────────────────────────────────────────────────────────────────────────────
export function HeroWorkflow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const [positions, setPositions] = useState<Pos[]>(() =>
    ANCHORS.map(() => ({ x: 0, y: 0 }))
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragRef = useRef<{ index: number; offsetX: number; offsetY: number } | null>(null);
  const mouseRef = useRef<Pos | null>(null);
  const loopRafRef = useRef<number | undefined>(undefined);

  // Single animation loop — handles magnetic attraction AND the smooth return after a drag.
  // Lerps each non-dragged node toward (anchor + magneticOffset). Self-stops when settled and mouse is out.
  const ensureLoop = () => {
    if (loopRafRef.current !== undefined) return;
    const tick = () => {
      const w = sizeRef.current.w;
      const h = sizeRef.current.h;
      let stillMoving = false;
      setPositions(prev =>
        prev.map((p, i) => {
          if (dragRef.current?.index === i) return p;
          const ax = ANCHORS[i].x * w;
          const ay = ANCHORS[i].y * h;
          let tx = ax;
          let ty = ay;
          const mp = mouseRef.current;
          if (mp) {
            const dx = mp.x - ax;
            const dy = mp.y - ay;
            const dist = Math.hypot(dx, dy);
            if (dist < MAGNET_RADIUS) {
              const falloff = 1 - dist / MAGNET_RADIUS;
              const factor = falloff * falloff * MAGNET_STRENGTH;
              tx = ax + dx * factor;
              ty = ay + dy * factor;
            }
          }
          const nx = p.x + (tx - p.x) * LERP;
          const ny = p.y + (ty - p.y) * LERP;
          if (Math.abs(nx - tx) > 0.25 || Math.abs(ny - ty) > 0.25) stillMoving = true;
          return { x: nx, y: ny };
        })
      );
      if (stillMoving || mouseRef.current) {
        loopRafRef.current = requestAnimationFrame(tick);
      } else {
        loopRafRef.current = undefined;
      }
    };
    loopRafRef.current = requestAnimationFrame(tick);
  };

  // Measure container + snap to anchors on mount/resize.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const sync = () => {
      const rect = el.getBoundingClientRect();
      sizeRef.current = { w: rect.width, h: rect.height };
      if (!dragRef.current && loopRafRef.current === undefined) {
        setPositions(ANCHORS.map(a => ({ x: a.x * rect.width, y: a.y * rect.height })));
      }
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (loopRafRef.current) cancelAnimationFrame(loopRafRef.current);
    };
  }, []);

  // Track mouse at the document level — the wrapper has pointer-events: none so we can't read
  // it from a local handler. Only update / kick the loop when the pointer is over the hero.
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const wasInside = mouseRef.current !== null;
      const isInside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
      if (isInside) {
        mouseRef.current = { x, y };
        ensureLoop();
      } else if (wasInside) {
        mouseRef.current = null;
        ensureLoop();
      }
    };
    document.addEventListener("pointermove", handler);
    return () => document.removeEventListener("pointermove", handler);
  }, []);

  // While dragging, suppress page-wide text selection and force grabbing cursor.
  useEffect(() => {
    if (!draggingId) return;
    const body = document.body;
    const prevUserSelect = body.style.userSelect;
    const prevWebkitUserSelect = body.style.webkitUserSelect;
    const prevCursor = body.style.cursor;
    body.style.userSelect = "none";
    body.style.webkitUserSelect = "none";
    body.style.cursor = "grabbing";
    return () => {
      body.style.userSelect = prevUserSelect;
      body.style.webkitUserSelect = prevWebkitUserSelect;
      body.style.cursor = prevCursor;
    };
  }, [draggingId]);

  const onPointerDown = (i: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Clear any pre-existing text selection so the highlight disappears the instant a node is grabbed.
    window.getSelection()?.removeAllRanges();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = containerRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    dragRef.current = { index: i, offsetX: px - positions[i].x, offsetY: py - positions[i].y };
    setDraggingId(ANCHORS[i].id);
  };

  const onPointerMove = (i: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.index !== i) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left - dragRef.current.offsetX;
    const y = e.clientY - rect.top - dragRef.current.offsetY;
    setPositions(prev => prev.map((p, idx) => (idx === i ? { x, y } : p)));
  };

  const onPointerUp = (i: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    dragRef.current = null;
    setDraggingId(null);
    ensureLoop(); // loop lerps the released node back toward (anchor + magnetic offset)
  };

  const pathD = smoothPath(positions);

  return (
    <div
      ref={containerRef}
      className="absolute top-16 left-0 right-0 bottom-0 hidden sm:block pointer-events-none"
      aria-hidden="true"
    >
      <svg className="absolute inset-0 w-full h-full" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="stringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7DD3FC" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#7DD3FC" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <path
          d={pathD}
          stroke="url(#stringGradient)"
          strokeWidth="1.25"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {ANCHORS.map((node, i) => {
        const isDragging = draggingId === node.id;
        const Icon = node.Icon;
        return (
          <div
            key={node.id}
            className="absolute pointer-events-auto select-none cursor-grab active:cursor-grabbing"
            style={{
              left: positions[i].x,
              top: positions[i].y,
              transform: `translate(-50%, -50%) scale(${isDragging ? 1.08 : 1})`,
              transition: isDragging ? "transform 0.15s ease-out" : "transform 0.2s ease-out",
              touchAction: "none",
            }}
            onPointerDown={onPointerDown(i)}
            onPointerMove={onPointerMove(i)}
            onPointerUp={onPointerUp(i)}
            onPointerCancel={onPointerUp(i)}
          >
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-11 h-11 rounded-2xl bg-surface/95 backdrop-blur-sm border flex items-center justify-center transition-[box-shadow,border-color] duration-200 ${
                  isDragging
                    ? "border-sky-300/70 shadow-[0_12px_32px_rgba(56,189,248,0.22),0_2px_6px_rgba(0,0,0,0.06)]"
                    : "border-line-soft shadow-[0_4px_12px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]"
                }`}
              >
                <Icon size={18} className="text-ink-muted" strokeWidth={1.75} />
              </div>
              <span className="text-[10px] font-medium text-ink-faint whitespace-nowrap">
                {node.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
