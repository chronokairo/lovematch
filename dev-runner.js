const { spawn } = require('child_process');
const path = require('path');

// Iniciar servidor
console.log('🚀 Iniciando Love Match Development...');

const server = spawn('node', [path.join(__dirname, 'server.js')], {
    stdio: 'inherit',
    env: { ...process.env, PORT: 3000 }
});

// Aguardar um pouco e iniciar Electron
setTimeout(() => {
    console.log('🖥️ Iniciando Electron...');
    const electron = spawn('electron', ['.'], {
        stdio: 'inherit'
    });

    electron.on('close', () => {
        console.log('👋 Fechando servidor...');
        server.kill();
        process.exit(0);
    });
}, 3000);

server.on('error', (error) => {
    console.error('❌ Erro no servidor:', error);
});