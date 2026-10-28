const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('kbFiles',{
 open:(filters)=>ipcRenderer.invoke('file:open',filters),
 save:(data)=>ipcRenderer.invoke('file:save',data)
});
