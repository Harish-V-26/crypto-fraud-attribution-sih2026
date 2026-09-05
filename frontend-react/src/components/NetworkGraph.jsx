// src/components/NetworkGraph.jsx
// White background & Black text interactive force-directed network graph

import { useRef, useCallback, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react'

// Node type styles - Light mode stark monochrome palette
const NODE_COLORS = {
  source:   { fill: '#000000', stroke: '#3f3f46', label: '#ffffff' },
  layering: { fill: '#f4f4f5', stroke: '#a1a1aa', label: '#000000' },
  mixer:    { fill: '#18181b', stroke: '#000000', label: '#ffffff' },
  exchange: { fill: '#000000', stroke: '#71717a', label: '#ffffff' },
  bridge:   { fill: '#52525b', stroke: '#000000', label: '#ffffff' },
  defi:     { fill: '#e4e4e7', stroke: '#27272a', label: '#000000' },
}

const EDGE_LABELS = {
  source:   '⬤ Source',
  layering: '⬤ Layering',
  mixer:    '◆ Mixer',
  exchange: '⬤ Exchange',
  bridge:   '★ Bridge',
  defi:     '▲ DeFi',
}

function transformGraph(graphData) {
  if (!graphData?.nodes || !graphData?.edges) return { nodes: [], links: [] }
  return {
    nodes: graphData.nodes.map(n => ({
      id: n.id,
      label: n.label,
      type: n.type || 'layering',
    })),
    links: graphData.edges.map((e, i) => ({
      id: `edge-${i}`,
      source: e.from,
      target: e.to,
      value: e.value || '',
    })),
  }
}

export default function NetworkGraph({ graphData, onNodeClick }) {
  const graphRef = useRef()
  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 420 })
  const containerRef = useRef()

  const fgData = transformGraph(graphData)

  // Responsive sizing
  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 420,
        })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Auto-fit on data load
  useEffect(() => {
    if (graphRef.current && fgData.nodes.length > 0) {
      setTimeout(() => graphRef.current?.zoomToFit(400, 40), 300)
    }
  }, [graphData])

  const handleNodeClick = useCallback(node => {
    setSelectedNode(node)
    onNodeClick?.(node)
    // Zoom to node
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 600)
      graphRef.current.zoom(2.5, 600)
    }
  }, [onNodeClick])

  const handleNodeHover = useCallback(node => {
    setHoveredNode(node)
    document.body.style.cursor = node ? 'pointer' : 'default'
  }, [])

  // Custom node paint
  const paintNode = useCallback((node, ctx, globalScale) => {
    const config = NODE_COLORS[node.type] || NODE_COLORS.layering
    const isSelected = selectedNode?.id === node.id
    const isHovered = hoveredNode?.id === node.id
    const r = isSelected ? 22 : (isHovered ? 19 : 16)

    // Highlight
    if (isSelected || isHovered) {
      ctx.shadowColor = '#000000'
      ctx.shadowBlur = isSelected ? 16 : 8
    } else {
      ctx.shadowBlur = 0
    }

    // Draw node shape based on type
    ctx.beginPath()
    if (node.type === 'mixer') {
      // Diamond
      ctx.moveTo(node.x, node.y - r)
      ctx.lineTo(node.x + r * 0.7, node.y)
      ctx.lineTo(node.x, node.y + r)
      ctx.lineTo(node.x - r * 0.7, node.y)
    } else if (node.type === 'bridge') {
      // Star (5-pointed)
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2
        const rad = i % 2 === 0 ? r : r * 0.45
        const x = node.x + Math.cos(angle) * rad
        const y = node.y + Math.sin(angle) * rad
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
    } else if (node.type === 'defi') {
      // Triangle
      ctx.moveTo(node.x, node.y - r)
      ctx.lineTo(node.x + r * 0.87, node.y + r * 0.5)
      ctx.lineTo(node.x - r * 0.87, node.y + r * 0.5)
    } else {
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
    }
    ctx.closePath()

    ctx.fillStyle = config.fill
    ctx.fill()
    ctx.strokeStyle = isSelected ? '#000000' : config.stroke
    ctx.lineWidth = isSelected ? 3 : 1.5
    ctx.stroke()
    ctx.shadowBlur = 0

    // Label
    const label = node.label?.length > 12 ? node.label.slice(0, 12) + '…' : node.label
    const fontSize = Math.max(8, 11 / globalScale)
    ctx.font = `600 ${fontSize}px JetBrains Mono, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = config.label
    ctx.fillText(label, node.x, node.y)
  }, [selectedNode, hoveredNode])

  // Custom link paint
  const paintLink = useCallback((link, ctx) => {
    const start = link.source
    const end = link.target
    if (!start || !end) return

    ctx.beginPath()
    ctx.strokeStyle = '#d4d4d8'
    ctx.lineWidth = 1.5
    ctx.setLineDash([])
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()

    // Arrow at end
    const dx = end.x - start.x
    const dy = end.y - start.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 1) return
    const arrowLen = 7
    const arrowAngle = 0.4
    const angle = Math.atan2(dy, dx)
    const arrowX = end.x - (dx / dist) * 19
    const arrowY = end.y - (dy / dist) * 19

    ctx.beginPath()
    ctx.fillStyle = '#000000'
    ctx.moveTo(arrowX, arrowY)
    ctx.lineTo(
      arrowX - arrowLen * Math.cos(angle - arrowAngle),
      arrowY - arrowLen * Math.sin(angle - arrowAngle),
    )
    ctx.lineTo(
      arrowX - arrowLen * Math.cos(angle + arrowAngle),
      arrowY - arrowLen * Math.sin(angle + arrowAngle),
    )
    ctx.fill()
  }, [])

  if (!graphData || fgData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[420px] bg-zinc-50 rounded-lg border border-zinc-300 border-dashed">
        <div className="text-center text-zinc-500 font-mono text-xs">
          <div className="text-2xl mb-2 text-black">◈</div>
          <div className="text-zinc-700 font-medium">Network graph will render here upon case investigation</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex gap-1">
        {[
          { icon: <ZoomIn size={13} />, action: () => graphRef.current?.zoom(graphRef.current.zoom() * 1.3, 300), tip: 'Zoom in' },
          { icon: <ZoomOut size={13} />, action: () => graphRef.current?.zoom(graphRef.current.zoom() * 0.77, 300), tip: 'Zoom out' },
          { icon: <Maximize2 size={13} />, action: () => graphRef.current?.zoomToFit(400, 40), tip: 'Fit view' },
          { icon: <RefreshCw size={13} />, action: () => { setSelectedNode(null); graphRef.current?.zoomToFit(400, 40) }, tip: 'Reset' },
        ].map(({ icon, action, tip }, i) => (
          <button
            key={i}
            onClick={action}
            title={tip}
            className="p-1.5 rounded-md bg-white/95 border border-zinc-300 text-zinc-700 hover:text-black hover:bg-zinc-100 transition-colors shadow-xs"
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 bg-white/95 p-2.5 rounded-md border border-zinc-200 shadow-2xs backdrop-blur-xs">
        {Object.entries(EDGE_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5 text-[10px] font-mono font-medium">
            <span style={{ color: NODE_COLORS[type].fill === '#ffffff' ? '#000000' : NODE_COLORS[type].fill }}>
              {label.split(' ')[0]}
            </span>
            <span className="text-zinc-700 capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Graph */}
      <div ref={containerRef} className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <ForceGraph2D
          ref={graphRef}
          graphData={fgData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="#ffffff"
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode={() => 'replace'}
          linkCanvasObject={paintLink}
          linkCanvasObjectMode={() => 'replace'}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          nodeRelSize={6}
          linkDirectionalArrowLength={0}
          cooldownTicks={80}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />
      </div>

      {/* Selected node info */}
      {selectedNode && (
        <div className="mt-3 p-3 bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-mono shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-black">{selectedNode.label}</span>
              <span className="ml-2 text-zinc-600 capitalize">({selectedNode.type})</span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-zinc-500 hover:text-black font-bold"
            >✕</button>
          </div>
          <div className="text-[11px] text-zinc-600 mt-1 break-all">{selectedNode.id}</div>
        </div>
      )}
    </div>
  )
}
