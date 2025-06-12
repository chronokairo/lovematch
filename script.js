class LoveMatchGame {
    constructor() {
        this.gameBoard = document.getElementById('game-board');
        this.timerElement = document.getElementById('timer');
        this.movesElement = document.getElementById('moves');
        this.pairsElement = document.getElementById('pairs');
        this.loveMessage = document.getElementById('love-message');
        this.messageText = document.getElementById('message-text');
        this.victoryModal = document.getElementById('victory-modal');
        this.heartsContainer = document.getElementById('hearts-container');
        
        // Game state
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.startTime = null;
        this.gameTimer = null;
        this.isGameActive = false;
        
        // Símbolos românticos
        this.symbols = [
            'fas fa-heart',
            'fas fa-kiss-wink-heart', 
            'fas fa-rose',
            'fas fa-ring',
            'fas fa-wine-glass',
            'fas fa-envelope-heart',
            'fas fa-gift',
            'fas fa-candy-cane'
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
        this.createGameBoard();
        this.setupEventListeners();
        this.startHeartParticles();
    }
    
    createGameBoard() {
        // Criar pares de cartas
        const cardSymbols = [...this.symbols, ...this.symbols];
        
        // Embaralhar
        for (let i = cardSymbols.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cardSymbols[i], cardSymbols[j]] = [cardSymbols[j], cardSymbols[i]];
        }
        
        // Criar elementos das cartas
        this.gameBoard.innerHTML = '';
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
    
    flipCard(card) {
        if (!this.isGameActive) {
            this.startGame();
        }
        
        if (card.classList.contains('flipped') || 
            card.classList.contains('matched') ||
            this.flippedCards.length >= 2) {
            return;
        }
        
        card.classList.add('flipped');
        this.flippedCards.push(card);
        this.playSound('flip-sound');
        
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
            // Match encontrado!
            card1.classList.add('matched');
            card2.classList.add('matched');
            this.matchedPairs++;
            this.updatePairs();
            this.playSound('match-sound');
            this.showLoveMessage();
            this.createHeartBurst(card1);
            this.createHeartBurst(card2);
            
            if (this.matchedPairs === 8) {
                setTimeout(() => this.gameWon(), 1000);
            }
        } else {
            // Não é match
            setTimeout(() => {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
            }, 1000);
        }
        
        this.flippedCards = [];
    }
    
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
        this.isGameActive = true;
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
    
    gameWon() {
        clearInterval(this.gameTimer);
        this.isGameActive = false;
        
        document.getElementById('final-time').textContent = this.timerElement.textContent;
        document.getElementById('final-moves').textContent = this.moves;
        
        this.victoryModal.classList.remove('hidden');
        this.createVictoryParticles();
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
    
    setupEventListeners() {
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.resetGame();
        });
        
        document.getElementById('share-btn').addEventListener('click', () => {
            this.shareGame();
        });
    }
    
    resetGame() {
        // Reset game state
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.isGameActive = false;
        
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
        }
        
        // Reset UI
        this.timerElement.textContent = '00:00';
        this.movesElement.textContent = '0';
        this.pairsElement.textContent = '0';
        this.victoryModal.classList.add('hidden');
        this.loveMessage.classList.add('hidden');
        
        // Recreate board
        this.createGameBoard();
    }
    
    shareGame() {
        const customMessage = document.getElementById('custom-love-message').value;
        const time = document.getElementById('final-time').textContent;
        const moves = document.getElementById('final-moves').textContent;
        
        const shareText = customMessage ? 
            `${customMessage}\n\nJoguei Love Match e terminei em ${time} com ${moves} tentativas! 💕\n\nJogue você também: ${window.location.href}` :
            `Joguei Love Match e terminei em ${time} com ${moves} tentativas! 💕\n\nJogue você também: ${window.location.href}`;
        
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
                // Ignore audio play errors (some browsers require user interaction)
            });
        }
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoveMatchGame();
});

// Add some CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes heartbeat {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
    
    .card:hover {
        animation: heartbeat 1s infinite;
    }
`;
document.head.appendChild(style);