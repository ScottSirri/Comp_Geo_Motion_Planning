'use strict';

// Node types
const REG = 0;
const SRC = 1;
const SINK = 2;

let graph;

class GraphNode {
	constructor(pt, dist, type) {
		this.pt = pt;	// The visibility graph point this represents
		this.adj = [];	// Adjacent points
		this.type = type;	// REG (regular), SRC (source), SINK
		this.dist = dist;
		this.predecessor = null;
		this.done = false;
	}
}

class Graph {
	
	constructor(edgesIn, src, sink) {
		this.src = new GraphNode(src, 0, SRC);
		this.currNode = this.src;
		this.sink = new GraphNode(sink, Infinity, SINK);
		this.nodesToVisit = [this.src];
		
		this.edges = [];
		this.initNodes(edgesIn);
		
		this.src.dist = 0;
	}
	
	initNodes(segs) {
		for(let seg of segs) {
			// Each seg has a 'p' and 'q', each with an 'x' and 'y' property
			// Each of what we insert to edges has two GraphNodes
			
			
			let pNode;
			let qNode;
			
			if(seg.p === this.src.pt) pNode = this.src;
			else if(seg.p === this.sink.pt) pNode = this.sink;
			if(seg.q === this.src.pt) qNode = this.src;
			else if(seg.q === this.sink.pt) qNode = this.sink;
			
			for(let nodeSeg of this.edges) {
				if(seg.p === nodeSeg.p.pt) pNode = nodeSeg.p;
				else if(seg.p === nodeSeg.q.pt) pNode = nodeSeg.q;
				
				if(seg.q === nodeSeg.p.pt) qNode = nodeSeg.p;
				else if(seg.q === nodeSeg.q.pt) qNode = nodeSeg.q;
			}
			
			if(pNode === undefined) {
				pNode = new GraphNode(seg.p, Infinity, REG);
			}
			if(qNode === undefined) {
				qNode = new GraphNode(seg.q, Infinity, REG);
			}
			
			let newNodeSeg = { p : pNode, q : qNode };
			
			this.edges.push(newNodeSeg);
		}
	}
	
	adjNodes(node) {
		
		let adj = [];
		let pt = node.pt;
		
		for(let i = 0; i < this.edges.length; ++i) {
			let seg = this.edges[i];
			if(seg === null) {
				continue;
			}
			
			if(seg.p.pt === pt) {
				adj.push(seg.q);
			} else if(seg.q.pt === pt) {
				adj.push(seg.p);
			}
		}
		
		return adj;
	}
	
	nextNode() {
		let minNode = new GraphNode(null, Infinity, REG);
		let minIndex;
		for(let i = 0; i < this.nodesToVisit.length; ++i) {
			let node = this.nodesToVisit[i];
			if(node.dist <= minNode.dist) {
				minIndex = i;
				minNode = node;
			}
		}
		
		// minNode is the node in this.nodesToVisit with the least distance
		
		if(minNode.pt === null) {
			console.log('No next point');
		} else this.nodesToVisit.splice(minIndex, 1);
		
		return minNode;
	}
	
	queue(node) {
		for(let queuedNode of this.nodesToVisit) {
			if(queuedNode.pt == node.pt) return;
		}
		this.nodesToVisit.push(node);
	}
}

/* Runs one iteration/loop of Dijkstra's algorithm and draws the results.
 */
function graphIterHandler() {
	
	let next = graph.nextNode();
	next.adj = graph.adjNodes(next);
	
	for(let adjNode of next.adj) {
		
		if(!adjNode.done) graph.queue(adjNode); // Pushes to nodesToVisit unless it's already present
		
		if(adjNode.dist > next.dist + nodeDist(adjNode, next)) {
			adjNode.predecessor = next;
			adjNode.dist = next.dist + nodeDist(adjNode, next);
		}
	}

	next.done = true;
	
	clearCanvas();
	drawGraph();
	
	if(next == graph.sink) {
		clearCanvas();
		console.log('Computed Shortest Path: length ' + 
				Math.floor(graph.sink.dist) + ' units');
		buttonGraphIter.disabled = true;
		
		drawFinalPath();
		drawGraph(false);
	}
}
buttonGraphIter.onclick = graphIterHandler;

/* Draws the final calculated shortest path and obstacles.
 */
function drawFinalPath() {
	
	for(let obstacle of obstacles) {
		if(obstacle.length > 0) drawPolygon(obstacle, false);
	}
	
	let node = graph.sink;
	
	context.strokeStyle = 'green';
	context.lineWidth = 3;
	
	while(node.predecessor !== null) {
		
		context.beginPath();
		context.moveTo(node.pt.x, node.pt.y);
		context.lineTo(node.predecessor.pt.x, node.predecessor.pt.y);
		context.stroke();
		
		node = node.predecessor;
	}
}

/* Draws the graph during calculation of shortest path.
 */
function drawGraph(edges = true) {
	
	for(let seg of graph.edges) {
		let p = seg.p.pt;
		let q = seg.q.pt;
		
		drawDist(seg.p);
		drawDist(seg.q);
		
		if(!edges) continue;
		
		if(seg.p.done) drawPoint(p, 'green', 6);
		else drawPoint(p, 'red', 6);
		
		if(seg.q.done) drawPoint(q, 'green', 6);
		else drawPoint(q, 'red', 6);
		
		context.strokeStyle = 'black';
		context.beginPath();
		context.moveTo(p.x, p.y);
		context.lineTo(q.x, q.y);
		context.stroke();
	}
	context.closePath();
}

/* Draws the thus-far calculated minimum distance of a node in the graph.
 */
function drawDist(node) {
	context.font = '10pt Calibri';
	context.fillStyle = 'red';

	context.fillText(`${node.dist === Infinity ? node.dist : Math.floor(node.dist)}`, node.pt.x - 10, node.pt.y + 15);
}

function nodeDist(a, b) {
	return Math.sqrt((a.pt.x - b.pt.x)**2 + (a.pt.y - b.pt.y)**2);
}