import { contextBridge, ipcRenderer, IpcRendererEvent, desktopCapturer } from 'electron'
import { Display } from './getBoundAndDisplay'
import { Bounds } from './screenshots'

type IpcRendererListener = (event: IpcRendererEvent, ...args: unknown[]) => void
type ScreenshotsListener = (...args: unknown[]) => void

export interface ScreenshotsData {
  bounds: Bounds
  display: Display
}

const map = new Map<ScreenshotsListener, Record<string, IpcRendererListener>>()

contextBridge.exposeInMainWorld('screenshots', {
  ready: () => {
    console.log('contextBridge ready')

    ipcRenderer.send('SCREENSHOTS:ready')
  },
  capture: async (display: Display) => {

    const sources = await ipcRenderer.invoke('SCREENSHOTS:getSources')

    if (!sources) {
      console.error(sources)
      console.error(display)
      throw new Error('没有获取到截图数据')
    }
    
    return sources
  },
  captured: () => {
    console.log('contextBridge captured')

    ipcRenderer.send('SCREENSHOTS:captured')
  },
  save: (arrayBuffer: ArrayBuffer, data: ScreenshotsData) => {
    console.log('contextBridge save', arrayBuffer, data)
    ipcRenderer.send('SCREENSHOTS:save', Buffer.from(arrayBuffer), data)
  },
  cancel: () => {
    console.log('contextBridge cancel')
    ipcRenderer.send('SCREENSHOTS:cancel')
  },
  ok: (arrayBuffer: ArrayBuffer, data: ScreenshotsData) => {
    console.log('contextBridge ok', arrayBuffer, data)

    ipcRenderer.send('SCREENSHOTS:ok', Buffer.from(arrayBuffer), data)
  },
  on: (channel: string, fn: ScreenshotsListener) => {
    console.log('contextBridge on', fn)

    const listener = (event: IpcRendererEvent, ...args: unknown[]) => fn(...args)

    const listeners = map.get(fn) ?? {}
    listeners[channel] = listener
    map.set(fn, listeners)

    ipcRenderer.on(`SCREENSHOTS:${channel}`, listener)
  },
  off: (channel: string, fn: ScreenshotsListener) => {
    console.log('contextBridge off', fn)

    const listeners = map.get(fn) ?? {}
    const listener = listeners[channel]
    delete listeners[channel]

    ipcRenderer.off(`SCREENSHOTS:${channel}`, listener)
  }
})
