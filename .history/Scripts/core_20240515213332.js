function pathTo(node) {
  var curr = node;
  var path = [];
  while (curr.parent) {
    path.unshift(curr);
    curr = curr.parent;
  }
  return path;
}

function getHeap() {
  return new BinaryHeap(function(node) {
    return node.f;
  });
}

var astar = {
  /**
  * Perform an A* Search on a graph given a start and end node.
  * @param {Graph} graph
  * @param {GridNode} start
  * @param {GridNode} end
  * @param {Object} [options]
  * @param {bool} [options.closest] Specifies whether to return the
             path to the closest node if the target is unreachable.
  * @param {Function} [options.heuristic] Heuristic function (see
  *          astar.heuristics).
  */
  search: function(graph, start, end, options) {
    graph.cleanDirty();
    options = options || {};
    var heuristic = options.heuristic || astar.heuristics.manhattan;
    var closest = options.closest || false;

    var openHeap = getHeap();
    var closestNode = start; // set the start node to be the closest if required

    start.h = heuristic(start, end);
    graph.markDirty(start);

    openHeap.push(start);

    while (openHeap.size() > 0) {

      // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
      var currentNode = openHeap.pop();

      // End case -- result has been found, return the traced path.
      if (currentNode === end) {
        return pathTo(currentNode);
      }

      // Normal case -- move currentNode from open to closed, process each of its neighbors.
      currentNode.closed = true;

      // Find all neighbors for the current node.
      var neighbors = graph.neighbors(currentNode);

      for (var i = 0, il = neighbors.length; i < il; ++i) {
        var neighbor = neighbors[i];

        if (neighbor.closed || neighbor.isWall()) {
          // Not a valid node to process, skip to next neighbor.
          continue;
        }

        // The g score is the shortest distance from start to current node.
        // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
        var gScore = currentNode.g + neighbor.getCost(currentNode);
        var beenVisited = neighbor.visited;

        if (!beenVisited || gScore < neighbor.g) {

          // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
          neighbor.visited = true;
          neighbor.parent = currentNode;
          neighbor.h = neighbor.h || heuristic(neighbor, end);
          neighbor.g = gScore;
          neighbor.f = neighbor.g + neighbor.h;
          graph.markDirty(neighbor);
          if (closest) {
            // If the neighbour is closer than the current closestNode or if it's equally close but has
            // a cheaper path than the current closest node then it becomes the closest node
            if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
              closestNode = neighbor;
            }
          }

          if (!beenVisited) {
            // Pushing to heap will put it in proper place based on the 'f' value.
            openHeap.push(neighbor);
          } else {
            // Already seen the node, but since it has been rescored we need to reorder it in the heap
            openHeap.rescoreElement(neighbor);
          }
        }
      }
    }

    if (closest) {
      return pathTo(closestNode);
    }

    // No result was found - empty array signifies failure to find path.
    return [];
  },
  // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
  heuristics: {
    manhattan: function(pos0, pos1) {
      var d1 = Math.abs(pos1.x - pos0.x);
      var d2 = Math.abs(pos1.y - pos0.y);
      return d1 + d2;
    },
    diagonal: function(pos0, pos1) {
      var D = 1;
      var D2 = Math.sqrt(2);
      var d1 = Math.abs(pos1.x - pos0.x);
      var d2 = Math.abs(pos1.y - pos0.y);
      return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
    }
  },
  cleanNode: function(node) {
    node.f = 0;
    node.g = 0;
    node.h = 0;
    node.visited = false;
    node.closed = false;
    node.parent = null;
  }
};

/**
 * A graph memory structure
 * @param {Array} gridIn 2D array of input weights
 * @param {Object} [options]
 * @param {bool} [options.diagonal] Specifies whether diagonal moves are allowed
 */
class Graph{
	constructor(gridIn, options){
	  options = options || {};
	  this.nodes = [];
	  this.diagonal = !!options.diagonal;
	  this.grid = [];
	  for (var x = 0; x < gridIn.length; x++) {
		this.grid[x] = [];

		for (var y = 0, row = gridIn[x]; y < row.length; y++) {
		  var node = new GridNode(x, y, row[y], this);
		  this.grid[x][y] = node;
		  this.nodes.push(node);
		}
	  }
	  this.init();
	}
	init() {
	  this.dirtyNodes = [];
	  for (var i = 0; i < this.nodes.length; i++) {
		astar.cleanNode(this.nodes[i]);
	  }
	};
	cleanDirty() {
		  for (var i = 0; i < this.dirtyNodes.length; i++) {
			astar.cleanNode(this.dirtyNodes[i]);
		  }
		  this.dirtyNodes = [];
	};
	markDirty(node) {
	  this.dirtyNodes.push(node);
	};
	neighbors(node, setting = {is4side: true, isDiagonal : this.diagonal}) {
	  var ret = [];
	  var x = node.x;
	  var y = node.y;
	  var grid = this.grid;
	  if(setting.is4side){
		  // West
		  if (grid[x - 1] && grid[x - 1][y]) {
			ret.push(grid[x - 1][y]);
		  }

		  // East
		  if (grid[x + 1] && grid[x + 1][y]) {
			ret.push(grid[x + 1][y]);
		  }

		  // South
		  if (grid[x] && grid[x][y - 1]) {
			ret.push(grid[x][y - 1]);
		  }

		  // North
		  if (grid[x] && grid[x][y + 1]) {
			ret.push(grid[x][y + 1]);
		  }
	  }
	  if (setting.isDiagonal) {
		// Southwest
		if (grid[x - 1] && grid[x - 1][y - 1]) {
		  ret.push(grid[x - 1][y - 1]);
		}

		// Southeast
		if (grid[x + 1] && grid[x + 1][y - 1]) {
		  ret.push(grid[x + 1][y - 1]);
		}

		// Northwest
		if (grid[x - 1] && grid[x - 1][y + 1]) {
		  ret.push(grid[x - 1][y + 1]);
		}

		// Northeast
		if (grid[x + 1] && grid[x + 1][y + 1]) {
		  ret.push(grid[x + 1][y + 1]);
		}
	  }

	  return ret;
	};
	toString() {
	  var graphString = [];
	  var nodes = this.grid;
	  for (var x = 0; x < nodes.length; x++) {
		var rowDebug = [];
		var row = nodes[x];
		for (var y = 0; y < row.length; y++) {
		  rowDebug.push(row[y].weight);
		}
		graphString.push(rowDebug.join(" "));
	  }
	  return graphString.join("\n");
	};
}

class GridNode {
	constructor(x, y, weight, graph = collisionGraph){
	  this.x = x;
	  this.y = y;
	  this.weight = weight;
	  this.graph = graph;
	}
	toString() {
  		return "[" + this.x + " " + this.y + "]";
	};
	getCost(fromNeighbor) {
	  // Take diagonal weight into consideration.
	  if (fromNeighbor && fromNeighbor.x != this.x && fromNeighbor.y != this.y) {
		return this.weight * 1.41421;
	  }
	  return this.weight;
	};
	isWall() {
		var returnValue = this.weight === 0;
		if(returnValue) return returnValue;
		var count = 0;
		for(var n of this.graph.neighbors(this)){
			if(n.weight===0)
				return true;
		}
	 	return false;
	};

}

function BinaryHeap(scoreFunction) {
  this.content = [];
  this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
  push: function(element) {
    // Add the new element to the end of the array.
    this.content.push(element);

    // Allow it to sink down.
    this.sinkDown(this.content.length - 1);
  },
  pop: function() {
    // Store the first element so we can return it later.
    var result = this.content[0];
    // Get the element at the end of the array.
    var end = this.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it bubble up.
    if (this.content.length > 0) {
      this.content[0] = end;
      this.bubbleUp(0);
    }
    return result;
  },
  remove: function(node) {
    var i = this.content.indexOf(node);

    // When it is found, the process seen in 'pop' is repeated
    // to fill up the hole.
    var end = this.content.pop();

    if (i !== this.content.length - 1) {
      this.content[i] = end;

      if (this.scoreFunction(end) < this.scoreFunction(node)) {
        this.sinkDown(i);
      } else {
        this.bubbleUp(i);
      }
    }
  },
  size: function() {
    return this.content.length;
  },
  rescoreElement: function(node) {
    this.sinkDown(this.content.indexOf(node));
  },
  sinkDown: function(n) {
    // Fetch the element that has to be sunk.
    var element = this.content[n];

    // When at 0, an element can not sink any further.
    while (n > 0) {

      // Compute the parent element's index, and fetch it.
      var parentN = ((n + 1) >> 1) - 1;
      var parent = this.content[parentN];
      // Swap the elements if the parent is greater.
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
        this.content[parentN] = element;
        this.content[n] = parent;
        // Update 'n' to continue at the new position.
        n = parentN;
      }
      // Found a parent that is less, no need to sink any further.
      else {
        break;
      }
    }
  },
  bubbleUp: function(n) {
    // Look up the target element and its score.
    var length = this.content.length;
    var element = this.content[n];
    var elemScore = this.scoreFunction(element);

    while (true) {
      // Compute the indices of the child elements.
      var child2N = (n + 1) << 1;
      var child1N = child2N - 1;
      // This is used to store the new position of the element, if any.
      var swap = null;
      var child1Score;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        var child1 = this.content[child1N];
        child1Score = this.scoreFunction(child1);

        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore) {
          swap = child1N;
        }
      }

      // Do the same checks for the other child.
      if (child2N < length) {
        var child2 = this.content[child2N];
        var child2Score = this.scoreFunction(child2);
        if (child2Score < (swap === null ? elemScore : child1Score)) {
          swap = child2N;
        }
      }

      // If the element needs to be moved, swap it, and continue.
      if (swap !== null) {
        this.content[n] = this.content[swap];
        this.content[swap] = element;
        n = swap;
      }
      // Otherwise, we are done.
      else {
        break;
      }
    }
  }
};
//////////////////////////////////////////
//			Initialize					//
//////////////////////////////////////////
var canvas = document.createElement("canvas");
canvas.id = "gameArea"
var context = canvas.getContext("2d");
canvas.width = 900;
canvas.height = 600;

var menu = document.createElement("canvas");
menu.id = "menuArea";
var menu_context = menu.getContext("2d");
menu.width = 300;
menu.height = 600;

var overlap = document.createElement("canvas");
overlap.id = "overlap";
var overlap_context = overlap.getContext("2d");
overlap.width = canvas.width+menu.width;
overlap.height = Math.max(canvas.height, menu.height);

document.body.appendChild(canvas);
document.body.appendChild(menu);
document.body.appendChild(overlap);

var lastUpdateTime;
var delta;
var lastestMousePos = {x:0, y:0};

var isPause = false;
var isIntro = true;
var isStarted = false;
var isEnd = false;
var isIngame = false;

var systemVoice = new SpeechSynthesisUtterance();

var debugTag = false;

const BlueTeamNum = 0;
const RedTeamNum = 1;
var allTeamsArr = [];
var natureUnitSet = new Set();
var teamsBaseArr = []; 
var teamsArr = [new Set(), new Set()];
var teamsTargetArr = [new Set(), new Set()];
var teamsTargetBool = [false, false];
var currentLevel = 0;
var increaseValue = -1;
var currentTeam = BlueTeamNum;

var windObj = {	getY: ()=>{return windObj.y+(Math.random()*2-1)/30},
				y: 0,
				x: 0,
				time: 0,
				curvePower: 1,
				isEnd:()=>{return windObj.x>=windObj.time}};
var bgColor = "#ccff99";
var dayNightCycle = 60000; //1 minute
var getInGameHour = ()=>{return (gameTime%dayNightCycle /dayNightCycle)*24};
var gameTime = 0;

var collisionUnits = new Set();
var collisionMapResolution = 20;
var collisionMap = [];
var collisionLastestUpdate = null;
var collisionGraph = null;
initCollisionMap();

var uiset = new Set();
var overlapSet = new Set();
			
var bgm = null;
var bgmArr = ["sfx/BGM_1.mp3", "sfx/BGM_2.mp3"];
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var audioRadio = 1; //the audio large or not

var preCreateUnit = null;
var lastPreCreateUnitSpeakTime = Date.now();
var preCreateUnitSpeakPeriod = 3000;
var preCreateUnitHelpSpeech = ["NO~", "plz", "what have i done", "oh god", "Whyyyyy","\uD83D\uDE22"];

function startup(){
	intro_init();
	mainloop();	
}

function gameStart() {
	window.speechSynthesis.cancel();
	resetSystemVoice();
	createMenuObj();

	isPause = true;
	isIntro = false;
	var countdown = (i)=>{
		if(i>0){
			context.save();
			context.font = "62px Arial";
			countdownNumber = new CountdownNumber({
				x : canvas.width/2-context.measureText(i).width/2,
				y : canvas.height/2
			}, i);;
			context.restore();

			uiset.add(countdownNumber);
			systemSpeak(i);
			i--;
			setTimeout(function() {
				//1 second later
				countdown(i);
			}, 1000);
		}else{
			bgm = new Audio(bgmArr[Math.floor(Math.random()*bgmArr.length)]);
			bgm.volume = 0.05*audioRadio;

            lastUpdateTime = Date.now();
						var redBase = new Base({ x: 0 + 10, y: canvas.height / 2 }, RedTeamNum), blueBase = new Base({ x: canvas.width - 10, y: canvas.height / 2 }, BlueTeamNum);
						addTeamUnit(redBase);
						//teamsBaseArr[RedTeamNum] = redBase;

						addTeamUnit(blueBase);
						//teamsBaseArr[BlueTeamNum] = blueBase;

						for (var i = 0; i < 20 + 10 * Math.random(); i++)
								addNatureUnit(new Tree({ x: Math.random() * canvas.width, y: getInvertedBellCurveRandomNumber() * canvas.height }, 2));
						for (var i = 0; i < 80 + 20 * Math.random(); i++)
								addNatureUnit(new Grass({ x: Math.random() * canvas.width, y: Math.random() * canvas.height }, 2));
            teamsBaseArr[RedTeamNum] = allTeamsArr[0];
            teamsBaseArr[BlueTeamNum] = allTeamsArr[1];
			// test code start //
			//teamsArr[0].add(new Warrior({x:100,y:100}, 0));
			//teamsArr[1].add(new Warrior({x:300,y:300}, 1));
			/*for(var i=0; i<15; i++){
				addTeamUnit( getRandomUnit({x: 200, y: 30*(i+1)}, 1));
				addTeamUnit( getRandomUnit({x: canvas.width-200, y: 30*(i+1)}, 0));
			}
			for(var i=0; i<15; i++){
				addTeamUnit( getRandomUnit({x: 225, y: 30*(i+1)}, 1));
				addTeamUnit( getRandomUnit({x: canvas.width-225, y: 30*(i+1)}, 0));
			}*/
			// test code end //

			systemSpeak("Battle Begin!");
			
			isStarted = true;
			isPause = false;
		}
	}
	
	countdown(5);
}

function getRandomUnit(pos, team){
	var rand = Math.floor(Math.random()*7);
	switch(rand){
		case 0: return new Warrior(pos,team);
		case 1: return new Archer(pos, team);
		case 2: return new Bomber(pos, team);
		case 3: return new Knight(pos, team);
		case 4: return new Giant(pos, team);
		case 5: return new Assassin(pos, team);
		case 6: return new Mage(pos, team);
	}
}

var hidden, visibilityChange; 
if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support 
  hidden = "hidden";
  visibilityChange = "visibilitychange";
} else if (typeof document.msHidden !== "undefined") {
  hidden = "msHidden";
  visibilityChange = "msvisibilitychange";
} else if (typeof document.webkitHidden !== "undefined") {
  hidden = "webkitHidden";
  visibilityChange = "webkitvisibilitychange";
}
 
var videoElement = document.getElementById("videoElement");

// If the page is hidden, pause the video;
// if the page is shown, play the video
function handleVisibilityChange() {
  if (document.hidden&&!isPause&&isStarted) {
  	triggerPause();
  } else if(isPause&&isStarted){
	triggerPause();
  }
}
document.addEventListener(visibilityChange, handleVisibilityChange, false);

//////////////////////////////////////////
//			Intropage					// 
//////////////////////////////////////////
function introPageUpdate(){
	//TODO: 
}

var intro;
var intro_context;
var currentIntroDrawMethod;
var easyButton,normalButton,hardButton,instructButton;

function intro_init(){
	intro = document.createElement("canvas");
	intro.id = "intro";
	intro_context = intro.getContext("2d");
	intro.width = canvas.width+menu.width+2;
	intro.height = Math.max(canvas.height, menu.height);
	document.body.appendChild(intro);
	currentIntroDrawMethod = introPageDraw;
	
	easyButton = new introButton('Is this EASY mode?', intro_context,intro.width-510, intro.height/2+40, 500, 80);
  normalButton = new introButton('NORMAL, that suits me ;)', intro_context,intro.width-510, intro.height/2+120, 500, 80);
  hardButton = new introButton('I worked HARD on that!', intro_context,intro.width-510, intro.height/2+200, 500, 80);
	instructButton = new introButton('INSTRUCTION', intro_context,intro.width-510, intro.height/2-40, 500, 80);
	
	intro.addEventListener('click', function(evt) {
		var mousePos = getMousePos(intro, evt);
		//debugger;
		if (isInside_fullgame(mousePos,easyButton)) {
			document.body.removeChild(intro);
			gameStart();
		}
    if (isInside_fullgame(mousePos,normalButton)) {
      document.body.removeChild(intro);
      gameStart();
      currentLevel = 1;
    }
    if (isInside_fullgame(mousePos,hardButton)) {
      document.body.removeChild(intro);
      gameStart();
      currentLevel = 2;
      increaseValue = -1.2;
    }
		if (isInside_fullgame(mousePos,instructButton)) {
			currentIntroDrawMethod = instructPageDraw; 
		}
	}, false);
}
class introButton{
	
	constructor(text,canvas,x,y,w,h){
		this.rect = {x:x, y:y, width:w, height:h};
		this.x=x; this.y=y; this.width=w; this.height=h;
		//this.isHover=false;
		this.canvas=canvas;
		this.text=text;
		this.onDraw();
	}
	onDraw(){
		this.canvas.beginPath();
		this.canvas.rect(this.x, this.y, this.width, this.height); 
		this.canvas.fillStyle = '#FFFFFF'; 
		this.canvas.fillStyle = 'rgba(200,200,225,0.5)';
		this.canvas.fill(); 
		this.canvas.lineWidth = 5;
		this.canvas.strokeStyle = '#202040'; 
		this.canvas.stroke();
		this.canvas.closePath();
		this.canvas.font = '30pt Gulim';
		this.canvas.fillStyle = '#000000';
		this.canvas.fillText(this.text, this.x+20, this.y+50);
	}
}



function isInside_fullgame(pos, rect){
	return pos.x > rect.x && pos.x < rect.x+rect.width && pos.y < rect.y+rect.height && pos.y > rect.y;
}

function introPageDraw(){
	intro_context.beginPath();
	intro_context.rect(0,0,intro.width+2, intro.height);
	intro_context.fillStyle = 'rgba(255,255,255,1)';
	intro_context.fill();
	intro_context.closePath();
	easyButton.onDraw();
  normalButton.onDraw();
  hardButton.onDraw();
	instructButton.onDraw();
	intro_context.font = 'bold 100pt Gulim';
	intro_context.fillText("FunFing Fight",40,150);
}

function instructPageDraw(){
	
	intro_context.beginPath();
	intro_context.rect(0,0,intro.width+2, intro.height);
	intro_context.fillStyle = 'rgba(255,255,255,1)';
	intro_context.fill();
	intro_context.closePath();
	easyButton.onDraw();
  normalButton.onDraw();
  hardButton.onDraw();
	intro_context.font = 'bold 30pt Gulim';
	intro_context.fillText("Goal:",40,50);
	intro_context.fillText("Steps:",40,140);
	
	intro_context.font = '20pt Gulim';
	intro_context.fillText("Destroy your enemy base!",40,90);
	intro_context.fillText("1. Click your favourite units in right panel.",40,180);
	intro_context.fillText("2. Click the battlefield to dispatch.",40,220);
	intro_context.fillText("3. Repeat 1-2, they will fight for you.",40,260);
	intro_context.fillText("4. Win!",40,300);
	
}



//////////////////////////////////////////
//			Game Loop					//
//////////////////////////////////////////
function mainloop(){
	var currentTime = Date.now();
	delta = currentTime-lastUpdateTime;
	

	overlap_context.clearRect(0,0, overlap.width, overlap.height);
	if(!isIntro){

		//game started
		if(!isPause)
			update(delta);

		draw();
		menuDraw();
		if(bgm!=null){
			if(bgm.paused && !isPause)
				bgm.play();
			if(isPause && !isEnd)
				bgm.pause();
		}
	}else{
		//still in intro page
		introPageUpdate();
		currentIntroDrawMethod();
	}
	lastUpdateTime = currentTime;
	requestAnimationFrame(mainloop);
};

function update(delta){
	enemyThinking();
	
	//generate the wind
	if(windObj.isEnd()){
		if(Math.random()<0.7){
			windObj.curvePower = windObj>0?1:-1 * Math.random()*1;
		}else{
			windObj.curvePower = (Math.random()*2-1);
		}
		windObj.curvePower*=Math.random()*3;
		windObj.time = 500+1000*Math.random();
		windObj.x = 0;
	}else{
		windObj.x+=delta;
		windObj.y = genCurve(windObj.x/windObj.time, 1, 1)*windObj.curvePower;
	}

	//sort the object to overlap
	allTeamsArr.sort(function(a,b){
		var layer = a.layer-b.layer;
		if(layer==0)
			return a.pos.y-b.pos.y;
		else
			return layer;
	});
	
	//trigger update
	for(let team of teamsArr){
		for(let obj of team) obj.onUpdate();
	}
	for(let obj of uiset) obj.onUpdate();

	for(let obj of overlapSet) obj.onUpdate();

	gameTime+=delta;
};

function draw(){
	//context.clearRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = bgColor;
	context.fillRect(0,0,canvas.width, canvas.height);
	for(let obj of allTeamsArr) obj.onDraw();
	for(let obj of uiset) obj.onDraw();
	for(let obj of overlapSet) obj.onDraw(overlap_context);
	//print debug tag
	if(debugTag){		
		context.fillStyle="#000000";
		context.fillText("FPS: "+Math.round(1/(delta/1000))+
		"      #TeamObjects: "+allTeamsArr.length+
		"      #SysObject: "+uiset.size , 32,32);
	}

	//print the blocking section
	if(preCreateUnit!=null){
		if(preCreateUnit instanceof Wall&&mouseMovingFrom!=null){
			var p1={}, p2={};
			p1.x=Math.floor(mouseMovingFrom.x/collisionMapResolution);
			p1.y=Math.floor(mouseMovingFrom.y/collisionMapResolution);
			p2.x=Math.floor(lastestMousePos.x/collisionMapResolution);
			p2.y=Math.floor(lastestMousePos.y/collisionMapResolution);
			var fakeMoney = money;
			for(let block of getBlockBetween(p1, p2)){
				if(fakeMoney-preCreateUnit.cost<0) break;
				var x = block.x*collisionMapResolution;
				var y = block.y*collisionMapResolution;
				if(block.y<3||block.y>=collisionMap[0].length-3||checkPosOfWallIsCollision({x:x,y:y})){
					context.fillStyle = "rgba(255,0,0,0.8)";
				}else{
					fakeMoney-=preCreateUnit.cost;
					context.fillStyle = "rgba(0,255,0,0.8)";
				}
				context.fillRect(x,y,collisionMapResolution, collisionMapResolution);
			}
		}
        drawCollisionGrid();
        context.beginPath();
        //console.log("draw something");
        if (currentTeam == BlueTeamNum) {
            context.rect(0, 0, 450, 600);
        } else {
            context.rect(450, 0, 900, 600);
        }
        //context.lineWidth="5";
        context.strokeStyle = "red";
        context.stroke();
		context.fillStyle = "rgba(255,0,0,0.2)";
		context.fill();
	}
	applyDayNightFiliter();
	
};

var previousPause = Date.now();
var pauseText = null;
function triggerPause() {
    //TODO: no pause
    return;
	if(isEnd || !isStarted)
		return;
	if(!isPause){
		previousPause = Date.now();
		isPause = true

		context.save();
		context.font = "62px Arial";
		pauseText = new BigText({
			x : canvas.width/2-context.measureText("Paused").width/2,
			y : canvas.height/2
		}, "Paused");;
		context.restore();
		
		uiset.add(pauseText);
		if(bgm!=null){
			if(bgm.paused && !isPause)
				bgm.play();
			if(isPause && !isEnd)
				bgm.pause();
		}
	}else{
		var delta = Date.now()-previousPause;
		for(let unit of allTeamsArr){
			if(unit instanceof Unit_Prototype){
				if(unit.skills!=null)
					for(let skill of unit.skills){
						skill.lastUsed+=delta;
					}
				if(unit.buffset != null)
					for(let buff of unit.buffset){
						buff.bornTime+=delta;
					}
			}else if(unit instanceof BodyFragment){
				unit.startTime+=delta;
				unit.endTime+=delta;
			}
		}
		for(let uiObj of uiset){
			if(uiObj.endTime>=0){
				uiObj.startTime+=delta;
				uiObj.endTime+=delta;
			}
		}
		isPause = false;
		uiset.delete(pauseText);
	}
}

//////////////////////////////////////////
//		On mouse click event handler	//
//////////////////////////////////////////
function normalizePreCreateUnit(){
		overlapSet.delete(preCreateUnit);
		if(preCreateUnit.inGrid){
			var cmr = collisionMapResolution;
			var x = Math.floor(preCreateUnit.pos.x/cmr)*cmr + cmr/2;
			var y = Math.floor(preCreateUnit.pos.y/cmr)*cmr + cmr/2;
			preCreateUnit.pos = {x:x, y:y};
		}
		preCreateUnit.onUpdate = preCreateUnit.temp_onUpdate;
		preCreateUnit.onDraw = preCreateUnit.temp_onDraw;
		preCreateUnit.isSpectre = false;
		if(preCreateUnit.onPlaced) preCreateUnit.onPlaced();
		
		addTeamUnit(preCreateUnit);
}
function checkPosOfWallIsCollision(pos, team = BlueTeamNum){
	var x = Math.floor(pos.x/collisionMapResolution);
	var y = Math.floor(pos.y/collisionMapResolution);
	for(let u of getEnemyTeamUnit(team)){
		var x1 = Math.floor(u.pos.x/collisionMapResolution);
		var y1 = Math.floor(u.pos.y/collisionMapResolution);		
		if(Math.abs(x1-x)<=1 && Math.abs(y1-y)<=1)return true;

	}
	return false;
}

var mouseMovingFrom =null;
var mouseMovingTo = null;

var rightPlayerCheck = function (mousePos) {
    return !(mousePos.x >= 0 && mousePos.x <= 450 && mousePos.y >= 0 && mousePos.y <= 600);
}
var leftPlayerCheck = function (mousePos) {
    return (mousePos.x >= 0 && mousePos.x <= 450 && mousePos.y >= 0 && mousePos.y <= 600);
}
var checkValidMouseArea = rightPlayerCheck;
//onMouseClick
function gameAreaOnClick(e){
	var mousePos = getMousePos(canvas, e);
	if(!isIntro&&isStarted){
		if(preCreateUnit !=null){
			if(money-preCreateUnit.cost>=0){
                if (checkValidMouseArea(mousePos)){
					if(checkCollision(preCreateUnit.pos.x, preCreateUnit.pos.y))
						return;
					if(preCreateUnit instanceof Wall && mouseMovingFrom!=null){
						//wall unit
						var cmr = collisionMapResolution;
						var p1={}, p2={};
						p1.x=Math.floor(mouseMovingFrom.x/cmr);
						p1.y=Math.floor(mouseMovingFrom.y/cmr);
						p2.x=Math.floor(mousePos.x/cmr);
						p2.y=Math.floor(mousePos.y/cmr);

						var tmpGrid = collisionMap.map(function(arr){
							return arr.slice();
						});
						
						var tmpGridGraph =null; 
						for(let block of getBlockBetween(p1, p2)){
							preCreateUnit.pos.x=block.x*cmr+cmr/2;
							preCreateUnit.pos.y=block.y*cmr+cmr/2;
							if(block.y<3||block.y>=collisionMap[0].length-3||checkPosOfWallIsCollision(preCreateUnit.pos)){
								continue;
							}
							if(money-preCreateUnit.cost<0) break;

							if(checkCollision(preCreateUnit.pos.x, preCreateUnit.pos.y)) continue;

							tmpGrid[block.x][block.y] = 0;
							tmpGridGraph = new Graph(tmpGrid, { diagonal: true });
							if(pathFind(teamsBaseArr[0].pos, teamsBaseArr[1].pos, tmpGridGraph).length<=0){
								TextBubble.Speak({pos:mousePos}, "You must leave 3 block as road");
								break;
							}

							normalizePreCreateUnit();

							console.log('finish added');
							money-=preCreateUnit.cost;
							selectUnitTypeByName(preCreateUnit.constructor.name);
						}

						overlapSet.delete(preCreateUnit);
					}else{
						//not wall unit
						normalizePreCreateUnit();

						console.log('finish added');
						money-=preCreateUnit.cost;
                    }
					
					var isEnoughMoney = money>preCreateUnit.cost;
					if(preCreateUnit instanceof Wall || !isEnoughMoney){
						preCreateUnit = null;
					}else{
					var unitType = preCreateUnit.constructor.name;
						if(isEnoughMoney){
							selectUnitTypeByName(unitType);
						}
					}
				}
			}
		}
		console.log(volumeButton!=null&&isInside(mousePos,volumeButton.rect,false));
		if(volumeButton!=null&&isInside(mousePos,volumeButton.rect,false))
			volumeButton.onClickEvent();
	}else{
		//still in menu
	}
}
	 
function getMousePos(canvas, evt) {
	var rect = canvas.getBoundingClientRect();
	return {
		x: evt.clientX - rect.left,
		y: evt.clientY - rect.top
	};
}

overlap.addEventListener('click',function(e){
	var mousePos = getMousePos(overlap,e);
	if(mousePos.x>900&&mousePos.x<1200&&mousePos.y<600){
		for(i=0;i<onClickObj.length;i++)
			if(onClickObj[i]!=null&&isInside(mousePos, onClickObj[i].rect, true)){
				onClickObj[i].onClickEvent();
			}
		
	}else if(mousePos.x<900&&mousePos.y<600){
		gameAreaOnClick(e);
	}
	mouseMovingFrom=null;
	console.log('click');
},false);

overlap.addEventListener('mousedown', function(e){
	var mousePos = getMousePos(overlap,e);
	if(mousePos.x<900&&mousePos.y<600 &&!(mousePos.x>=0&&mousePos.x<=450&&mousePos.y>=0&&mousePos.y<=600)){
		mouseMovingFrom = mousePos;
	}
}, false);

overlap.addEventListener('mousemove',function(e){
	var mousePos = lastestMousePos = getMousePos(overlap,e);
	if(mousePos.x>900&&mousePos.x<1200&&mousePos.y<600){
		for(let obj of uiObj)
			if(obj.rect && isInside(mousePos, obj.rect, true))
				obj.isHover=true;
			else
				obj.isHover=false;
	}else if(mousePos.x<900&&mousePos.y<600){
		//in gamearea
	}
	/*
	for(i=0;i<onClickObj.length-4;i++)
		if(isInside(mousePos, onClickObj[i].rect)&&(onClickObj[i] instanceof SelectUnitButton))
			onClickObj[i].isHover=true;
		else
			onClickObj[i].isHover=false;
			*/
	
},false);

//////////////////////////////////////////
//		On Keypress event handler		//
//////////////////////////////////////////
var lastKey = null;
addEventListener("keydown", function (e) {
	//record the lastKey
	lastKey = e.keyCode;
}, false);

addEventListener("keyup", function (e) {
	//check if is F2, to trigger debug mode
	console.log("keyup: "+ lastKey);
	if(lastKey == 113){
		debugTag = !debugTag;
		console.log("Debug Mode: "+(debugTag?"ON":"OFF"));
	}else if(lastKey==49){
		tmp_start = lastestMousePos;
		console.log(tmp_start);
	}else if(lastKey==50){
		tmp_end = lastestMousePos;
		console.log(tmp_end);
	}

	if(tmp_start!=null&&tmp_end!=null){
		var nodes = pathFind(tmp_start, tmp_end);
		uiset.add(new Path(nodes));
		tmp_start = tmp_end = null;
	}
	lastKey = null;
}, false);

var tmp_start= null;
var tmp_end = null;
//////////////////////////////////////////
//			Enemy Player Logic			//
//////////////////////////////////////////
var lastThinkgTime = Date.now();
var ifChecked50 = false, ifChecked20 = false;
function enemyThinking() {
	if(Date.now()-lastThinkgTime >=10000){
		var avgX = 0, fPosX=0;
		//Calculate Average x with the total number of blue team unit
		//Decide the position of generating enemy
		
		avgX = getAvgX();

		//Check if average x distance is appear and not NAN
		if(avgX){
			//if Average X is smaller than 450(left side of the canvas)
			if(avgX < 450){
				//60% chances the X is equal to average X, 40% chances within 100 to 250 
				if(Math.floor((Math.random() * 10) + 1)>6){
					fPosX = avgX;
				}else{
					fPosX = 100 + Math.floor((Math.random() * 150) + 1);
				}
			}else{
				fPosX=(canvas.width - (avgX + (Math.random() * 10) + 1));
			}
		}else{//if average X is not exist randomly generate position X within the left area
			fPosX=Math.floor((Math.random() * 450) + 1)
		}

    if(currentLevel == 0){
    	genUnit(fPosX); // generate enemy unit
    }else if(currentLevel == 1){
      genUnitNor(fPosX);
    }else{
      genUnitHard(fPosX);
    }
    console.log(increaseValue);
		lastThinkgTime = Date.now();
	}
}

function getAvgX(){
  var avgX = 0, totalX = 0, countTeam=0;
  for(let tar of teamsArr[BlueTeamNum]){
    if(tar instanceof Unit_Prototype){
      if(tar.type!="structure"){
        totalX += tar.pos.x;
        countTeam++;
      }
    }
  }
  avgX = totalX/countTeam;
  return avgX;
}

function genUnit(fPosX){
  //genUnit, generate unit
  var genUnit;
  if(teamsBaseArr[RedTeamNum].hp < teamsBaseArr[RedTeamNum].maxHp * 0.2 && ifChecked20 == false){
    while(enemyMoney>0){
      genUnit = getRandomUnit({x: fPosX,y: Math.floor((Math.random() * 600) + 1)},RedTeamNum);
      if(enemyMoney-genUnit.cost>=0){
        addTeamUnit(genUnit);
        enemyMoney-=genUnit.cost;
      }else{
        ifChecked20 = true;
        break;
      }
    }
  }else if(teamsBaseArr[RedTeamNum].hp < teamsBaseArr[RedTeamNum].maxHp * 0.5 && ifChecked50 == false){
    while(enemyMoney>0){
      genUnit = getRandomUnit({x: fPosX,y: Math.floor((Math.random() * 600) + 1)},RedTeamNum);
      if(enemyMoney-genUnit.cost>=0){
        addTeamUnit(genUnit);
        enemyMoney-=genUnit.cost;
      }else{
        ifChecked50 = true;
        break;
      }
    }
  }else if(enemyMoney>0){
    genUnit = getRandomUnit({x: fPosX,y: Math.floor((Math.random() * 600) + 1)},RedTeamNum);
    if(enemyMoney-genUnit.cost>=150){
      addTeamUnit(genUnit);
      enemyMoney-=genUnit.cost;
    }
  }
}

function genUnitNor(fPosX){
  //genUnit, generate unit
  var genUnit, genUnitNum=Math.floor((Math.random() * 2) + 3);
  console.log('genUnitNum '+genUnitNum);
  while(genUnitNum!=0){
    genUnit = genSpecificUnit({x: fPosX,y: Math.floor((Math.random() * 600) + 1)},RedTeamNum);
    if(enemyMoney-genUnit.cost>=0){
      addTeamUnit(genUnit);
      enemyMoney-=genUnit.cost;
    }
    genUnitNum--;
  }
}

function genUnitHard(fPosX){
  //genUnit, generate unit
  var genUnit, genUnitNum=Math.floor((Math.random() * 2) + 3);
  console.log('genUnitNum '+genUnitNum);
  while(genUnitNum!=0){
    genUnit = genSpecificUnit({x: fPosX,y: Math.floor((Math.random() * 600) + 1)},RedTeamNum);
    if(enemyMoney-genUnit.cost>=0){
      addTeamUnit(genUnit);
      enemyMoney-=genUnit.cost;
    }
    genUnitNum--;
  }
}

function genSpecificUnit(pos, team){
  var countTeam=0, unitCnt=[0,0,0,0,0,0,0],unitECnt=[0,0,0,0,0,0,0], i=0;
  for(let tar of teamsArr[BlueTeamNum]){
    if(tar instanceof Unit_Prototype){
      if(tar.type!="structure"){
        countTeam++;
        i = getUnitCount(tar);
        unitCnt[i]+=1;
      }
    }
  }

  for(let tar of teamsArr[RedTeamNum]){
    if(tar instanceof Unit_Prototype){
      if(tar.type!="structure"){
        countTeam++;
        i = getUnitCount(tar);
        unitECnt[i]+=1;
      }
    }
  }

  if(countTeam > 7){
    var chance = Math.floor((Math.random() * 10)+1);
    if(chance > 0 && chance <4){
      return new Bomber(pos,team);
    }else if(chance>4 && chance <6){
      return new Giant(pos,team);
    }else{
      return new Mage(pos,team);
    }
  }else{
  	if(unitCnt[2]+unitCnt[6] > unitCnt[0]+unitCnt[1]+unitCnt[3]+unitCnt[4]+unitCnt[5]){
    	return new Warrior(pos,team);
    }else if(unitCnt[0]+unitCnt[5] > unitCnt[1]+unitCnt[2]+unitCnt[3]+unitCnt[4]+unitCnt[6]){
    	return new Archer(pos, team);
    }else if(unitCnt[1]+unitCnt[4]+unitCnt[6]>unitCnt[0]+unitCnt[2]+unitCnt[5]){
    	if(unitCnt[3]>0){
    		return new Knight(pos, team);
    	}else{
    		return new Assassin(pos, team);
    	}
    }else{
      return new Warrior(pos,team);
    }
  }
  for(let cnt of arrUniCnt){
  	cnt = 0;
  }
}

function getUnitCount(unit){
	if(unit instanceof Warrior){
		return 0;
	}else if (unit instanceof Archer){
		return 1;
	}else if (unit instanceof Knight){
		return 2;
	}else if (unit instanceof Bomber){
		return 3;
	}else if (unit instanceof Mage){
		return 4;
	}else if (unit instanceof Giant){
		return 5;
	}else if (unit instanceof Assassin){
		return 6;
	}
}
//////////////////////////////////////////
//			AI Player Logic			    //
//////////////////////////////////////////
var plastThinkgTime = Date.now();
var pifChecked50 = false, pifChecked20 = false;
function playerThinking() {
	if(Date.now()-lastThinkgTime >=5000){
		var avgX = 0, totalX = 0, countTeam=0, fPosX=0;
		//Calculate Average x with the total number of blue team unit
		//Decide the position of generating enemy
		for(let tar of teamsArr[RedTeamNum]){
			if(tar instanceof Unit_Prototype){
				if(tar.type!="structure"){
					totalX += tar.pos.x;
					countTeam += 1;
				}
			}
		}
		avgX = totalX/countTeam;
		
		//Check if average x distance is appear and not NAN
		if(avgX){
			//if Average X is smaller than 450(left side of the canvas)
			if(avgX > 450){
				//60% chances the X is equal to average X, 40% chances within 100 to 250 
				if(Math.floor((Math.random() * 10) + 1)>6){
					fPosX = avgX;
				}else{
					fPosX = 650 + Math.floor((Math.random() * 150) + 1);
				}
			}else{
				fPosX=(canvas.width - (avgX + (Math.random() * 10) + 1));
			}
		}else{//if average X is not exist randomly generate position X within the left area
			fPosX = Math.floor(450+(Math.random() * 450) + 1)
		}
		//genUnit, generate unit
		var genUnit;
		if(teamsBaseArr[BlueTeamNum].hp < teamsBaseArr[BlueTeamNum].maxHp * 0.2 && pifChecked20 == false){
			while(money>0){
				genUnit = getRandomUnit({x: fPosX,y: Math.floor((Math.random() * 600) + 1)},BlueTeamNum);
				if(money-genUnit.cost>=0){
					addTeamUnit(genUnit);
					money-=genUnit.cost;
				}else{
					ifChecked20 = true;
					break;
				}
			}
		}else if(teamsBaseArr[BlueTeamNum].hp < teamsBaseArr[BlueTeamNum].maxHp * 0.5 && pifChecked50 == false){
			while(money>0){
				genUnit = getRandomUnit({x: fPosX,y: Math.floor((Math.random() * 600) + 1)},BlueTeamNum);
				if(money-genUnit.cost>=0){
					addTeamUnit(genUnit);
					money-=genUnit.cost;
				}else{
					ifChecked50 = true;
					break;
				}
			}
		}else if(money>0){
			genUnit = getRandomUnit({x: fPosX,y: Math.floor((Math.random() * 600) + 1)},BlueTeamNum);
			if(money-genUnit.cost>=100){
				addTeamUnit(genUnit);
				money-=genUnit.cost;
			}
		}
		console.log(money);
		plastThinkgTime = Date.now();
	}
}

//////////////////////////////////////////
//			Collision Methods			//
//////////////////////////////////////////
function circleCollision(c1, c2){
	return distanceBetween(c1.pos,c2.pos)<c1.radius+c2.radius;
}

function drawCollisionGrid(ctx = context){
	var cmr = collisionMapResolution;
	ctx.beginPath();
	ctx.strokeStyle = "rgba(255,255,255,0.3)";
	for(var row=0; row<collisionMap[0].length; row++){
		var rowY =  row*cmr;
		ctx.moveTo(0,rowY);
		ctx.lineTo(canvas.width, rowY);
		ctx.stroke();
	}
	for(var col=0; col<collisionMap.length; col++){
		var colX =  col*cmr;
		ctx.moveTo(colX,0);
		ctx.lineTo(colX, canvas.height);
		ctx.stroke();
	}

	ctx.fillStyle = "rgba(0,0,255,1)";
	for(var col = 0; col<collisionMap.length; col++){
		var colArr = collisionMap[col];
		for(var row = 0; row<colArr.length; row++){
			if(!colArr[row]){
				ctx.fillRect(col*cmr, row*cmr, cmr, cmr);
			}
		}
	}
}

function initCollisionMap(){
	for(var col = 0; col<canvas.width/collisionMapResolution; col++){
		var colArr = [];
		for(var row = 0; row<canvas.height/collisionMapResolution; row++){
			colArr[row]=1;
		}
		collisionMap[col]=colArr;
	}
	if(collisionGraph==null){
		//collisionGraph = new Graph(collisionMap);
		collisionGraph = new Graph(collisionMap, { diagonal: true });

		collisionLastestUpdate = Date.now();
	}
}

function registerCollision(unit){
	collisionUnits.add(unit);
	refreshCollisionMap();
}
function unRegisterCollision(unit){
	collisionUnits.delete(unit);
	refreshCollisionMap();
}
function refreshCollisionMap(){
	initCollisionMap();
	for(let unit of collisionUnits){
		if(unit.isSpectre)
			continue;
		var xarr =[], yarr = [];
		xarr[0] = Math.floor((unit.pos.x)/collisionMapResolution);
		yarr[0] = Math.floor((unit.pos.y)/collisionMapResolution);
		for(let y of yarr){
			if(y<0||y>=collisionMap[0].length)
				continue;
			for(let x of xarr){
				if(x<0||x>=collisionMap.length)
					continue;
				collisionMap[x][y] = 0;
			}
		}
	}
	//collisionGraph = new Graph(collisionMap);
	collisionGraph = new Graph(collisionMap, { diagonal: true });
	collisionLastestUpdate = Date.now();
}
function checkCollision(x,y){
	var x = Math.floor((x)/collisionMapResolution);
	var y = Math.floor((y)/collisionMapResolution);
	return !collisionMap[x][y];
}

//////////////////////////////////////////
//			Path Finding				//
//////////////////////////////////////////
function preventOutGrid(pos){
	var rPos= {};
	rPos.x = Math.max(Math.min(pos.x, canvas.width-1), 1);
	rPos.y = Math.max(Math.min(pos.y, canvas.height-1), 1);
	return rPos;
}
function pathFind(startPos, endPos, graph = collisionGraph){
	var sPos = preventOutGrid(startPos);
	var ePos = preventOutGrid(endPos);
	var cmr = collisionMapResolution;
	var start = graph.grid[
		Math.floor(sPos.x/cmr)
	][
		Math.floor(sPos.y/cmr)
	];
	var end = graph.grid[
		Math.floor(ePos.x/cmr)
	][
		Math.floor(ePos.y/cmr)
	];
	//var result = astar.search(graph, start, end);
	var result = astar.search(graph, start, end,{ heuristic: astar.heuristics.diagonal });
	return result;
}
function getBlockBetween(pos1,pos2){
	var dx = Math.abs(pos2.x-pos1.x);
	var dy = Math.abs(pos2.y-pos1.y);
	var sx = (pos1.x < pos2.x) ? 1 : -1;
	var sy = (pos1.y < pos2.y) ? 1 : -1;
	var err = dx-dy;
	var blocks = new Set();
	while(true){
		blocks.add({x:pos1.x,y:pos1.y});  // Do what you need to for this
		if ((pos1.x==pos2.x) && (pos1.y==pos2.y)){
			return blocks;
		}
		var e2 = 2*err;
		if (e2 >-dy){ err -= dy; pos1.x  += sx; }
		if (e2 < dx){ err += dx; pos1.y  += sy; }
	}
}

//////////////////////////////////////////
//			UI Objects					//
//////////////////////////////////////////
class TextBubble{
	constructor(pos, speech, time, curveSeed, color, borderColor, isOverlap = false){
		this.pos = pos;
		this.speech = speech;
		this.time = time; //in second
		this.startTime = Date.now();
		this.endTime = Date.now()+time*1000;
		if(curveSeed!=null&&curveSeed>-10&&curveSeed<10){
			curveSeed = curveSeed>0?10:-10;
		}
		this.curveSeed = curveSeed;
		this.color = color;
		this.borderColor = borderColor;
		this.alpha = 100;
		this.tmpX = 0;
		this.isOverlap = isOverlap;
	}
	onUpdate(){
		this.alpha = Math.round((1-((Date.now()-this.startTime)/(this.endTime-this.startTime)))*100)/100;
		this.tmpX = this.curveSeed*((Date.now()-this.startTime)/(this.endTime-this.startTime));
		if(Date.now()>this.endTime){
			if(this.isOverlap)
				overlapSet.delete(this);
			else
				uiset.delete(this);
		}
	}
	onDraw(ctx = context){
		var alpha = this.alpha;
		var tmpX = this.tmpX;
		ctx.fillStyle="rgba("+this.color+","+alpha+")";
		if(this.curveSeed==null){
			ctx.fillText(this.speech, this.pos.x,this.pos.y);
		}else{
			var y = genCurve(tmpX, this.curveSeed, 1);
			ctx.strokeStyle = "rgba(255,255,255,"+alpha+")";
			ctx.strokeText(this.speech, this.pos.x+tmpX,this.pos.y-y);
			ctx.fillText(this.speech, this.pos.x+tmpX,this.pos.y-y);
		}
	}

	static Speak(speaker, speech, isOverlap = false){
		var ctx = context;
		if(isOverlap){
			ctx = overlap_context;
		}
		var speechLength = ctx.measureText(speech).width;
		
		var tb = new TextBubble({x:speaker.pos.x-speechLength/2, y:speaker.pos.y-20}, speech, 1, null, "0,0,0", isOverlap);

		if(isOverlap)
			overlapSet.add(tb);
		else
			uiset.add(tb);
	}

	static DamagePoint(speaker, damage, isOverlap = false){
		if(damage>=0||damage<0){
			var color = damage>0?"255,0,0":"0,255,0";
			damage *=damage>0?1:-1;
			var speechLength = context.measureText(damage).width;
			if(damage==0){
				var speech = "MISS"
				speechLength = context.measureText(speech).width;

				var tb = new TextBubble({x:speaker.pos.x-speechLength/2, y:speaker.pos.y-20}, speech, 1, null, "100,100,100", isOverlap);

				if(isOverlap)
					overlapSet.add(tb);
				else
					uiset.add(tb);
			}else{
				var tb =  new TextBubble({x:speaker.pos.x-speechLength/2, y:speaker.pos.y}, damage, 1, 
				(Math.random()*30)-15
				, color, isOverlap);

				if(isOverlap)
					overlapSet.add(tb);
				else
					uiset.add(tb);
			}
		}else{
			var color = "255,0,0"
			var speechLength = context.measureText(damage).width;
			var tb =  new TextBubble({x:speaker.pos.x-speechLength/2, y:speaker.pos.y}, damage, 1, 
			(Math.random()*30)-15
			, color, isOverlap);

			if(isOverlap)
				overlapSet.add(tb);
			else
				uiset.add(tb);
		}
	}
}

class BigText{
	constructor(pos, speech, color ="0,0,0", borderColor = "150,150,150"){
		this.pos = pos;
		this.speech = speech;
		this.color = color;
		this.borderColor = borderColor;
		this.alpha = 1;
	}
	onUpdate(){

	}
	onDraw(){
		context.save();
		context.fillStyle="rgba("+this.color+","+this.alpha+")";
		context.font = "62px Arial";
		context.fillText(this.speech, this.pos.x,this.pos.y);
		context.lineWidth = 2;
		context.strokeStyle="rgba("+this.borderColor+","+this.alpha+")";
		context.strokeText(this.speech, this.pos.x,this.pos.y);
		context.restore();
		
	}
}

class CountdownNumber{
	constructor(pos, speech, color ="0,0,0", borderColor = "150,150,150"){
		this.pos = pos;
		this.speech = speech;
		this.color = color;
		this.borderColor = borderColor;
		this.alpha = 1;
		this.startTime = Date.now();
	}
	onUpdate(){

	}
	onDraw(){
		this.alpha = 1-((Date.now()-this.startTime)/1000);
		if(this.alpha<0){
			uiset.delete(this);
		}
		context.save();
		context.fillStyle="rgba("+this.color+","+this.alpha+")";
		context.font = "62px Arial";
		context.fillText(this.speech, this.pos.x,this.pos.y);
		context.lineWidth = 2;
		context.strokeStyle="rgba("+this.borderColor+","+this.alpha+")";
		context.strokeText(this.speech, this.pos.x,this.pos.y);
		context.restore();
		
	}
}

class Path{
	constructor(pathFindedNodes, colorRGB = "0,0,0"){
		this.pathFindedNodes = pathFindedNodes;
		this.colorRGB = colorRGB;
		this.bornTime = Date.now();
	}
	onUpdate(){
	}
	onDraw(){		
		context.beginPath();
		context.strokeStyle = "rgba("+this.colorRGB+","+(1-(Math.min((Date.now()-this.bornTime)/1000, 0.8)))+")";
		var isStartPoint = true;
		for(let node of this.pathFindedNodes){
			var x = node.x*collisionMapResolution+collisionMapResolution/2;
			var y = node.y*collisionMapResolution+collisionMapResolution/2;
			if(isStartPoint)
				context.moveTo(x,y);
			else
				context.lineTo(x,y);
			isStartPoint = false;
		}
		context.stroke();
	}

}
var nightFill = context.createLinearGradient(0,0,0,canvas.height);
nightFill.addColorStop(0, "rgba(0,0,50,0.35)");
nightFill.addColorStop(1, "rgba(0,0,10,0.25)");

var dawnHour = 6;
var dawnFill = context.createLinearGradient(0,0,0,canvas.height);
dawnFill.addColorStop(0, "rgba(255,200,100,0.5)");
dawnFill.addColorStop(0.8, "rgba(255,255,255,0.1)");
dawnFill.addColorStop(1, "rgba(255,255,255,0.1)");

var duskHour = 18;
var duskFill = context.createLinearGradient(0,0,0,canvas.height);
duskFill.addColorStop(0, "rgba(255,118,0,0.5)");
duskFill.addColorStop(0.8, "rgba(255,255,255,0)");
duskFill.addColorStop(1, "rgba(255,255,255,0)");

function applyDayNightFiliter(){
	var h = getInGameHour();
	if(Math.abs((h-dawnHour))<=2){
		context.globalAlpha = 1-Math.abs((h-dawnHour))/2;
		context.fillStyle = dawnFill;
		context.fillRect(0,0,canvas.width, canvas.height);
	}
	if(Math.abs((h-duskHour))<=2){
		context.globalAlpha = 1-Math.abs((h-duskHour))/2;
		context.fillStyle = duskFill;
		context.fillRect(0,0,canvas.width, canvas.height);
	}
	if(h>duskHour-2 ||h<dawnHour+2){
		var tmp =  Math.min(Math.abs(h-(duskHour-2)), Math.abs(2+dawnHour-h))/6;
		context.globalAlpha = tmp;
		context.fillStyle = nightFill;
		context.fillRect(0,0,canvas.width, canvas.height);
	}

	context.globalAlpha = 1;
}

function genCurve(x, endPoint, curvePower = 50){
	var y = (-1*((x)*(x))+endPoint*x)/curvePower;
	return y;
}

function drawShadow(unit){
	var h = getInGameHour();
	var x = unit.pos.x;
	var y = unit.pos.y+unit.radius;
	var color = "rgba(0,0,0,0.2)";
	var hourPercent = (h/24);
	var multiper = hourPercent>0.5?1:-1;
	var width = unit.radius*0.8;
	var height =  unit.radius/4;
	context.beginPath();

	context.fillStyle = color;
	context.ellipse(x, y, width, height, 0 * Math.PI/180
	, 0, 2* Math.PI);
	context.fill();
	context.closePath();	
}

function drawStar(cx,cy,spikes,outerRadius,innerRadius, color){
	var rot=Math.PI/2*3;
	var x=cx;
	var y=cy;
	var step=Math.PI/spikes;
	context.beginPath();
	context.moveTo(cx,cy-outerRadius)
	for(i=0;i<spikes;i++){
		x=cx+Math.cos(rot)*outerRadius;
		y=cy+Math.sin(rot)*outerRadius;
		context.lineTo(x,y)
		rot+=step
		x=cx+Math.cos(rot)*innerRadius;
		y=cy+Math.sin(rot)*innerRadius;
		context.lineTo(x,y)
		rot+=step
	}

	context.lineTo(cx,cy-outerRadius);
	context.closePath();
	context.strokeStyle= color;
	context.stroke();
}

//////////////////////////////////////////
//			Sound Thingy				//
//////////////////////////////////////////
function BufferLoader(context, urlList, callback) {
  this.context = context;
  this.urlList = urlList;
  this.onload = callback;
  this.bufferList = new Array();
  this.loadCount = 0;
}

BufferLoader.prototype.loadBuffer = function(url, index) {
  // Load buffer asynchronously
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  var loader = this;

  request.onload = function() {
    // Asynchronously decode the audio file data in request.response
    loader.context.decodeAudioData(
      request.response,
      function(buffer) {
        if (!buffer) {
          alert('error decoding file data: ' + url);
          return;
        }
        loader.bufferList[index] = buffer;
        if (++loader.loadCount == loader.urlList.length)
          loader.onload(loader.bufferList);
      },
      function(error) {
        console.error('decodeAudioData error', error);
      }
    );
  }

  request.onerror = function() {
    //alert('BufferLoader: XHR error');
  }

  request.send();
}

BufferLoader.prototype.load = function() {
  for (var i = 0; i < this.urlList.length; ++i)
  this.loadBuffer(this.urlList[i], i);
}

function makeSoundAt(soundSrc,volume, x){
	if(window.location.href.startsWith("file")){
		var t = new Audio(soundSrc);
		t.volume = volume*audioRadio;
		t.play();
	}else{
		var sound = audioCtx.createBufferSource();
		var bufferLoader = new BufferLoader(
		audioCtx,
		[soundSrc],
		(bufferList)=>{
			sound.buffer = bufferList[0];
			//var sound = new Audio(soundSrc);
			var panNode = audioCtx.createStereoPanner();
			var gainNode = audioCtx.createGain();
			var soundPosition = Math.max(Math.min((x-canvas.width/2)/(canvas.width*0.5), 1), -1);
			panNode.pan.value = soundPosition;
			gainNode.gain.value = volume*audioRadio;
			sound.connect(panNode);
			panNode.connect(gainNode);
			gainNode.connect(audioCtx.destination);

			sound.start();
		}
		);
		bufferLoader.load();
	}
}

function resetSystemVoice(){
	systemVoice.voiceURI = 'native';
	systemVoice.volume = 0.6*audioRadio; // 0 to 1
	systemVoice.rate = 1; // 0.1 to 10
	systemVoice.pitch = 1; //0 to 2
	systemVoice.text = 'test';
	systemVoice.lang = 'en-US';
}
function systemSpeak(speech, isForce = false){
	systemVoice.text = speech;
	if(isForce)
		window.speechSynthesis.cancel();
	systemVoice.volume = 0.6*audioRadio;
	window.speechSynthesis.speak(systemVoice);
}

//////////////////////////////////////////
//			Core Thingy					//
//////////////////////////////////////////
function getBellCurveRandomNumber(){
	return (Math.random()+Math.random()+Math.random())/3;
}

function getInvertedBellCurveRandomNumber(){
	var ran = getBellCurveRandomNumber();
	if(ran>0.5){
		return 1-(ran-0.5);
	}else{
		return 0.5-ran;
	}
}

function triggerLoser(team){
	if(team ==0){
		systemVoice.rate = 0.1; // 0.1 to 10
		systemSpeak("Defeat.", true);
		resetSystemVoice();
		
		previousPause = Date.now();
		isPause = true

		context.save();
		context.font = "62px Arial";
		var bigText = new BigText({
			x : canvas.width/2-context.measureText("You Lose").width/2,
			y : canvas.height/2
		}, "You Lose", "255,0,0");;
		context.restore();
		
		uiset.add(bigText);
		
		bgm.pause();
		bgm = new Audio('sfx/Lose.mp3');
		bgm.volume = 0.3*audioRadio;
		bgm.play();
		isEnd = true;

	}else{
		systemVoice.rate = 0.5; // 0.1 to 10
		systemVoice.pitch  = 1.2; // 0 to 2
		systemSpeak("Victory!", true);
		resetSystemVoice();
		
		previousPause = Date.now();
		isPause = true

		context.save();
		context.font = "62px Arial";
		var bigText = new BigText({
			x : canvas.width/2-context.measureText("You Win").width/2,
			y : canvas.height/2
		}, "You Win", "255,255,0", "255,150,0");;
		context.restore();
		
		uiset.add(bigText);

		bgm.pause();
		bgm = new Audio('sfx/Victory.mp3');
		bgm.volume = 0.3*audioRadio;
		bgm.play();
		isEnd = true;
	}
}

function addNatureUnit(unit) {
	allTeamsArr.push(unit);
	natureUnitSet.add(unit);
}

function addTeamUnit(unit) {
	allTeamsArr.push(unit);
	teamsArr[unit.team].add(unit);
	if (teamsTargetBool[unit.team]) {
			teamsTargetBool = [false, false];
			teamsTargetBool[unit.team] = true;
	} else {
			teamsTargetBool = [false, false];
	}
}

function removeTeamUnit(unit){
	var i = allTeamsArr.indexOf(unit);
	if(i != -1) {
		allTeamsArr.splice(i, 1);
	}
	teamsArr[unit.team].delete(unit);
	if(teamsTargetBool[unit.team]){
		teamsTargetBool = [false, false];
		teamsTargetBool[unit.team] = true;
	}else{
		teamsTargetBool = [false, false];
	}
}

class Damage{
	constructor(applyBy, damage, knockBack){
		this.applyBy = applyBy;
		this.damage = damage;
		this.knockBack = knockBack;
	}
}

/** 
 * The super class of all PhysicsEntity
 * @param pos should be a object like {x:0, y:0}
 * @param team  0 is for user, 1 is the ai (teamsArr[1])
 * @param radius the hitbox radius
 * @param ms the Maxium movement speed of this unit
 * @param a_ms the Acceleration Speed of this unit
 */
class PhysicsEntity{
	constructor(pos, team, radius, ms, a_ms){
		this.pos = pos;
		this.team = team;
		this.radius = radius;
		this.ms = ms;
		this.a_ms = a_ms;

		this.isAlive = true;
		this.x_velocity = 0;
		this.y_velocity = 0;
		this.facingDegrees = 0;
		this.isSpectre = false;

		this.z_process = 0;
		this.z_target = -1;
		this.z_curvePower = 100;

		this.layer = 0;
	}

	getYwithZ(){
		return this.pos.y-this.getZ();
	}

	getZ(){
		if(this.z_target>0){
			return genCurve(this.z_process, this.z_target, this.z_curvePower);
		}else{
			return 0;
		}
	}

	applyZ(z_target, z_curvePower = 100){
		if(this.z_process>this.z_target){
			this.z_target=z_target;
			this.z_curvePower = z_curvePower;
			this.z_process = 0;
		}
	}

	isCollisionWith(b){
		if(b.isSpectre)
			return false;
		if(this.isAlive && b.isAlive){
			return circleCollision(this, b);
		}
		return false;
	}
	
	despawn(){
		this.isAlive = false;
		this.onDespawn();
		removeTeamUnit(this);
	}	

	moveAndCheckCollision(nextPos){
		//Collison checking
		var prePos = this.pos;
		this.pos = nextPos;
		var isCollision = false;
		var thisobj = this;
		enemyTeamLooper(this, function(tar){
			if(thisobj.isCollisionWith(tar)){
				thisobj.onCollision(tar);
			}
		});
	}

	tryMoveTo(nextPos){
		//Collison checking
		var prePos = this.pos;
		this.pos = nextPos;
		if(this.isSpectre)
			return;
		var isCollision = false;
		var thisobj = this;
		enemyTeamLooper(this, function(tar){
			if(thisobj.isCollisionWith(tar)){
				isCollision = true;
			}
		});
		if(isCollision){
			this.pos = prePos; //reset the pos if the nextPos will collision
			this.x_velocity = this.y_velocity = 0;
		}
	}

	applyForce(source, force){
		if(force!=0){
			var degrees = getDegreesToTarget(this.pos, source.pos);
			var wantPos = moveTowardToDegrees({x:0, y:0}, degrees, force);
			this.x_velocity-=force * (wantPos.x/force);
			this.y_velocity-=force * (wantPos.y/force);
		}
	}

	getNextPos(){
		return {x:this.pos.x+this.x_velocity, y: this.pos.y+this.y_velocity};
	}

	doMove(){
		var nextPos = {x:this.pos.x+this.x_velocity, y: this.pos.y+this.y_velocity};
		this.tryMoveTo(nextPos);
	}

	setStartSpeed(facingDegrees, s_ms){
		if(s_ms!=0){
			var wantPos = moveTowardToDegrees(this.pos, facingDegrees, s_ms);
			this.x_velocity = s_ms * (wantPos.x-this.pos.x)/s_ms;
			this.y_velocity = s_ms * (wantPos.y-this.pos.y)/s_ms;
		}
	}

	backward(){
		var degrees = this.degreesToTarget = getDegreesToTarget(this.pos, this.target.pos);
		var wantPos = moveTowardToDegrees(this.pos, 180-this.facingDegrees, this.ms);
		var x_a_ms = this.a_ms * Math.abs(wantPos.x-this.pos.x)/this.ms;
		var y_a_ms = this.a_ms * Math.abs(wantPos.y-this.pos.y)/this.ms;
		
		this.facingDegrees = degreesTracing(this.facingDegrees, degrees, 5);
		
		if(this.x_velocity-x_a_ms>-this.ms/2 && this.x_velocity>(wantPos.x-this.pos.x)){
			this.x_velocity-=x_a_ms;
		}else if(this.x_velocity+x_a_ms<this.ms/2 && this.x_velocity<(wantPos.x-this.pos.x)){
			this.x_velocity+=x_a_ms;
		}
		if(this.y_velocity-y_a_ms>-this.ms/2 && this.y_velocity>(wantPos.y-this.pos.y)){
			this.y_velocity-=y_a_ms;
		}else if(this.y_velocity+y_a_ms<this.ms/2 && this.y_velocity<(wantPos.y-this.pos.y)){
			this.y_velocity+=y_a_ms;
		}	
	}

	changeVelocityToDegree(facingDegrees){
		this.facingDegrees = facingDegrees;
		var wantPos = moveTowardToDegrees(this.pos, facingDegrees, this.ms);
		var x_a_ms = this.a_ms * Math.abs(wantPos.x-this.pos.x)/this.ms;
		var y_a_ms = this.a_ms * Math.abs(wantPos.y-this.pos.y)/this.ms;
		
		if(this.x_velocity-x_a_ms>-this.ms && this.x_velocity>(wantPos.x-this.pos.x)){
			this.x_velocity-=x_a_ms;
		}else if(this.x_velocity+x_a_ms<this.ms && this.x_velocity<(wantPos.x-this.pos.x)){
			this.x_velocity+=x_a_ms;
		}
		if(this.y_velocity-y_a_ms>-this.ms && this.y_velocity>(wantPos.y-this.pos.y)){
			this.y_velocity-=y_a_ms;
		}else if(this.y_velocity+y_a_ms<this.ms && this.y_velocity<(wantPos.y-this.pos.y)){
			this.y_velocity+=y_a_ms;
		}	
	}
	changeVelocityToPos(pos){
		var degrees = this.degreesToTarget = getDegreesToTarget(this.pos, pos);
		var wantPos = moveTowardToDegrees(this.pos, degrees, this.ms);
		var x_a_ms = this.a_ms * Math.abs(wantPos.x-this.pos.x)/this.ms;
		var y_a_ms = this.a_ms * Math.abs(wantPos.y-this.pos.y)/this.ms;

		if(Math.abs(degrees-this.facingDegrees)>10){
			x_a_ms *= 0.5;
			y_a_ms *=0.5;
		}
		this.facingDegrees = degreesTracing(this.facingDegrees, degrees, 5);
		
		if(this.x_velocity-x_a_ms>-this.ms && this.x_velocity>(wantPos.x-this.pos.x)){
			this.x_velocity-=x_a_ms;
		}else if(this.x_velocity+x_a_ms<this.ms && this.x_velocity<(wantPos.x-this.pos.x)){
			this.x_velocity+=x_a_ms;
		}
		if(this.y_velocity-y_a_ms>-this.ms && this.y_velocity>(wantPos.y-this.pos.y)){
			this.y_velocity-=y_a_ms;
		}else if(this.y_velocity+y_a_ms<this.ms && this.y_velocity<(wantPos.y-this.pos.y)){
			this.y_velocity+=y_a_ms;
		}	
	}
	changeVelocityTo(target){
		this.changeVelocityToPos(target.pos);
	}

	stop(){
		if(this.x_velocity>0){
			this.x_velocity=Math.max(this.x_velocity-this.a_ms/5, 0);
		}else if(this.x_velocity<0){
			this.x_velocity=Math.min(this.x_velocity+this.a_ms/5, 0);
		}
		if(this.y_velocity>0){
			this.y_velocity=Math.max(this.y_velocity-this.a_ms/5, 0);
		}else if(this.y_velocity<0){
			this.y_velocity=Math.min(this.y_velocity+this.a_ms/5, 0);
		}
	}
}


//////////////////////////////////////////
//			AI Methods					//
//////////////////////////////////////////
function getTeamColor(team){
	return getTeamColor(team, false);
}
function getTeamColor(team, isSpectre){
	var alpha = isSpectre?0.5:1;
	if(team == 0)
		return "rgba(0,0,255,"+alpha+")";
	if(team == 1)
		return "rgba(255,0,0,"+alpha+")";
}
function getTeamColorRGB(team){
	if(team == 0)
		return "0,0,255";
	if(team == 1)
		return "255,0,0";
}

function getZombieTeamColor(team){
	if(team == 0)
		return "rgba(0,0,255,1)";
	if(team == 1)
		return "rgba(255,50,0,1)";
}

function getZombieBodyColor(isSpectre){
	return "rgba(255,255,255,0.3)";
}


function getDebugTeamColor(team){
	if(team == 0)
		return "rgba(0,0,255,0.5)";
	if(team == 1)
		return "rgba(255,0,0,0.5)";
}

function getTeamHPColor(team){
	if(team == 0)
		return "#00ff00";
	if(team == 1)
		return "#ff0000";
}

function getBodyColor(isSpectre){
	var alpha = isSpectre?0.5:1;
	return "rgba(255,255,255,"+alpha+")";
}

function getEnemyTeam(team){
	var tmp = [];
	for(var i =0; i<teamsArr.length; i++){
		if(i!=team){
			for(let tar of teamsArr[i])
				tmp.push(tar);
		}
	}
	return tmp;
}

function getEnemyTeamUnit(team, withWall = false){
	if(!teamsTargetBool[team]){
		teamsTargetArr[team] = [];
		for(var i =0; i<teamsArr.length; i++){
			if(i!=team){
				for(let tar of teamsArr[i]){
					if(tar instanceof Unit_Prototype&&
					(!withWall&&!(tar instanceof Wall))&&
					tar.isAlive&&
					!tar.isSpectre)teamsTargetArr[team].push(tar);
				}
			}
		}
		teamsTargetBool[team] = true;
	}
	return teamsTargetArr[team];
}

function getEnemyTeamUnitWithCondition(team, condition){
	var tmp = [];
	for(let tar of getEnemyTeamUnit(team)){
		if(tar instanceof Unit_Prototype&&
			tar.isAlive&&
			!tar.isSpectre&&
			condition(tar))tmp.push(tar);
	}
	return tmp;
}

function getAllyTeamUnitWithCondition(team, condition){
	var tmp = [];
	for(let tar of teamsArr[team]){
		if(tar instanceof Unit_Prototype&&
			!tar instanceof Wall&&
			tar.isAlive&&
			!tar.isSpectre&&
			condition(tar))tmp.push(tar);
	}
	return tmp;
}


function allyTeamUnitLooper(myself, triggerFunction){
	for(let tar of teamsArr[myself.team]){	
		if(tar instanceof Unit_Prototype && tar!=myself)
			triggerFunction(tar);
	}
}


function enemyTeamLooper(myself, triggerFunction){
	for(let tar of getEnemyTeam(myself.team)){	
		triggerFunction(tar);
	}
}

function findClosestTarget(myself, condition = null){
	var enemyTeam = condition==null?getEnemyTeamUnit(myself.team):getEnemyTeamUnitWithCondition(myself.team, condition);
	if(enemyTeam.length>1){
		enemyTeam.sort(function(a,b){
			return (distanceBetween(myself.pos, a.pos)-myself.radius-a.radius)-
					(distanceBetween(myself.pos, b.pos)-myself.radius-b.radius	);
		});
	}

	return enemyTeam[0];
}

function findClosestAlly(myself, condition = null){
	var allyTeam = condition==null?teamsArr[myself.team]:getAllyTeamUnitWithCondition(myself.team, condition);
	if(allyTeam.length>1){
		allyTeam.sort(function(a,b){
			return (distanceBetween(myself.pos, a.pos)-myself.radius-a.radius)-
					(distanceBetween(myself.pos, b.pos)-myself.radius-b.radius	);
		});
	}

	return allyTeam[0];
}


function findTargetBetween(myself, min, max){
	var enemyTeam = getEnemyTeamUnitWithCondition(myself.team, (obj)=>{
		var tmp = distanceBetween(myself.pos, obj.pos);
		return tmp>=min && tmp<=max;
	});
	enemyTeam.sort(function(a,b){
		return (distanceBetween(myself.pos, a.pos)-myself.radius-a.radius)-
				(distanceBetween(myself.pos, b.pos)-myself.radius-b.radius	);
	});

	return enemyTeam;
}

function distanceBetween(a, b){
	return Math.sqrt((a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y));
}

function moveTowardToDegrees(currentPos, facingDegrees, ms){
	var degrees = facingDegrees;

	var nextPos = {x:currentPos.x, y:currentPos.y};
	nextPos.x += Math.cos(degrees*Math.PI/180)*ms;
	nextPos.y += Math.sin(degrees*Math.PI/180)*ms;
	return nextPos;
}

function getDegreesToTarget(currentPos, targetPos){
	var degrees = Math.atan2(targetPos.y-currentPos.y, targetPos.x-currentPos.x) * (180/Math.PI);
	return degrees;
}

function degreesTracing(currentDegrees, targetDegrees, moveDegrees){
	if(Math.abs(currentDegrees-targetDegrees)<moveDegrees){
		return targetDegrees;		
	}
	if(currentDegrees < targetDegrees){
		if(Math.abs(currentDegrees - targetDegrees)<180)
		   currentDegrees += moveDegrees;
		else currentDegrees -= moveDegrees;

	}else if(currentDegrees > targetDegrees){
		if(Math.abs(currentDegrees - targetDegrees)<180)
		   currentDegrees -= moveDegrees;
		else currentDegrees += moveDegrees;
	}
	currentDegrees = currentDegrees%360;
	currentDegrees = currentDegrees%-360;
	if(currentDegrees>180)currentDegrees-=360;
	if(currentDegrees<-180)currentDegrees+=360;
	return currentDegrees;
}

function isDegreeNeededToAdd(currentDegrees, targetDegrees){
	if(currentDegrees < targetDegrees){
		return Math.abs(currentDegrees - targetDegrees)<180;
	}else if(currentDegrees > targetDegrees){
		return !(Math.abs(currentDegrees - targetDegrees)<180);
	}
	return true;
}

function mirrorDegree(d){
	if(d>=0)
		d = 180-d;
	else if(d<0)
		d = 180+d;
	return d;
}

function gridPosToRealPos(pos){
	var rPos={};
	rPos.x = pos.x*collisionMapResolution+collisionMapResolution/2;
	rPos.y = pos.y*collisionMapResolution+collisionMapResolution/2;
	return rPos;
}

function realPosToGridPos(pos){
	var rPos={};
	rPos.x = Math.floor(pos.x/collisionMapResolution);
	rPos.y = Math.floor(pos.y/collisionMapResolution);
	return rPos;
}

function posEqual(pos1,pos2){
	if(pos1==null||pos2==null)return false;
	return pos1.x==pos2.x &&pos1.y==pos2.y;
}
//////////////////////////////////////////
//			Drawing Thingy				//
//////////////////////////////////////////
class Hand{
	constructor(owner, direction, degrees, max_degrees, min_degrees, handSize, length, handMoveingSpeed){
		this.owner = owner;
		this.direction = direction;
		this.degrees = degrees;
		this.max_degrees = max_degrees;
		this.min_degrees = min_degrees;
		this.handSize = handSize;
		this.length = length;
		this.handMoveingSpeed = handMoveingSpeed;

		this.weapon = null;
		this.handAddBool = false;
		this.handPos = owner.pos;
		this.handDegrees = degrees;

		this.pointingAt = null;
		this.autoSwingTo = max_degrees;
	}
	draw(ctx = context){
		var x =this.owner.pos.x;
		//var y = this.pos.y;
		var y = this.owner.getYwithZ();
		var tmpX = x + (this.direction=="r"?1:-1)*this.owner.radius
		
		this.handDegrees = this.direction=="l"?180-this.degrees:this.degrees;
		if(!isPause)
			this.handPos = moveTowardToDegrees({x: tmpX, y: y}, this.handDegrees, this.length);

		ctx.beginPath();
		ctx.moveTo(tmpX, y);
		ctx.lineTo(this.handPos.x, this.handPos.y);
		ctx.strokeStyle = getTeamColor(this.owner.team, this.isSpectre);
		ctx.stroke();

		ctx.beginPath();
		ctx.arc(this.handPos.x,this.handPos.y,this.handSize,0, 2* Math.PI);
		ctx.stroke();		
		if(this.pointingAt == null || this.owner.mainHand != this.direction){
			if(this.degrees>=this.max_degrees){
				this.autoSwingTo = this.min_degrees;
			}else if(this.degrees<=this.min_degrees){
				this.autoSwingTo = this.max_degrees;
			}
		}else{
			if(this.pointingAt instanceof Unit_Prototype){
				this.autoSwingTo = getDegreesToTarget(this.owner.pos, this.pointingAt.pos);
				this.autoSwingTo = this.direction=="l"?mirrorDegree(this.autoSwingTo):this.autoSwingTo;
			}else{
				this.autoSwingTo = this.pointingAt;
			}
		}
		if(!isPause)
			this.degrees = degreesTracing(this.degrees, this.autoSwingTo, this.handMoveingSpeed);
	}

	drawWeapon(ctx = context){
		if(this.weapon!=null){
			ctx.translate(this.handPos.x, this.handPos.y);
			ctx.rotate(this.handDegrees*Math.PI/180);
			if(this.handDegrees>=90 || this.handDegrees<-90){
				ctx.scale(1, -1);
			}
			this.weapon.onDraw(ctx);
			ctx.setTransform(1,0,0,1,0,0);
		}
	}

	toFragment(){
		var x =this.owner.pos.x;
		//var y = this.pos.y;
		var y = this.owner.getYwithZ();
		var tmpX = x + (this.direction=="r"?1:-1)*this.owner.radius
		var frag = new BodyFragment({x:tmpX, y:y}, this.owner.team);
		frag.rotation = this.direction=="l"?this.degrees:this.degrees;
		frag.drawShape = ()=>{
			if(this.direction=="l")
				context.scale(1, -1);
			var handPos = {x:0+this.length, y:0};
			context.beginPath();
			context.moveTo(0, 0);
			context.lineTo(this.length, 0);
			context.strokeStyle = getZombieTeamColor(this.owner.team);
			context.stroke();

			context.beginPath();
			context.arc(this.length,0,this.handSize,0, 2* Math.PI);
			context.stroke();		
		};
		frag.x_velocity+=this.owner.x_velocity/2;
		frag.y_velocity+=this.owner.y_velocity/2;
		return frag;
	}

	weaponToFragment(){
		if(this.weapon==null)
			return null;
		var frag = new BodyFragment(this.handPos, this.owner.team);
		frag.rotate = this.handDegrees;
		frag.drawShape = ()=>{
			this.weapon.onDraw();
		};
		frag.x_velocity+=this.owner.x_velocity/2;
		frag.y_velocity+=this.owner.y_velocity/2;
		return frag;
	}
}

class BodyFragment extends PhysicsEntity{
	constructor(pos, team){
		super(pos, team, 0, -1, 0);
		this.drawShape=()=>{};
		
		this.rotation = 0;
		this.rotateScale = Math.random()*6-3;
		this.x_velocity = Math.random()*0.4-0.2;
		this.y_velocity = Math.random()*0.4-0.2;

		this.isSpectre = true;
		this.bornTime = Date.now();
		this.endTime = this.bornTime + 6*1000;
		this.scale = 1;

		this.layer = -1;
		this.alpha = 0.3;
	}
	
	isCollisionWith(b){
		return false;
	}

	onUpdate(){
		this.doMove();
		this.rotation += this.rotateScale;
		if(Date.now()>this.endTime){
			//this.scale-=0.03;
			this.alpha-=0.3*0.03;
			if(this.alpha<=0)
				this.despawn();
		}
	}

	onDraw(ctx = context){
		var x = this.pos.x;
		var y = this.pos.y;
		
		//draw the real shape
		ctx.translate(this.pos.x, this.pos.y);
		ctx.rotate(this.rotation*Math.PI/180);
		ctx.scale(this.scale, this.scale);
		ctx.globalAlpha = this.alpha;
		this.drawShape(ctx);
		ctx.globalAlpha = 1;
		ctx.setTransform(1,0,0,1,0,0);
	}

	onDespawn(){
		
	}

}

//////////////////////////////////////////
//			Playable Unit, AI			//
//////////////////////////////////////////
var eyesArr = ["' '", "o o", "- -", "0 0", "= =", "@ @", "T T", "Q Q", "^ ^", "> <", "v v", "~ ~", "? ?"];
var mouthArr = ["o", "H", "-", "v", "w", "^", "3", "A", "u", "x", "q"];
/** 
 * The super class of all unit
 * @param pos should be a object like {x:0, y:0}
 * @param team  0 is for user, 1 is the ai (teamsArr[1])
 * @param ms the Maxium movement speed of this unit
 * @param a_ms the Acceleration Speed of this unit
 * @param hp the health point of thie unit
 * @param cost
 * @param radius the hitbox radius
 * @param skills a array of the skill set
 */
class Unit_Prototype extends PhysicsEntity{
	static get HP(){return 10;}
	static get MS(){return 1;}
	static get A_MS(){return 0.05;}
	static get COST(){return 8;}
	static get DESCRIPTION(){return "A normal Warrior, Melee Unit";}
	static get TYPE(){return "melee";}
	
	constructor(pos, team, ms, a_ms, hp, cost, radius, skills){
		super(pos, team, radius, ms, a_ms);
		this.maxHp = this.hp = hp;
		this.cost = cost;
		this.skills = skills;

		this.facingDegrees = team==0?180:0;
		this.target = null;
		this.distanceToTarget = null;
		this.degreesToTarget = null;
		this.lastTargetLockTime = 0;
		this.buffset = new Set();

		this.eyes = eyesArr[Math.floor(Math.random()*eyesArr.length)];
		this.mouth = mouthArr[Math.floor(Math.random()*mouthArr.length)];
		this.eyesPosition = context.measureText(this.eyes).width/2;
		this.mouthPosition = context.measureText(this.mouth).width/2;

		this.handMoveingSpeed =(Math.random()*3+1);
		this.rHand = new Hand(this,"r", 80, 80, -20, 1, 5, this.handMoveingSpeed);
		this.lHand = new Hand(this,"l", 80, 80, -20, 1, 5, this.handMoveingSpeed);

		this.mainHand = "r";
		
		this.pathNode = null;
		this.currentGrid = realPosToGridPos(this.pos);
		this.targetLatestGrid = null;
		this.collisionLastestUpdate = null;
	}

	onUpdate(){
		if(!this.isAlive)
			return;

		//Looking for target every 500ms
		this.targetFindBehavior();

		//walk toward to target
		this.walkingBehavior();

		this.currentGrid = realPosToGridPos(this.pos);
				
		//Update targetInfo
		if(this.target!=null){
			this.distanceToTarget = distanceBetween(this.pos, this.target.pos) - this.radius - this.target.radius;
		}

		//exchanging mainHand
		if(this.facingDegrees>=93 ||this.facingDegrees<=-93){
			if(this.mainHand!="l"){
				this.lHand.weapon = [this.rHand.weapon, this.rHand.weapon = this.lHand.weapon][0];
				this.mainHand = "l";
			}
		}else if(this.facingDegrees<=87 && this.facingDegrees>=-87){
			if(this.mainHand!="r"){
				this.lHand.weapon = [this.rHand.weapon, this.rHand.weapon = this.lHand.weapon][0];
				this.mainHand = "r";
			}
		}
		allyTeamUnitLooper(this, (tar)=>{
			if(circleCollision(this, tar)){
				this.applyForce(tar, 0.05);
			}
		});
		
		//fix illegal position
		this.pos.x = Math.min(Math.max(this.pos.x,0),canvas.width);
		this.pos.y = Math.min(Math.max(this.pos.y,0),canvas.height);

		//check for usable skills
		for(let skill of this.skills) if(skill.isAvail()&&skill.condition(this)) skill.cast(this);

		//check for the buff
		for(let buff of this.buffset) buff.onUpdate(); 
	}

	onDraw(){
		var x = this.pos.x;
		var y = this.pos.y;

		//check for the buff
		for(let buff of this.buffset) if(buff.isBehindBody) buff.onDraw(); 

		//draw the shadow
		drawShadow(this);

		//draw the real shape
		this.drawShape();
						
		//check for the buff
		for(let buff of this.buffset) if(!buff.isBehindBody) buff.onDraw(); 

		//draw hp bar
		if(this.hp!=0 || this.maxHp!=0){
			context.beginPath();
			context.fillStyle="#AAAAAA";
			context.fillRect(x-10, y+this.radius+5, 20, 3);
			context.fillStyle=getTeamHPColor(this.team);
			context.fillRect(x-10, y+this.radius+5, 20*(this.hp/this.maxHp), 3);
		}

		if(debugTag){
			//draw hitbox
			context.beginPath();
			context.arc(x,y,this.radius,0, 2* Math.PI);			
			context.strokeStyle = getDebugTeamColor(this.team);
			context.stroke();
			
			//draw facing line
			var tmpPos = moveTowardToDegrees(this.pos, this.facingDegrees, this.radius*1.5+5);
			context.beginPath();
			context.moveTo(x, y);
			context.lineTo(tmpPos.x, tmpPos.y);
			context.stroke();	
		}
	}

	getMainHand(){
		if(this.mainHand =='r'){
			return this.rHand;
		}else{
			return this.lHand;
		}
	}

	drawShape(ctx = context){
		var x = this.pos.x;
		//var y = this.pos.y;
		var y = this.getYwithZ();

		//draw righthand
		this.rHand.draw(ctx);
		//draw left hand
		this.lHand.draw(ctx);

		//draw the body
		ctx.beginPath();
		ctx.arc(x,y,this.radius,0, 2* Math.PI);
		ctx.fillStyle = getBodyColor(this.isSpectre);
		ctx.fill();
		ctx.strokeStyle = getTeamColor(this.team, this.isSpectre);
		ctx.stroke();
		
		
		//draw the face
		ctx.beginPath();
		ctx.fillStyle= getTeamColor(this.team, this.isSpectre);
		ctx.font="Calibri";
		ctx.fillText(this.eyes, x-this.eyesPosition,y+2);
		ctx.fillText(this.mouth, x-this.mouthPosition,y+7);
		ctx.font="";
		
		//draw the weapons
		this.rHand.drawWeapon(ctx);
		this.lHand.drawWeapon(ctx);
	}

	toFragment(){
		this.deadEyesPosition = context.measureText("x x").width/2;
		this.deadMouthPosition = context.measureText("o").width/2;
		var x =this.pos.x;
		//var y = this.pos.y;
		var y = this.getYwithZ();
		var frag = new BodyFragment({x:x, y:y}, this.team);
		frag.drawShape = ()=>{
			//draw the body
			context.beginPath();
			context.arc(0,0,this.radius,0, 2* Math.PI);
			context.fillStyle = getZombieBodyColor(this.isSpectre);
			context.fill();
			context.strokeStyle = getZombieTeamColor(this.team);
			context.stroke();

			//draw the face
			context.beginPath();
			context.fillStyle= getZombieTeamColor(this.team);
			context.font="Calibri";
			context.fillText("x x", -this.deadEyesPosition,2);
			context.fillText("o", -this.deadMouthPosition,7);
			context.font="";

		};
		frag.x_velocity+=this.x_velocity/2;
		frag.y_velocity+=this.y_velocity/2;
		return frag;
	}

	moveTowardToNextNode(){
		if(this.pathNode!=null && this.pathNode[0] !=null){
			var pos = gridPosToRealPos(this.pathNode[0]);
			this.changeVelocityToPos(pos);
			if(distanceBetween(this.pos, pos)<=this.radius*2)
				this.pathNode.shift();
			//this.changeVelocityTo(this.target);
		}else if(this.target!=null && (this.panNode==null ||this.pathNode[0]==null)){
			this.changeVelocityTo(this.target);
		}
	}

	updateTargetInfo(){
		if(this.target!=null){
			this.distanceToTarget = distanceBetween(this.pos, this.target.pos);
			this.degreesToTarget = getDegreesToTarget(this.pos, this.target.pos);
			
			if(!posEqual(this.targetLatestGrid,this.target.currentGrid)||
			this.collisionLastestUpdate!=collisionLastestUpdate){
				this.targetLatestGrid = this.target.currentGrid;
				this.pathNode = pathFind(this.pos, this.target.pos);
				this.collisionLastestUpdate = collisionLastestUpdate;

				if(debugTag&&this.pathNode!=null){
					uiset.delete(this.pathObj);
					this.pathObj = new Path(this.pathNode, getTeamColorRGB(this.team));
					uiset.add(this.pathObj);
				}
			}
		}
		if(!debugTag){
			uiset.delete(this.pathObj);
			this.pathObj = null;
		}else if(debugTag&&this.pathObj==null&&this.pathNode!=null){
			this.pathObj = new Path(this.pathNode, getTeamColorRGB(this.team));
			uiset.add(this.pathObj);
		}
	}


	//////////////////////////////////////////
	//	override the method below only		//
	//////////////////////////////////////////
	targetFindBehavior(){
		//Looking for target every 500ms
		if(Date.now()-this.lastTargetLockTime> 1000 || this.lastTargetLockTime==0){
			this.lastTargetLockTime = Date.now();
			this.target = findClosestTarget(this);
			this.updateTargetInfo();
		}
	}
	walkingBehavior(){
		//walk toward to target
		if(this.target!=null){ //Target exist
			this.moveTowardToNextNode();
		}else{ //No target
			this.stop();
		}
		this.doMove();
	}

	onHit(damage){
		//spawn the damage point text
		TextBubble.DamagePoint(this, damage.damage);

		//do the hp reduce
		this.hp-=damage.damage;
		
		//if still survive, do knockBack if the damage will
		if(damage.knockBackPower!=0){
			this.applyForce(damage.applyBy, damage.knockBack);
		}

		//check if this unit will die from this damage
		if(this.hp<=0){
			this.despawn();
		}
	}

	onDespawn(){
		uiset.delete(this.pathObj);
		//implement the on despawn event by overriding this
		addTeamUnit(this.lHand.toFragment());
		addTeamUnit(this.rHand.toFragment());
		if(this.lHand.weapon!=null)
			addTeamUnit(this.lHand.weaponToFragment());
		if(this.rHand.weapon!=null)
			addTeamUnit(this.rHand.weaponToFragment());
		addTeamUnit(this.toFragment());
			
	}

	applyBuff(buff){
		this.buffset.add(buff);
	}
}

class Base extends Unit_Prototype{
	static get HP(){return 1000;}
	static get MS(){return 0;}
	static get A_MS(){return 0;}
	static get COST(){return 0;}
	static get DESCRIPTION(){return "The Base of the team, Structure";}
	static get TYPE(){return "structure";}
	static get COMBAT_RANGE(){return "long";}

	constructor(pos, team){
		super(pos, team, Base.MS, Base.A_MS, Base.HP, Base.COST, 80, []);
		this.type = "structure";
	}
	targetFindBehavior(){
		
	}
	walkingBehavior(){

	}
	onHit(damage){
		TextBubble.DamagePoint(this, damage.damage);
		this.hp-=damage.damage;
		if(this.hp<0){
			this.despawn();
		}else{

		}

		if(this.team==0 &&damage.damage>0 &&(this.lastOnHitSpeech == null || Date.now()-this.lastOnHitSpeech>5*1000)){
			systemSpeak("Your base is under Attack!", true);
			this.lastOnHitSpeech = Date.now();
		}
	}
	onDespawn(){
		TextBubble.Speak(this, "GG");
		triggerLoser(this.team);
	}
	
	drawShape(ctx = context){
		super.drawShape(ctx);
		var x = this.pos.x;
		var y = this.pos.y;
		var font = ctx.font;
		ctx.font = "20pt Arial";
		var w = context.measureText("\uD83D\uDC51").width;
		ctx.fillText("\uD83D\uDC51",x-w/2, y-this.radius);
		ctx.font = font;
		/*
  		ctx.beginPath();	
		ctx.arc(x,y,this.radius,0, 2* Math.PI);
		ctx.fillStyle = getTeamColor(this.team);
		
		ctx.fill();
		*/
	}


	applyBuff(buff){

	}
}


 /*
pos, team, ms, a_ms, hp, cost, radius, skills
 */
class Warrior extends Unit_Prototype{
	static get HP(){return 10;}
	static get MS(){return 1;}
	static get A_MS(){return 0.05;}
	static get COST(){return 50;}
	static get DESCRIPTION(){return "A normal Warrior, Melee Unit";}
	static get TYPE(){return "melee";}
	static get COMBAT_RANGE(){return "short";}
	
	constructor(pos, team){
		//pos, team, ms, a_ms, hp, cost, radius, skills
		super(pos, team, Warrior.MS, Warrior.A_MS, Warrior.HP, Warrior.COST, 10, [new MeleeAttack(2,1)]);
		this.rHand.weapon = new Sword();
		this.type = "melee";
	}
}

class Archer extends Unit_Prototype{
	static get HP(){return 6;}
	static get MS(){return 0.8;}
	static get A_MS(){return 0.05;}
	static get COST(){return 70;}
	static get DESCRIPTION(){return "Shot the enemy by its arrow and bow, \nRanged Unit";}
	static get TYPE(){return "range";}
	static get COMBAT_RANGE(){return "very long";}

	constructor(pos, team){
		//pos, team, ms, a_ms, hp, cost, radius, skills
		super(pos, team, Archer.MS, Archer.A_MS, Archer.HP, Archer.COST, 10, [new ArrowShot()]);
		this.rHand.weapon = new Bow();
		this.type = "range";
	}
	
	walkingBehavior(){
		//walk toward to target
		if(this.target!=null){ //Target exist
			if(this.distanceToTarget <150){
				this.backward();
			}else{
				this.moveTowardToNextNode();
				//this.changeVelocityTo(this.target);
			}
		}else{ //No target
			this.stop();
		}
		this.doMove();
	}
	targetFindBehavior(){
		super.targetFindBehavior();
		
		this.lHand.pointingAt=this.target;
		this.rHand.pointingAt=this.target;
	}
}

class Bomber extends Unit_Prototype{
	static get HP(){return 6;}
	static get MS(){return 0.8;}
	static get A_MS(){return 0.05;}
	static get COST(){return 80;}
	static get DESCRIPTION(){return "Explosion is its art. Great when deal with \na lot of enemies, Ranged Unit";}
	static get TYPE(){return "range";}
	static get COMBAT_RANGE(){return "long";}
	
	constructor(pos, team){
		//pos, team, ms, a_ms, hp, cost, radius, skills
		super(pos, team, Bomber.MS, Bomber.A_MS, Bomber.HP, Bomber.COST, 10, [new MeleeAttack(2,1), new BoomThrow()]);
		this.rHand.weapon = new Bomb();
		this.type = "range";
	}
	targetFindBehavior(){
		//Looking for target every 500ms
		if(Date.now()-this.lastTargetLockTime> 500 || this.lastTargetLockTime==0){
			this.lastTargetLockTime = Date.now();
			this.target = findTargetBetween(this, 30, 900)[0];
			if(this.target==null)
				this.target = findClosestTarget(this);
			
			this.updateTargetInfo();
		}
	}
	
	walkingBehavior(){
		//walk toward to target
		if(this.target!=null){ //Target exist
			if(this.distanceToTarget <100){
				this.backward();
			}else{
				this.moveTowardToNextNode();
				//this.changeVelocityTo(this.target);
			}
		}else{ //No target
			this.stop();
		}
		this.doMove();
	}
}

class Knight extends Unit_Prototype{
	static get HP(){return 16;}
	static get MS(){return 1;}
	static get A_MS(){return 0.1;}
	static get COST(){return 100;}
	static get DESCRIPTION(){return "Can't Stop, Won't Stop, Strike the enemy \nfrontline, Melee Unit";}
	static get TYPE(){return "melee";}
	static get COMBAT_RANGE(){return "short";}
	
	constructor(pos, team){	
		//pos, team, ms, a_ms, hp, cost, radius, skills
		super(pos, team, Knight.MS, Knight.A_MS, Knight.HP, Knight.COST, 10, [new MeleeAttack(2,0.5), new KnightDash()]);
		this.rHand.weapon = new Lance();
		this.lHand.weapon = new Shield();
		this.type = "melee";
		this.isDashing = false;
	}

	walkingBehavior(){
		//walk toward to target
		if(this.isDashing){
			this.changeVelocityToDegree(this.dashingTo);
		}else{
			if(this.target!=null){ //Target exist
				this.moveTowardToNextNode();
				//this.changeVelocityTo(this.target);
			}else{ //No target
				this.stop();
			}
		}
		this.doMove();
	}
}

class Giant extends Unit_Prototype{
	static get HP(){return 45;}
	static get MS(){return 1;}
	static get A_MS(){return 0.05;}
	static get COST(){return 120;}
	static get DESCRIPTION(){return "Cute and Harmless but very Offensive\nCan taunt enemies, Melee Unit";}
	static get TYPE(){return "melee";}
	static get COMBAT_RANGE(){return "not available";}
	
	constructor(pos, team){	
		//pos, team, ms, a_ms, hp, cost, radius, skills
		super(pos, team, Giant.MS, Giant.A_MS, Giant.HP, Giant.COST, 20, [new Taunt()]);
		this.type = "melee";
	}
	onHit(damage){
		//spawn the damage point text
		TextBubble.DamagePoint(this, damage.damage);

		//do the hp reduce
		this.hp-=damage.damage;

		//check if this unit will die from this damage
		if(this.hp<=0){
			this.despawn();
		}else{
			//if still survive, do knockBack if the damage will
			if(damage.knockBackPower!=0){
				this.applyForce(damage.applyBy, damage.knockBack*0.5);
			}
		}
	}
	walkingBehavior(){
		//walk toward to target
		if(this.target!=null){ //Target exist
			this.changeVelocityTo(this.target);
		}else{ //No target
			this.stop();
		}
		this.doMove();
	}

	targetFindBehavior(){
		//Looking for target every 500ms
		if(Date.now()-this.lastTargetLockTime> 500 || this.lastTargetLockTime==0){
			this.lastTargetLockTime = Date.now();
			this.target = findClosestTarget(this, (obj)=>{return obj.type!="structure"});
			if(this.target==null){
				this.target = findClosestTarget(this);
			}

			this.updateTargetInfo();		
		}
	}

	isCollisionWith(b){
		if(b.isSpectre)
			return false;
		if(this.isAlive && b.isAlive){
			if(circleCollision(this, b)){
				if(b instanceof Wall &&(b.takenGiantDamageTime==null||Date.now()-b.takenGiantDamageTime>250)){
					b.onHit(new Damage(this,1,0));
					b.takenGiantDamageTime = Date.now();
				}

				return true;
			}
		}
		return false;
	}
	
}

class Assassin extends Unit_Prototype{
	static get HP(){return 6;}
	static get MS(){return 2;}
	static get A_MS(){return 0.15;}
	static get COST(){return 100;}
	static get DESCRIPTION(){return "Love to stealth behind the Ranged Units\nHigh Speed, High Damage, Melee Unit";}
	static get TYPE(){return "melee";}
	static get COMBAT_RANGE(){return "short";}

	constructor(pos, team){	
		//pos, team, ms, a_ms, hp, cost, radius, skills
		super(pos, team, Assassin.MS, Assassin.A_MS, Assassin.HP, Assassin.COST, 10, [new MeleeAttack(3,0.5, 0.8), new Stealth()]);
		this.rHand.weapon = new Dagger();
		this.lHand.weapon = new Dagger();
		this.type = "melee";
	}
	targetFindBehavior(){
		//Looking for target every 500ms
		if(Date.now()-this.lastTargetLockTime> 500 || this.lastTargetLockTime==0){
			this.lastTargetLockTime = Date.now();
			this.target = findClosestTarget(this, (obj)=>{return obj.type=="range"});
			if(this.target==null){
				this.target = findClosestTarget(this);
			}

			this.updateTargetInfo();	
		}
	}
	onHit(damage){
		if(this.skills[1].isAvail()){
			this.skills[1].cast(this);
			return;
		}
		//spawn the damage point text
		TextBubble.DamagePoint(this, damage.damage);

		//do the hp reduce
		this.hp-=damage.damage;

		//check if this unit will die from this damage
		if(this.hp<=0){
			this.despawn();
		}else{
			//if still survive, do knockBack if the damage will
			if(damage.knockBackPower!=0){
				this.applyForce(damage.applyBy, damage.knockBack);
			}
		}
	}
}

class Mage extends Unit_Prototype{
	static get HP(){return 4;}
	static get MS(){return 1;}
	static get A_MS(){return 0.05;}
	static get COST(){return 120;}
	static get DESCRIPTION(){return "Glass cannon with cool casting animation\nHit 5 enemies per attack, Ranged Unit";}
	static get TYPE(){return "range";}
	static get COMBAT_RANGE(){return "long";}
	
	constructor(pos, team){	
		//pos, team, ms, a_ms, hp, cost, radius, skills
		super(pos, team, Mage.MS, Mage.A_MS, Mage.HP, Mage.COST, 10, [new MeleeAttack(2,0.5), new LightingChain()]);
		this.rHand.weapon = new MagicStaff();
		this.type = "range";
		this.isCasting = false;
	}

	walkingBehavior(){
		//walk toward to target
		if(this.isCasting){
			this.stop();
		}else{
			if(this.target!=null){ //Target exist
				if(this.distanceToTarget <150){
					this.backward();
				}else{
					this.moveTowardToNextNode();
					//this.changeVelocityTo(this.target);
				}
			}else{ //No target
				this.stop();
			}
		}
		this.doMove();
	}
}

class Engineer extends Unit_Prototype{
	static get HP(){return 8;}
	static get MS(){return 1;}
	static get A_MS(){return 0.05;}
	static get COST(){return 70;}
	static get DESCRIPTION(){return "Aiming the Ranged Unit, support Unit";}
	static get TYPE(){return "range";}
	static get COMBAT_RANGE(){return "short";}

	constructor(pos, team){	
		//pos, team, ms, a_ms, hp, cost, radius, skills
		super(pos, team, Engineer.MS, Engineer.A_MS, Engineer.HP, Engineer.COST, 10, [new EngineerFix()]);
		this.rHand.weapon = new Spear();
		this.type = "range";
	}
	targetFindBehavior(){
		//Looking for target every 500ms
		if(Date.now()-this.lastTargetLockTime> 500 || this.lastTargetLockTime==0){
			this.lastTargetLockTime = Date.now();
			this.target = findClosestAlly(this, (obj)=>{return obj.type=="structure"});
			if(this.target==null){
				this.target = findClosestAlly(this);
			}

			this.updateTargetInfo();	
		}
	}
	
	walkingBehavior(){
		//walk toward to target
		if(this.target!=null){ //Target exist
			if(this.distanceToTarget <3){
				this.stop();
			}else{
				this.moveTowardToNextNode();
				//this.changeVelocityTo(this.target);
			}
		}else{ //No target
			this.stop();
		}
		this.doMove();
	}
}

class NatureThing extends Unit_Prototype{	
	constructor(pos, team, ms, a_ms, hp, cost, radius, skills){
		super(pos, team, ms, a_ms, hp, cost, radius, skills);
		this.type = "structure";
	}
	targetFindBehavior(){
		
	}
	walkingBehavior(){

	}

	isCollisionWith(b){
		return false;
	}
	applyBuff(buff){

	}
}

class Tree extends NatureThing{
	static get HP(){return 0;}
	static get MS(){return 0;}
	static get A_MS(){return 0;}
	static get COST(){return 0;}
	static get DESCRIPTION(){return "Tree";}
	static get TYPE(){return "structure";}
	static get COMBAT_RANGE(){return "na";}

	constructor(pos, team){
		super(pos, team, Tree.MS, Tree.A_MS, Tree.HP, Tree.COST, 10, []);
		this.type = "structure";
		this.height = 30+40*Math.random();
		this.leavesPercent = 0.7+0.25*Math.random();
		this.leavesWidth = 10+10*Math.random();
		this.radius = this.leavesWidth/2;
	}
	drawShape(ctx = context){
		var x = this.pos.x;
		var y = this.pos.y;
		var leavesStartAtY =  this.height*(1-this.leavesPercent);

		ctx.translate(x, y+this.radius);
  		ctx.beginPath();
  		ctx.moveTo(0,0);
  		ctx.lineTo(0, -leavesStartAtY);
  		ctx.strokeStyle= "brown";
  		ctx.lineWidth = 2;  		
  		ctx.stroke();
		ctx.closePath();
		
		ctx.beginPath();
  		ctx.moveTo(0, -leavesStartAtY);
  		ctx.lineTo(-this.leavesWidth/2, -leavesStartAtY);
  		var treeTopX = windObj.getY()*(this.radius);
  		ctx.lineTo(treeTopX, -this.height);
  		ctx.lineTo(this.leavesWidth/2, -leavesStartAtY);
  		ctx.lineTo(0, -leavesStartAtY);
  		ctx.strokeStyle ="green";
  		ctx.lineWidth = 1;  
  		ctx.stroke();
  		ctx.fillStyle = "rgba(0,150,0,0.9)";
  		ctx.fill();
	 	ctx.setTransform(1,0,0,1,0,0);
	}
}

class Grass extends NatureThing{
	static get HP(){return 0;}
	static get MS(){return 0;}
	static get A_MS(){return 0;}
	static get COST(){return 0;}
	static get DESCRIPTION(){return "Grass";}
	static get TYPE(){return "structure";}
	static get COMBAT_RANGE(){return "na";}

	constructor(pos, team){
		super(pos, team, Grass.MS, Grass.A_MS, Grass.HP, Grass.COST, 3, []);
		this.type = "structure";
		this.layer = -1;
		this.leaves = new Set();
		if(Math.random()>0.5){
			this.leaves.add({
				length: 5+5*Math.random(),
				degrees: -90+10+20*Math.random(),
				color:"rgba(0,150,0,"+(0.3+0.5*Math.random())+")"
			});
			this.leaves.add({
				length: 5+5*Math.random(),
				degrees: -90+(12*Math.random())-6,
				color:"rgba(0,150,0,"+(0.3+0.5*Math.random())+")"
			});
			this.leaves.add({
				length: 5+5*Math.random(),
				degrees: -90-10-20*Math.random(),
				color:"rgba(0,150,0,"+(0.3+0.5*Math.random())+")"
			});
		}else{			
			this.leaves.add( {
				length: 5+5*Math.random(),
				degrees: -90+10+20*Math.random(),
				color:"rgba(0,150,0,"+(0.3+0.5*Math.random())+")"
			});
			this.leaves.add({
				length: 5+5*Math.random(),
				degrees: -90-10-20*Math.random(),
				color:"rgba(0,150,0,"+(0.3+0.5*Math.random())+")"
			});
		}
	}
	
	drawShape(ctx = context){
		var x = this.pos.x;
		var y = this.pos.y;

		ctx.translate(x, y+this.radius);
  		ctx.beginPath();
  		for(let leaf of this.leaves){
  			var windY = windObj.getY();
  			ctx.moveTo(0,0);
  			var targetPos = moveTowardToDegrees({x:0, y:0}, leaf.degrees+60*windY, leaf.length);
  			ctx.lineTo(targetPos.x, targetPos.y);
			ctx.strokeStyle =leaf.color;
			ctx.lineWidth = 1;  
			ctx.stroke();		
  		}
  		
	 	ctx.setTransform(1,0,0,1,0,0);
	}
}

class Wall extends Unit_Prototype{
	static get HP(){return 30;}
	static get MS(){return 0;}
	static get A_MS(){return 0;}
	static get COST(){return 3;}
	/*
	static get COST(){
		var cost = 5;
		if(teamsArr!=null){
			var counter = 1;
			for(let unit of teamsArr[BlueTeamNum]){
				if(unit instanceof Wall){
					counter++;
				}
			}
			var cost = counter*5;
		}
		return cost;
	}
	*/
	static get DESCRIPTION(){return "Trump's";}
	static get TYPE(){return "structure";}
	static get COMBAT_RANGE(){return "na";}

	constructor(pos, team){
		super(pos, team, Wall.MS, Wall.A_MS, Wall.HP, Wall.COST, 10, []);
		this.type = "structure";
		this.inGrid = true;

		this.dots = [];
		var r = this.radius;
		for(var i=0; i<5*Math.random(); i++){
			var w = Math.floor(5+5*Math.random());
			var h = Math.floor(5+5*Math.random());
			this.dots.push({
				x:Math.floor((r*2-w)*Math.random()),
				y:Math.floor((r*2-h)*Math.random()),
				w:w,
				h:h
			});
		}
	}
	targetFindBehavior(){

	}
	walkingBehavior(){

	}

	onPlaced(){
		registerCollision(this);
	}

	onDespawn(){
		unRegisterCollision(this);
	}

	applyForce(source, force){
		//Override to make it can't apply force
	}

	drawShape(ctx = context){	
		var x = this.pos.x;
		var y = this.pos.y;
		var r = this.radius;

		ctx.beginPath();
		ctx.fillStyle = "#AAAAAA";
		ctx.strokeStyle = getTeamColor(this.team);

		ctx.fillRect(x-r, y-r, r*2, r*2);
		ctx.strokeRect(x-r, y-r, r*2, r*2);

		ctx.fillStyle = "rgba(100,100,100,0.2)";
		ctx.strokeStyle = "rgba(0,0,0,0.2)";
		for(let dot of this.dots){
			ctx.fillRect(x-r+dot.x, y-r+dot.y, dot.w, dot.h);
			ctx.strokeRect(x-r+dot.x, y-r+dot.y, dot.w, dot.h);
		}
	}
}
//////////////////////////////////////////
//			Skills						//
//////////////////////////////////////////
/**
 * The super class of all skill
 */
class Skill_Prototype{
	constructor(cooldown){
		this.cooldown = cooldown; //in second
		this.lastUsed = Date.now()-cooldown*1000;
	}
	//check if the skill's cd is end
	isAvail(){
		return Date.now()-this.lastUsed>(this.cooldown*1000);
	}

	//////////////////////////////////////////
	//	override the method below only		//
	//////////////////////////////////////////
	//the caster is the object who casted the skill
	condition(){
		return true;
	}
	cast(caster){
		this.lastUsed = Date.now();
		this.onCast(caster);
	}
	onCast(caster){
		console.log("cast!");
	}
}

class MeleeAttack extends Skill_Prototype{
	static get SFX(){return ["sfx/melee1.wav","sfx/melee2.wav","sfx/melee3.wav","sfx/melee4.wav"]};
	constructor(damage, knockBack, cooldown = 1){
		super(cooldown);
		this.damage = damage;
		this.knockBack = knockBack;
	}
	condition(caster){
		if(caster.target!=null && caster.target.isAlive)
			return caster.distanceToTarget <= 3;
		return false;
	}
	onCast(caster){
		if(caster.target!=null&&caster.target.isAlive){
 			makeSoundAt(MeleeAttack.SFX[Math.floor(MeleeAttack.SFX.length*Math.random())], 0.05, caster.pos.x);
			caster.getMainHand().handMoveingSpeed=15;
			setTimeout(()=>{
				caster.lHand.handMoveingSpeed = caster.handMoveingSpeed;
				caster.rHand.handMoveingSpeed = caster.handMoveingSpeed;
				}, 150);
			caster.target.onHit(new Damage(caster, this.damage, this.knockBack));
		}
	}
}

class SpearThrow extends Skill_Prototype{
	constructor(){
		super(2);
	}
	condition(caster){
		if(caster.target!=null){
			var tmpBool = caster.distanceToTarget <= caster.radius+150;
			return tmpBool;
		}
		return false;
	}
	onCast(caster){
		if(caster.target!=null){
			addTeamUnit(new SpearProjectile(caster, caster.degreesToTarget));	
		}
	}
}

class ArrowShot extends Skill_Prototype{
	constructor(){
		super(1);
	}
	condition(caster){
		if(caster.target!=null){
			var tmpBool = caster.distanceToTarget <= caster.radius+150;
			return tmpBool;
		}
		return false;
	}
	onCast(caster){
		if(caster.target!=null){
 			makeSoundAt('sfx/ArrowAttack1.wav', 0.05, caster.pos.x);
			addTeamUnit(new ArrowProjectile(caster, caster.degreesToTarget));
		}
	}
}

class RapidArrowShot extends Skill_Prototype{
	constructor(){
		super(10);
	}
	condition(caster){
		if(caster.target!=null){
			var tmpBool = caster.distanceToTarget <= caster.radius+150;
			return tmpBool;
		}
		return false;
	}
	onCast(caster){
		TextBubble.Speak(caster, "Rapid Fire!");
		var countdown = (i)=>{
			if(i>0){
				i--;
				if(caster.target!=null){
					addTeamUnit(new ArrowProjectile(caster, caster.degreesToTarget));
					caster.backward();
				}
				setTimeout(function() {
					//1 second later
					countdown(i);
				}, 250);
			}
		};
		countdown(3);
	}
}

class BoomThrow extends Skill_Prototype{
	constructor(){
		super(3);
	}
	condition(caster){
		if(caster.target!=null){
			var tmpBool = caster.distanceToTarget <= caster.radius+130 &&
							caster.distanceToTarget >= caster.radius+30;
			return tmpBool;
		}
		return false;
	}

	onCast(caster){
		if(caster.target!=null){
			addTeamUnit(new BoomProjectile(caster, caster.degreesToTarget, caster.distanceToTarget+caster.radius));
			TextBubble.Speak(caster, "Boom!");
		}
	}
}

class Fireball extends Skill_Prototype{
	constructor(){
		super(5);
	}
	condition(caster){
		if(caster.target!=null){
			var tmpBool = caster.distanceToTarget <= caster.radius+130;
			return tmpBool;
		}
		return false;
	}

	cast(caster){
		this.lastUsed = Date.now();
		caster.applyBuff(new CastingDebuff(caster, 3, this));
	}

	onCast(caster){
		if(caster.target!=null){
			addTeamUnit(new BoomProjectile(caster, caster.degreesToTarget));
			TextBubble.Speak(caster, "Fire Ball!");
		}
	}
}

class KnightDash extends Skill_Prototype{
	constructor(){
		super(5);
	}
	condition(caster){
		if(caster.target!=null && caster.target.isAlive)
			return caster.distanceToTarget <= 50;
		return false;
	}
	onCast(caster){
		if(caster.target!=null){
			var shockwave = new KnightDashShcokwaveProjectile(caster, 15);
			addTeamUnit(shockwave);
			caster.facingDegrees = getDegreesToTarget(caster.pos, caster.target.pos);
			caster.applyBuff(new DashingDebuff(caster, 1, shockwave));
			TextBubble.Speak(caster, "Charrrrrrrrrge!");
			/*
			var audio = new Audio('sfx/100.wav');
			audio.volume = 0.05;
			audio.play();
			*/
		}
	}
}

class Taunt extends Skill_Prototype{
	constructor(){
		super(8);
		this.tmpArr = [];
		this.speechPool = ["Apple is better than Android", "Android is better than Apple"
						, "Java is slow AF", "I go to school by bus"];
	}
	condition(caster){
		this.tmpArr = findTargetBetween(caster, 0, 120);
		return this.tmpArr.length>=1;
	}
	onCast(caster){
 		makeSoundAt('sfx/Suspense 1.wav', 0.05, caster.pos.x);
		caster.applyBuff(new TauntingBuff(caster, 3));
		for(let tar of this.tmpArr){
			var tmpBool = true;
			for(let buff of tar.buffset){
				if(buff instanceof TauntedDebuff){
					tmpBool = false;
					break;
				}
			}
			if(tmpBool)
				tar.applyBuff(new TauntedDebuff(tar, 3, caster));
		}
		var rand = Math.floor(Math.random()*this.speechPool.length);
		TextBubble.Speak(caster, this.speechPool[rand]);
	}
}

class Stealth extends Skill_Prototype{
	constructor(){
		super(4);
	}
	condition(caster){
		if(caster.target!=null && caster.target.isAlive && caster.target.type!="structure")
			return caster.distanceToTarget <= 50;
		return false;
	}
	onCast(caster){
 		makeSoundAt('sfx/Stealth.wav', 0.1, caster.pos.x);
		caster.applyBuff(new StealthBuff(caster, 1));
		TextBubble.Speak(caster, "Disappear...");
	}
}

class LightingChain extends Skill_Prototype{
	constructor(){
		super(5);
	}
	condition(caster){
		if(caster.target!=null){
			var tmpBool = caster.distanceToTarget+caster.target.radius <= caster.radius+250;
			return tmpBool;
		}
		return false;
	}

	cast(caster){
		this.lastUsed = Date.now();
		caster.applyBuff(new CastingDebuff(caster, 3, this));
 		makeSoundAt('sfx/SiphonMana.wav', 0.05, caster.pos.x);
	}

	onCast(caster){
		var chainTarget = findTargetBetween(caster, 0, 300).slice(0, 5);
		if(chainTarget.length>0){
 			makeSoundAt('sfx/PurgeTarget1.wav', 0.05, caster.pos.x);
			addTeamUnit(new LightingChainProjectile(caster, chainTarget, 3));
			TextBubble.Speak(caster, "Lighting Chain!");

			for(let tar of chainTarget){
				tar.onHit(new Damage(caster, 6, 0));
			}
		}
	}
}

class EngineerFix extends Skill_Prototype{
	constructor(){
		super(1);
	}
	condition(caster){
		if(caster.target!=null&&caster.target.type=="structure"){
			var tmpBool = caster.distanceToTarget <= caster.radius+3;
			return tmpBool;
		}
		return false;
	}
	onCast(caster){
		if(caster.target!=null&&caster.target.isAlive&&caster.target.type=="structure"&&caster.target.hp/caster.target.maxHp<1){
			caster.target.onHit(new Damage(caster, -1, 0));
		}
	}
}
//////////////////////////////////////////
//			Projectiles					//
//////////////////////////////////////////
/**
 * The super class of all projectiles
 */
 class Projectile_Prototype extends PhysicsEntity{
 	constructor(owner, ms, a_ms, s_ms, radius, facingDegrees, maxDistance){
		super(owner.pos, owner.team, radius, ms, a_ms);
		this.owner = owner;
 		this.facingDegrees = facingDegrees;
 		this.maxDistance = maxDistance;
		this.setStartSpeed(facingDegrees, s_ms);
		
		this.showShadow = true;
		this.travedDistance = 0;
 	}

 	onUpdate(){
		//walk toward to target
		this.changeVelocityToDegree(this.facingDegrees);
		var prePos = this.pos;
		var nextPos = this.getNextPos();
		this.moveAndCheckCollision(nextPos);
		
		if(this.maxDistance>=0){
			this.travedDistance+=distanceBetween(prePos, this.pos);
			if(this.travedDistance>this.maxDistance){
				this.despawn();
			}
		}
 	}
 	
 	onDraw(){
 		var x = this.pos.x;
 		var y = this.pos.y;
 		if(this.showShadow){
 			drawShadow(this);
 		}
		if(debugTag){
			//draw hitbox
			context.beginPath();
			context.arc(x,y,this.radius,0, 2* Math.PI);			
			context.strokeStyle = getDebugTeamColor(this.team);
			context.stroke();
			
			//draw facing line
			var tmpPos = moveTowardToDegrees(this.pos, this.facingDegrees, this.radius+2);
			context.beginPath();
			context.moveTo(x, y);
			context.lineTo(tmpPos.x, tmpPos.y);
			context.stroke();
		}
		this.drawShape();
 	}

	//////////////////////////////////////////
	//	override the method below only		//
	//////////////////////////////////////////
 	onDespawn(){

 	}

 	onCollision(target){

 	}
 	
 	drawShape(){
 		
 	}
 }

 class AOEProjectile_Prototype extends Projectile_Prototype{
 	constructor(owner, ms, a_ms, s_ms, radius, facingDegrees, maxDistance, hitableCounter){
 		super(owner, ms, a_ms, s_ms, radius, facingDegrees, maxDistance);
 		this.hitableCounter = hitableCounter;

 		this.hittedUnit = new Set();
 	}

	checkInUnit(target){
		this.hittedUnit.add(target);
		if(this.hittedUnit.size>=this.hitableCounter){
			this.despawn();
		}
	}
 }

 class SpearProjectile extends Projectile_Prototype{
 	constructor(pos, team, facingDegrees){
 		//owner, ms, a_ms, s_ms, radius, facingDegrees, maxDistance
 		super(pos, team, 5, 0.2, 0, 2, facingDegrees, 200);
 	}

 	onCollision(target){
 		if(target.onHit!=null&&target.isAlive){
			target.onHit(new Damage(this,2,0));
			this.despawn();
 		}else{
 			
 		}
 	}

 	drawShape(){
 		var x = this.pos.x;
 		var tmpy = this.pos.y - genCurve(6*(this.travedDistance/this.maxDistance), 6);	
		context.translate(x, tmpy);
		context.rotate((90+this.facingDegrees)*Math.PI/180);
		context.beginPath();
		context.moveTo(0,0);
		context.lineTo(0,20);
		context.moveTo(0,0);
		context.lineTo(2,5);
		context.moveTo(0,0);
		context.lineTo(-2,5);
		context.strokeStyle = getTeamColor(this.team);
		context.stroke();
		
	 	context.setTransform(1,0,0,1,0,0);
 	}
 }

 class ArrowProjectile extends Projectile_Prototype{
 	constructor(owner, facingDegrees){
 		//owner, ms, a_ms, s_ms, radius, facingDegrees, maxDistance
 		super(owner, 5, 0.2, 4, 2, facingDegrees, 200);
 		this.applyZ(this.maxDistance, 600);
 	}

 	onCollision(target){
 		if(target.onHit!=null&&target.isAlive){
 			makeSoundAt('sfx/ArrowImpact.wav', 0.05, this.pos.x);
			target.onHit(new Damage(this,1,0));
			this.despawn();
 		}else{
 			
 		}
 	}

 	drawShape(){
 		var x = this.pos.x;
		this.z_process = this.travedDistance;
 		var tmpy = this.getYwithZ();
		context.translate(x, tmpy);
		context.rotate((this.facingDegrees)*Math.PI/180);
		context.beginPath();
		context.moveTo(-4,0);
		context.lineTo(14,0);
		context.lineTo(10,4);
		context.moveTo(14,0);
		context.lineTo(10,-4);
		context.moveTo(-2,0);
		context.lineTo(-4,4);
		context.moveTo(-2,0);
		context.lineTo(-4,-4);
		context.moveTo(-4,0);
		context.lineTo(-6,4);
		context.moveTo(-4,0);
		context.lineTo(-6,-4);
		context.strokeStyle = getTeamColor(this.team);
		context.stroke();
		
	 	context.setTransform(1,0,0,1,0,0);
 	}
 }

 class BoomProjectile extends Projectile_Prototype{
 	constructor(owner, facingDegrees, distanceToTarget){
 		//owner, ms, a_ms, s_ms, radius, facingDegrees, maxDistance, hittedUnit
 		super(owner, 2.5, 0.1, 2.5, 6 , facingDegrees, distanceToTarget, 5);
 		this.bomb = new Bomb();
 		
 		this.applyZ(this.maxDistance, 100);
 	}

 	onCollision(target){
 	}

 	drawShape(){
 		var x = this.pos.x;
		this.z_process = this.travedDistance;
 		var tmpy = this.getYwithZ();
		context.translate(x, tmpy);
		
		this.bomb.onDraw();
		
	 	context.setTransform(1,0,0,1,0,0);
 	}

 	onDespawn(){
 		addTeamUnit(new ExplosionProjectile(this, 0, 5, 1.5, 50));
 	}
 }

 class ExplosionProjectile extends AOEProjectile_Prototype{
 	 constructor(owner, s_radius,  hitableCounter, a_radius, until_radius){
 		//owner, ms, a_ms, s_ms, radius, facingDegrees, maxDistance, hitableCounter
 		super(owner, 0, 0, 0, s_radius , 0, 0, hitableCounter);
 		this.a_radius = a_radius;
 		this.until_radius = until_radius;
 		
 		this.showShadow = false;
 		this.isSpectre = true;

		this.gradient = context.createRadialGradient(0, 0, 0, 0, 0, until_radius);
		this.gradient.addColorStop(0, "rgba(255,255,255,0.5)");
		this.gradient.addColorStop(1, getTeamColor(this.owner.team, true));

		this.layer =1 ;
		
		makeSoundAt('sfx/Explosion.wav', 0.05, this.pos.x);
 	}

 	onUpdate(){
		this.moveAndCheckCollision(this.pos);
		this.radius+=this.a_radius;
		
		if(this.radius>this.until_radius){
		this.a_radius=-this.a_radius;
		this.radius = this.until_radius;
		}
		if(this.radius<0){
			this.despawn();
		}
 	}

 	onCollision(target){
 		if(target.onHit!=null&&target.isAlive&&!this.hittedUnit.has(target)){
			target.onHit(new Damage(this,3,2));
			this.hittedUnit.add(target);
 		}else{
 			
 		}
 	}

 	drawShape(){
 		var x = this.pos.x;
 		var y = this.pos.y;
		context.translate(x, y);
		context.beginPath();
		context.arc(0, 0,this.radius,0, 2* Math.PI);
		context.fillStyle = this.gradient;
		context.fill();
		
	 	context.setTransform(1,0,0,1,0,0);
 	}
 }

 class KnightDashShcokwaveProjectile extends AOEProjectile_Prototype{
	constructor(owner, radius){		
 		//owner, ms, a_ms, s_ms, radius, facingDegrees, maxDistance, hitableCounter
 		super(owner, 0, 0, 0, radius, 0, -1, -1);
		this.showShadow = false;
 		this.isSpectre = true;
	}

	onUpdate(){
		var nextPos = this.owner.pos;
		this.moveAndCheckCollision(nextPos);
	}

 	onCollision(target){
 		if(target.onHit!=null&&target.isAlive&&!this.hittedUnit.has(target)){
 			makeSoundAt('sfx/Punch.mp3', 0.01, this.pos.x);
			target.onHit(new Damage(this,1,5));
			this.hittedUnit.add(target);
 		}else{
 			
 		}
 	}

	onDespawn(){
		
	}


 	drawShape(){
 		var x = this.pos.x;
 		var y = this.pos.y;
		context.translate(x, y);
		context.beginPath();
		context.arc(0, 0,this.radius,0, 2* Math.PI);	
		context.strokeStyle = getTeamColor(this.team);
		context.stroke();
		
	 	context.setTransform(1,0,0,1,0,0);
 	}
 }

 class LightingChainProjectile extends AOEProjectile_Prototype{
  constructor(owner, targets, lifetime){
    //owner, ms, a_ms, s_ms, radius, facingDegrees, maxDistance, hitableCounter
    super(owner, 0, 0, 0, 0, 0, -1, -1);

    this.subLighting = [];
    this.lifetime = lifetime;
    this.bornTime = Date.now();
    this.endTime = Date.now()+1000;
    this.targets = targets;
    
    this.showShadow = false;
    this.isSpectre = true;
    
    var sl = {startTime: Date.now()};
    sl.points = [[]];

    sl.points[0].push({x:0,y:0});
    var preTar = owner;
    var counter = 0;
    for(let tar of targets){
      var distanceToTarget = (distanceBetween(preTar.pos, tar.pos));
      sl.points[counter] = [];
      for(var i = 0; i < 10; i++){
        sl.points[counter].push({x: distanceToTarget/10*i, y:Math.random()*20-10});
      }
      sl.points[counter].push({x: distanceToTarget, y: 0});
      preTar = tar;
      counter++;
    }
    this.subLighting.push(sl);

    this.color = getTeamColor(owner.team);
  }
  
  onUpdate(){
    if(Date.now()>this.endTime){
      this.despawn();
    }
  }

  onCollision(target){
  }


  drawShape(){
    if(Date.now() < this.endTime-200 
    && Date.now() - this.subLighting[this.subLighting.length-1].startTime >100){
      var sl = {startTime: Date.now()};
      var preTar = this.owner;
      var counter = 0;
      sl.points = [[]];
      sl.points[0].push({x:0,y:0});
      for(let tar of this.targets){
        var distanceToTarget = (distanceBetween(preTar.pos, tar.pos));
        sl.points[counter] = [];
        for(var i = 0; i < 10; i++){
          sl.points[counter].push({x: distanceToTarget/10*i, y:Math.random()*20-10});
        }
        sl.points[counter].push({x: distanceToTarget, y: 0});
        preTar = tar;
        counter++;
      }
      this.subLighting.push(sl);
    }
    for(let subLight of this.subLighting){
      if((Date.now()-subLight.startTime)>300)
        continue;
      context.beginPath();
      var alpha = 0.7-(Date.now()-subLight.startTime)/300;
      context.strokeStyle="rgba("+getTeamColorRGB(this.owner.team)+", "+alpha+")";
      var x = this.owner.pos.x;
      var y = this.owner.pos.y;
      var preTar = this.owner;
      var counter = 0;
      for(let tar of this.targets){
        context.translate(x, y);
        context.rotate((getDegreesToTarget(preTar.pos, tar.pos))*Math.PI/180);
        context.moveTo(0,0);
        for(let p of subLight.points[counter]){
          context.lineTo(p.x, p.y);
        }
        context.stroke();
        x = tar.pos.x;
        y = tar.pos.y;
        preTar = tar;
        counter++;
        context.setTransform(1,0,0,1,0,0);
      }
      //context.setTransform(1,0,0,1,0,0);
      context.closePath();
    }

  }
 }

//////////////////////////////////////////
//			Buff / DeBuff				//
//////////////////////////////////////////
class Buff{
	constructor(owner, lifetime){
		this.owner = owner;
		this.lifetime = lifetime;
		this.isBehindBody = true;

		this.bornTime = Date.now();
	}
	onUpdate(){
		if(this.lifetime<0)
			return;
		if(Date.now()>this.bornTime+this.lifetime*1000){
			this.onEnd();
			this.owner.buffset.delete(this);
		}
	}
	onDraw(){

	}
	onCreate(){

	}
	onEnd(){

	}
}

class CastingDebuff extends Buff{
	constructor(owner, lifetime, skill){
		super(owner, lifetime);
		this.skill = skill;

		this.rotation = 0;
		this.onCreate();
		/*
		this.words =[];

		for(var i=0; i<360; i+=20){
			this.words.push ({char:String.fromCharCode(48+Math.floor(78*Math.random())), angle: i});
		}
		*/
	}

	onDraw(){
		var x = this.owner.pos.x;
		var tmpY = this.owner.pos.y+this.owner.radius;	
		context.strokeStyle = context.fillStyle = getTeamColor(this.owner.team);
		context.translate(x,tmpY);
		context.scale(1, 0.5);
		context.rotate((this.rotation)*Math.PI/180);
		context.beginPath();
		context.arc(0, 0,this.owner.radius*2,0, 2* Math.PI);
		context.stroke();
/*
		context.beginPath();
		context.arc(0, 0,this.owner.radius*3,0, 2* Math.PI);	
		context.stroke();
		for(let w of this.words){
			context.rotate((w.angle)*Math.PI/180);
			context.fillText(w.char, 0, -2*this.owner.radius);
			context.rotate((-w.angle)*Math.PI/180);
		}
*/
		drawStar(0, 0, 6, this.owner.radius*2, this.owner.radius, getTeamColor(this.owner.team));
	 	context.setTransform(1,0,0,1,0,0);
	 	this.rotation++;
	 	if(this.rotation>=180)this.rotation = -180;
	}

	onCreate(){
		this.owner.isCasting = true;
		this.owner.getMainHand().handMoveingSpeed = 0;
		this.owner.getMainHand().weapon.isCharging = true;
	}

	onEnd(){
		this.owner.isCasting = false;
		this.owner.getMainHand().handMoveingSpeed = this.owner.handMoveingSpeed;
		this.owner.getMainHand().weapon.isCharging = false;
		this.skill.onCast(this.owner);
	}

}

class DashingDebuff extends Buff{
	constructor(owner, lifetime, destroyProjectile){
		super(owner, lifetime);
		this.dp = destroyProjectile;
		this.onCreate();
	}

	onCreate(){
		this.owner.isDashing = true;
		this.owner.dashingTo = this.owner.degreesToTarget;

		this.pre_ms = this.owner.ms;
		this.owner.ms*=3;
		
		this.pre_a_ms = this.owner.a_ms;
		this.owner.a_ms*=3;

		this.pre_onHit = this.owner.onHit;
		this.owner.onHit = ()=>{
			TextBubble.DamagePoint(this.owner, 0);
		};
	}

	onEnd(){
		if(this.dp!=null)
			this.dp.despawn();
		this.owner.ms=this.pre_ms;
		this.owner.a_ms=this.pre_a_ms;
		this.owner.onHit = this.pre_onHit;
		this.owner.isDashing = false;
	}
}

class TauntingBuff extends Buff{
	constructor(owner, lifetime){
		super(owner, lifetime);
		this.auraRadius = owner.radius;
		this.minRadius = this.auraRadius;
		this.maxRadius = this.minRadius*1.5;
		this.addBool = true;

		this.gradient = context.createRadialGradient(0, 0, this.minRadius, 0, 0, this.maxRadius);
		this.gradient.addColorStop(0, getTeamColor(this.owner.team));
		this.gradient.addColorStop(1, "rgba(255,255,255,0)");

		this.onCreate();
	}

	onDraw(){
		var x = this.owner.pos.x;
		var y = this.owner.pos.y;
		context.translate(x,y);
		context.arc(0, 0,this.auraRadius,0, 2* Math.PI);
		context.fillStyle=this.gradient;
		context.fill();
	 	context.setTransform(1,0,0,1,0,0);

	 	this.auraRadius+= this.addBool?0.5:-0.5;
	 	if(this.auraRadius>=this.maxRadius){
	 		this.addBool = false;
	 	}else if(this.auraRadius<=this.minRadius){
	 		this.addBool = true;
	 	}
	}

	onCreate(){
    
		this.pre_onHit = this.owner.onHit;
		this.owner.onHit = 	(damage)=>{
			//damage.damage*=0.5
			//spawn the damage point text
			TextBubble.DamagePoint(this.owner, damage.damage);

			//do the hp reduce
			this.owner.hp-=damage.damage;

			//check if this unit will die from this damage
			if(this.owner.hp<=0){
				this.owner.despawn();
			}else{
				//if still survive, do knockBack if the damage will
				if(damage.knockBackPower!=0){
					this.owner.applyForce(damage.applyBy, damage.knockBack*0.2);
				}
			}
		}

	}
	onEnd(){
		this.owner.onHit = this.pre_onHit;
	}
}

class TauntedDebuff extends Buff{
	constructor(owner, lifetime, tauntBy){
		super(owner, lifetime);
		this.tauntBy = tauntBy;
		this.isBehindBody = false;

		this.onCreate();
		owner.onHit(new Damage(tauntBy, 1,-5));
	}

	onDraw(){
		var x = this.owner.pos.x+Math.random()*this.owner.radius/3+this.owner.radius/2;
		var tmpY = this.owner.pos.y-this.owner.radius;
		context.translate(x,tmpY);
		context.rotate((Math.random()*30-15)*Math.PI/180);
		context.beginPath();
		context.moveTo(-6, -2);
		context.quadraticCurveTo(0, 0, -2, -6);

		context.moveTo(6, -2);
		context.quadraticCurveTo(0, 0, 2, -6);

		context.moveTo(-6, 2);
		context.quadraticCurveTo(0, 0, -2, 6);


		context.moveTo(6, 2);
		context.quadraticCurveTo(0, 0, 2, 6);
		
		context.lineWidth=2;
		context.strokeStyle="#000000";
		context.stroke();
	 	context.setTransform(1,0,0,1,0,0);		
		context.lineWidth=1;
	}

	onCreate(){
		this.owner.target = this.tauntBy;

		this.pre_targetFindBehavior = this.owner.targetFindBehavior;
		this.owner.targetFindBehavior = ()=>{};
	}

	onEnd(){
		this.owner.targetFindBehavior = this.pre_targetFindBehavior;
	}
}

class StealthBuff extends Buff{
	constructor(owner, lifetime){
		super(owner, lifetime);
		this.onCreate();
	}
	onCreate(){
		this.owner.isSpectre = true;

		this.pre_ms = this.owner.ms;
		this.owner.ms*=2;
		
		this.pre_a_ms = this.owner.a_ms;
		this.owner.a_ms*=3;

		this.pre_applyBuff = this.owner.applyBuff;
		this.owner.applyBuff = (buff)=>{};
		
	}

	onEnd(){
		this.owner.isSpectre = false;

		this.owner.ms = this.pre_ms;
		this.owner.a_ms = this.pre_a_ms;
		this.owner.applyBuff = this.pre_applyBuff ;
	}
}


//////////////////////////////////////////
//			Weapon Shape				//
//////////////////////////////////////////
class WeaponShape_Prototype{
	constructor(){

	}
	onDraw(ctx = context){

	}
}

class Sword extends WeaponShape_Prototype{
	constructor(){
		super();
	}
	onDraw(ctx = context){
		ctx.strokeStyle = "#000000";
		/*
		ctx.moveTo(0, 2);
		ctx.lineTo(0, -12);
		*/
		
		ctx.beginPath();
		ctx.moveTo(1, -2);
		ctx.lineTo(1, -12);
		ctx.lineTo(0, -13);
		ctx.lineTo(-1, -12);
		ctx.lineTo(-1, -2);	
		ctx.lineTo(1, -2);
		ctx.stroke();
		ctx.fillStyle = "#FFFFFF";
		ctx.fill();
		
		ctx.beginPath();
		ctx.moveTo(0, 4);
		ctx.lineTo(0, -2);
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(3, -2);
		ctx.lineTo(-3,-2);
		ctx.stroke();
	}
}

class Pistol extends WeaponShape_Prototype{
	constructor(){
		super();
	}
	onDraw(ctx = context){
		ctx.beginPath();
		ctx.moveTo(0, 2);
		ctx.lineTo(0, -2);
		ctx.lineTo(5, -2);
		ctx.strokeStyle = "#000000";
		ctx.stroke();
	}
}

class Spear extends WeaponShape_Prototype{
	constructor(){
		super();
	}
	onDraw(ctx = context){
		ctx.beginPath();
		ctx.moveTo(0, 10);
		ctx.lineTo(0, -10);
		ctx.lineTo(2, -8);
		ctx.moveTo(0, -10);		
		ctx.lineTo(-2, -8);
		ctx.strokeStyle = "#000000";
		ctx.stroke();
	}	
}

class Bow extends WeaponShape_Prototype{
	constructor(){
		super();
	}
	onDraw(ctx = context){
		ctx.strokeStyle = "#000000";
		ctx.beginPath();
		ctx.moveTo(-5, -10);
		ctx.quadraticCurveTo(10, 0, -5, 10);
		ctx.lineWidth = 1.5;
		ctx.stroke();
		
		ctx.beginPath();
		ctx.moveTo(-5, 10);
		ctx.lineTo(-5, -10);
		ctx.lineWidth = 1;
		ctx.stroke();
		/*
		ctx.beginPath();
		ctx.moveTo(0, 10);
		ctx.lineTo(0, -10);
		ctx.lineTo(-1,-10);
		ctx.lineTo(1,-10);
		ctx.arc(1,0,10,-0.5*Math.PI,-1.5*Math.PI);
		ctx.lineTo(-1,10);
		ctx.lineTo(1,10);
		ctx.moveTo(-4,0);
		ctx.lineTo(14,0);
		ctx.lineTo(13,1);
		ctx.lineTo(12,1);
		ctx.moveTo(14,0);
		ctx.lineTo(13,-1);
		ctx.lineTo(12,-1);
		ctx.moveTo(-2,0);
		ctx.lineTo(-4,4);
		ctx.moveTo(-2,0);
		ctx.lineTo(-4,-4);
		ctx.moveTo(-4,0);
		ctx.lineTo(-6,4);
		ctx.moveTo(-4,0);
		ctx.lineTo(-6,-4);
		*/

	}	
}

class Lance extends WeaponShape_Prototype{
	constructor(){
		super();
	}

	onDraw(ctx = context){
		ctx.fillStyle = "#FFFFFF";
		ctx.strokeStyle = "#000000";
		
		ctx.beginPath();
		ctx.moveTo(0,4);
		ctx.lineTo(0,0);
		ctx.lineTo(-1,0);
		ctx.lineTo(-1,4);
		ctx.lineTo(0,4);
		ctx.fill()
		ctx.stroke();
		

		ctx.beginPath();
		ctx.moveTo(3,-1);
		ctx.lineTo(-4,-1);
		ctx.lineTo(-5,-2);
		ctx.lineTo(-5,-4);
		ctx.lineTo(-3,-4);
		ctx.fill()
		ctx.stroke();
		
		ctx.beginPath();
		ctx.moveTo(3,-1);
		ctx.lineTo(4,-2);
		ctx.lineTo(4,-4);
		ctx.lineTo(2,-4);
		ctx.lineTo(1,-3);
		ctx.lineTo(-2,-3);
		ctx.lineTo(-3,-4);
		ctx.fill()
		ctx.stroke();
		
		ctx.beginPath();
		ctx.moveTo(2,-4);
		ctx.bezierCurveTo(2, -4, 3, -6, 1, -7);
		ctx.lineTo(0,-17);
		ctx.moveTo(2,-4);
		ctx.lineTo(1,-3);
		ctx.lineTo(-2,-3);
		ctx.lineTo(-3,-4);
		ctx.bezierCurveTo(-3, -4, -4, -6, -2, -7);
		ctx.lineTo(0,-17);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	}
}

class Shield extends WeaponShape_Prototype{
	constructor(){
		super();
	}

	onDraw(ctx = context){
		ctx.beginPath();
		ctx.arc(-4,0,7,0,2*Math.PI);
		ctx.fillStyle = "#ffffff";
		ctx.fill();


		ctx.lineWidth = 3;
		ctx.strokeStyle = "#000000";
		ctx.stroke();
		
		ctx.lineWidth = 1;
		
		ctx.beginPath();
		ctx.arc(-4,0,4,0,2*Math.PI);
		ctx.fillStyle = "#000000";
		ctx.fill();
		
	}
}

class Bomb extends WeaponShape_Prototype{
	constructor(){
		super();
	}

	onDraw(ctx = context){
		ctx.beginPath();
		ctx.arc(4,-4,5,0,2*Math.PI);
		ctx.fillStyle = "#000000";
		ctx.fill();
		ctx.moveTo(6,-9);
		ctx.lineTo(6,-11);
		ctx.moveTo(2,-9);
		ctx.lineTo(2,-11);
		ctx.lineTo(6,-11);
		ctx.moveTo(4,-11);
		ctx.lineTo(4,-13);
		ctx.lineTo(2,-14);
		ctx.strokeStyle = "#000000";
		ctx.stroke();

		ctx.fillStyle = "#FE7314";
		ctx.fillRect(2+Math.random()*6-3, -16+Math.random()*6-3, 2, 2);
		ctx.fillRect(2+Math.random()*6-3, -16+Math.random()*6-3, 2, 2);
		ctx.fillRect(2+Math.random()*6-3, -16+Math.random()*6-3, 2, 2);
	}
}

class Dagger extends WeaponShape_Prototype{
	constructor(){
		super();
	}

	onDraw(ctx = context){
		ctx.beginPath();
		ctx.moveTo(0,4);
		ctx.lineTo(0,-7);
		ctx.moveTo(0,0);
		ctx.lineTo(-3,0);
		ctx.lineTo(-3,-3);
		
		
		ctx.moveTo(0,0);
		ctx.lineTo(3,0);
		ctx.lineTo(3,-3);

		ctx.strokeStyle = "#000000";
		ctx.stroke();
	}
}

class MagicStaff extends WeaponShape_Prototype{
	constructor(){
		super();
		var headArr = ["V", "@", "o", "X", "S", "s", "7"];
		this.head = headArr[Math.floor(headArr.length*Math.random())];
		this.headWidth = context.measureText(this.head).width;
		this.particles = [];
		this.lastParticlesTime = Date.now();
		this.isCharging = false;
	}

	onDraw(ctx = context){
		if(this.isCharging && Date.now()-this.lastParticlesTime>50){
			this.particles.push({
				d: 30,
				s: Math.floor(2+5*Math.random()),
				color: "rgba("+Math.floor(255*Math.random())+","+Math.floor(255*Math.random())+","+Math.floor(255*Math.random())+","+(0.5+0.3*Math.random())+")",
				angle: 360*Math.random()*Math.PI/180
			});
			this.lastParticlesTime = Date.now();
		}
		ctx.beginPath();
		ctx.moveTo(0,10);
		ctx.lineTo(0,-10);
		//ctx.quadraticCurveTo(-10,-20,5,-10);

		ctx.strokeStyle =ctx.fillStyle = "#000000";
		ctx.stroke();
		ctx.fillText(this.head,-this.headWidth/2, -5);
		
		ctx.translate(0,-10);
		if(this.isCharging){
			for(var i=0; i<this.particles.length; i++){
				var p = this.particles[i];
				if(p.d>0){
					ctx.fillStyle = p.color;
					ctx.rotate(p.angle);
					ctx.fillRect(0, -p.d, p.s, p.s);
					p.d-=2;
					ctx.rotate(-p.angle);
				}else{
					this.particles.splice(i, 1);
				}
			}
		}else if(this.particles.length>0){
			this.particles = [];
		}
	}
}

//////////////////////////////////////////
//			Menu Thingy					//
//////////////////////////////////////////

function selectUnitType(num){
	if(isPause)
		return;
	//TODO: fung, call this, the preCreateUnit Type should be like 
    // new Warrior({x:0,y:0}, 0);
    var preUnitArr = [new Warrior({ x: 0, y: 0 }, currentTeam), new Archer({ x: 0, y: 0 }, currentTeam), new Knight({ x: 0, y: 0 }, currentTeam), new Bomber({ x: 0, y: 0 }, currentTeam),
        new Mage({ x: 0, y: 0 }, currentTeam), new Giant({ x: 0, y: 0 }, currentTeam), new Assassin({ x: 0, y: 0 }, currentTeam), new Wall({ x: 0, y: 0 }, currentTeam)];
	preCreateUnit = preUnitArr[num];
	preCreateUnit.isSpectre = true;
	preCreateUnit.temp_onUpdate = preCreateUnit.onUpdate;

	if(preCreateUnit.inGrid){
		preCreateUnit.onUpdate = ()=>{
			var cmr = collisionMapResolution;
			var x = Math.floor(lastestMousePos.x/cmr)*cmr + cmr/2;
			var y = Math.floor(lastestMousePos.y/cmr)*cmr + cmr/2;
			preCreateUnit.pos = {x:x, y:y};
		};
	}else{
		preCreateUnit.onUpdate = ()=>{
			preCreateUnit.pos = lastestMousePos;
		};
	}

	preCreateUnit.temp_onDraw = preCreateUnit.onDraw;
	preCreateUnit.onDraw = function(ctx){
		preCreateUnit.drawShape(ctx);
	};
	overlapSet.add(preCreateUnit);
}
function selectUnitTypeByName(name){
	var unitNameToNum = [
	'Warrior',
	'Archer',
	'Knight',
	'Bomber',
	'Mage',
	'Giant',
	'Assassin',
	'Wall'
	]
	selectUnitType(unitNameToNum.indexOf(name));
}

var menuUpdate = function(delta){
	//change money x position since money width may longer
	gameMoney = new MenuText(menu_context,"$"+money,moneyRect.x+moneyRect.width-menu_context.measureText('$'+money).width-9*money.toString().length,95,"25px Arial",'orange');
	gameMoney.onDraw();
/*
	for(i=0;i<=onClickObj.length;i++){
		if(onClickObj[i] instanceof SelectUnitButton && onClickObj[i].isHover){
			//console.log("hover");
			onClickObj[i].onHoverEvent();
		}
	}
	*/ 
	for(let obj of uiObj){
		if(obj.onHoverEvent && obj.isHover)
			obj.onHoverEvent();
	}

	if(Date.now()-previousMoneyUpdate>=1000&&!isPause){
		increaseMoney();
    increaseEnemyMoney(increaseValue);
		previousMoneyUpdate = Date.now();
	}
}

var uiObj = [];
var onClickObj = [];
var money = 100;	//init money = 100
var enemyMoney = 100;
var maxIncreaseUnit = 50;	//maximun increase $20 per second
var constant = 0.05;	//c higher-> increase rate slower
var time=0;
var gameTitle,questionImg,moneyRect,gameMoney,unitTitle,warriorButton,archerButton,knightButton,bomberButton,
	mageButton,giantButton,assassinButton,buildingTitle,wallButton,towerButton,pauseButton,rubbishButton,volumeButton,moneyImg;
var priceArr = [Warrior.COST,Archer.COST,Knight.COST,Bomber.COST,Mage.COST,Giant.COST,Assassin.COST,Wall.COST];
var volumeIncrease=false;

var previousMoneyUpdate = Date.now();

function increaseMoney(){
	money+=Math.round(maxIncreaseUnit*(1-Math.pow((1+time),constant*-1)));
	gameMoney.text='$'+money;
	time++;
}

function increaseEnemyMoney(value){
	enemyMoney+=Math.round(maxIncreaseUnit*(1-Math.pow((1+time),constant*value)));
	time++;
}

function createMenuObj(){
	uiObj.push(gameTitle = new MenuText(menu_context,"FunFing Fight",10,50,"40px Arial","black"));
	//uiObj.push(questionImg = new MenuImg(menu_context,'img/question_icon.png',260,5,35,35,true));
	uiObj.push(moneyRect = new MenuRoundRect(menu_context,55,65,220,40,5,'orange'));
	uiObj.push(unitTitle = new MenuText(menu_context,"Units",115,135,"30px Arial",'gray'));
	uiObj.push(warriorButton = new SelectUnitButton(menu_context,10,145,135,40,5,"Warrior",Warrior.COST,new Sword(),Warrior.HP,2,Warrior.COMBAT_RANGE,Warrior.MS,Warrior.DESCRIPTION));	//hp,damage,range,ms,ability
	uiObj.push(archerButton = new SelectUnitButton(menu_context,155,145,135,40,5,"Archer",Archer.COST,new Bow(),Archer.HP,2,Archer.COMBAT_RANGE,Archer.MS,Archer.DESCRIPTION)); //??
	uiObj.push(knightButton = new SelectUnitButton(menu_context,10,195,135,40,5,"Knight",Knight.COST,new Lance(),Knight.HP,2,Knight.COMBAT_RANGE,Knight.MS,Knight.DESCRIPTION));	//??
	uiObj.push(bomberButton = new SelectUnitButton(menu_context,155,195,135,40,5,"Bomber",Bomber.COST,new Bomb(),Bomber.HP,3,Bomber.COMBAT_RANGE,Bomber.MS,Bomber.DESCRIPTION));
	uiObj.push(mageButton = new SelectUnitButton(menu_context,10,245,135,40,5,"Mage",Mage.COST,new MagicStaff(),Mage.HP,5,Mage.COMBAT_RANGE,Mage.MS,Mage.DESCRIPTION));
	uiObj.push(giantButton = new SelectUnitButton(menu_context,155,245,135,40,5,"Giant",Giant.COST,new Shield(),Giant.HP,0,Giant.COMBAT_RANGE,Giant.MS,Giant.DESCRIPTION));
	uiObj.push(assassinButton = new SelectUnitButton(menu_context,10,295,135,40,5,"Assassin",Assassin.COST,new Dagger(),Assassin.HP,3,Assassin.COMBAT_RANGE,Assassin.MS,Assassin.DESCRIPTION));
	uiObj.push(buildingTitle = new MenuText(menu_context,"Buildings",100,385,"30px Arial",'gray'));
	uiObj.push(wallButton = new SelectUnitButton(menu_context,10,395,135,40,5,"Wall",Wall.COST,new WallUnit(),Wall.HP,null,null,null,Wall.DESCRIPTION));
	//uiObj.push(towerButton = new SelectUnitButton(menu_context,155,395,135,40,5,"Tower",170,null,null,null,null,null,null));
	uiObj.push(volumeButton = new VolumeButton(overlap_context,840,580,40,40,false));
	uiObj.push(rubbishButton = new RubbishBin(menu_context,220,510,50,50));
	uiObj.push(moneyImg = new UnicodeImage(menu_context,5,100,40,40,"\uD83D\uDCB0"));
	uiObj.push(exitButton = new RoundButton(menu_context,210,550,70,30,5,"Exit","#fc1400"));
	uiObj.push(pauseButton = new RoundButton(menu_context,20,550,90,30,5,"Pause","#6da208"));
	console.log(moneyImg);
	setupMenuOnClick();
}

function setupMenuOnClick(){

/*
	questionImg.onClickEvent = ()=>{
		console.log('click question');
	}
*/
	for(i=0;i<onClickObj.length-1;i++)
		onClickObj[i].onClickEvent = ()=>{
			if(money>=priceArr[i]){
				if(preCreateUnit!=null){
					overlapSet.delete(preCreateUnit);
				}
				selectUnitType(i);
				console.log('added preCreateUnit');
			}
		}
	
	pauseButton.onClickEvent = ()=>{
		triggerPause();
	}

	exitButton.onClickEvent = () =>{
		var r = confirm("Are you sure to exit the game?");
		if (r == true) {
			close();
		}
	}
	
	rubbishButton.onClickEvent = () =>{
		if(preCreateUnit!=null){
			TextBubble.DamagePoint(preCreateUnit, "Noooooo", true);
			overlapSet.delete(preCreateUnit);
			preCreateUnit=null;
		}
	}

	rubbishButton.onHoverEvent = ()=>{
		if(preCreateUnit!=null&&Date.now()>lastPreCreateUnitSpeakTime+preCreateUnitSpeakPeriod-2000*Math.random()){
			var rand = Math.floor(Math.random()*preCreateUnitHelpSpeech.length);
			TextBubble.Speak(preCreateUnit, preCreateUnitHelpSpeech[rand], true);
			lastPreCreateUnitSpeakTime = Date.now();
		}
	}

	volumeButton.onClickEvent = () =>{
		console.log('onclick volume');
		if(audioRadio==1||audioRadio==0)
			volumeIncrease=!volumeIncrease;
		switch(audioRadio){
			case 0: audioRadio=0.25; volumeIncrease=true;break;
			case 0.25: if(volumeIncrease){audioRadio=0.5;}
						else{audioRadio=0;}break;
			case 0.5: if(volumeIncrease){audioRadio=1;}
						else{audioRadio=0.25;}break;
			case 1: audioRadio=0.5; volumeIncrease=false; break;
		}
		if(bgm!=null){
			bgm.volume=0.05*audioRadio;
		}
	}

}

class WallUnit{
	constructor(){
		this.dots = [];
		var x = 80;
		var y = 420;
		var r = 10;

		this.dots = [];
		for(var i=0; i<5*Math.random(); i++){
			var w = Math.floor(5+5*Math.random());
			var h = Math.floor(5+5*Math.random());
			this.dots.push({
				x:Math.floor((r*2-w)*Math.random()),
				y:Math.floor((r*2-h)*Math.random()),
				w:w,
				h:h
			});
		}
	}
	
	onDraw(){
		var ctx=menu_context;
		var x = 80;
		var y = 420;
		var r = 10;

		ctx.beginPath();
		ctx.fillStyle = "#AAAAAA";
		ctx.strokeStyle = "black";
		ctx.fillRect(x-r, y-r, r*2, r*2);
		ctx.strokeRect(x-r, y-r, r*2, r*2);

		ctx.fillStyle = "rgba(100,100,100,0.2)";
		ctx.strokeStyle = "rgba(0,0,0,0.2)";
		for(let dot of this.dots){
			ctx.fillRect(x-r+dot.x, y-r+dot.y, dot.w, dot.h);
			ctx.strokeRect(x-r+dot.x, y-r+dot.y, dot.w, dot.h);
		}
		ctx.closePath();
	}
}

var menuDraw = function(){
	menu_context.clearRect(0,0, menu.width, menu.height);
	for(i=0;i<uiObj.length;i++)
		uiObj[i].onDraw();
	menuUpdate();
}

function isInside(pos, rect,inMenu){
	if(inMenu)
		return pos.x > rect.x+900 && pos.x < rect.x+900+rect.width && pos.y < rect.y+rect.height && pos.y > rect.y;
	else
		return pos.x > rect.x && pos.x < rect.x+rect.width && pos.y < rect.y+rect.height && pos.y > rect.y;
}

class MenuObj{
	constructor(x,y,w,h){
		this.rect = {x:x, y:y, width:w, height:h};
		this.x=x; this.y=y; this.width=w; this.height=h;
		this.isHover=false;
	}
}

class MenuImg extends MenuObj{
	constructor(canvas,path,x,y,w,h,canClick){
		super(x,y,w,h);
		this.img=document.createElement("IMG");
		this.canvas=canvas;
		this.path=path;
		if(canClick)
			onClickObj.push(this);
	}

	onDraw(){
		this.img.src = this.path;
		this.canvas.drawImage(this.img,this.x,this.y,this.width,this.height);
	}
}

class MenuText extends MenuObj{
	constructor(canvas,text,x,y,font,color){
		var w=canvas.measureText(text).width;
		var h=canvas.measureText(text).height;
		super(x,y,w,0);
		this.font=font;
		this.color=color;
		this.canvas=canvas;
		this.text=text;
	}

	onDraw(){
		this.canvas.beginPath();
		this.canvas.font = this.font;
		this.canvas.fillStyle = this.color;
		this.canvas.fillText(this.text,this.x,this.y);
		this.canvas.closePath();
	}
}

class MenuRoundRect extends MenuObj{
	constructor(canvas,x,y,w,h,r,color){
		super(x,y,w,h);
		this.canvas=canvas;
		this.r=r;
		this.color=color;
	}

	onDraw(){
		this.canvas.beginPath();
		this.canvas.moveTo(this.x+this.r, this.y);
		this.canvas.lineTo(this.x+this.width-this.r, this.y);
		this.canvas.quadraticCurveTo(this.x+this.width, this.y, this.x+this.width, this.y+this.r);
		this.canvas.lineTo(this.x+this.width, this.y+this.height-this.r);
		this.canvas.quadraticCurveTo(this.x+this.width, this.y+this.height, this.x+this.width-this.r, this.y+this.height);
		this.canvas.lineTo(this.x+this.r, this.y+this.height);
		this.canvas.quadraticCurveTo(this.x, this.y+this.height, this.x, this.y+this.height-this.r);
		this.canvas.lineTo(this.x, this.y+this.r);
		this.canvas.quadraticCurveTo(this.x, this.y, this.x+this.r, this.y);
		this.canvas.strokeStyle = this.color;
		this.canvas.stroke();

		this.canvas.closePath();
	}
}

class VolumeButton extends MenuObj{
	constructor(canvas,x,y,w,h){
		super(x,y,w,h);
		this.rect = {x:x-11, y:y-30, width:w, height:h};
		this.canvas=canvas;
		this.image="\uD83D\uDD0A";
	}

	onDraw(){
		this.canvas.beginPath();		
		this.canvas.fillStyle='#757575';
		this.canvas.rect(840,555,10,20);
		this.canvas.fill();
		this.canvas.lineWidth=2;
		this.canvas.strokeStyle='black';
		this.canvas.stroke();
		this.canvas.closePath();
		this.canvas.beginPath();
		this.canvas.moveTo(850,555);
		this.canvas.lineTo(865,545);
		this.canvas.lineTo(865,585);
		this.canvas.lineTo(850,575);
		this.canvas.lineTo(850,555);
		this.canvas.closePath();
		this.canvas.fillStyle='#C0C0C0';
		this.canvas.fill();
		this.canvas.strokeStyle='black';
		this.canvas.stroke();
		this.canvas.beginPath();
		this.canvas.fillStyle='#00cbff';
		switch(audioRadio){
			case 0.25:
				this.canvas.rect(870,555,5,20);
				this.canvas.fill();
				break;
			case 0.5:
				this.canvas.rect(870,555,5,20);
				this.canvas.fill();
				this.canvas.rect(880,550,5,28);
				this.canvas.fill();
				break;
			case 1:
				this.canvas.rect(870,555,5,20);
				this.canvas.fill();
				this.canvas.rect(880,550,5,28);
				this.canvas.fill();
				this.canvas.rect(890,545,5,37);
				this.canvas.fill();
				break;
			
		}
		this.canvas.strokeStyle='black';
				this.canvas.stroke();
		this.canvas.closePath();
	}
}


class RoundButton extends MenuObj{
	constructor(canvas,x,y,w,h,r,text,color){
		super(x,y,w,h);
		this.canvas=canvas;
		this.r=r;
		this.text=text;
		this.color=color;
		onClickObj.push(this);
	}

	onDraw(){
		 this.canvas.beginPath();
		 this.canvas.rect(this.x, this.y, this.width, this.height); 
		 this.canvas.fillStyle = '#FFFFFF'; 
		 if(this.text=="Exit")
		 	this.canvas.fillStyle = 'rgba(248,135,125,0.5)';
		 else
		 	this.canvas.fillStyle = 'rgba(210,221,189,0.5)';
		 this.canvas.fill(); 
		 this.canvas.strokeStyle = this.color; 
		 this.canvas.stroke();
		 this.canvas.font = '15pt Gulim';
		 this.canvas.fillStyle = this.color;
		 this.canvas.fillText(this.text, this.x+18, this.y+23);
		 this.canvas.closePath();
	}
}

class UnicodeImage extends MenuObj{
	constructor(canvas,x,y,w,h,code){
		super(x,y,w,h);
		//console.log(this.rect)
		this.canvas=canvas;
		this.code=code;
	}
	onDraw(){
		this.canvas.save();
		this.canvas.font = '30pt Gulim';
		this.canvas.fillStyle = '#000000';
		this.canvas.fillText(this.code, this.x, this.y);
		this.canvas.restore();
	}
}

class RubbishBin extends MenuObj{
	constructor(canvas,x,y,w,h){
		super(x,y,w,h);
		this.canvas=canvas;
		this.rect = {x:x-11, y:y-30, width:w, height:h};
		onClickObj.push(this);
	}
	onDraw(){
		if(preCreateUnit==null) return;
		this.canvas.beginPath();
		this.canvas.moveTo(225,475);
		this.canvas.bezierCurveTo(225,485,255,485,255,475);
		this.canvas.lineTo(255,515);
		this.canvas.bezierCurveTo(255,525,225,525,225,515);
		this.canvas.lineTo(225,475);
		this.canvas.fillStyle='#C0C0C0';
		this.canvas.fill();
		this.canvas.strokeStyle='black';
		this.canvas.stroke();
		this.canvas.closePath();
		this.canvas.beginPath();
		this.canvas.moveTo(255,475);
		this.canvas.bezierCurveTo(255,465,225,465,225,475);
		this.canvas.bezierCurveTo(225,485,255,485,255,475);
		this.canvas.fillStyle='#757575';
		this.canvas.fill();
		this.canvas.moveTo(230,480);
		this.canvas.lineTo(230,515);
		this.canvas.moveTo(237,481);
		this.canvas.lineTo(237,518);
		this.canvas.moveTo(245,481);
		this.canvas.lineTo(245,517);
		this.canvas.moveTo(250,480);
		this.canvas.lineTo(250,515);
		this.canvas.strokeStyle='black';
		this.canvas.stroke();
	}
}

class SelectUnitButton extends MenuObj{
	constructor(canvas,x,y,w,h,r,titleText,cost,weaponObj,hp,damage,range,ms,ability){
		super(x,y,w,h);
		this.canvas=canvas;
		this.r=r;
		this.titleText=titleText;
		this.cost=cost;
		this.rectColor='green';
		this.weaponObj=weaponObj;
		this.hp=hp;
		this.damage=damage;
		this.range=range;
		this.ms=ms;
		this.ability=ability;
		this.objArr =[];
		this.objArr.push(new MenuRoundRect(this.canvas,this.x,this.y,this.width,this.height,this.r,this.rectColor));
		this.objArr.push(new MenuText(this.canvas,this.titleText,this.x+5,this.y+this.height-5,"17px Arial","black"));
		this.objArr.push(new MenuText(this.canvas,"$"+this.cost,this.x+this.width-this.canvas.measureText("$"+this.cost).width-15,this.y+this.height-5,"15px Arial","black"));
		this.objArr.push(weaponObj);
		onClickObj.push(this);
	}

	onDraw(){
		for(let obj of this.objArr){
			if(obj==this.weaponObj)
				drawWeaponImg(obj,this.canvas,this.x-40,this.y+10,this.titleText,false);
			else
				obj.onDraw();
		}
		if(money<this.cost)
			redRect(menu_context,this.x,this.y,this.width,this.height);
	}

	onHoverEvent(canvas){
		unitDescriptBox(overlap_context,930,this.y+this.height+5,255,200,5,'#959595',this.titleText,this.imageSrc,this.hp,this.damage,this.range,this.ms,this.ability,this.weaponObj);
	}
}

function redRect(canvas,x,y,w,h){
	var r=5;
	canvas.beginPath();
	canvas.moveTo(x+r,y);
	canvas.lineTo(x+w-r,y);
	canvas.quadraticCurveTo(x+w,y,x+w,y+r);
	canvas.lineTo(x+w,y+h-r);
	canvas.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
	canvas.lineTo(x+r,y+h);
	canvas.quadraticCurveTo(x,y+h,x,y+h-r);
	canvas.lineTo(x,y+r);
	canvas.quadraticCurveTo(x,y,x+r,y);
	canvas.strokeStyle = 'red';
	canvas.stroke();
	canvas.moveTo(x,y);
	canvas.lineTo(x+w,y+h);
	canvas.moveTo(x+w,y);
	canvas.lineTo(x,y+h);
	canvas.strokeStyle='red';
	canvas.stroke();
	canvas.closePath();
}

function unitDescriptBox(canvas,x,y,width,height,r,color,jobTitle,jobImg,hp,damage,range,ms,ability,weaponObj){	
	if(jobTitle=="Wall"||jobTitle=="Tower")
		height=130;
	//console.log('hover');
	var imgArr = [];
	canvas.beginPath();
	canvas.moveTo(x+r, y);
	canvas.lineTo(x+width-r, y);
	canvas.quadraticCurveTo(x+width, y, x+width, y+r);
	canvas.lineTo(x+width, y+height-r);
	canvas.quadraticCurveTo(x+width, y+height, x+width-r, y+height);
	canvas.lineTo(x+r, y+height);
	canvas.quadraticCurveTo(x, y+height, x, y+height-r);
	canvas.lineTo(x, y+r);
	canvas.quadraticCurveTo(x, y, x+r, y);
	canvas.strokeStyle = color;
	canvas.stroke();
	canvas.fillStyle = 'rgba(299,299,299,0.8)';
	canvas.fill();
	canvas.font = "bold 25px Arial";
	canvas.fillStyle = "black";
	canvas.fillText(jobTitle,x+10,y+25);
	//imgArr.push(new MenuImg(canvas,jobImg,x+15+canvas.measureText(jobTitle).width,y,30,30));
	imgArr.push(new MenuImg(canvas,"img/health.png",x+135,y+35,15,15));
	if(jobTitle!="Wall"&&jobTitle!="Tower"){
		imgArr.push(new MenuImg(canvas,"img/damge.png",x+135,y+60,15,15));
		imgArr.push(new MenuImg(canvas,"img/range.png",x+135,y+85,15,15));
		imgArr.push(new MenuImg(canvas,"img/movementspeed.png",x+135,y+110,15,15));
		imgArr.push(new MenuImg(canvas,"img/ab.png",x+135,y+135,15,15));
	}else
		imgArr.push(new MenuImg(canvas,"img/ab.png",x+135,y+60,15,15));
	imgArr.push(weaponObj);
	canvas.font = "15px Arial";
	canvas.fillText("Health",x+10,y+50);
	if(jobTitle!="Wall"&&jobTitle!="Tower"){
		canvas.fillText("Damage",x+10,y+75);
		canvas.fillText("Attack Range",x+10,y+100);
		canvas.fillText("Movement Speed",x+10,y+125);
	}
	if(jobTitle!="Wall"&&jobTitle!="Tower")
		canvas.fillText("Description",x+10,y+150);
	else
		canvas.fillText("Description",x+10,y+75);
	canvas.fillText(":"+hp,x+150,y+50);
	if(jobTitle!="Wall"&&jobTitle!="Tower"){
		canvas.fillText(":"+damage,x+150,y+75);
		canvas.fillText(":"+range,x+150,y+100);
		canvas.fillText(":"+ms,x+150,y+125);
	}
	if(jobTitle!="Wall"&&jobTitle!="Tower")
		canvas.fillText(":",x+150,y+150);
	else
		canvas.fillText(":",x+150,y+75);
	canvas.font = "13px Arial";
	if(ability!=null){
		var abilityArr = ability.split('\n');
		if(jobTitle!="Wall"&&jobTitle!="Tower")
			canvas.fillText(abilityArr[0],x+10,y+170);
		else
			canvas.fillText(abilityArr[0],x+10,y+95);
		if(abilityArr.length>1)
			if(jobTitle!="Wall"&&jobTitle!="Tower")
				canvas.fillText(abilityArr[1],x+10,y+190);
			else
				canvas.fillText(abilityArr[1],x+10,y+115);
	}
	for(let obj of imgArr){
		drawWeaponImg(obj,canvas,x,y,jobTitle,true);
	}
	canvas.closePath();
}

function drawWeaponImg(obj,canvas,x,y,jobTitle,isHover){
	if(obj instanceof WeaponShape_Prototype){
		if(obj instanceof Sword){
			if(!isHover)
				y-=5;
			canvas.translate(x+70+canvas.measureText(jobTitle).width,y+25);
			canvas.scale(2,2);
			canvas.rotate(45*Math.PI/180);
		}
		else if(obj instanceof Bow){
			if(!isHover)
				y-=5;
			canvas.translate(x+75+canvas.measureText(jobTitle).width,y+12);
			canvas.scale(1.7,1.7);
			canvas.rotate(-40*Math.PI/180);	
		}
		else if(obj instanceof Lance){
			canvas.translate(x+70+canvas.measureText(jobTitle).width,y+20);
			canvas.scale(1.5,1.5);
			canvas.rotate(45*Math.PI/180);
		}
		else if(obj instanceof Bomb){
			canvas.translate(x+60+canvas.measureText(jobTitle).width,y+15);
			canvas.scale(1.5,1.5);
			canvas.rotate(45*Math.PI/180);
		}
		else if(obj instanceof MagicStaff){
			canvas.translate(x+80+canvas.measureText(jobTitle).width,y+15);
			canvas.scale(1.5,1.5);
			canvas.rotate(45*Math.PI/180);
		}
		else if(obj instanceof Shield){
			canvas.translate(x+80+canvas.measureText(jobTitle).width,y+20);
			canvas.scale(1.6,1.6);
			canvas.rotate(45*Math.PI/180);
		}
		else if(obj instanceof Dagger){
			if(!isHover){
				x-=20;
			}
			canvas.translate(x+80+canvas.measureText(jobTitle).width,y+15);
			canvas.scale(2.5,2.5);
			canvas.rotate(45*Math.PI/180);
		}
		obj.onDraw(canvas);
		canvas.setTransform(1,0,0,1,0,0);
	}else if(obj!=null)
		obj.onDraw();
	
}
