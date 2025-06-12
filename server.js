const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname)));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Estrutura para armazenar salas
const rooms = new Map();

// Gerar código de sala
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Embaralhar cartas
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Gerar tabuleiro do jogo
function generateGameBoard() {
    const symbols = [
        'fas fa-heart', 'fas fa-kiss', 'fas fa-gift', 'fas fa-ring',
        'fas fa-wine-glass', 'fas fa-envelope', 'far fa-heart', 'fas fa-star'
    ];
    const cardSymbols = [...symbols, ...symbols];
    return shuffleArray(cardSymbols);
}

io.on('connection', (socket) => {
    console.log('Jogador conectado:', socket.id);

    // Criar sala
    socket.on('create-room', (data) => {
        const roomCode = generateRoomCode();
        const room = {
            code: roomCode,
            host: socket.id,
            players: [{
                id: socket.id,
                playerId: 'player1',
                ready: false,
                name: data.playerName || 'Jogador 1'
            }],
            gameMode: data.gameMode || 'competitive', // competitive, cooperative
            gameBoard: null,
            currentTurn: 'player1',
            scores: { player1: 0, player2: 0 },
            gameStarted: false,
            gameEnded: false,
            flippedCards: [],
            matchedCards: [],
            cooperativeState: {
                waitingForSecondCard: false,
                firstCardPlayer: null,
                firstCardIndex: null
            }
        };

        rooms.set(roomCode, room);
        socket.join(roomCode);
        socket.roomCode = roomCode;

        socket.emit('room-created', {
            roomCode,
            playerId: 'player1',
            isHost: true
        });

        socket.emit('room-updated', room);
    });

    // Entrar na sala
    socket.on('join-room', (data) => {
        const { roomCode, playerName } = data;
        const room = rooms.get(roomCode);

        if (!room) {
            socket.emit('error', { message: 'Sala não encontrada' });
            return;
        }

        if (room.players.length >= 2) {
            socket.emit('error', { message: 'Sala está cheia' });
            return;
        }

        if (room.gameStarted) {
            socket.emit('error', { message: 'Jogo já começou' });
            return;
        }

        const player = {
            id: socket.id,
            playerId: 'player2',
            ready: false,
            name: playerName || 'Jogador 2'
        };

        room.players.push(player);
        socket.join(roomCode);
        socket.roomCode = roomCode;

        socket.emit('room-joined', {
            roomCode,
            playerId: 'player2',
            isHost: false
        });

        io.to(roomCode).emit('room-updated', room);
    });

    // Marcar como pronto
    socket.on('player-ready', () => {
        const roomCode = socket.roomCode;
        const room = rooms.get(roomCode);

        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (player) {
            player.ready = true;
        }

        // Se ambos estão prontos, iniciar jogo
        if (room.players.length === 2 && room.players.every(p => p.ready)) {
            room.gameStarted = true;
            room.gameBoard = generateGameBoard();
            room.currentTurn = 'player1';
            
            io.to(roomCode).emit('game-started', room);
        }

        io.to(roomCode).emit('room-updated', room);
    });

    // Fazer movimento
    socket.on('make-move', (data) => {
        const { cardIndex } = data;
        const roomCode = socket.roomCode;
        const room = rooms.get(roomCode);

        if (!room || !room.gameStarted || room.gameEnded) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        const playerId = player.playerId;

        // Verificar se a carta já foi virada ou matched
        if (room.flippedCards.includes(cardIndex) || room.matchedCards.includes(cardIndex)) {
            return;
        }

        if (room.gameMode === 'competitive') {
            // Modo competitivo - verificar turno
            if (room.currentTurn !== playerId) return;

            room.flippedCards.push(cardIndex);

            if (room.flippedCards.length === 2) {
                const [card1Index, card2Index] = room.flippedCards;
                const card1Symbol = room.gameBoard[card1Index];
                const card2Symbol = room.gameBoard[card2Index];

                if (card1Symbol === card2Symbol) {
                    // Match!
                    room.scores[playerId]++;
                    room.matchedCards.push(card1Index, card2Index);
                    
                    // Jogador continua jogando
                } else {
                    // Não match - próximo jogador
                    room.currentTurn = playerId === 'player1' ? 'player2' : 'player1';
                }

                // Limpar cartas viradas após um tempo
                setTimeout(() => {
                    room.flippedCards = [];
                    io.to(roomCode).emit('cards-flipped-back', {
                        card1Index,
                        card2Index,
                        isMatch: card1Symbol === card2Symbol
                    });
                    
                    // Verificar fim de jogo
                    if (room.matchedCards.length === 16) {
                        room.gameEnded = true;
                        io.to(roomCode).emit('game-ended', room);
                    }
                    
                    io.to(roomCode).emit('game-updated', room);
                }, 1500);
            }

        } else if (room.gameMode === 'cooperative') {
            // Modo cooperativo - cada jogador escolhe uma carta
            if (!room.cooperativeState.waitingForSecondCard) {
                // Primeira carta
                room.cooperativeState.waitingForSecondCard = true;
                room.cooperativeState.firstCardPlayer = playerId;
                room.cooperativeState.firstCardIndex = cardIndex;
                room.flippedCards = [cardIndex];
                
                // Próximo jogador deve escolher
                room.currentTurn = playerId === 'player1' ? 'player2' : 'player1';
                
            } else {
                // Segunda carta
                if (playerId === room.cooperativeState.firstCardPlayer) {
                    // Mesmo jogador não pode escolher duas vezes seguidas
                    return;
                }

                const firstCardIndex = room.cooperativeState.firstCardIndex;
                const secondCardIndex = cardIndex;
                
                room.flippedCards = [firstCardIndex, secondCardIndex];
                
                const card1Symbol = room.gameBoard[firstCardIndex];
                const card2Symbol = room.gameBoard[secondCardIndex];

                if (card1Symbol === card2Symbol) {
                    // Match! Ambos ganham pontos
                    room.scores.player1++;
                    room.scores.player2++;
                    room.matchedCards.push(firstCardIndex, secondCardIndex);
                } else {
                    // Não match - continua tentando
                }

                // Reset estado cooperativo
                room.cooperativeState = {
                    waitingForSecondCard: false,
                    firstCardPlayer: null,
                    firstCardIndex: null
                };

                // Próximo turno alterna
                room.currentTurn = room.cooperativeState.firstCardPlayer === 'player1' ? 'player2' : 'player1';

                // Limpar cartas viradas após um tempo
                setTimeout(() => {
                    room.flippedCards = [];
                    io.to(roomCode).emit('cards-flipped-back', {
                        card1Index: firstCardIndex,
                        card2Index: secondCardIndex,
                        isMatch: card1Symbol === card2Symbol
                    });
                    
                    // Verificar fim de jogo
                    if (room.matchedCards.length === 16) {
                        room.gameEnded = true;
                        io.to(roomCode).emit('game-ended', room);
                    }
                    
                    io.to(roomCode).emit('game-updated', room);
                }, 1500);
            }
        }

        io.to(roomCode).emit('card-flipped', { 
            cardIndex, 
            playerId,
            gameState: room 
        });
        io.to(roomCode).emit('game-updated', room);
    });

    // Desconexão
    socket.on('disconnect', () => {
        console.log('Jogador desconectado:', socket.id);
        
        const roomCode = socket.roomCode;
        if (roomCode) {
            const room = rooms.get(roomCode);
            if (room) {
                room.players = room.players.filter(p => p.id !== socket.id);
                
                if (room.players.length === 0) {
                    rooms.delete(roomCode);
                } else {
                    io.to(roomCode).emit('player-disconnected', socket.id);
                    io.to(roomCode).emit('room-updated', room);
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '127.0.0.1', () => {
    console.log(`Servidor Love Match rodando na porta ${PORT}`);
});