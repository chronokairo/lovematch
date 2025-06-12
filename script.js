class LoveMatchGame {
    constructor() {
        // Elementos DOM existentes
        this.gameBoard = document.getElementById('game-board');
        this.timerElement = document.getElementById('timer');
        this.movesElement = document.getElementById('moves');
        this.pairsElement = document.getElementById('pairs');
        this.loveMessage = document.getElementById('love-message');
        this.messageText = document.getElementById('message-text');
        this.victoryModal = document.getElementById('victory-modal');
        this.heartsContainer = document.getElementById('hearts-container');
        
        // Novos elementos para multiplayer
        this.modeSelection = document.getElementById('mode-selection');
        this.multiplayerLobby = document.getElementById('multiplayer-lobby');
        this.gameScreen = document.getElementById('game-screen');
        this.multiplayerInfo = document.getElementById('multiplayer-info');

        // Game state existente
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.startTime = null;
        this.gameTimer = null;
        this.isGameActive = true;

        // Multiplayer state
        this.isMultiplayer = false;
        this.roomCode = null;
        this.playerId = null;
        this.isHost = false;
        this.isMyTurn = false;
        this.playerScores = { player1: 0, player2: 0 };
        this.connectedPlayers = 0;
        this.gameState = null;
        this.pollInterval = null;

        // Símbolos românticos
        this.symbols = [
            'fas fa-heart',
            'fas fa-kiss',
            'fas fa-gift',
            'fas fa-ring',
            'fas fa-wine-glass',
            'fas fa-envelope',
            'far fa-heart',
            'fas fa-star'
        ];

        // Mensagens de amor
        this.loveMessages = [
            "Você é minha pessoa favorita! 💕",
            "Cada momento com você é especial ✨",
            "Meu coração bate mais forte por você 💓",
            "Você faz meus dias mais felizes 🌈",
            "Obrigado(a) por ser incrível 💖",
            "Você é meu raio de sol ☀️",
            "Amor não tem fim quando é verdadeiro 💝",
            "Você completa minha vida 🌟"
        ];

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startHeartParticles();
    }

    // Navegação entre telas
    showModeSelection() {
        this.modeSelection.classList.remove('hidden');
        this.multiplayerLobby.classList.add('hidden');
        this.gameScreen.classList.add('hidden');
    }

    showMultiplayerLobby() {
        this.modeSelection.classList.add('hidden');
        this.multiplayerLobby.classList.remove('hidden');
        this.gameScreen.classList.add('hidden');
    }

    showGameScreen() {
        this.modeSelection.classList.add('hidden');
        this.multiplayerLobby.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
        
        if (this.isMultiplayer) {
            this.multiplayerInfo.classList.remove('hidden');
            document.getElementById('back-to-lobby-btn').classList.remove('hidden');
        } else {
            this.multiplayerInfo.classList.add('hidden');
            document.getElementById('back-to-lobby-btn').classList.add('hidden');
        }
    }

    // Multiplayer API (simulada com localStorage para demo)
    async createRoom() {
        try {
            const roomCode = this.generateRoomCode();
            const gameState = {
                roomCode,
                players: [],
                gameBoard: null,
                currentTurn: 'player1',
                scores: { player1: 0, player2: 0 },
                gameStarted: false,
                gameEnded: false
            };

            // Simular API com localStorage
            localStorage.setItem(`room_${roomCode}`, JSON.stringify(gameState));
            
            this.roomCode = roomCode;
            this.playerId = 'player1';
            this.isHost = true;
            
            await this.joinRoom(roomCode);
            return roomCode;
        } catch (error) {
            console.error('Erro ao criar sala:', error);
            alert('Erro ao criar sala. Tente novamente.');
        }
    }

    async joinRoom(roomCode) {
        try {
            const gameStateStr = localStorage.getItem(`room_${roomCode}`);
            if (!gameStateStr) {
                throw new Error('Sala não encontrada');
            }

            const gameState = JSON.parse(gameStateStr);
            
            if (gameState.players.length >= 2) {
                throw new Error('Sala está cheia');
            }

            if (!this.playerId) {
                this.playerId = gameState.players.length === 0 ? 'player1' : 'player2';
            }

            if (!gameState.players.find(p => p.id === this.playerId)) {
                gameState.players.push({ 
                    id: this.playerId, 
                    ready: false 
                });
            }

            localStorage.setItem(`room_${roomCode}`, JSON.stringify(gameState));
            
            this.roomCode = roomCode;
            this.gameState = gameState;
            this.updateLobbyUI();
            this.startPolling();
            
            return true;
        } catch (error) {
            console.error('Erro ao entrar na sala:', error);
            alert(error.message);
            return false;
        }
    }

    async setPlayerReady() {
        if (!this.roomCode) return;

        try {
            const gameStateStr = localStorage.getItem(`room_${this.roomCode}`);
            const gameState = JSON.parse(gameStateStr);
            
            const player = gameState.players.find(p => p.id === this.playerId);
            if (player) {
                player.ready = true;
            }

            // Se ambos jogadores estão prontos, inicia o jogo
            if (gameState.players.length === 2 && 
                gameState.players.every(p => p.ready)) {
                
                gameState.gameStarted = true;
                gameState.gameBoard = this.generateGameBoard();
                gameState.currentTurn = 'player1';
            }

            localStorage.setItem(`room_${this.roomCode}`, JSON.stringify(gameState));
            this.gameState = gameState;

            if (gameState.gameStarted) {
                this.startMultiplayerGame();
            }
        } catch (error) {
            console.error('Erro ao marcar como pronto:', error);
        }
    }

    async makeMove(cardIndex) {
        if (!this.isMyTurn || !this.roomCode) return false;

        try {
            const gameStateStr = localStorage.getItem(`room_${this.roomCode}`);
            const gameState = JSON.parse(gameStateStr);
            
            if (!gameState.gameStarted || gameState.gameEnded) return false;

            // Simular movimento no estado do jogo
            const move = {
                playerId: this.playerId,
                cardIndex,
                timestamp: Date.now()
            };

            if (!gameState.currentMove) {
                gameState.currentMove = move;
            } else {
                // Segundo movimento do turno
                const firstMove = gameState.currentMove;
                const card1Symbol = gameState.gameBoard[firstMove.cardIndex];
                const card2Symbol = gameState.gameBoard[cardIndex];

                if (card1Symbol === card2Symbol) {
                    // Match!
                    gameState.scores[this.playerId]++;
                    gameState.matchedCards = gameState.matchedCards || [];
                    gameState.matchedCards.push(firstMove.cardIndex, cardIndex);
                } else {
                    // Não match - próximo jogador
                    gameState.currentTurn = this.playerId === 'player1' ? 'player2' : 'player1';
                }

                gameState.currentMove = null;
            }

            localStorage.setItem(`room_${this.roomCode}`, JSON.stringify(gameState));
            return true;
        } catch (error) {
            console.error('Erro ao fazer movimento:', error);
            return false;
        }
    }

    startPolling() {
        if (this.pollInterval) return;

        this.pollInterval = setInterval(async () => {
            if (!this.roomCode) return;

            try {
                const gameStateStr = localStorage.getItem(`room_${this.roomCode}`);
                if (!gameStateStr) return;

                const newGameState = JSON.parse(gameStateStr);
                
                if (JSON.stringify(newGameState) !== JSON.stringify(this.gameState)) {
                    this.gameState = newGameState;
                    this.handleGameStateUpdate();
                }
            } catch (error) {
                console.error('Erro no polling:', error);
            }
        }, 1000);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    handleGameStateUpdate() {
        if (!this.gameState) return;

        if (this.gameState.gameStarted && !this.isGameActive) {
            this.startMultiplayerGame();
        }

        this.updateLobbyUI();
        this.updateMultiplayerUI();
        this.isMyTurn = this.gameState.currentTurn === this.playerId;
    }

    updateLobbyUI() {
        if (!this.gameState) return;

        document.getElementById('current-room-code').textContent = this.roomCode;
        
        const player1Element = document.getElementById('player1');
        const player2Element = document.getElementById('player2');
        
        if (this.gameState.players.length >= 1) {
            const player1 = this.gameState.players[0];
            player1Element.classList.toggle('ready', player1.ready);
            player1Element.querySelector('.ready-status').textContent = 
                player1.ready ? 'Pronto!' : 'Aguardando...';
        }
        
        if (this.gameState.players.length >= 2) {
            const player2 = this.gameState.players[1];
            player2Element.classList.toggle('ready', player2.ready);
            player2Element.querySelector('.ready-status').textContent = 
                player2.ready ? 'Pronto!' : 'Aguardando...';
        }

        const readyBtn = document.getElementById('ready-btn');
        const myPlayer = this.gameState.players.find(p => p.id === this.playerId);
        if (myPlayer && myPlayer.ready) {
            readyBtn.textContent = 'Aguardando...';
            readyBtn.disabled = true;
        }
    }

    updateMultiplayerUI() {
        if (!this.isMultiplayer || !this.gameState) return;

        // Atualizar scores
        document.querySelector('#player1-score .score').textContent = 
            `${this.gameState.scores.player1} pares`;
        document.querySelector('#player2-score .score').textContent = 
            `${this.gameState.scores.player2} pares`;

        // Atualizar indicador de turno
        const turnText = document.getElementById('turn-text');
        const turnIndicator = turnText.parentElement;
        
        if (this.isMyTurn) {
            turnText.textContent = 'Sua vez!';
            turnIndicator.className = 'turn-indicator your-turn';
        } else {
            turnText.textContent = 'Turno do oponente';
            turnIndicator.className = 'turn-indicator opponent-turn';
        }

        // Destacar jogador ativo
        document.getElementById('player1-score').classList.toggle('active', 
            this.gameState.currentTurn === 'player1');
        document.getElementById('player2-score').classList.toggle('active', 
            this.gameState.currentTurn === 'player2');
    }

    generateRoomCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    generateGameBoard() {
        const cardSymbols = [...this.symbols, ...this.symbols];
        
        // Embaralhar
        for (let i = cardSymbols.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cardSymbols[i], cardSymbols[j]] = [cardSymbols[j], cardSymbols[i]];
        }
        
        return cardSymbols;
    }

    startMultiplayerGame() {
        this.isMultiplayer = true;
        this.isGameActive = true;
        this.showGameScreen();
        this.createGameBoard();
        this.isMyTurn = this.gameState.currentTurn === this.playerId;
        this.updateMultiplayerUI();
        
        if (this.playerId === 'player1') {
            this.startGame();
        }
    }

    // Modificações nas funções existentes para suportar multiplayer
    createGameBoard() {
        this.gameBoard.innerHTML = '';
        this.cards = [];
        
        let cardSymbols;
        if (this.isMultiplayer && this.gameState && this.gameState.gameBoard) {
            cardSymbols = this.gameState.gameBoard;
        } else {
            cardSymbols = [...this.symbols, ...this.symbols];
            
            for (let i = cardSymbols.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [cardSymbols[i], cardSymbols[j]] = [cardSymbols[j], cardSymbols[i]];
            }
        }

        cardSymbols.forEach((symbol, index) => {
            const card = this.createCard(symbol, index);
            this.gameBoard.appendChild(card);
            this.cards.push(card);
        });
    }

    createCard(symbol, index) {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.symbol = symbol;
        card.dataset.index = index;

        card.innerHTML = `
            <div class="card-face card-back">
                <i class="fas fa-question"></i>
            </div>
            <div class="card-face card-front">
                <i class="${symbol}"></i>
            </div>
        `;

        card.addEventListener('click', () => this.flipCard(card));
        return card;
    }

    async flipCard(card) {
        if (this.isMultiplayer && !this.isMyTurn) {
            return;
        }

        if (card.classList.contains('flipped') ||
            card.classList.contains('matched') ||
            this.flippedCards.length >= 2) {
            return;
        }

        if (this.startTime === null) {
            this.startGame();
        }

        card.classList.add('flipped');
        this.flippedCards.push(card);
        this.playSound('flip-sound');

        if (this.isMultiplayer) {
            await this.makeMove(parseInt(card.dataset.index));
        }

        if (this.flippedCards.length === 2) {
            this.moves++;
            this.updateMoves();
            setTimeout(() => this.checkMatch(), 600);
        }
    }

    checkMatch() {
        const [card1, card2] = this.flippedCards;
        const symbol1 = card1.dataset.symbol;
        const symbol2 = card2.dataset.symbol;

        if (symbol1 === symbol2) {
            card1.classList.add('matched');
            card2.classList.add('matched');
            this.matchedPairs++;
            this.updatePairs();
            this.playSound('match-sound');
            this.showLoveMessage();
            this.createHeartBurst(card1);
            this.createHeartBurst(card2);

            if (this.isMultiplayer) {
                this.gameState.scores[this.playerId]++;
                this.updateMultiplayerUI();
            }

            if (this.matchedPairs === 8) {
                setTimeout(() => this.gameWon(), 1000);
            }
        } else {
            setTimeout(() => {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
            }, 800);
        }

        this.flippedCards = [];
    }

    gameWon() {
        clearInterval(this.gameTimer);
        this.isGameActive = false;
        this.stopPolling();

        if (this.isMultiplayer) {
            const myScore = this.gameState.scores[this.playerId];
            const opponentId = this.playerId === 'player1' ? 'player2' : 'player1';
            const opponentScore = this.gameState.scores[opponentId];

            document.getElementById('victory-title').textContent = 
                myScore > opponentScore ? '🎉 Você Venceu! 🎉' : 
                myScore < opponentScore ? '😔 Você Perdeu 😔' : 
                '🤝 Empate! 🤝';

            document.getElementById('victory-message').textContent = 
                'Jogo finalizado!';

            document.getElementById('multiplayer-result').classList.remove('hidden');
            document.getElementById('final-player-pairs').textContent = myScore;
            document.getElementById('final-opponent-pairs').textContent = opponentScore;
        } else {
            document.getElementById('victory-title').textContent = '🎉 Parabéns! 🎉';
            document.getElementById('victory-message').textContent = 
                'Você encontrou todos os pares!';
            document.getElementById('multiplayer-result').classList.add('hidden');
        }

        document.getElementById('final-time').textContent = this.timerElement.textContent;
        document.getElementById('final-moves').textContent = this.moves;

        this.victoryModal.classList.remove('hidden');
        this.createVictoryParticles();
    }

    resetGame() {
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.startTime = null;
        this.isGameActive = true;

        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }

        this.timerElement.textContent = '00:00';
        this.movesElement.textContent = '0';
        this.pairsElement.textContent = '0';
        this.victoryModal.classList.add('hidden');
        this.loveMessage.classList.add('hidden');

        if (this.isMultiplayer) {
            this.showMultiplayerLobby();
            this.stopPolling();
            this.isMultiplayer = false;
            this.roomCode = null;
            this.playerId = null;
            this.gameState = null;
        } else {
            this.createGameBoard();
        }
    }

    setupEventListeners() {
        // Mode selection
        document.getElementById('single-player-btn').addEventListener('click', () => {
            this.isMultiplayer = false;
            this.showGameScreen();
            this.createGameBoard();
        });

        document.getElementById('multiplayer-btn').addEventListener('click', () => {
            this.showMultiplayerLobby();
        });

        // Lobby
        document.getElementById('create-room-btn').addEventListener('click', async () => {
            const roomCode = await this.createRoom();
            if (roomCode) {
                document.getElementById('room-info').classList.remove('hidden');
            }
        });

        document.getElementById('join-room-btn').addEventListener('click', () => {
            document.getElementById('room-input').classList.remove('hidden');
        });

        document.getElementById('join-confirm-btn').addEventListener('click', async () => {
            const roomCode = document.getElementById('room-code').value.toUpperCase();
            if (roomCode.length === 6) {
                const success = await this.joinRoom(roomCode);
                if (success) {
                    document.getElementById('room-input').classList.add('hidden');
                    document.getElementById('room-info').classList.remove('hidden');
                }
            }
        });

        document.getElementById('ready-btn').addEventListener('click', () => {
            this.setPlayerReady();
        });

        document.getElementById('back-to-menu').addEventListener('click', () => {
            this.stopPolling();
            this.showModeSelection();
        });

        // Game buttons
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.resetGame();
        });

        document.getElementById('back-to-lobby-btn').addEventListener('click', () => {
            this.resetGame();
        });

        document.getElementById('share-btn').addEventListener('click', () => {
            this.shareGame();
        });
    }

    // Métodos existentes permanecem iguais...
    showLoveMessage() {
        const randomMessage = this.loveMessages[Math.floor(Math.random() * this.loveMessages.length)];
        this.messageText.textContent = randomMessage;
        this.loveMessage.classList.remove('hidden');

        setTimeout(() => {
            this.loveMessage.classList.add('hidden');
        }, 3000);
    }

    createHeartBurst(card) {
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < 8; i++) {
            const heart = document.createElement('div');
            heart.innerHTML = '💖';
            heart.style.position = 'fixed';
            heart.style.left = centerX + 'px';
            heart.style.top = centerY + 'px';
            heart.style.fontSize = '20px';
            heart.style.pointerEvents = 'none';
            heart.style.zIndex = '1000';

            const angle = (i / 8) * Math.PI * 2;
            const distance = 100;
            const endX = centerX + Math.cos(angle) * distance;
            const endY = centerY + Math.sin(angle) * distance;

            document.body.appendChild(heart);

            heart.animate([
                { transform: 'translate(0, 0) scale(0)', opacity: 1 },
                { transform: `translate(${endX - centerX}px, ${endY - centerY}px) scale(1)`, opacity: 0 }
            ], {
                duration: 1000,
                easing: 'ease-out'
            }).addEventListener('finish', () => {
                heart.remove();
            });
        }
    }

    startGame() {
        this.startTime = Date.now();
        this.gameTimer = setInterval(() => this.updateTimer(), 1000);
    }

    updateTimer() {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        this.timerElement.textContent = `${minutes}:${seconds}`;
    }

    updateMoves() {
        this.movesElement.textContent = this.moves;
    }

    updatePairs() {
        this.pairsElement.textContent = this.matchedPairs;
    }

    createVictoryParticles() {
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const heart = document.createElement('div');
                heart.innerHTML = ['💖', '💕', '💘', '💝'][Math.floor(Math.random() * 4)];
                heart.style.position = 'fixed';
                heart.style.left = Math.random() * window.innerWidth + 'px';
                heart.style.top = '-50px';
                heart.style.fontSize = (Math.random() * 20 + 15) + 'px';
                heart.style.pointerEvents = 'none';
                heart.style.zIndex = '999';

                document.body.appendChild(heart);

                heart.animate([
                    { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
                    { transform: `translateY(${window.innerHeight + 100}px) rotate(360deg)`, opacity: 0 }
                ], {
                    duration: Math.random() * 2000 + 3000,
                    easing: 'linear'
                }).addEventListener('finish', () => {
                    heart.remove();
                });
            }, i * 100);
        }
    }

    startHeartParticles() {
        setInterval(() => {
            if (Math.random() < 0.3) {
                const heart = document.createElement('div');
                heart.className = 'heart-particle';
                heart.innerHTML = ['💕', '💖', '💘'][Math.floor(Math.random() * 3)];
                heart.style.left = Math.random() * window.innerWidth + 'px';
                heart.style.animationDuration = (Math.random() * 3 + 2) + 's';
                heart.style.animationDelay = Math.random() * 2 + 's';

                this.heartsContainer.appendChild(heart);

                setTimeout(() => {
                    heart.remove();
                }, 5000);
            }
        }, 2000);
    }

    shareGame() {
        const customMessage = document.getElementById('custom-love-message').value;
        const time = document.getElementById('final-time').textContent;
        const moves = document.getElementById('final-moves').textContent;

        let shareText;
        if (this.isMultiplayer) {
            const myScore = document.getElementById('final-player-pairs').textContent;
            const opponentScore = document.getElementById('final-opponent-pairs').textContent;
            shareText = customMessage ? 
                `${customMessage}\n\nJoguei Love Match multiplayer: ${myScore} x ${opponentScore} em ${time}! 💕\n\nJogue você também: ${window.location.href}` :
                `Joguei Love Match multiplayer: ${myScore} x ${opponentScore} em ${time}! 💕\n\nJogue você também: ${window.location.href}`;
        } else {
            shareText = customMessage ? 
                `${customMessage}\n\nJoguei Love Match e terminei em ${time} com ${moves} tentativas! 💕\n\nJogue você também: ${window.location.href}` :
                `Joguei Love Match e terminei em ${time} com ${moves} tentativas! 💕\n\nJogue você também: ${window.location.href}`;
        }

        if (navigator.share) {
            navigator.share({
                title: 'Love Match - Jogo do Dia dos Namorados',
                text: shareText,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(shareText).then(() => {
                alert('Texto copiado para a área de transferência!');
            });
        }
    }

    playSound(soundId) {
        const audio = document.getElementById(soundId);
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {
                // Ignore audio play errors
            });
        }
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new LoveMatchGame(); // Tornar global para Electron
});

// Add some CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes heartbeat {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
    
    .card:not(.flipped):not(.matched):hover {
        animation: heartbeat 1s infinite;
        transform: scale(1.05);
    }
    
    /* Remove hover effects das cartas viradas ou com match */
    .card.flipped:hover,
    .card.matched:hover {
        animation: none;
        transform: rotateY(180deg);
    }
    
    .card.matched:hover {
        transform: rotateY(180deg) scale(1.05);
    }
`;
document.head.appendChild(style);