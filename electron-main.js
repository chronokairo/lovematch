const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');
const findFreePort = require('find-free-port');

let mainWindow;
let serverProcess;
let serverPort = 3000;

// Função para iniciar o servidor backend
async function startServer() {
    try {
        // Encontrar uma porta livre
        const freePorts = await findFreePort(3000, 3100);
        serverPort = freePorts[0];
        
        console.log(`Iniciando servidor na porta ${serverPort}`);
        
        // Iniciar o servidor Node.js
        const serverPath = isDev ? 
            path.join(__dirname, 'server.js') : 
            path.join(process.resourcesPath, 'app', 'server.js');
            
        serverProcess = spawn('node', [serverPath], {
            env: { ...process.env, PORT: serverPort },
            stdio: isDev ? 'inherit' : 'pipe'
        });

        serverProcess.on('error', (error) => {
            console.error('Erro ao iniciar servidor:', error);
            dialog.showErrorBox('Erro', 'Falha ao iniciar o servidor do jogo.');
        });

        // Aguardar um pouco para o servidor inicializar
        return new Promise((resolve) => {
            setTimeout(resolve, 2000);
        });
        
    } catch (error) {
        console.error('Erro ao encontrar porta livre:', error);
        throw error;
    }
}

// Função para criar a janela principal
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true
        },
        show: false, // Não mostrar até estar pronto
        titleBarStyle: 'default',
        autoHideMenuBar: false
    });

    // Carregar a aplicação
    const startUrl = `http://localhost:${serverPort}`;
    mainWindow.loadURL(startUrl);

    // Mostrar quando pronto
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        if (isDev) {
            mainWindow.webContents.openDevTools();
        }
    });

    // Lidar com links externos
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Menu personalizado
    createMenu();
}

// Criar menu da aplicação
function createMenu() {
    const template = [
        {
            label: 'Love Match',
            submenu: [
                {
                    label: 'Sobre Love Match',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Sobre Love Match',
                            message: 'Love Match v1.0.0',
                            detail: 'Jogo de memória romântico com multiplayer.\n\nFeito com ❤️ para o Dia dos Namorados!'
                        });
                    }
                },
                { type: 'separator' },
                {
                    label: 'Reiniciar Jogo',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.reload();
                    }
                },
                { type: 'separator' },
                {
                    label: 'Sair',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Jogo',
            submenu: [
                {
                    label: 'Novo Jogo Solo',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.executeJavaScript(`
                            if (window.game) {
                                window.game.gameMode = 'single';
                                window.game.isMultiplayer = false;
                                window.game.showGameScreen();
                                window.game.createGameBoard();
                            }
                        `);
                    }
                },
                {
                    label: 'Modo Competitivo',
                    accelerator: 'CmdOrCtrl+1',
                    click: () => {
                        mainWindow.webContents.executeJavaScript(`
                            if (window.game) {
                                window.game.gameMode = 'competitive';
                                window.game.showMultiplayerLobby();
                            }
                        `);
                    }
                },
                {
                    label: 'Modo Cooperativo',
                    accelerator: 'CmdOrCtrl+2',
                    click: () => {
                        mainWindow.webContents.executeJavaScript(`
                            if (window.game) {
                                window.game.gameMode = 'cooperative';
                                window.game.showMultiplayerLobby();
                            }
                        `);
                    }
                },
                { type: 'separator' },
                {
                    label: 'Voltar ao Menu',
                    accelerator: 'Escape',
                    click: () => {
                        mainWindow.webContents.executeJavaScript(`
                            if (window.game) {
                                window.game.showModeSelection();
                            }
                        `);
                    }
                }
            ]
        },
        {
            label: 'Ajuda',
            submenu: [
                {
                    label: 'Como Jogar',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Como Jogar',
                            message: 'Love Match - Como Jogar',
                            detail: `🎮 MODOS DE JOGO:

• Solo: Encontre todos os 8 pares no menor tempo
• Competitivo: Compete contra um amigo
• Cooperativo: Trabalhem juntos como equipe

💕 COMO JOGAR:
1. Clique nas cartas para virá-las
2. Encontre os pares de símbolos românticos
3. Complete todos os pares para vencer!

⌨️ ATALHOS:
• Ctrl+N: Novo jogo solo
• Ctrl+1: Modo competitivo
• Ctrl+2: Modo cooperativo
• Ctrl+R: Reiniciar
• Esc: Voltar ao menu`
                        });
                    }
                },
                { type: 'separator' },
                {
                    label: 'Reportar Bug',
                    click: () => {
                        shell.openExternal('https://github.com/seu-usuario/lovematch/issues');
                    }
                }
            ]
        }
    ];

    // Ajustes específicos para macOS
    if (process.platform === 'darwin') {
        template[0].label = app.getName();
        template[0].submenu.unshift({
            label: 'Sobre ' + app.getName(),
            role: 'about'
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Event listeners do Electron
app.whenReady().then(async () => {
    try {
        await startServer();
        createWindow();
        
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
        
    } catch (error) {
        console.error('Erro ao inicializar aplicação:', error);
        dialog.showErrorBox('Erro de Inicialização', 
            'Não foi possível iniciar o Love Match. Tente executar como administrador.');
        app.quit();
    }
});

app.on('window-all-closed', () => {
    // Parar o servidor
    if (serverProcess) {
        serverProcess.kill();
    }
    
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    // Parar o servidor antes de sair
    if (serverProcess) {
        serverProcess.kill();
    }
});

// Prevenir múltiplas instâncias
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}