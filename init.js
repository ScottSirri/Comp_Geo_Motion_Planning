'use strict';

let divContainer = document.createElement('div');
divContainer.id = 'divContainer';
divContainer.style.width = window.innerWidth;
document.body.appendChild(divContainer);

let divCanvas = document.createElement('div');
divCanvas.id = 'divCanvas';
divContainer.appendChild(divCanvas);

let canvas = document.createElement('canvas');
canvas.id='canvas';
canvas.height=600;
divCanvas.appendChild(canvas);
canvas.width=600;

let divUI = document.createElement('div');
divUI.id = 'divUI';
divContainer.appendChild(divUI);

let headerUI = document.createElement('h1');
headerUI.id = 'headerUI';
headerUI.innerHTML = 'Visibility Graph Creation';
divUI.appendChild(headerUI);

let buttonAddPt = document.createElement('button');
buttonAddPt.innerHTML = 'Add Start Point';
buttonAddPt.id = 'buttonAddPt';
buttonAddPt.disabled = false;
divUI.appendChild(buttonAddPt);

let buttonAddObstacle = document.createElement('button');
buttonAddObstacle.innerHTML = 'Add Obstacle';
buttonAddObstacle.id = 'buttonAddObstacle';
buttonAddObstacle.disabled = false;
divUI.appendChild(buttonAddObstacle);

let buttonBeginCalc = document.createElement('button');
buttonBeginCalc.innerHTML = 'Begin Calculating VG';
buttonBeginCalc.id = 'buttonBeginCalc';
buttonBeginCalc.disabled = true;
divUI.appendChild(buttonBeginCalc);

let buttonFindVisibleVerts = document.createElement('button');
buttonFindVisibleVerts.innerHTML = 'Find Visible Verts';
buttonFindVisibleVerts.id = 'buttonFindVisibleVerts';
buttonFindVisibleVerts.disabled = true;
divUI.appendChild(buttonFindVisibleVerts);

let buttonNextVisibleVert = document.createElement('button');
buttonNextVisibleVert.innerHTML = 'Next Visible Vert';
buttonNextVisibleVert.id = 'buttonNextVisibleVert';
buttonNextVisibleVert.disabled = true;
divUI.appendChild(buttonNextVisibleVert);

let olSweepStatus = document.createElement('ul');
olSweepStatus.id = 'olSweepStatus';
olSweepStatus.innerHTML = 'Sweep Status (after current point):';
divUI.appendChild(olSweepStatus);

let buttonGraphIter = document.createElement('button');
buttonGraphIter.id = 'buttonGraphIter';
buttonGraphIter.innerHTML = 'Dijkstra\'s Algorithm Iteration';
buttonGraphIter.disabled = true;
divUI.appendChild(buttonGraphIter);


/*let button = document.createElement('button');
button.innerHTML = '';
button.id = 'button';
button.disabled = true;
divUI.appendChild(button);*/

/*let buttonReset = document.createElement('button');
buttonReset.innerHTML = 'Reset';
buttonReset.id = 'buttonReset';
divUI.appendChild(buttonReset);*/

/* Code taken from 
 * https://www.30secondsofcode.org/articles/s/js-data-structures-binary-search-tree
 */
class BinarySearchTreeNode {
  constructor(seg, parent = null) {
    this.seg = seg;
	this.value = segVal(seg);
    this.parent = parent;
    this.left = null;
    this.right = null;
  }

  get isLeaf() {
    return this.left === null && this.right === null;
  }

  get hasChildren() {
    return !this.isLeaf;
  }
}

class BinarySearchTree {
	constructor(key) {
		if(key !== null) {
			this.root = new BinarySearchTreeNode(key, null);
		} else this.root = null;
	}

	insert(seg) {
		
		if(this.root === null) {
			this.root = new BinarySearchTreeNode(seg, null);
			return;
		}
		
		let newVal = segVal(seg);
		
		let node = this.root;
		while (true) {
			
			if(eqSegs(node.seg, seg)) {
				return;
			}
			
			if (node.value >= newVal) {
				if (node.left !== null) {
					// Search left-hand subtree
					node = node.left;
				} else {
					// Insert
					node.left = new BinarySearchTreeNode(seg, node);
					return true;
				}
			} else {	
				if (node.right !== null) {
					// Search right-hand subtree
					node = node.right;
				} else {
					// Insert
					node.right = new BinarySearchTreeNode(seg, node);
					return true;
				}
			}
		}
	}

	// TODO : Convert these to log-time searches?
	has(seg) {
		for (let node of this.postOrderTraversal()) {
			if (eqSegs(node.seg, seg)) return true;
		}
		return false;
	}
	find(seg) {
		for (let node of this.postOrderTraversal()) {
			if (eqSegs(node.seg, seg)) return node;
		}
		return undefined;
	}

	remove(seg) {
		const node = this.find(seg);
		if (node === undefined) {
			return false;
		}
		const isRoot = (node.parent === null);
		const isLeftChild = (!isRoot) ? node.parent.left === node : false;
		const hasBothChildren = (node.left !== null) && (node.right !== null);

		if (node.isLeaf) {
			if (!isRoot) {
				if (isLeftChild) node.parent.left = null;
				else node.parent.right = null;
			} else {
				this.root = null;
			}
			return true;
		} else if (!hasBothChildren) {
			const child = node.left !== null ? node.left : node.right;
			if (!isRoot) {
				if (isLeftChild) node.parent.left = child;
				else node.parent.right = child;
			} else {
				this.root = child;
			}
			child.parent = node.parent;
			return true;
		} else {
			const rightmostLeft = [...this.inOrderTraversal(node.left)].slice(-1)[0];
			rightmostLeft.parent = node.parent;
			if (!isRoot) {
				if (isLeftChild) node.parent.left = rightmostLeft;
				else node.parent.right = rightmostLeft;
			} else {
				this.root = rightmostLeft;
			}
			rightmostLeft.right = node.right;
			node.right.parent = rightmostLeft;
			return true;
		}
	}
  
	printTree() {
	if(this.root === null || this.root === undefined) {
		console.log('Attempted to print empty BST');
	}
	console.log('BST PRINT:');
	this.printSubtree(this.root);
	}
	
	min() {
		let node = this.root;
		if(node === null) return null;
		while(node.left !== null) {
			node = node.left;
		}
		return node.seg;
	}
	
	prev(seg) {
		let node = this.find(seg);
		if(node == node.parent.left) {	// If left child
			if(node.right === null) return null;	// This is the first (closest) elem (segment)
			let query = node.right;
			while(query.right !== null) query = query.right;
			return query.seg;
		} else {	// If right child
			if(node.parent.left === null) return node.parent.seg;	// No sibling
			
			// Search left sibling subtree
			let query = node.parent.left;
			while(query.right !== null) query = query.right;
			return query.seg;
		}
	}
  
	printSubtree(node) {
		if(node === null || node === undefined) return;
		this.printSubtree(node.left);
		this.printSubtree(node.right);
	}
  
	*inOrderTraversal(node = this.root) {
		if(node === null) {
			return;
		}
		if (node.left) yield* this.inOrderTraversal(node.left);
		yield node;
		if (node.right) yield* this.inOrderTraversal(node.right);
	}

	*postOrderTraversal(node = this.root) {
		if(node === null) {
			return;
		}
		if (node.left) yield* this.postOrderTraversal(node.left);
		if (node.right) yield* this.postOrderTraversal(node.right);
		yield node;
	}

	*preOrderTraversal(node = this.root) {
		yield node;
		if (node.left) yield* this.preOrderTraversal(node.left);
		if (node.right) yield* this.preOrderTraversal(node.right);
	}
}


class SweepStatusNode {
  constructor(seg, parent = null) {
    this.seg = seg;
    this.parent = parent;
    this.left = null;
    this.right = null;
  }
  
  // Returns the distance to the intersection between ray from currVert to otherPt and this.seg
  value(currVertPt, otherPt) {
	  return distSeg(currVertPt, otherPt, this.seg)
  }

  get isLeaf() {
    return this.left === null && this.right === null;
  }

  get hasChildren() {
    return !this.isLeaf;
  }
}

class SweepStatusBST {
	constructor(key) {
		if(key !== null) {
			this.root = new SweepStatusNode(key, null);
		} else this.root = null;
	}

	/* Segment being inserted, endpoint of that segment hit first, current vertex around which we are sweeping.
	 */
	insert(seg, endpt, currVertPt) {
		
		if(this.root === null) {
			this.root = new SweepStatusNode(seg, null);
			return;
		}
		
		let newVal = distPt(currVertPt, endpt);
		
		let node = this.root;
		while (true) {
			
			if(eqSegs(node.seg, seg)) {
				return;
			}
			
			if (node.value(currVertPt, endpt) >= newVal) {
				if (node.left !== null) {
					// Search left-hand subtree
					node = node.left;
				} else {
					// Insert
					node.left = new SweepStatusNode(seg, node);
					return true;
				}
			} else {	
				if (node.right !== null) {
					// Search right-hand subtree
					node = node.right;
				} else {
					// Insert
					node.right = new SweepStatusNode(seg, node);
					return true;
				}
			}
		}
	}


	// TODO : Convert these to log-time searches?
	has(seg) {
		for (let node of this.postOrderTraversal()) {
			if (eqSegs(node.seg, seg)) return true;
		}
		return false;
	}
	find(seg) {
		for (let node of this.postOrderTraversal()) {
			if (eqSegs(node.seg, seg)) return node;
		}
		return undefined;
	}

	remove(seg) {
		const node = this.find(seg);
		if (node === undefined) {
			return false;
		}
		
		const isRoot = (node.parent === null);
		const isLeftChild = (!isRoot) ? node.parent.left === node : false;
		const hasBothChildren = (node.left !== null) && (node.right !== null);

		if (node.isLeaf) { // 0 children
			// Easy: chop off a leaf
			if (!isRoot) {
				if (isLeftChild) {
					node.parent.left = null;
				} else {
					node.parent.right = null;
				}
			} else {
				this.root = null;
			}
			return true;
		} else if (!hasBothChildren) { // 1 child
			// Child usurps parent
			const child = (node.left !== null) ? node.left : node.right;
			if (!isRoot) {
				if (isLeftChild) {
					node.parent.left = child;
				} else {
					node.parent.right = child;
				}
			} else {
				this.root = child;
			}
			child.parent = node.parent;
			return true;
		} else { // 2 children
		
			const rightmostLeft = [...this.inOrderTraversal(node.left)].slice(-1)[0]; // Last elem in the in-order left subtree
			
			// This was forgotten in the original code
			rightmostLeft.parent.right = null;	
			rightmostLeft.parent = node.parent;
			
			if (!isRoot) {
				if (isLeftChild) node.parent.left = rightmostLeft;
				else node.parent.right = rightmostLeft;
			} else {
				this.root = rightmostLeft;
			}
			
			// This condition was forgotten in the original code
			if(node.left !== rightmostLeft) { 
				rightmostLeft.left = node.left;
				node.left.parent = rightmostLeft;
			}
			
			rightmostLeft.right = node.right;
			if(node.right !== null) node.right.parent = rightmostLeft;
			
			return true;
		}
	}
  
	printTree() {
	if(this.root === null || this.root === undefined) {
		console.log('Attempted to print empty BST');
	}
	console.log('BST PRINT:');
	this.printSubtree(this.root);
	}
	
	min() {
		let node = this.root;
		if(node === null) return null;
		
		while(node.left !== null) {
			node = node.left
		}
		return node.seg;
	}
	
	prev(seg) {
		let node = this.find(seg);
		if(node == node.parent.left) {	// If left child
			if(node.right === null) return null;	// This is the first (closest) elem (segment)
			let query = node.right;
			while(query.right !== null) query = query.right;
			return query.seg;
		} else {	// If right child
			if(node.parent.left === null) return node.parent.seg;	// No sibling
			
			// Search left sibling subtree
			let query = node.parent.left;
			while(query.right !== null) query = query.right;
			return query.seg;
		}
	}
  
	printSubtree(node) {
		if(node === null || node === undefined) return;
		console.log(`${pSe(node.seg)}: par=${node.parent === null ? 'null' : pSe(node.parent.seg)}, left=${node.left === null ? 'null' : pSe(node.left.seg)}, right=${node.right === null ? 'null' : pSe(node.right.seg)}`);
		this.printSubtree(node.left);
		this.printSubtree(node.right);
	}
  
	*inOrderTraversal(node = this.root) {
		if(node === null) return;
		
		if (node.left) yield* this.inOrderTraversal(node.left);
		yield node;
		if (node.right) yield* this.inOrderTraversal(node.right);
	}

	*postOrderTraversal(node = this.root) {
		if(node === null) {
			//console.log('Attempting to access segment from empty BST');
			return;
		}
		
		if (node.left !== null) yield* this.postOrderTraversal(node.left);
		if (node.right !== null) yield* this.postOrderTraversal(node.right);
		yield node;
	}

	*preOrderTraversal(node = this.root) {
		yield node;
		if (node.left) yield* this.preOrderTraversal(node.left);
		if (node.right) yield* this.preOrderTraversal(node.right);
	}
}

function segVal(seg) {
	return (seg.dist ?? seg.order);
}

function eqSegs(seg1, seg2) {
	if(seg1.p === seg2.p && seg1.q === seg2.q) return true;
	if(seg1.p === seg2.q && seg1.q === seg2.p) return true;
	return false;
}

/*
 * Code for mergesort and merge is taken from stackabuse.com
 * and is written by Abhilash Kakumanu.
 */
function mergesort(array) {
	
  // Base case or terminating case
  if(array.length < 2){
    return array;
  }
  
  const half = array.length / 2;
  
  const left = array.splice(0, half);
  return merge(mergesort(left), mergesort(array));
}

/*
 * Code for mergesort and merge is taken from stackabuse.com
 * and is written by Abhilash Kakumanu.
 */
function merge(left, right) {
	
    let arr = [];
    // Break out of loop if any one of the array gets empty
    while (left.length && right.length) {
        // Pick the smallest element of the left and right subarrays 
        if (left[0].angle < right[0].angle) {
            arr.push(left.shift());
        } else if (left[0].angle > right[0].angle) {
            arr.push(right.shift());
        } else if (left[0].angle === right[0].angle) {
			if (left[0].dist < right[0].dist) {
				arr.push(left.shift());
			} else {
				arr.push(right.shift());
			}
		}
    }
    
    // Concatenating the leftover elements
    // (in case we didn't go through the entire left or right array)
    return [ ...arr, ...left, ...right ]
}

/* Returns the angle between the vector pq and positive x-axis.
 */
function angle(p, q) {
	// y-signs reversed because canvas origin is in top left, shouldn't affect functionality?
	let a = { x : q.x - p.x, y : p.y - q.y};	
	let angle =  Math.atan2(a.y, a.x) * (180 / Math.PI);	// Is that how atan2 works?
	if(angle < 0) angle += 360;
	return angle;
}

/* Returns if the two segments intersect each other.
 */
function intersect(seg1, seg2) {
	// Intersect if the two turns are different directions (different signs).
	return  orient(seg1.p, seg1.q, seg2.p) * 
			orient(seg1.p, seg1.q, seg2.q) <= 0 &&
			orient(seg2.p, seg2.q, seg1.p) * 
			orient(seg2.p, seg2.q, seg1.q) <= 0;
}

/* Returns whether the three passed points make a left turn, as defined in the 
 * Orient function from Dave Mount's notes.
 * Left turn if negative.
 */
function leftTurn(p, q, r) {
	assert(p.x !== undefined);
	assert(q.x !== undefined);
	assert(r.x !== undefined);
	// The equal part of the geq deals with the degenerate 
	// case in which two of the points are coincident
	return (q.x*r.y - q.y*r.x) - (p.x*r.y - p.y*r.x) + (p.x*q.y - p.y*q.x) < 0;
}

/* Returns whether the three passed points make a left turn, as defined in the 
 * Orient function from Dave Mount's notes.
 * Left turn if negative because origin top left
 */
function orient(p, q, r) {
	assert(p.x !== undefined);
	assert(q.x !== undefined);
	assert(r.x !== undefined);
	// The equal part of the geq deals with the degenerate 
	// case in which two of the points are coincident
	return (q.x*r.y - q.y*r.x) - (p.x*r.y - p.y*r.x) + (p.x*q.y - p.y*q.x);
}

function closestToSegment(pt, segment) {
	let a = segment.p;
	let b = segment.q;
	let slope = (b.y-a.y)/(b.x-a.x);
	let yIntercept = b.y - (slope * b.x);
	
	let perpSlope = -1/slope;
	let perpYIntercept = pt.y - (perpSlope * pt.x);
	let lineX = (perpYIntercept - yIntercept) / (slope - perpSlope);
	
	let closestToLine = {x : lineX, y: (perpSlope * lineX) + perpYIntercept};
	let closestToSeg;
	if(closestToLine.x > segment.p.x && closestToLine.x > segment.q.x) {
		closestToSeg = (segment.p.x > segment.q.x) ? segment.p : segment.q;
	} else if(closestToLine.x < segment.p.x && closestToLine.x < segment.q.x) {
		closestToSeg = (segment.p.x < segment.q.x) ? segment.p : segment.q;
	} else {
		closestToSeg = closestToLine;
	}
	
	return Math.sqrt((pt.x - closestToSeg.x)**2 + (pt.y - closestToSeg.y)**2);
}

function pS(pt) {
	return `(${pt.x}, ${pt.y})`;
}

function pSe(seg) {
	return `${pS(seg.p)}-${pS(seg.q)}`;
}

function printArr(arr) {
	let str = `{${arr.length}}: `;
	for(let pt of arr) str = str + `(${pt.x}, ${pt.y}) `;
	console.log(str);
}

function distPt(a, b) {
	return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2);
}

/* a is current vertex from which we are drawing visibility edges.
 * b is an edge to which we are drawing a ray.
 * segment is in (or about to be in) the sweep status and we want to know the distance to the intersection between ray ab and segment.
 */
function distSeg(a, b, segment) {
	
	assert(a !== undefined);
	assert(a.x !== undefined);
	assert(b !== undefined);
	assert(b.x !== undefined);
	assert(segment !== undefined);
	assert(segment.p !== undefined);
	
	let p = segment.p;
	let q = segment.q;
	
	// Intersect at endpoint of segment pq
	if(b == q || b == p) {
		let distance = Math.sqrt((b.x - a.x)**2 + (b.y - a.y)**2);
		return distance;
	}
	
	// Find intersection between ray ab and segment pq
	
/* Equation of line through pq: y = ((q.y - p.y) / (q.x - p.x))*(x - p.x) + p.y
								  = mP*x - mP*p.x + p.y
   Equation of line through ab: y = ((b.y - a.y) / (b.x - a.x))*(x - a.x) + a.y
								  = mA*x - mA*a.x + a.y
		mP*x - mP*p.x + p.y = mA*x - mA*a.x + a.y
		x*(mP - mA) = mP*p.x - mA*a.x + a.y - p.y
		x = (mP*p.x - mA*a.x + a.y - p.y) / (mP - mA)
*/
	
	let mP = (q.y - p.y) / (q.x - p.x);
	let mA = (b.y - a.y) / (b.x - a.x);
	let x_inter = (mP*p.x - mA*a.x + a.y - p.y) / (mP - mA);
	let y_inter = mP*x_inter - mP*p.x + p.y;
	
	let distance = Math.sqrt((a.x - x_inter)**2 + (a.y - y_inter)**2);
	
	return distance;
}
