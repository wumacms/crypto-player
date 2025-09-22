const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
}

ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Videos', extensions: ['mp4'] }
        ]
    });

    if (!result.canceled) {
        return result.filePaths[0];
    }
    return null;
});

ipcMain.handle('encrypt-video', async (event, filePath, password) => {
    try {
        const videoData = fs.readFileSync(filePath);
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(password, 'salt', 32);
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(videoData);
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        const encryptedData = {
            iv: iv.toString('hex'),
            encryptedData: encrypted.toString('hex')
        };

        const outputPath = filePath + '.encrypted';
        fs.writeFileSync(outputPath, JSON.stringify(encryptedData));

        return outputPath;
    } catch (error) {
        throw error;
    }
});

ipcMain.handle('decrypt-video', async (event, filePath, password) => {
    try {
        const encryptedData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(password, 'salt', 32);
        const iv = Buffer.from(encryptedData.iv, 'hex');

        const encryptedText = Buffer.from(encryptedData.encryptedData, 'hex');
        const decipher = crypto.createDecipheriv(algorithm, key, iv);

        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        const outputPath = filePath.replace('.encrypted', '_decrypted.mp4');
        fs.writeFileSync(outputPath, decrypted);

        return outputPath;
    } catch (error) {
        throw error;
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});