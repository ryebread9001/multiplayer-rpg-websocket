const socket = io('', {transports: ['websocket']});

let players = [];
let clientArrows = {};
let clientPlayers = {};
let plats = [];
let sprites = [];
let clientPlayerId = "Unknown Player";
let canShoot = true;

const messages = document.getElementById("messages");
const chatInput = document.getElementById("chat-input");
const chatSubmit = document.getElementById("chat-submit");
const chatForm = document.getElementById("chat-form");

function sendMsg() {
	console.log("chatSubmit: ", chatSubmit);
	let obj = {}
	obj.msg = chatInput.value;
	socket.emit("chat", obj);
	chatInput.value = "";
}

chatSubmit.addEventListener("click", (e)=>{
	e.preventDefault();
	sendMsg();
}, false);

chatForm.addEventListener('submit', (e) => {
	e.preventDefault();
	sendMsg();
}, false);

socket.on("connect", () => {
	console.log("connected", socket.id);
	clientPlayerId = socket.id;
})
 
socket.on("map", (map) => {
	plats = map;
	for (var i = 0; i < plats.length; i++) {
		let x = plats[i].x;
		let y = plats[i].y;
		let w = plats[i].w;
		let h = plats[i].h;
		let type = plats[i].type;
		let color = plats[i].color;

		plats[i] = new Platform(x, y, w, h, color, type);
	}
})

socket.on("playerDisconnect", (disconnectedID) => {
	console.log("player Disconnect ", disconnectedID);
	clientPlayers =  Object.keys(clientPlayers).filter(id =>
		id !== disconnectedID).reduce((newObj, id) =>
		{
			newObj[id] = clientPlayers[id];
			return newObj;
		}, {}
	);
	console.log(clientPlayers);
})

socket.on("newChat", (chat) => {
	let newChatSpan = document.createElement('p');
	newChatSpan.innerText = chat.name + ": " + chat.msg;
	messages.appendChild(newChatSpan);
	if (messages.children.length > 6) {
		messages.children[0].remove();
	}
	//messages.appendChild(document.createElement('br'));
})

socket.on("players", (serverPlayers) => {
	for (var i = 0; i < serverPlayers.length; i++) {
		if (!(serverPlayers[i].id in clientPlayers)) {
			clientPlayers[serverPlayers[i].id] = new Player(500-(playerSize/2), 500-(playerSize/2), 0, 0, 'red', serverPlayers[i].id)
		} else {
			clientPlayers[serverPlayers[i].id].updateFromServer(serverPlayers[i]);
		}

		if (serverPlayers[i].id == socket.id) {
			score.innerText = serverPlayers[i].score;
		}
	}
	let numActive = Object.keys(clientPlayers).length;
	activePlayers.innerText = numActive;
})

socket.on("arrows", (serverArrows) => {
	serverArrows.forEach((arw) => {
		if (!(arw.id in clientArrows)) {
			clientArrows[arw.id] = new Arrow(arw.x, arw.y, arw.w, arw.h, arw.dir, arw.id);
		} else if (arw.dead) {
			delete clientArrows[arw.id];
		} else {
			clientArrows[arw.id].updateFromServer(arw);
		}
	})
})

var canvas = document.getElementById("imgCanvas");
var context = canvas.getContext("2d");
canvas.width = 1000;
canvas.height = 1000;
let width = canvas.width;
let height = canvas.height;

let player = document.getElementById('player'); // image refs
let cliff = document.getElementById('cliff');
let grass = document.getElementById('grass');
let grass2 = document.getElementById('grass2');
let grass3 = document.getElementById('grass3');
let grass4 = document.getElementById('grass4');
let arrowR = document.getElementById('arrowR');
let arrowL = document.getElementById('arrowL');
let arrowU = document.getElementById('arrowU');
let arrowD = document.getElementById('arrowD');
let skull = document.getElementById('skull');
const activePlayers = document.getElementById('active-players');
const score = document.getElementById('score');
const usernameInput = document.getElementById("username-input");


usernameInput.addEventListener("keyup", (e) => {
	clientPlayers[clientPlayerId].name = usernameInput.value;
	socket.emit("name", usernameInput.value);
})

const controlMapper = {
	'main' : { left: false, up: false, right: false, down: false },
	'second' : { left: false, up: false, right: false, down: false }
}
const friction = 0.75;
let tileNum = 25;
let tileSize = width / tileNum;
const playerSize = tileSize-1;
const walkingSpeed = 0.7;

const scale = 1;
const pWidth = playerSize;
const pHeight = playerSize;
const scaledWidth = scale * pWidth;
const scaledHeight = scale * pHeight;

const cycleLoop = [0, 1, 0, 2];

function Sprite(x, y, w, h, img) {
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.img = img;
	this.drawSprite = function() {
		context.drawImage(img,
			0, 0, this.w, this.h,
			this.x-(this.w/2), this.y-(this.h/2), this.w, this.h);
	}
}

function Player(x, y, xSpeed, ySpeed, color, playerID) {

	this.xSpeed = xSpeed;
	this.ySpeed = ySpeed;
	this.size = playerSize;
	this.xCenter = x + (this.size/2);
	this.yCenter = y + (this.size/2)
  	this.color = color;
	this.playerID = playerID;
	this.canJump = true;
	this.colFrame - false;
	this.dir = 0;
	this.cycle = 0;
	this.frameCount = 0;
	this.name = "";
	this.dead = false;
	this.previousXCenter;
	this.previousYCenter;

	this.drawCharacter = function() {
		context.fillStyle = this.color;
		context.fillRect(this.xCenter-(this.size/2), this.yCenter-(this.size/2), this.size, this.size);
	}

	this.drawFrame = function() {
		this.frameCount++;
		
		if (this.frameCount%5==0) {
			if (Math.abs(this.xSpeed) > 0.5 || Math.abs(this.ySpeed) > 0.5) {
				if (this.cycle == 3) {
					this.cycle = 0;
				} else {
					this.cycle++;
				}
			} else {
				this.cycle = 0;
			}
		}
		

		context.drawImage(player,
		cycleLoop[this.cycle] * this.size/1.2, this.dir * this.size * 0.93, this.size*0.75, this.size*0.97,
		this.xCenter-(this.size/2), this.yCenter-(this.size/2), this.size, this.size);
	}

	this.drawName = function() {
		context.font = "small-caps 16px sans-serif";
		context.textAlign = "center"
  		context.fillText(this.name, this.xCenter-this.size/4, this.yCenter-this.size*0.75);
	}

	this.updateFromServer = function(serverPlayer) {
		this.previousXCenter = this.xCenter;
		this.previousYCenter = this.yCenter;
		this.xCenter = serverPlayer.xCenter;
		this.yCenter = serverPlayer.yCenter;
		this.xSpeed = serverPlayer.xSpeed;
		this.ySpeed = serverPlayer.ySpeed;
		this.dir = serverPlayer.dir;
		this.score = serverPlayer.score;
		this.dead = serverPlayer.dead;
		if (serverPlayer.name) this.name = serverPlayer.name;
	}

  	this.update = function() {	
		this.drawFrame();
		this.drawName();
	}
}

function Arrow(x, y, w, h, dir) {
	this.x = x;
	this.y = y;
	this.dir = dir;
	this.w = w;
	this.h = h;

	if (this.dir == 0) {
		this.drawImage = ()=>context.drawImage(arrowD,
			0, 0, this.w, this.h,
			this.x-(this.w/2), this.y-(this.h/2), this.w*2.5, this.h*2);
	} else if (this.dir == 1) {
		this.drawImage = ()=>context.drawImage(arrowU,
			0, 0, this.w, this.h,
			this.x-(this.w/2), this.y-(this.h/2), this.w*2.5, this.h*2);
	} else if (this.dir == 2) {
		this.drawImage = ()=>context.drawImage(arrowL,
			0, 0, this.w, this.h,
			this.x-(this.w/2), this.y-(this.h/2), this.w*2.5, this.h*2);
	} else if (this.dir == 3) {
		this.drawImage = ()=>context.drawImage(arrowR,
			0, 0, this.w, this.h,
			this.x-(this.w/2), this.y-(this.h/2), this.w*2.5, this.h*2);
	}

	this.updateFromServer = function(serverArrow) {
		this.x = serverArrow.x;
		this.y = serverArrow.y;
	}

	this.draw = function() {
		// context.fillStyle = 'red';
		// context.fillRect(this.x-(this.w/2), this.y-(this.h/2), this.w, this.h);
		// if (this.dir == 0) {
		// 	context.drawImage(arrowD,
		// 		0, 0, this.w, this.h,
		// 		this.x-(this.w/2), this.y-(this.h/2), this.w*2.5, this.h*2);
		// } else if (this.dir == 1) {
		// 	context.drawImage(arrowU,
		// 		0, 0, this.w, this.h,
		// 		this.x-(this.w/2), this.y-(this.h/2), this.w*2.5, this.h*2);
		// } else if (this.dir == 2) {
		// 	context.drawImage(arrowL,
		// 		0, 0, this.w, this.h,
		// 		this.x-(this.w/2), this.y-(this.h/2), this.w*2.5, this.h*2);
		// } else if (this.dir == 3) {
		// 	context.drawImage(arrowR,
		// 		0, 0, this.w, this.h,
		// 		this.x-(this.w/2), this.y-(this.h/2), this.w*2.5, this.h*2);
		// }
		this.drawImage()
	}
}

function Platform(x, y, w, h, color, type) {
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.color = color;
	this.type = type;

	this.drawPlatform = function() {
		//context.fillStyle = this.color;
		//context.fillRect(this.x-(this.w/2), this.y-(this.h/2), this.w, this.h);
		context.drawImage(cliff,
			0, 0, this.w, this.h,
			this.x-(this.w/2), this.y-(this.h/2), this.w*2.5, this.h*2);

	}

	this.draw = function() {
		if (this.type == 'trigger') {

		} else {
			this.drawPlatform();
		}
	}
}

function drawPlats(plats) {
	for (var i = 0; i < plats.length; i++) {
		plats[i].update();
	}
}

function drawIterable(iter) {
	for (var i = 0; i < iter.length; i++) {
		iter[i].draw();
	}
}

function drawGrass() {
	let randomGrass = [grass, grass2, grass3, grass4];
	for (var i = 0; i < width/tileNum; i++) {
		for (var j = 0; j < height/tileNum; j++) {
			let random = getRandomInt(0, randomGrass.length-1);
			if (i == 12 || j == 12) {
				context.drawImage(randomGrass[3],
					0, 0, 76, 76,
					i*tileSize, j*tileSize, 76, 76)
			} else {
				context.drawImage(grass,
					0, 0, 76, 76,
					i*tileSize, j*tileSize, 76, 76);
			}
		}
	}
}

function distance2D(x1, y1, x2, y2) {
	let a = x1-x2;
	let b = y1-y2;
	return Math.floor(Math.sqrt(a*a + b*b))
}

function draw() {
	context.clearRect(0, 0, width, height);
	drawGrass();
	if (sprites.length > 5) {
		sprites = sprites.slice(1, sprites.length-1)
	}
	sprites.forEach((sprt)=>{
		sprt.drawSprite();
	})
	if (plats.length > 0) drawIterable(plats);
	if (Object.keys(clientArrows).length > 0) {
		for (const arw in clientArrows) {
			clientArrows[arw].draw();
		}
	}
	if (Object.keys(clientPlayers).length > 0) {
		for (const player in clientPlayers) {
			let curr = clientPlayers[player]
			curr.update();
			if (distance2D(curr.xCenter, curr.yCenter, curr.previousXCenter, curr.previousYCenter) > 10) {
				sprites.push(new Sprite(curr.previousXCenter, curr.previousYCenter, 39, 39, skull));
				//curr.dead = false;
			}

		}
	}
	
}

document.body.onload = function() {
  function gameLoop() {
    draw();
    window.requestAnimationFrame(gameLoop);
  }
  window.requestAnimationFrame(gameLoop);
};

function getRandomInt(min,max) {
    return Math.floor((Math.random()*max)+min);
}

function keyPressedHandler(event) {
	//if (event.repeat) return;
	if (chatInput != document.activeElement && usernameInput != document.activeElement && canShoot) {
		console.log("keyPressed")
		if (event.keyCode === 32) {
			console.log("shoot")
			controlMapper.main.shoot = true;
			canShoot = false;
			socket.emit('inputs', controlMapper.main);
			controlMapper.main.shoot = false;
			document.onkeypress = null;
		}
	}
}

function keyDownHandler(event) {
	let inputsToSend = [39, 68, 37, 65, 40, 83, 38, 87];
	if (chatInput != document.activeElement && usernameInput != document.activeElement) {
		if (event.keyCode === 39 || event.keyCode === 68) {
			controlMapper.main.right = true;
			
		} else if (event.keyCode === 37 || event.keyCode === 65) {
			controlMapper.main.left = true;
		}
		if (event.keyCode === 40 || event.keyCode === 83) {
			controlMapper.main.down = true;
		} else if (event.keyCode === 38 || event.keyCode === 87) {
			controlMapper.main.up = true;
		}
		
		if (inputsToSend.includes(event.keyCode)) {
			controlMapper.main.shoot = false;
			socket.emit('inputs', controlMapper.main);
		}
	}
}

function keyUpHandler(event) {
	let inputsToSend = [32, 39, 68, 37, 65, 40, 83, 38, 87];
	if (chatInput != document.activeElement && usernameInput != document.activeElement) {
		if (event.keyCode === 39 || event.keyCode === 68) {
			controlMapper.main.right = false;
		} else if (event.keyCode === 37 || event.keyCode === 65) {
			controlMapper.main.left = false;
		}
		if (event.keyCode === 40 || event.keyCode === 83) {
			controlMapper.main.down = false;
		} else if (event.keyCode === 38 || event.keyCode === 87) {
			controlMapper.main.up = false;
		}
		if (event.keyCode === 32) {
			canShoot = true;
			controlMapper.main.shoot = false;
			document.onkeypress = keyPressedHandler;
		}
		if (inputsToSend.includes(event.keyCode)) {
			controlMapper.main.shoot = false;
			socket.emit('inputs', controlMapper.main);
		}
	}
}

document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);
document.addEventListener("keypress", keyPressedHandler, false);
