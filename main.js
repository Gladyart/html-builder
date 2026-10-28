const {app, BrowserWindow, dialog, ipcMain} = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
function createWindow(){
  const win = new BrowserWindow({width:1500,height:940,minWidth:1050,minHeight:650,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.loadFile('index.html');
}
app.whenReady().then(()=>{createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
ipcMain.handle('file:open',async(_e,filters)=>{const r=await dialog.showOpenDialog({properties:['openFile'],filters});if(r.canceled||!r.filePaths[0])return null;return {name:path.basename(r.filePaths[0]),content:await fs.readFile(r.filePaths[0],'utf8')};});
ipcMain.handle('file:save',async(_e,{name,content,filters})=>{const r=await dialog.showSaveDialog({defaultPath:name,filters});if(r.canceled||!r.filePath)return null;await fs.writeFile(r.filePath,content,'utf8');return r.filePath;});
