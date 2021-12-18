'use strict';

const CLICK_PENDING = 1;
const CLICK_OBST 	  = 2;
const CLICK_START   = 3;
const CLICK_END     = 4;
const CLICK_DONE = 5;

let obstacles = [[]];
let pendingObstacle = [];
let visibilityGraph;	// BST of visibility edges (segments) with properties p and q

let startVertex;
let endVertex;
let currVert = [];	// Queue of vertices, from each of which we will calculate visibility edges
let currVertPSOrder = [];	// Array of objects w pt, dist, angle properties in sweep order
let currVertPSOrderInd;		// Index of the vertex currently being examined in the sweep
let currVertPSStatus;		// BST of segments in sweep status

const START_PT = 1;
const END_PT = 2;
let awaitingPt = START_PT;

let clickMode = CLICK_PENDING;

let canvasPtLen = 6;

//Graphics library utility
let context;
if(canvas.getContext) {
	context = canvas.getContext('2d');
}

/* Initialize currVertPSOrder as an array of all obstacles vertices (and the 
 * start/end points) sorted in CCW order around the current vertex.
 */
function initializePSOrder() {
	
	currVertPSOrder = [];
	let currVertPt = currVert[currVert.length - 1];
	
	for(let obst of obstacles) {
		for(let obstPt of obst) {
			if(obstPt === currVertPt) continue;
			
			// The only reason for including the distance property is 
			// tie-breaking if two points happen to be at the same angle
			let obstPtDist = Math.sqrt((currVertPt.x - obstPt.x)**2 + 
					(currVertPt.y - obstPt.y)**2);
			let obstPtAngle = angle(currVertPt, obstPt);
			assert(!isNaN(obstPtDist) && !isNaN(obstPtAngle));
			let elem = {pt : obstPt, dist : obstPtDist, angle : obstPtAngle};
			
			currVertPSOrder.push(elem);
		
		}
	}
	
	// Add the starting point to currVertPSOrder
	if(currVertPt != startVertex) {
		let startDist = Math.sqrt((currVertPt.x - startVertex.x)**2 + (currVertPt.y - startVertex.y)**2);
		let startAngle = angle(currVertPt, startVertex);
		currVertPSOrder.push( { pt : startVertex, dist : startDist, angle : startAngle } );
	}
	
	// Add the ending point to currVertPSOrder
	if(currVertPt != endVertex) {
		let endDist = Math.sqrt((currVertPt.x - endVertex.x)**2 + (currVertPt.y - endVertex.y)**2);
		let endAngle = angle(currVertPt, endVertex);
		currVertPSOrder.push( { pt : endVertex, dist : endDist, angle : endAngle } );
	}
	
	// Sort vertices in CCW order
	currVertPSOrder = mergesort(currVertPSOrder);
	if(currVertPSOrder.length > 0) currVertPSOrderInd = 0;
	
	return currVertPSOrder;
}

/* Cast a ray to the right from the current vertex and add any intersected
 * segments to the initial sweep status.
 */
function initializePSStatus() {
	
	let currVertPt = currVert[currVert.length - 1];
	let infty = { x : currVertPt.x + canvas.width, y : currVertPt.y };
	let seg1 = {p : currVertPt, q : infty};	// Ray to the right
	
	currVertPSStatus = new SweepStatusBST(null);
	
	for(let obst of obstacles) {
		for(let i = 0; i < obst.length; ++i) {
			
			let a = obst[i];
			let b = obst[nextInd(i, obst.length)];
			if(a == currVertPt || b == currVertPt) continue;
			let seg2 = {p : a, q : b};	// Edge of obstacle
			
			if(intersect(seg1, seg2)) {
				seg2.dist = closestToSegment(currVertPt, seg2);
				//Arbitrary selection of a, dangerous?
				currVertPSStatus.insert(seg2, a, currVertPt);
			}
		}
	}
}

/* Resets the global sweep structures in preparation for the next vertex from 
 * which it will draw visibility edges.
 */
function nextVertex() {
	
	if(newVGVert() === true) {
		return true;	// Done with creation of visibility graph
	}
	
	let currVertPt = currVert[currVert.length - 1];
	
	initializePSOrder();
	initializePSStatus();
	
	return false;
}

/* Finds and draws all visibility edges for the next vertex.
 */
function buttonFindVisibleVertsHandler() {
	
	if(currVertPSOrder.length === 0 || 
			currVertPSOrderInd === currVertPSOrder.length) {
		//  Prepare for next vertex from which to draw visibility edges
		let isDone = nextVertex();
		if(isDone) return;
	}
	
	let currVertPt = currVert[currVert.length - 1];
	
	while(currVertPSOrderInd < currVertPSOrder.length) {
		let otherPt = currVertPSOrder[currVertPSOrderInd++].pt;
		
		updateAdjacentSegmentsSweepStatus(currVertPt, otherPt);
		
		if(visible(currVertPt, otherPt)) {
			let seg = { p : currVertPt, q : otherPt };
			// Arbitrary value assignment for ordering
			seg.value = (seg.p.x < seg.q.x) ? seg.p.x : seg.q.x;
			
			// The insertion operation filters out duplicates
			if(visibilityGraph === undefined) {
				visibilityGraph = new BinarySearchTree(seg);
			} else visibilityGraph.insert(seg);
		}
	}
	
	redraw(false);
	
	// Resets the UI sweep status
	currVertPSStatus.root = null;
	updateSweepStatusUI();
	return;
}
buttonFindVisibleVerts.onclick = buttonFindVisibleVertsHandler;

/* Adds or removes the segments adjacent to otherPt from the sweep status 
 * depending on whether they're on the CW or CCW side of the sweep line.
 * If they're both on the CCW side, then it checks which is closer 
 * on the CCW side (they share an endpoint)
 */
function updateAdjacentSegmentsSweepStatus(currVertPt, otherPt) {
	
	// Ignore the start/end vertices, which have no neighbors
	if(otherPt.ccw === undefined && otherPt.cw === undefined) return; 
	
	let segCCW = { p : otherPt, q : otherPt.ccw };
	let segCW = { p : otherPt, q : otherPt.cw };
	
	// A left turn from the sweep line indicates it's on the CCW side
	
	if(leftTurn(currVertPt, otherPt, otherPt.ccw)) {
			currVertPSStatus.insert(segCCW, otherPt, currVertPt);
	} else currVertPSStatus.remove(segCCW);
	
	if(leftTurn(currVertPt, otherPt, otherPt.cw)) {
			currVertPSStatus.insert(segCW, otherPt, currVertPt);
	} else currVertPSStatus.remove(segCW);
}

/* Find and draw the next visibility edge for the current vertex, or switch
 * to the next vertex if done.
 */
function buttonNextVisibleVertHandler() {
	
	if(currVertPSOrder.length === 0 || 
			currVertPSOrderInd === currVertPSOrder.length) {
		let isDone = nextVertex();
		if(isDone) return;
	}
	
	
	let currVertPt = currVert[currVert.length - 1];
	let otherPt = currVertPSOrder[currVertPSOrderInd++].pt;
	
	if(visible(currVertPt, otherPt)) {
		
		let seg = { p : currVertPt, q : otherPt };
		// Arbitrary value assignment for ordering
		seg.value = (seg.p.x < seg.q.x) ? seg.p.x : seg.q.x;
	
		// The insertion operation filters out any duplicates
		if(visibilityGraph === undefined) {
			visibilityGraph = new BinarySearchTree(seg);
		} else visibilityGraph.insert(seg);
	}
	
	updateAdjacentSegmentsSweepStatus(currVertPt, otherPt);
	
	redraw();
	
	// Draw the newest visibility edge in bold green
	context.strokeStyle='rgb(0,255,0)';
	context.lineWidth = 3;
	context.beginPath();
	context.moveTo(currVertPt.x, currVertPt.y);
	context.lineTo(otherPt.x, otherPt.y);
	context.stroke();
	context.closePath();
	context.lineWidth = 1;
}
buttonNextVisibleVert.onclick = buttonNextVisibleVertHandler;

/* Returns whether the algorithm has completed. Resets the global sweep 
 * structures and prepares for the next vertex if not.
 */
function newVGVert() {
	
	if(currVert.length == 1) {
		console.log('Completed Visibility Graph');
		buttonNextVisibleVert.disabled = true;
		buttonFindVisibleVerts.disabled = true;
		
		buttonGraphIter.disabled = false;
		let segArray = [];
		for(let node of visibilityGraph.inOrderTraversal()) {
			segArray.push(node.seg);
		}
		graph = new Graph(segArray, startVertex, endVertex);
		drawGraph();
		return true;
	} else {
		currVert.pop();
	}
	
	currVertPSStatus = null;
	currVertPSOrder = [];
	currVertPSOrderInd = null;
	
	return false;
}

/* Returns whether the segment pq intersects the interior of q's polygon 
 * locally at q.
 */
function localIntersect(p, q) {
	
	assert(p.x !== undefined);
	assert(q.x !== undefined);
	
	// When either is start/end vertex
	if(q.cw === undefined && q.ccw === undefined) return false;
	
	let slope = (q.y - p.y) / (q.x - p.x);
	let epsilon = 0.01;
	let sign = (p.x < q.x) ? -1 : 1;
	
	let deltaPt = { x : q.x + (sign * epsilon), y : q.y + slope * (sign * epsilon) };
	
	if(insidePolygon(deltaPt, obstacles[q.polyIndex])) {
		return true;
	} else return false;
	
}

/* Returns whether the two passed points are visible to each other.
 */
function visible(p, q) {
	assert(p.x !== undefined);
	assert(q.x !== undefined);
	let seg = { p : p, q : q };
	
	if(q.cw !== undefined && q.ccw !== undefined && 
			(p == q.cw || p == q.ccw)) {
		return true;
	}
	
	if(localIntersect(p, q)) {
		return false;
	} else if(currVertPSOrderInd === 0 || 
			currVertPSOrder[currVertPSOrderInd - 1].y !== p.y) {
/* If it's the first vertex in the sweep, or the previous vertex in the sweep 
isn't on the segment from the current vertex to it.
This is an assumption of general position given it's unlikely that a point 
will lie on the non-horizontal segment between two other points
*/
		let closestSegment = currVertPSStatus.min();
		
		if(closestSegment !== null && intersect(closestSegment, seg) && 
				q !== closestSegment.p && q !== closestSegment.q) {
			return false;
		} else {
			return true;
		}
	} else if (!visible(p, currVertPSOrder[currVertPSOrderInd - 1])) {
		return false;
	} else {
		let prevPt = currVertPSOrder[currVertPSOrderInd - 1];
		// In this condition, the segment from current vertex to prevPt is a 
		// subset of the segment from the current vertex to q. Uncommon
		for (let node of currVertPSStatus.inOrderTraversal()) {
			if (intersect(node.seg, {p : prevPt, q : q })) return false;
		}
	}
	
	return true;
}

/* Initializes the visibility graph creation.
 */
function buttonBeginCalcHandler() {
	
	clickMode = CLICK_DONE;
	
	// Populate stack of vertices from which we will calculate visibility edges
	for(let obst of obstacles) {
		for(let vert of obst) {
			currVert.push(vert);
		}
	}
	currVert.push(endVertex);
	currVert.push(startVertex);
	
	buttonAddObstacle.disabled = true;
	buttonAddPt.disabled = true;
	buttonBeginCalc.disabled = true;
	buttonFindVisibleVerts.disabled = false;
	buttonNextVisibleVert.disabled = false;
	
	initializePSOrder();
	initializePSStatus();
	
	console.log(`Start pt: ${pS(startVertex)}`);
	console.log(`  End pt: ${pS(endVertex)}`);
	console.log('');
	
	let currVertPt = currVert[currVert.length - 1];
	
}
buttonBeginCalc.onclick = buttonBeginCalcHandler;

/* Draws the coordinate of a vertex we click on.
 */
function drawCoord(clickPt) {
	context.font = '8pt Calibri';
	context.fillStyle = 'green';
	let canvasPt = { x : clickPt.x - 10, y : clickPt.y - 10 } ;
	for(let obst of obstacles) {
		for(let pt of obst) {
			if(Math.abs(pt.x - canvasPt.x) < 12 && 
					Math.abs(pt.y - canvasPt.y) < 12) {
				context.fillText(`(${pt.x}, ${pt.y})`, pt.x - 20, pt.y - 8);
				return;
			}
		}
	}
	
	if(Math.abs(startVertex.x - canvasPt.x) < 12 && Math.abs(startVertex.y - canvasPt.y) < 12) {
		context.fillText(`(${startVertex.x}, ${startVertex.y})`, startVertex.x - 20, startVertex.y - 8);
	}
				
	if(Math.abs(endVertex.x - canvasPt.x) < 12 && Math.abs(endVertex.y - canvasPt.y) < 12) {
		context.fillText(`(${endVertex.x}, ${endVertex.y})`, endVertex.x - 20, endVertex.y - 8);
	}		
}

/* Delegates functionality when the canvas is clicked.
 */
function canvasClickHandler(event) {
	let clickPt = { x : Math.floor(event.clientX), y : Math.floor(event.clientY) };
	switch(clickMode) {
		case CLICK_PENDING:
			// Do nothing
			break;
		case CLICK_OBST:
			addObstacleVert(clickPt);
			break;
		case CLICK_START:
			addStartVert(clickPt);
			break;
		case CLICK_END:
			addEndVert(clickPt);
			break;
		case CLICK_DONE:
			drawCoord(clickPt);
			break;
		default:
			console.log('Unidentified click');
	}
}
canvas.onclick = canvasClickHandler;

function buttonAddObstacleHandler() {
	if(clickMode != CLICK_OBST) {
		clickMode = CLICK_OBST;
		buttonAddObstacle.innerHTML = 'Close Obstacle';
		buttonAddPt.disabled = true;
		buttonBeginCalc.disabled = true;
		
		// Obstacles initially has an empty list, so shift that out
		if(obstacles[0] === undefined || obstacles[0].length === 0) {
			obstacles.shift();
		}
	} else if(clickMode == CLICK_OBST) {
		
		clickMode = CLICK_PENDING;
		buttonAddObstacle.innerHTML = 'Add Obstacle';
		buttonAddPt.disabled = false;
		if(startVertex !== undefined && endVertex !== undefined) {
			buttonBeginCalc.disabled = false;
		}
		
		if(validPolygon(pendingObstacle)) {
			
			let newObstacle = [];
			for(let i = 0; i < pendingObstacle.length; ++i) {
				newObstacle.push(pendingObstacle[i]);
				newObstacle[i].polyIndex = obstacles.length;
			}
			
			newObstacle = makeCCW(newObstacle);
			obstacles.push(newObstacle);
			
			console.log(`Obstacle #${obstacles.length}:`);
			printArr(newObstacle);
			console.log('');
		}
		
		redraw();
		pendingObstacle = [];
	}
}
buttonAddObstacle.onclick = buttonAddObstacleHandler;

function addObstacleVert(newPt) {
	// Conversion from page coords to canvas coords
	newPt.x -= 10;
	newPt.y-= 10;
	
	if(pendingObstacle.length == 0 && insideObstacles(newPt)) {
		clickMode = CLICK_PENDING;
		buttonAddObstacle.innerHTML = 'Add Obstacle';
		buttonAddPt.disabled = false;
		alert('Place obstacle vertices outside of other obstacles');
		return;
	}
	
	pendingObstacle.push(newPt);
	
	drawPoint(newPt, 'green');
	context.font = '8pt Calibri';
	context.fillStyle = 'green';
	context.fillText(`${pendingObstacle.length}: (${newPt.x}, ${newPt.y})`, newPt.x - 20, newPt.y - 8);
}

function buttonAddPtHandler() {
	
	if(awaitingPt === START_PT) clickMode = CLICK_START;
	else if(awaitingPt === END_PT) clickMode = CLICK_END;

	buttonAddObstacle.disabled = true;
	buttonAddPt.disabled = true;
	buttonBeginCalc.disabled = true;
}
buttonAddPt.onclick = buttonAddPtHandler;

/* Add and draw a source point for the path.
 */
function addStartVert(pt) {
	
	buttonAddObstacle.disabled = false;
	buttonAddPt.disabled = false;
	if(endVertex !== undefined) buttonBeginCalc.disabled = false;
	clickMode = CLICK_PENDING;
	
	startVertex = { x : pt.x - 10, y : pt.y - 10 };
	
	if(insideObstacles(startVertex)) {
		alert('Place the start vertex outside any obstacles');
		return;
	}
	
	redraw();
	drawPoint(startVertex, 'rgb(0,255,0)');
	
	buttonAddPt.innerHTML = 'Add End Point';
	awaitingPt = END_PT;
}

/* Add and draw a terminating point for the path.
 */
function addEndVert(pt) {
	
	buttonAddObstacle.disabled = false;
	buttonAddPt.disabled = false;
	buttonBeginCalc.disabled = false;
	clickMode = CLICK_PENDING;
	
	endVertex = { x : pt.x - 10, y : pt.y - 10 };
	
	if(insideObstacles(endVertex)) {
		alert('Place the end vertex outside any obstacles');
		return;
	}
	
	redraw();
	drawPoint(endVertex, 'rgb(255,0,0)');
	
	buttonAddPt.innerHTML = 'Add Start Point';
	awaitingPt = START_PT;
	
	buttonBeginCalc.disabled = false;
}

/* Determine if the passed point is inside the passed polygon by drawing a 
 * ray to the right and counting the number of intersections with the edges 
 * of each polygon (inside if odd parity).
 */
function insidePolygon(pt, polygon) {
	
	if(pt === undefined) {
		console.log('Undefined pt passed to insidePolygon');
	}
	
	let infty = { x : canvas.width + 10, y : pt.y };
	let segment1 = { p : pt, q : infty};
	let numIntersections = 0;
	
	if(polygon === undefined) {
		console.log(`Undefined polygon in insidePolygon`);
	}
	
	for(let vertIndex = 0; vertIndex < polygon.length; ++vertIndex) {
		let segment2 = { p : polygon[vertIndex] };
		segment2.q = (vertIndex < polygon.length - 1) ? polygon[vertIndex + 1] : polygon[0];
		if(intersect(segment1, segment2)) {
			++numIntersections;
		}
	}
	
	if(numIntersections % 2 == 1) return true;
	
	return false;
}

/* Returns whether the passed point is inside any of the (complete) obstacles.
 */
function insideObstacles(pt) {
	for(let polyIndex = 0; polyIndex < obstacles.length; ++polyIndex) {
		if(insidePolygon(pt, obstacles[polyIndex])) return true;
	}
	return false;
}

function containsObstacles(newPoly) {
	if(newPoly === undefined) {
		console.log('undefined polygon passed to containsObstacles');
	}
	
	for(let poly of obstacles) {
		if(poly.length > 0 && insidePolygon(poly[0], newPoly)) return true;
	}
	return false;
}

/* Returns true if the passed array of vertices forms a polygon and doesn't
 * intersect nor contain any other obstacles.
 */
function validPolygon(polygon) {
	if(0 < polygon.length && polygon.length < 3) {
		alert('Obstacles must have at least 3 vertices');
		return false;
	} else if(0 === polygon.length) return false;
	
	for(let i = 0; i < polygon.length; ++i) {
		let pt = polygon[i];
		let nextPt = (i < polygon.length - 1) ? polygon[i + 1] : polygon[0];
		
		let segment1 = { p : pt, q : nextPt };
		
		for(let j = 0; j < polygon.length; ++j) {
			
			let otherPt = polygon[j];
			let otherNextPt = (j < polygon.length - 1) ? polygon[j + 1] : polygon[0];
			
			if(otherPt == pt || otherPt == nextPt || 
				otherNextPt == pt || otherNextPt == nextPt) continue;

			let segment2 = { p : otherPt, q : otherNextPt };
			
			if(intersect(segment1, segment2)) {
				alert('Obstacles cannot intersect themselves');
				return false;
			}
		}
	}
	
	for(let polyIndex = 0; polyIndex < obstacles.length; ++polyIndex) {
		let otherPolygon = obstacles[polyIndex];
		for(let vertIndex = 0; vertIndex < polygon.length; ++vertIndex) {
			let pt = polygon[vertIndex];
			let nextPt = (vertIndex < polygon.length - 1) ? polygon[vertIndex + 1] : polygon[0];
			
			let segment1 = { p : pt, q : nextPt };
			
			for(let otherVertIndex = 0; otherVertIndex < otherPolygon.length; ++otherVertIndex) {
				
				let otherPt = otherPolygon[otherVertIndex];
				let otherNextPt = (otherVertIndex < otherPolygon.length - 1) ? otherPolygon[otherVertIndex + 1] : otherPolygon[0];
				
				if(otherPt == pt || otherPt == nextPt || 
					otherNextPt == pt || otherNextPt == nextPt) continue;

				let segment2 = { p : otherPt, q : otherNextPt };
				
				if(intersect(segment1, segment2)) {
					alert('Obstacles cannot intersect each other');
					return false;
				}
			}
		}
	}
	
	let startInPoly = startVertex !== undefined && 
			insidePolygon(startVertex, pendingObstacle);
	let endInPoly = endVertex !== undefined && 
			insidePolygon(endVertex, pendingObstacle);
	if(containsObstacles(pendingObstacle) || startInPoly || endInPoly) {
		alert('Obstacles cannot contain any vertices');
		return false;
	}
	
	return true;
}

/* Returns the passed polygon with the vertices in CCW order.
 */
function makeCCW(polygon) {
	
	// The point with min x coordinate is guaranteed to be on the convex hull
	let minXCoord = Infinity;
	let minXIndex = -1;
	for(let i = 0; i < polygon.length; ++i) {
		// Will be amended later if the ordering is not CCW
		polygon[i].ccw = polygon[nextInd(i, polygon.length)];
		polygon[i].cw = polygon[prevInd(i, polygon.length)];
		
		if(polygon[i].x < minXCoord) {
			minXCoord = polygon[i].x;
			minXIndex = i;
		}
	}
	
	let prevIndex = prevInd(minXIndex, polygon.length);
	let nextIndex = nextInd(minXIndex, polygon.length);
	
	if(leftTurn(polygon[prevIndex], polygon[minXIndex], polygon[nextIndex])) {
		return polygon;
	}
	
	let newPoly = [];
	let polyLen = polygon.length;
	
	while(polygon.length > 0) newPoly.push(polygon.pop());
	
	for(let i = 0; i < newPoly.length; ++i) {
		newPoly[i].ccw = newPoly[nextInd(i, newPoly.length)];
		newPoly[i].cw  = newPoly[prevInd(i, newPoly.length)];
	}
	
	assert(polyLen === newPoly.length);
	
	return newPoly;
	
}

/* Clears the canvas.
 */
function clearCanvas() {
	context.clearRect(0, 0, canvas.width, canvas.height);
}

function drawPoint(pt, color = 'rgb(0,0,0)', size = canvasPtLen / 2) {
	context.strokeStyle = color;
	context.fillStyle = color;
	//context.fillRect(pt.x - (canvasPtLen/2), pt.y - (canvasPtLen/2), canvasPtLen, canvasPtLen);
	context.moveTo(pt.x + size, pt.y);
	context.beginPath();
	context.arc(pt.x, pt.y, size, 0, Math.PI * 2, true);
	context.fill();
	context.closePath();
}

/* Draws the obstacles, vertices, and visibility graph.
 */
function draw(highlight = true) {
	
	for(let obstacle of obstacles) {
		if(obstacle.length > 0) drawPolygon(obstacle, highlight);
	}
	
	if(endVertex   !== undefined && endVertex   !== null) {
		drawPoint(  endVertex, 'rgb(255,0,0)');
	}
	if(startVertex !== undefined && startVertex !== null) {
		drawPoint(startVertex, 'rgb(0,255,0)');
	}
	if(currVert != null && currVert.length > 0) {
		context.beginPath();
		context.strokeStyle = 'rgb(255,0,0)';
		let vert = currVert[currVert.length - 1];
		context.moveTo(vert.x + canvasPtLen * 3, vert.y);
		context.arc(vert.x, vert.y, canvasPtLen * 3, 0, Math.PI * 2, true);
		context.stroke();
	}
	
	if(visibilityGraph === undefined) return;
	
	//context.setLineDash([10,10]);
	for(let node of visibilityGraph.inOrderTraversal()) {
		let seg = node.seg;
		
		context.strokeStyle = 'rgb(255,0,0)';
		context.fillStyle = 'rgb(255,0,0)';
		context.beginPath();
		context.moveTo(seg.p.x, seg.p.y);
		context.lineTo(seg.q.x, seg.q.y);
		context.stroke();
	}
	//context.setLineDash([]);
	context.closePath();
}

/* Clears canvas and calls draw.
 */
function redraw(highlight = true) {
	clearCanvas();
	draw(highlight);
	updateSweepStatusUI();
}

function drawPolygon(arr, highlight = true) {
	context.lineWidth = 3;
	for(let i = 0; i < arr.length; ++i) {
		
		let pt = arr[i];
		let seg = { p : arr[prevInd(i, arr.length)], q : pt };
		if(currVert.length > 0 && currVertPSStatus.has(seg) && highlight) {
			context.strokeStyle = 'rgb(0,0,255)';
			context.fillStyle = 'rgb(0,0,255)';
		} else { 
			context.strokeStyle = 'rgb(0,0,0)';
			context.fillStyle = 'rgb(0,0,0)';
		}
		
		context.beginPath();
		context.moveTo(arr[prevInd(i, arr.length)].x, arr[prevInd(i, arr.length)].y);
		context.lineTo(pt.x, pt.y);
		context.stroke();
		context.closePath();
		drawPoint(pt);
	}
	context.lineWidth = 1;
}

function assert(condition, msg = '') {
	if(!condition) {
		let str = (msg.length > 0) ? ': ' + msg : '';
		throw new Error(`Assertion failed${str}`);
	}
}

function nextInd(ind, len) {
	assert(typeof ind === 'number');
	assert(typeof len === 'number');
	if(ind < len - 1) return ind + 1;
	else return 0;
}

function prevInd(ind, len) {
	assert(typeof ind === 'number');
	assert(typeof len === 'number');
	if(ind > 0) return ind - 1;
	else return len - 1;
}

function updateSweepStatusUI() {
	
	// Eliminate all of the children
	while(olSweepStatus.firstChild) {
		olSweepStatus.removeChild(olSweepStatus.firstChild);
	}
	olSweepStatus.innerHTML = 'Sweep Status (after current point):'
	
	if(currVertPSStatus !== undefined) {
		// Add new, updated children
		for (let node of currVertPSStatus.postOrderTraversal()) {
			let newItem = document.createElement('li');
			newItem.id = 'sweepItem';
			newItem.innerHTML = `(${node.seg.p.x}, ${node.seg.p.y}) &#8594; (${node.seg.q.x}, ${node.seg.q.y})`;
			olSweepStatus.appendChild(newItem);
		}
	}
}

