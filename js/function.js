;(function() {
	'use strict';
	/*
	0 - пустое место
	1 - палуба корабля
	2 - клетка рядом с кораблём
	3 - обстрелянная клетка
	4 - попадание в палубу
	*/

	let startGame = false;
	let isHandler = false;
	let compShot = false;

	const getElement = id => document.getElementById(id);
	const getCoordinates = el => {
		// координаты всех сторон элемента относительно окна браузера
		const coords = el.getBoundingClientRect();
		return {
			left: coords.left + window.pageXOffset,
			right: coords.right + window.pageXOffset,
			top: coords.top + window.pageYOffset,
			bottom: coords.bottom + window.pageYOffset
		};
	}

	class Field {
		static FIELD_SIDE = 330;
		static SHIP_SIDE = 33;
		static SHIP_DATA = {
			fourdeck: [1, 4],
			tripledeck: [2, 3],
			doubledeck: [3, 2],
			singledeck: [4, 1]
		};

		constructor(field) {
			this.field = field;
			this.squadron = {};
			this.matrix = [];

			let { left, right, top, bottom } = getCoordinates(this.field);
			this.fieldLeft = left;
			this.fieldRight = right;
			this.fieldTop = top;
			this.fieldBottom = bottom;
		}

		static createMatrix() {
			const arr = [...Array(10)].map(() => Array(10).fill(0));
			return arr;
		}
		static getRandom = n => Math.floor(Math.random() * (n + 1));

		cleanField() {
			const divs = this.field.querySelectorAll('div');
			for (let div of divs) {
				div.remove();
			}
			this.squadron = {};
			this.matrix = Field.createMatrix();
		}

		randomLocationShips() {
			for (let type in Field.SHIP_DATA) {
				// кол-во кораблей данного типа
				let count = Field.SHIP_DATA[type][0];
				// кол-во палуб у корабля данного типа
				let decks = Field.SHIP_DATA[type][1];
				// прокручиваем кол-во кораблей
				for (let i = 0; i < count; i++) {
					// получаем координаты первой палубы и направление расположения палуб (корабля)
					let options = this.getCoordsDecks(decks);
					options.decks = decks;
					options.shipname = type + String(i + 1);

					const ship = new Ships(this, options);
					ship.createShip();
				}
			}
		}

		getCoordsDecks(decks) {
			let kx = Field.getRandom(1), ky = (kx == 0) ? 1 : 0,
				x, y;

			if (kx == 0) {
				x = Field.getRandom(9); y = Field.getRandom(10 - decks);
			} else {
				x = Field.getRandom(10 - decks); y = Field.getRandom(9);
			}

			const obj = {x, y, kx, ky}
			const result = this.checkLocationShip(obj, decks);
			if (!result) return this.getCoordsDecks(decks);
			return obj;
		}

		checkLocationShip(obj, decks) {
			let { x, y, kx, ky, fromX, toX, fromY, toY } = obj;

			fromX = (x == 0) ? x : x - 1;
			if (x + kx * decks == 10 && kx == 1) toX = x + kx * decks;
			else if (x + kx * decks < 10 && kx == 1) toX = x + kx * decks + 1;
			else if (x == 9 && kx == 0) toX = x + 1;
			else if (x < 9 && kx == 0) toX = x + 2;

			fromY = (y == 0) ? y : y - 1;
			if (y + ky * decks == 10 && ky == 1) toY = y + ky * decks;
			else if (y + ky * decks < 10 && ky == 1) toY = y + ky * decks + 1;
			else if (y == 9 && ky == 0) toY = y + 1;
			else if (y < 9 && ky == 0) toY = y + 2;

			if (toX === undefined || toY === undefined) return false;

			if (this.matrix.slice(fromX, toX)
				.filter(arr => arr.slice(fromY, toY).includes(1))
				.length > 0) return false;
			return true;
		}
	}

	///////////////////////////////////////////

	class Ships {
		constructor(self, options) {
			// с каким экземпляром работаем
			this.player = (self === human) ? human : computer;
			// this.player = self;
			// на каком поле создаётся данный корабль
			this.field = self.field;
			// уникальное имя корабля
			this.shipname = options.shipname;
			//количество палуб
			this.decks = options.decks;
			// координата X первой палубы
			this.x = options.x;
		 	// координата Y первой палубы
			this.y = options.y;
			// направлении расположения палуб
			this.kx = options.kx;
			this.ky = options.ky;
			// счётчик попаданий
			this.hits = 0;
			// массив с координатами палуб корабля, является элементом squadron
			this.arrDecks = [];
		}

		static showShip(self, shipname, x, y, kx) {
			const div = document.createElement('div'),
				  dir = (kx == 1) ? ' vertical' : '',
				  classname = shipname.slice(0, -1);

			// устанавливаем уникальный идентификатор для корабля
			div.setAttribute('id', shipname);
			// собираем в одну строку все классы 
			div.className = `ship ${classname}${dir}`;
			// через атрибут 'style' задаём позиционирование кораблю относительно
			// его родительского элемента
			// смещение вычисляется путём умножения координаты первой палубы на
			// размер клетки игрового поля, этот размер совпадает с размером палубы
			div.style.cssText = `left:${y * Field.SHIP_SIDE}px; top:${x * Field.SHIP_SIDE}px;`;
			self.field.appendChild(div);
		}

		createShip() {
			let { player, field, shipname, decks, x, y, kx, ky, hits, arrDecks, k = 0 } = this;

			while (k < decks) {
				let i = x + k * kx, j = y + k * ky;

				player.matrix[i][j] = 1; // игровое поле
				arrDecks.push([i, j]);
				k++;
			}

			player.squadron[shipname] = {arrDecks, hits, x, y, kx, ky};

			if (player === human) {
				Ships.showShip(human, shipname, x, y, kx);
				if (Object.keys(player.squadron).length == 10) {
					buttonPlay.dataset.hidden = false;
				}
			}
		}
	}

	///////////////////////////////////////////

	class Placement {
		constructor() {
			this.field = humanfield;
			this.dragObject = {};
			this.pressed = false;

			let { left, right, top, bottom } = getCoordinates(this.field);
			this.fieldLeft = left;
			this.fieldRight = right;
			this.fieldTop = top;
			this.fieldBottom = bottom;
		}

		static getShipName = el => el.getAttribute('id');
		static getCloneDecks = el => {
			const type = el.getAttribute('id').slice(0, -1);
			return Field.SHIP_DATA[type][1];
		}

		setObserver() {
			if (isHandler) return;
			document.addEventListener('mousedown', this.onMouseDown.bind(this));
			this.field.addEventListener('contextmenu', this.rotationShip.bind(this));
			document.addEventListener('mousemove', this.onMouseMove.bind(this));
			document.addEventListener('mouseup', this.onMouseUp.bind(this));
			isHandler = true;
		}

		onMouseDown(e) {
			if (e.which != 1 || startGame) return;

			const el = e.target.closest('.ship');
			if(!el) return;
			this.pressed = true;

			// переносимый объект и его свойства
			this.dragObject = {
				el,
				parent: el.parentElement,
				next: el.nextElementSibling,
				// координаты, с которых начат перенос
				downX: e.pageX,
				downY: e.pageY,
				left: el.offsetLeft,
				top: el.offsetTop,
				// горизонтальное положение корабля
				kx: 0,
				ky: 1
			};

			// редактируем положение корабля на игровом поле
			if (el.parentElement === this.field) {
				const name = Placement.getShipName(el);
				this.dragObject.kx = human.squadron[name].kx;
				this.dragObject.ky = human.squadron[name].ky;
			}
		}

		onMouseMove(e) {
			if (!this.pressed || !this.dragObject.el) return;

			let { left, right, top, bottom } = getCoordinates(this.dragObject.el);

			if (!this.clone) {
				this.decks = Placement.getCloneDecks(this.dragObject.el);
				this.clone = this.creatClone({left, right, top, bottom}) || null;
				if (!this.clone) return;

				// вычисляем сдвиг курсора по координатам X и Y
				this.shiftX = this.dragObject.downX - left;
				this.shiftY = this.dragObject.downY - top;
				// z-index нужен для позиционирования клона над всеми элементами DOM
				this.clone.style.zIndex = '1000';
				// перемещаем клон в BODY
				document.body.appendChild(this.clone);

				// удаляем устаревший экземпляр корабля, если он существует
				this.removeShipFromSquadron(this.clone);
			}

			// координаты клона относительно BODY с учётом сдвига курсора
			// относительно верней левой точки
			let currentLeft = Math.round(e.pageX - this.shiftX),
					currentTop = Math.round(e.pageY - this.shiftY);
			this.clone.style.left = `${currentLeft}px`;
			this.clone.style.top = `${currentTop}px`;

			// проверяем, что клон находится в пределах игрового поля, с учётом
			// небольших погрешностей (14px )
			if (left >= this.fieldLeft - 14 && right <= this.fieldRight + 14 && top >= this.fieldTop - 14 && bottom <= this.fieldBottom + 14) {
				const coords = this.getCoordsCloneInMatrix({left, right, top, bottom});
				const obj = {
					x: coords.x,
					y: coords.y,
					kx: this.dragObject.kx,
					ky: this.dragObject.ky
				};

				const result = human.checkLocationShip(obj, this.decks);
				if (result) {
					// клон находится в пределах игрового поля,
					// подсвечиваем его контур зелёным цветом
					this.clone.classList.remove('unsuccess');
					this.clone.classList.add('success');
				} else {
					// в соседних клетках находятся ранее установленные корабли,
					// подсвечиваем его контур красным цветом
					this.clone.classList.remove('success');
					this.clone.classList.add('unsuccess');
				}
			} else {
				// клон находится за пределами игрового поля,
				// подсвечиваем его контур красным цветом
				this.clone.classList.remove('success');
				this.clone.classList.add('unsuccess');
			}
		}

		onMouseUp() {
			this.pressed = false;
			if (!this.clone) return;				

			if (this.clone.classList.contains('unsuccess')) {
				this.clone.classList.remove('unsuccess');
				this.clone.rollback();
			} else {
				this.createShipAfterEditing();
			}

			// удаляем объекты 'clone' и 'dragObject'
			this.removeClone();
		}

		rotationShip(e) {
			// запрещаем появление контекстного меню
			e.preventDefault();
			if (e.which != 3 || startGame) return;

			const el = e.target.closest('.ship');
			const name = Placement.getShipName(el);

			if (human.squadron[name].decks == 1) return;

			const obj = {
				kx: (human.squadron[name].kx == 0) ? 1 : 0,
				ky: (human.squadron[name].ky == 0) ? 1 : 0,
				x: human.squadron[name].x,
				y: human.squadron[name].y
			};
			const decks = human.squadron[name].arrDecks.length;
			this.removeShipFromSquadron(el);
			human.field.removeChild(el);
			const result = human.checkLocationShip(obj, decks);

			if(!result) {
				obj.kx = (obj.kx == 0) ? 1 : 0;
				obj.ky = (obj.ky == 0) ? 1 : 0;
			}

			// добавляем в объект свойства нового корабля
			obj.shipname = name;
			obj.decks = decks;

			// создаём экземпляр нового корабля
			const ship = new Ships(human, obj);
			ship.createShip();

			if (!result) {
				const el = getElement(name);
				el.classList.add('unsuccess');
				setTimeout(() => { el.classList.remove('unsuccess') }, 750);
			}
		}

		creatClone(coords) {
			const clone = this.dragObject.el;
			const oldPosition = this.dragObject;

			clone.rollback = () => {
				if (oldPosition.parent == this.field) {
					clone.style.left = `${oldPosition.left}px`;
					clone.style.top = `${oldPosition.top}px`;
					clone.style.zIndex = '';
					oldPosition.parent.insertBefore(clone, oldPosition.next);
					this.createShipAfterEditing();
				} else {
					clone.removeAttribute('style');
					oldPosition.parent.insertBefore(clone, oldPosition.next);
				}
			};
			return clone;
		};

		removeClone() {
			delete this.clone;
			this.dragObject = {};
		}

		createShipAfterEditing() {
			// получаем координаты, пересчитанные относительно игрового поля
			const coords = getCoordinates(this.clone);
			let { left, top, x, y } = this.getCoordsCloneInMatrix(coords);
			this.clone.style.left = `${left}px`;
			this.clone.style.top = `${top}px`;
			// переносим клон внутрь игрового поля
			this.field.appendChild(this.clone);
			this.clone.classList.remove('success');

			// создаём объект со свойствами нового корабля
			const options = {
				shipname: Placement.getShipName(this.clone),
				x,
				y,
				kx: this.dragObject.kx,
				ky: this.dragObject.ky,
				decks: this.decks
			};

			// создаём экземпляр нового корабля
			const ship = new Ships(human, options);
			ship.createShip();
			// теперь в игровом поле находится сам корабль, поэтому его клон удаляем из DOM
			this.field.removeChild(this.clone);
		}

		getCoordsCloneInMatrix({left, right, top, bottom} = coords) {
			let computedLeft = left - this.fieldLeft,
				computedRight = right - this.fieldLeft,
				computedTop = top - this.fieldTop,
				computedBottom = bottom - this.fieldTop;

			// создаём объект, куда поместим итоговые значения
			const obj = {};

			// в результате выполнения условия, убираем неточности позиционирования клона
			let ft = (computedTop < 0) ? 0 : (computedBottom > Field.FIELD_SIDE) ? Field.FIELD_SIDE - Field.SHIP_SIDE : computedTop;
			let fl = (computedLeft < 0) ? 0 : (computedRight > Field.FIELD_SIDE) ? Field.FIELD_SIDE - Field.SHIP_SIDE * this.decks : computedLeft;

			obj.top = Math.round(ft / Field.SHIP_SIDE) * Field.SHIP_SIDE;
			obj.left = Math.round(fl / Field.SHIP_SIDE) * Field.SHIP_SIDE;
			// переводим значение в координатах матрицы
			obj.x = obj.top / Field.SHIP_SIDE;
			obj.y = obj.left / Field.SHIP_SIDE;

			return obj;
		}

		removeShipFromSquadron(el) {
			const name = Placement.getShipName(el);
			if (!human.squadron[name]) return;

			const arr = human.squadron[name].arrDecks;
			for (let coords of arr) {
				const [x, y] = coords;
				human.matrix[x][y] = 0;
			}
			delete human.squadron[name];
		}
	}

	///////////////////////////////////////////

	class Controller {
		// массив базовых координат для формирования coordsFixed
		static START_POINTS = [
			[ [6,0], [2,0], [0,2], [0,6] ],
			[ [3,0], [7,0], [9,2], [9,6] ]
		];
		static SERVICE_TEXT = getElement('service_text');

		constructor() {
			this.player = '';
			this.opponent = '';
			this.text = '';
			// массив с координатами выстрелов при рандомном выборе
			this.coordsRandom = [];
			// массив с заранее вычисленными координатами выстрелов
			this.coordsFixed = [];
			// массив с координатами вокруг клетки с попаданием
			this.coordsAroundHit = [];
			// временный объект корабля, куда будем заносить координаты
			// попаданий, расположение корабля, количество попаданий
			this.resetTempShip();
		}

		static showServiceText = text => {
			Controller.SERVICE_TEXT.innerHTML = text;
			// setTimeout(() => { Controller.SERVICE_TEXT.innerHTML = '' }, 2500);
		}

		static getCoordsIcon(el) {
			const x = el.style.top.slice(0, -2) / Field.SHIP_SIDE;
			const y = el.style.left.slice(0, -2) / Field.SHIP_SIDE;
			return [x, y];
		}

		static removeElementArray(arr, [x, y]) {
			return arr.filter(item => item[0] != x || item[1] != y);
		}

		init() {
			// Рандомно выбираем игрока и его противника
			// const random = Field.getRandom(1);

			// test row !!!!!
			const random = 1;
			
			this.player = (random == 0) ? human : computer;
			this.opponent = (this.player === human) ? computer : human;

			// генерируем координаты выстрелов компьютера и заносим их в
			// массивы coordsRandom и coordsFixed
			this.setCoordsShot();
			// обработчики события для игрока
			computerfield.addEventListener('click', this.makeShot.bind(this));
			computerfield.addEventListener('contextmenu', this.setUselessCell.bind(this));

			if (this.player === human) {
				compShot = false;
				this.text = 'Вы стреляете первым';
			} else {
				compShot = true;
				this.text = 'Первым стреляет компьютер';
				setTimeout(() => this.makeShot(), 2000);
			}
			Controller.showServiceText(this.text);
		}

		setCoordsShot() {
			for (let i = 0; i < 10; i++) {
				for(let j = 0; j < 10; j++) {
					this.coordsRandom.push([i, j]);
				}
			}
			this.coordsRandom.sort((a, b) => Math.random() - 0.5);

			let x, y;

			for (let arr of Controller.START_POINTS[0]) {
				x = arr[0]; y = arr[1];
				while (x <= 9 && y <= 9) {
					this.coordsFixed.push([x, y]);
					x = (x <= 9) ? x : 9;
					y = (y <= 9) ? y : 9;
					x++; y++;
				}
			}

			for (let arr of Controller.START_POINTS[1]) {
				x = arr[0]; y = arr[1];
				while(x >= 0 && x <= 9 && y <= 9) {
					this.coordsFixed.push([x, y]);
					x = (x >= 0 && x <= 9) ? x : (x < 0) ? 0 : 9;
					y = (y <= 9) ? y : 9;
					x--; y++;
				};
			}
			this.coordsFixed = this.coordsFixed.reverse();
		}

		setCoordsAroundHit(x, y) {
			let {firstHit, kx, ky} = this.tempShip;
			let arr = [];

			if (firstHit.length == 0) {
				this.tempShip.firstHit = [x, y];
			} else if (kx == 0 && ky == 0) {
				this.tempShip.kx = (Math.abs(firstHit[0] - x) == 1) ? 1 : 0;
				this.tempShip.ky = (Math.abs(firstHit[1] - y) == 1) ? 1: 0;
			}

			// вертикальное расположение
			if (x > 0) this.coordsAroundHit.push([x - 1, y]);
			if (x < 9) this.coordsAroundHit.push([x + 1, y]);
			// горизонтальное расположение
			if (y > 0) this.coordsAroundHit.push([x, y - 1]);
			if (y < 9) this.coordsAroundHit.push([x, y + 1]);

			// валидация координат с помощью фильтра
			arr = this.coordsAroundHit.filter(([x, y]) => human.matrix[x][y] == 0 || human.matrix[x][y] == 1);
			this.coordsAroundHit = [...arr];
		}

		setUselessCell(e) {
			e.preventDefault();
			if (e !== undefined && e.which != 3 || compShot) return;

			const coords = this.transformCoordsInMatrix(e, computer);
			const check = this.checkUselessCell(coords);
			if (check) {
				this.showIcons(this.opponent, coords, 'shaded-cell');
			} 
		}

		transformCoordsInMatrix(e, self) {
			const x = Math.trunc((e.pageY - self.fieldTop) / Field.SHIP_SIDE);
			const y = Math.trunc((e.pageX - self.fieldLeft) / Field.SHIP_SIDE);
			return [x, y];
		}

		removeCoordsFromArrays(coords) {
			if (this.coordsAroundHit.length > 0) {
				this.coordsAroundHit = Controller.removeElementArray(this.coordsAroundHit, coords);
			}
			if (this.coordsFixed.length > 0) {
				this.coordsFixed = Controller.removeElementArray(this.coordsFixed, coords);
			}
			this.coordsRandom = Controller.removeElementArray(this.coordsRandom, coords);
		}

		checkUselessCell(coords) {
			const icons = this.opponent.field.querySelectorAll('.icon-field');
			if (icons.length == 0) return true;

			for (let icon of icons) {
				const [x, y] = Controller.getCoordsIcon(icon);
				if (coords[0] == x && coords[1] == y && icon.classList.contains('shaded-cell')) {
					const f = (new Error()).stack.split('\n')[2].trim().split(' ')[1];
					if (f == 'Controller.setUselessCell') {
						icon.parentElement.removeChild(icon);
					} else {
						Controller.showServiceText('Уберите маркер клетки игрового поля');
						icon.classList.add('shaded-cell_red');
						setTimeout(() => { icon.classList.remove('shaded-cell_red') }, 500);
					}
					return false;
				}
			}
			return true;
		}

		markUselessCell(coords) {
			let n = 0, x, y;
			for (let coord of coords) {
				x = coord[0]; y = coord[1];
				// за пределами игрового поля
				if (x < 0 || x > 9 || y < 0 || y > 9) continue;
				// что-то уже есть
				if (human.matrix[x][y] != 0) continue;
				human.matrix[x][y] = 2;
				n++;
				setTimeout(() => this.showIcons(human, coord, 'shaded-cell'), 100 * n);
				// удаляем полученные координаты из всех массивов
				this.removeCoordsFromArrays(coord);
			}
		}

		markUselessCellAroundShip(coords){
			const {hits, kx, ky, x0, y0} = this.tempShip;
			let points;

			// однопалубный корабль
			if (this.tempShip.hits == 1) {
				points = [
					// верхняя
					[x0 - 1, y0],
					// нижняя
					[x0 + 1, y0],
					// левая
					[x0, y0 - 1],
					// правая
					[x0, y0 + 1]
				];
			// многопалубный корабль
			} else {
				points = [
					// левая / верхняя
					[x0 - kx, y0 - ky],
					// правая / нижняя
					[x0 + kx * hits, y0 + ky * hits]
				];
			}
			this.markUselessCell(points);
		}

		showIcons(opponent, [x, y], iconClass) {
			const span = document.createElement('span');
			span.className = `icon-field ${iconClass}`;
			span.style.cssText = `left:${y * Field.SHIP_SIDE}px; top:${x * Field.SHIP_SIDE}px;`;
			opponent.field.appendChild(span);
		}

		getCoordsForShot() {
			const coords = (this.coordsAroundHit.length > 0) ? this.coordsAroundHit.pop() : (this.coordsFixed.length > 0) ? this.coordsFixed.pop() : this.coordsRandom.pop();
			
			// удаляем полученные координаты из всех массивов
			this.removeCoordsFromArrays(coords);
			return coords;
		}

		resetTempShip() {
			this.tempShip = {
				hits: 0,
				firstHit: [],
				kx: 0,
				ky: 0
			};
		}

		makeShot(e) {
			let x, y;
			if (e !== undefined) {
				if (e.which != 1 || compShot) return;
				([x, y] = this.transformCoordsInMatrix(e, this.opponent));
			} else {
				// получаем координаты для выстрела компьютера
				([x, y] = this.getCoordsForShot());
			}

			// проверяем наличие иконки 'shaded-cell' по полученым координатам
			const check = this.checkUselessCell([x, y]);
			if (!check) return;

			// показываем и удаляем иконку выстрела
			this.showIcons(this.opponent, [x, y], 'explosion');
			const explosion = this.opponent.field.querySelector('.explosion');
			setTimeout(() => explosion.parentElement.removeChild(explosion), 300);


			const v	= this.opponent.matrix[x][y];
			switch(v) {
				case 0: // промах
					this.miss(x, y);
					break;
				case 1: // попадание
					this.hit(x, y);
					break;
				case 3: // повторный обстрел
				case 4:
					Controller.showServiceText('По этим координатам вы уже стреляли!');
					break;
			}
		}

		miss(x, y) {
			let text = '';
			// устанавливаем иконку промаха и записываем промах в матрицу
			this.showIcons(this.opponent, [x, y], 'dot');
			this.opponent.matrix[x][y] = 3;

			// определяем статус игроков
			if (this.player === human) {
				text = 'Вы промахнулись. Стреляет компьютер.';
				this.player = computer;
				this.opponent = human;
				compShot = true;
				setTimeout(() => this.makeShot(), 2000);
			} else {
				text = 'Компьютер промахнулся. Ваш выстрел.';

				// обстреляны все возможные клетки для данного корабля
				if (this.coordsAroundHit.length == 0 && this.tempShip.hits > 0) {
					// корабль потоплен, отмечаем useless cell вокруг него
					this.markUselessCellAroundShip([x, y]);
					this.resetTempShip();
				}
				this.player = human;
				this.opponent = computer;
				compShot = false;
			}
			Controller.showServiceText(text);
		}

		hit(x, y) {
			let text = '';
			// устанавливаем иконку попадания и записываем попадание в матрицу
			this.showIcons(this.opponent, [x, y], 'red-cross');
			this.opponent.matrix[x][y] = 4;
			text = (this.player === human) ? 'Поздравляем! Вы попали. Ваш выстрел.' : 'Компьютер попал в ваш корабль. Выстрел компьютера';
			Controller.showServiceText(text);

			// увеличиваем счётчик попаданий
			// если счётчик === количеству палуб, удаляем корабль из эскадры
			for (let name in this.opponent.squadron) {
				const dataShip = this.opponent.squadron[name];
				for (let value of dataShip.arrDecks) {
					if (value[0] == x && value[1] == y) {
						dataShip.hits++;
						if (dataShip.hits == dataShip.arrDecks.length) {
							if (this.opponent === human) {
								// код компьютера: сохраняем координаты первой палубы
								this.tempShip.x0 = dataShip.x;
								this.tempShip.y0 = dataShip.y;
							}
							delete this.opponent.squadron[name];
							if (this.opponent === computer) {
								console.log(computer.squadron);
							}
						}
						// break;
					}
				}
			}

			// все корабли эскадры уничтожены
			if (Object.keys(this.opponent.squadron).length == 0) {
				if (this.opponent === human) {
					text = 'К сожалению, вы проиграли.';
					// показываем оставшиеся корабли компьютера
					for (let name in computer.squadron) {
						const dataShip = computer.squadron[name];
						Ships.showShip(computer, name, dataShip.x, dataShip.y, dataShip.kx );
					}
				} else {
					text = 'Поздравляем! Вы выиграли!';
				}
				Controller.showServiceText(text);
			// бой продолжается
			} else if (this.opponent === human) {
				this.tempShip.hits++;
				// отмечаем клетки по диагонали, где точно не может стоять корабль
				const coords = [
					[x - 1, y - 1],
					[x - 1, y + 1],
					[x + 1, y - 1],
					[x + 1, y + 1]
				];
				this.markUselessCell(coords);

				// формируем координаты обстрела вокруг попадания
				this.setCoordsAroundHit(x, y);

				// max кол-во палуб у оставшихся кораблей
				let obj = Object.values(human.squadron)
					.reduce((a, b) => a.arrDecks.length > b.arrDecks.length ? a : b);
				// определяем, есть ли ещё корабли, с кол-вом палуб больше, чем попаданий
				if (this.tempShip.hits >= obj.arrDecks.length || this.coordsAroundHit.length == 0) {
					// корабль потоплен, отмечаем useless cell вокруг него
					this.markUselessCellAroundShip(coords);
					this.coordsAroundHit = [];
					this.resetTempShip();
				}
				setTimeout(() => this.makeShot(), 2000);
			}
		}
	}

	///////////////////////////////////////////

	const humanfield = getElement('field_human');
	const human = new Field(humanfield);

	const computerfield = getElement('field_computer');
	let computer = {};

	const shipsCollection = getElement('ships_collection');
	const initialShips = document.querySelector('.wrap + .initial-ships');
	const buttonPlay = getElement('play');

	getElement('type_placement').addEventListener('click', function(e) {
		if (e.target.tagName != 'SPAN') return;

		buttonPlay.dataset.hidden = true;
		human.cleanField();

		let initialShipsClone = '';
		const type = e.target.dataset.target;
		const typeGeneration = {
			random() {
				shipsCollection.hidden = true;
				human.randomLocationShips();
			},
			manually() {
				let value = !shipsCollection.hidden;

				if (shipsCollection.children.length > 1) {
					shipsCollection.removeChild(shipsCollection.lastChild);
				}

				if (!value) {
					initialShipsClone = initialShips.cloneNode(true);
					shipsCollection.appendChild(initialShipsClone);
					initialShipsClone.hidden = false;
				}

				shipsCollection.hidden = value;
			}
		};
		typeGeneration[type]();

		const placement = new Placement();
		placement.setObserver();
	});

	buttonPlay.addEventListener('click', function(e) {
		buttonPlay.dataset.hidden = true;
		getElement('instruction').hidden = true;
		computerfield.parentElement.hidden = false;

		computer = new Field(computerfield);
		computer.cleanField();
		computer.randomLocationShips();
		startGame = true;

		const battle = new Controller();
		battle.init();
	});

	/////////////////////////////////////////////////

	function printMatrix() {
		let print = '';
		for (let x = 0; x < 10; x++) {
			for (let y = 0; y < 10; y++) {
				print += human.matrix[x][y];
			}
			print += '<br>';
		}
		getElement('matrix').innerHTML = print;
	}
})();
