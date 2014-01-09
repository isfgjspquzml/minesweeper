/*jshint undef:true, devel:true */
/*global $:false */

'use strict';

var globalVars = globalVars || {}; // boardLength, boardHeight, numberMines, mines, flags, gameMap, totalFound, currentlyPlaying 
var globalConstants = globalConstants || {};

// Constants
globalConstants.MAX_SIZE = 50;
globalConstants.FOUND_VAL = -1;
globalConstants.PROXIMITY_VAL = -2;
globalConstants.MINE_VAL = 1;
globalConstants.LOSE_MESSAGE = 'YOU LOSE!';
globalConstants.TRY_AGAIN_MESSAGE = 'TRY AGAIN!';
globalConstants.WIN_MESSAGE = 'YOU WIN!';
globalConstants.DEFAULT_GREEN = '#00FF00';
globalConstants.DEFAULT_RED = '#FF0000';
globalConstants.DEFAULT_YELLOW = '#FFFF00';
globalConstants.DEFAULT_WHITE = '#FFFFFF';

// DOM references
var $board, $gameForm, $newGame, $validate, $cheat, $message;

$( document ).ready( function() {
	$board = $( '#board' );
	$gameForm = $('#gameForm');
	$newGame = $gameForm.find( '#initGame' );
	$validate = $gameForm.find( '#validate' );
	$cheat = $gameForm.find( '#cheat' );
	$message = $( '#message' );

	$board.on( 'mousedown', 'td', function(event) {
		var idArray, cellX, cellY;

		idArray = $( this ).attr( 'id' ).split( '_' );
		cellX = parseInt( idArray[1] );
		cellY = parseInt( idArray[2] );

		switch ( event.which ) {
			case 1:
				// Left click
				updateGameState( cellX, cellY );
				break;
			case 3:
				// Right click
				flagCell( cellX, cellY );
				break;
			default:
				break;
		}
	});

	/**
	* Check whether the inputs for the lenght, height, and # mines are legal before initializing the game.
	* Reset the form and button by the time initBoard is called.
	*/
	$newGame.on( 'click', null, function() {
		var boardLength, boardHeight, numberMines;

		boardLength = $gameForm.find( '#boardLength' ).val();
		boardHeight = $gameForm.find( '#boardHeight' ).val();
		numberMines = $gameForm.find( '#numberMines' ).val();

		// Check that inputs are appropriate numbers
		if ( !parseInt( boardLength ) || boardLength < 1 ) {
			boardLength = null;
		} else if ( boardLength > globalConstants.MAX_SIZE ) {
			boardLength = globalConstants.MAX_SIZE;
		}

		if ( !parseInt( boardHeight ) || boardHeight < 1 ) {
			boardHeight = null;
		} else if ( boardHeight > globalConstants.MAX_SIZE ) {
			boardHeight = globalConstants.MAX_SIZE;
		}

		if ( !parseInt( numberMines ) || numberMines < 0 ) {
			numberMines = null;
		} else if ( numberMines > boardLength * boardHeight ) {
			numberMines = boardLength * boardHeight - 1;
		}

		// Reset the input form
		$gameForm.find( '#boardLength' ).val( '' );
		$gameForm.find( '#boardHeight' ).val( '' );
		$gameForm.find( '#numberMines' ).val( '' );

		// Reset the button
		$(this).blur();

		initBoard(boardLength, boardHeight, numberMines);
	});

	$validate.on( 'click', null, function() {
		// Reset the button
		$(this).blur();

		validate();
	});

	$cheat.on( 'click', null, function() {
		// Reset the button
		$(this).blur();

		cheat();
	});

	/**
	* Reset all variables in globalvars. Make random positions for mines. Create the map.
	* 
	* @param {number} boardLength The width of the board
	* @param {number} boardHeight The height of the board
	* @param {number} numberMines The number of mines that should be placed onto the board
	*/
	function initBoard( boardLength, boardHeight, numberMines ) {
		var i, j, row, col;
		var addTableRow, addTableColumn;
		var toRemove, minesToRemove;
		var innerArray, size;
		var flags, gameMap, mines;

		$message.html('');

		// Set default values should if not already set
		boardLength = boardLength || 8;
		boardHeight = boardHeight || 8;
		numberMines = numberMines || 10;

		globalVars.boardLength = boardLength;
		globalVars.boardHeight = boardHeight;
		globalVars.numberMines = numberMines;

		// Initialize number of spaces found in the game
		globalVars.totalFound = 0;

		size = boardLength * boardHeight;

		// Initialize flags array
		flags = [];

		// Randomly populate the map with mines
		mines = [];
		for ( i = 0; i < size; i++ ) {
			mines.push(i);
		}

		minesToRemove = size - numberMines;

		for ( i = 0; i < minesToRemove; i++ ) {
			toRemove = Math.floor( Math.random() * size );
			mines.splice( toRemove, 1 );
			size--;
		}

		$board.empty();

		// Create the map in HTML and store it in a 2D array
		gameMap = [];
		for ( i = 0; i < boardHeight; i++ ) {
			addTableRow = '<tr>';
			addTableColumn = '';

			innerArray = [];

			for ( j = 0; j < boardLength; j++ ) {
				// id will be tile_x_y
				addTableColumn += '<td id=tile_' + j + '_' + i + '></td>';

				innerArray.push( 0 );
			}
			addTableRow += addTableColumn + '</tr>';
			$board.append( addTableRow );

			gameMap.push( innerArray );
		}

		for ( i = 0; i < mines.length; i++ ) {
			row = Math.floor( mines[i] / globalVars.boardHeight );
			col = mines[i] - row * globalVars.boardHeight;
			gameMap[row][col] = globalConstants.MINE_VAL;
		}

		// Set variables in global variable
		globalVars.currentlyPlaying = true;
		globalVars.flags = flags;
		globalVars.gameMap = gameMap;
		globalVars.mines = mines;
	}

	/**
	* Takes the cell coordinates a user has clicked. 
	* If the cell is next to a mine, display the # of mines, other click all the cells adjacent.
	* 
	* @param {number} cellX The x coordinate of the cell
	* @param {number} cellY The y coordinate of the cell
	*/
	function updateGameState( cellX, cellY ) {
		var i, j;
		var xCoord, yCoord;
		var minesCount, position, neighbors, neighborSplit;

		// In case inputs are not integers
		cellX = parseInt(cellX);
		cellY = parseInt(cellY);

		// If the game is over, disregard clicks
		if ( globalVars.currentlyPlaying ) {

			if ( globalVars.gameMap[cellX][cellY] == globalConstants.MINE_VAL) {
				cheat();
				globalVars.currentlyPlaying = false;
				$message.html( globalConstants.LOSE_MESSAGE );
				return;
			} else if ( globalVars.gameMap[cellX][cellY] == globalConstants.FOUND_VAL) {
				return;
			} else if ( globalVars.flags[cellY * globalVars.boardLength + cellX] == globalConstants.MINE_VAL ) {
				return;
			} else {
				neighbors = [];
				minesCount = 0;
				position = cellY * globalVars.boardLength + cellX;

				// Get all neighbors
				xCoord = [cellX - 1, cellX, cellX + 1];
				yCoord = [cellY - 1, cellY, cellY + 1];
				for ( i = 0; i < xCoord.length; i++ ) {
					for ( j = 0; j < yCoord.length; j++) {
						if ( i != 1 || j != 1 ) {
							if ( xCoord[i] >= 0 && xCoord[i] < globalVars.boardLength &&
								yCoord[j] >= 0 && yCoord[j] < globalVars.boardHeight ) {

								// Keep track of unknown neighbors into neighbor array
								if ( globalVars.gameMap[xCoord[i]][yCoord[j]] != globalConstants.FOUND_VAL &&
									globalVars.gameMap[xCoord[i]][yCoord[j]] != globalConstants.PROXIMITY_VAL ) {
									neighbors.push( xCoord[i] + '.' + yCoord[j] );
								}

								// See if neighbor is a bomb
								if ( globalVars.gameMap[xCoord[i]][yCoord[j]] == globalConstants.MINE_VAL ) {
									minesCount++;
								}
							}
						}
					}
				}

				if ( minesCount > 0) {
					$board.find( '#tile_' + cellX + '_' + cellY ).html(minesCount);

					// Mark the square as found near a bomb
					if(globalVars.gameMap[cellX][cellY] != globalConstants.PROXIMITY_VAL ) {
						globalVars.totalFound++;
						globalVars.gameMap[cellX][cellY] = globalConstants.PROXIMITY_VAL;
					}
				} else {
					$board.find( '#tile_' + cellX + '_' + cellY ).css( 'background', globalConstants.DEFAULT_GREEN );

					// Mark the square as found not to have a bomb
					globalVars.totalFound++;
					globalVars.gameMap[cellX][cellY] = globalConstants.FOUND_VAL;

					// Loop through all surrounding squares
					for ( i = 0; i < neighbors.length; i++ ) {
						neighborSplit = neighbors[i].split( '.' );
						updateGameState( neighborSplit[0], neighborSplit[1] );
					}
				}
			}
		}
	}

	/**
	* Flags a cell at the specified coordinates
	* 
	* @param {number} cellX The x coordinate of the cell
	* @param {number} cellY The y coordinate of the cell
	*/
	function flagCell( cellX, cellY ) {
		var position;

		// If the game is over, disregard clicks
		if ( globalVars.currentlyPlaying ) {
			position = cellY * globalVars.boardLength + cellX;

			if ( globalVars.flags[position] === undefined || globalVars.flags[position] === 0 ) {
				globalVars.flags[position] = globalConstants.MINE_VAL;
				$board.find( '#tile_' + cellX + '_' + cellY ).css( 'background', globalConstants.DEFAULT_YELLOW );
			} else {
				globalVars.flags[position] = 0;
				$board.find( '#tile_' + cellX + '_' + cellY ).css( 'background', globalConstants.DEFAULT_WHITE );
			}
		}
	}

	/**
	* Determine whether the game is over. First look at the number of tiles found, then whether the mines are flagged.
	* 
	*/
	function validate() {
		var pass;

		// If the game is over, disregard clicks
		if ( globalVars.currentlyPlaying ) {

			pass = true;
			console.log(globalVars.totalFound);
			console.log(globalVars.boardLength * globalVars.boardHeight - globalVars.mines.length);

			if ( globalVars.totalFound != globalVars.boardLength * globalVars.boardHeight - globalVars.mines.length ) {
				pass = false;
			}

			if ( pass ) {
				$message.html( globalConstants.WIN_MESSAGE );
				globalVars.currentlyPlaying = false;
			} else {
				$message.html( globalConstants.TRY_AGAIN_MESSAGE );
			}
		}
	}

	/**
	* Reveal the board. Iterate through the map and color the tiles.
	* 
	*/
	function cheat() {
		var i, j, val, color;

		if ( globalVars.currentlyPlaying ) {
			for ( i = 0; i < globalVars.boardLength; i++) {
				for ( j = 0; j < globalVars.boardHeight; j++) {
					val = globalVars.gameMap[i][j];

					switch ( val ) {
						case globalConstants.FOUND_VAL:
							color = globalConstants.DEFAULT_GREEN;
							break;
						case globalConstants.MINE_VAL:
							color = globalConstants.DEFAULT_RED;
							break;
						default:
							color = globalConstants.DEFAULT_GREEN;
							break;
					}

					$board.find( '#tile_' + i + '_' + j ).css( 'background', color );
				}
			}
			globalVars.currentlyPlaying = false;
		}
	}
});