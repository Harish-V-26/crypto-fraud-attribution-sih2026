// src/components/NetworkGraph.jsx
// Black & White interactive force-directed network graph for transaction flow visualization

import { useRef, useCallback, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react'

// Node type styles - Pure Black & White monochrome palette
const NODE_COLORS = {
  source:   { fill: '#ffffff', stroke: '#71717a', label: '#000000' },
  layering: { fill: '#3f3f46', stroke: '#71717a', label: '#ffffff' },
  mixer:    { fill: '#f4f4f5', stroke: '#000000', label: '#000000' },
  exchange: { fill: '#ffffff', stroke: '#27272a', label: '#000000' },
  bridge:   { fill: '#a1a1aa', stroke: '#27272a', label: '#000000' },
  defi:     { fill: '#71717a', stroke: '#ffffff', label: '#ffffff' },
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

    // Clean monochrome highlight
    if (isSelected || isHovered) {
      ctx.shadowColor = '#ffffff'
      ctx.shadowBlur = isSelected ? 18 : 8
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
    ctx.strokeStyle = isSelected ? '#ffffff' : config.stroke
    ctx.lineWidth = isSelected ? 2.5 : 1.2
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
    ctx.strokeStyle = '#3f3f46'
    ctx.lineWidth = 1.2
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
    ctx.fillStyle = '#a1a1aa'
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
      <div className="flex items-center justify-center h-[420px] bg-black rounded-lg border border-zinc-800 border-dashed">
        <div className="text-center text-zinc-400 font-mono text-xs">
          <div className="text-2xl mb-2 text-white">◈</div>
          <div>Network graph will render here upon case investigation</div>
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
            className="p-1.5 rounded-md bg-zinc-900/90 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shadow-sm"
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 bg-black/90 p-2.5 rounded-md border border-zinc-800 backdrop-blur-xs">
        {Object.entries(EDGE_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5 text-[10px] font-mono">
            <span style={{ color: NODE_COLORS[type].fill }}>{label.split(' ')[0]}</span>
            <span className="text-zinc-400 capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Graph */}
      <div ref={containerRef} className="overflow-hidden rounded-lg border border-zinc-800 bg-black">
        <ForceGraph2D
          ref={graphRef}
          graphData={fgData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="#000000"
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
        <div className="mt-3 p-3 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-white">{selectedNode.label}</span>
              <span className="ml-2 text-zinc-400 capitalize">({selectedNode.type})</span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-zinc-400 hover:text-white"
            >✕</button>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 break-all">{selectedNode.id}</div>
        </div>
      )}
    </div>
  )
}
