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
		const coord = el.getBoundingClientRect();
		return {
			left: coord.left + window.pageXOffset,
			right: coord.right + window.pageXOffset,
			top: coord.top + window.pageYOffset,
			bottom: coord.bottom + window.pageYOffset
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
			const arr = Array(10).fill().map(() => Array(10).fill(0));
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
					let options = this.getCoordinatesDecks(decks);
					options.decks = decks;
					options.shipname = type + String(i + 1);

					const ship = new Ships(this, options);
					ship.createShip();
				}
			}
		}

		getCoordinatesDecks(decks) {
			let kx = Field.getRandom(1), ky = (kx == 0) ? 1 : 0,
				x, y;

			if (kx == 0) {
				x = Field.getRandom(9); y = Field.getRandom(10 - decks);
			} else {
				x = Field.getRandom(10 - decks); y = Field.getRandom(9);
			}

			const obj = {x, y, kx, ky}
			const result = this.checkLocationShip(obj, decks);
			if (!result) return this.getCoordinatesDecks(decks);
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
			div.setAttribute('id', this.shipname);
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
				let i = x + k * kx,
					j = y + k * ky;

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
				const coordinates = this.getCoordinatesCloneInMatrix({left, right, top, bottom});
				const obj = {
					x: coordinates.x,
					y: coordinates.y,
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

		creatClone(coord) {
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
			const coord = getCoordinates(this.clone);
			let { left, top, x, y } = this.getCoordinatesCloneInMatrix(coord);
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

		getCoordinatesCloneInMatrix({left, right, top, bottom} = coord) {
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
			for (let coord of arr) {
				const [x, y] = coord;
				human.matrix[x][y] = 0;
			}
			delete human.squadron[name];
		}
	}

	class Controller {
		static SERVICE_TEXT = getElement('service_text');

		constructor() {
			this.player = '';
			this.opponent = '';
			this.text = '';
		}

		static showServiceText = text => {
			Controller.SERVICE_TEXT.innerHTML = text;
			let tm = 0;
			tm = setTimeout(() => { Controller.SERVICE_TEXT.innerHTML = '' }, 2500);
		}

		static getCoordinatesIcon(el) {
			const obj = {};
			obj.x = el.style.top.slice(0, -2) / Field.SHIP_SIDE;
			obj.y = el.style.left.slice(0, -2) / Field.SHIP_SIDE;
			return obj;
		}

		init() {
			// Рандомно выбираем игрока и его противника для первого выстрела
			const random = Field.getRandom(0); // заменить 0 на 1 !!!!!!!
			this.player = (random == 0) ? human : computer;
			this.opponent = (this.player === human) ? computer : human;

			if (this.player === human) {
				computerfield.addEventListener('click', this.makeShot.bind(this));
				computerfield.addEventListener('contextmenu', this.setEmptyCell.bind(this));
				this.text = 'Вы стреляете первым';
			} else {
				this.text = 'Первым стреляет компьютер';
			}
			Controller.showServiceText(this.text);
		}

		setEmptyCell(e) {
			e.preventDefault();
			if (e !== undefined && e.which != 3 || compShot) return;

			const coord = this.transformCoordinatesInMatrix(e, computer);
			const check = this.checkShadedCell(coord);
			if (check) {
				this.showIcons(this.opponent, coord, 'shaded-cell');
			} 
		}

		transformCoordinatesInMatrix(e, self) {
			const obj = {};
			obj.x = Math.trunc((e.pageY - self.fieldTop) / Field.SHIP_SIDE);
			obj.y = Math.trunc((e.pageX - self.fieldLeft) / Field.SHIP_SIDE);
			return obj;
		}

		checkShadedCell(coord) {
			const icons = this.opponent.field.querySelectorAll('.icon-field');
			if (icons.length == 0) return true;

			for (let icon of icons) {
				const { x, y } = Controller.getCoordinatesIcon(icon);
				if (coord.x == x && coord.y == y && icon.classList.contains('shaded-cell')) {
					const f = (new Error()).stack.split('\n')[2].trim().split(' ')[1];
					if (f == 'Controller.setEmptyCell') {
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

		showIcons(opponent, coord, iconClass) {
			const span = document.createElement('span');
			span.className = `icon-field ${iconClass}`;
			span.style.cssText = `left:${coord.y * Field.SHIP_SIDE}px; top:${coord.x * Field.SHIP_SIDE}px;`;
			opponent.field.appendChild(span);
		}

		makeShot(e) {
			let x, y;
			if (e !== undefined) {
				if (e.which != 1 || compShot) return;
				({ x, y } = this.transformCoordinatesInMatrix(e, this.opponent));
			} else {
				// получаем координаты для выстрела компьютера
				// ...
			}

			// проверяем наличие иконки 'shaded-cell' по полученым координатам
			const check = this.checkShadedCell({ x, y });
			if (!check) return;

			const v	= this.opponent.matrix[x][y];
			switch(v) {
				case 0: // промах
					this.miss({ x, y });
					break;
				case 1: // попадание
				this.hit({ x, y });
					break;
				case 3: // повторный обстрел
				case 4:
				Controller.showServiceText('По этим координатам вы уже стреляли!');
					break;
			}
		}

		miss({ x, y }) {
			let text = '';
			// устанавливаем иконку промаха и записываем промах в матрицу
			this.showIcons(this.opponent, { x, y }, 'dot');
			this.opponent.matrix[x][y] = 3;

			// определяем статус игроков
			if (this.player === human) {
				text = 'Вы промахнулись. Стреляет компьютер.';
				this.player = computer;
				this.opponent = human;
				compShot = true;
				// код для подготовки выстрела компьютера
				// ...
			} else {
				text = 'Компьютер промахнулся. Ваш выстрел.';
				this.player = human;
				this.opponent = computer;
				compShot = false;
			}
			Controller.showServiceText(text);
		}

		hit({ x, y }) {
			let text = '';
			// устанавливаем иконку попадания и записываем попадание в матрицу
			this.showIcons(this.opponent, { x, y }, 'red-cross');
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
							if (this.opponent === computer) {
								// код компьютера: сохраняем координаты первой палубы
								// ...
							}
							delete this.opponent.squadron[name];
						}
						return;
					}
				}
			}

			// все корабли эскадры уничтожены
			if (this.opponent.squadron.length == 0) {
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
				// reset массивов и флагов для для начала новой игры
				// ...
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
