// src/components/NetworkGraph.jsx
// Interactive force-directed network graph for transaction flow visualization

import { useRef, useCallback, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react'

// Node type styles
const NODE_COLORS = {
  source:   { fill: '#4fb3a9', stroke: '#2a4a47', label: '#0f1417' },
  layering: { fill: '#5c6b70', stroke: '#3a454b', label: '#dfe6e8' },
  mixer:    { fill: '#c85a4f', stroke: '#5a2f2a', label: '#fde8e7' },
  exchange: { fill: '#d99a3f', stroke: '#5a4629', label: '#0f1417' },
  bridge:   { fill: '#ff8844', stroke: '#6a3a20', label: '#0f1417' },
  defi:     { fill: '#8899ff', stroke: '#2a3068', label: '#0f1417' },
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

    // Glow effect for selected/hovered
    if (isSelected || isHovered) {
      ctx.shadowColor = config.fill
      ctx.shadowBlur = isSelected ? 20 : 12
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
    ctx.lineWidth = isSelected ? 2.5 : 1.5
    ctx.stroke()
    ctx.shadowBlur = 0

    // Label
    const label = node.label?.length > 12 ? node.label.slice(0, 12) + '…' : node.label
    const fontSize = Math.max(8, 11 / globalScale)
    ctx.font = `600 ${fontSize}px IBM Plex Mono, monospace`
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
    ctx.strokeStyle = '#3a454b'
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
    const arrowLen = 8
    const arrowAngle = 0.4
    const angle = Math.atan2(dy, dx)
    const arrowX = end.x - (dx / dist) * 20
    const arrowY = end.y - (dy / dist) * 20

    ctx.beginPath()
    ctx.fillStyle = '#4fb3a9'
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
      <div className="flex items-center justify-center h-[420px] bg-panel-alt rounded-lg border border-border border-dashed">
        <div className="text-center text-text-dim">
          <div className="text-4xl mb-3">◈</div>
          <div className="text-sm">Network graph will appear here after tracing</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex gap-1.5">
        {[
          { icon: <ZoomIn size={14} />, action: () => graphRef.current?.zoom(graphRef.current.zoom() * 1.3, 300), tip: 'Zoom in' },
          { icon: <ZoomOut size={14} />, action: () => graphRef.current?.zoom(graphRef.current.zoom() * 0.77, 300), tip: 'Zoom out' },
          { icon: <Maximize2 size={14} />, action: () => graphRef.current?.zoomToFit(400, 40), tip: 'Fit to view' },
          { icon: <RefreshCw size={14} />, action: () => { setSelectedNode(null); graphRef.current?.zoomToFit(400, 40) }, tip: 'Reset' },
        ].map(({ icon, action, tip }, i) => (
          <button
            key={i}
            onClick={action}
            title={tip}
            className="p-1.5 rounded bg-panel-alt/90 border border-border text-text-dim hover:text-accent hover:border-accent transition-colors"
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
        {Object.entries(EDGE_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5 text-[10px] font-mono">
            <span style={{ color: NODE_COLORS[type].fill }}>{label.split(' ')[0]}</span>
            <span className="text-text-dim capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Graph */}
      <div ref={containerRef} className="graph-canvas-wrapper overflow-hidden rounded-lg border border-border bg-panel-alt">
        <ForceGraph2D
          ref={graphRef}
          graphData={fgData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="#1c252a"
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
        <div className="mt-3 p-3 bg-panel-alt border border-accent/40 rounded-lg text-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-accent">{selectedNode.label}</span>
              <span className="ml-2 text-xs text-text-dim font-mono capitalize">({selectedNode.type})</span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-text-dim hover:text-text-main text-xs"
            >✕</button>
          </div>
          <div className="font-mono text-xs text-text-dim mt-1 break-all">{selectedNode.id}</div>
        </div>
      )}
    </div>
  )
}
