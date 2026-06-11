import { useCallback, useEffect, useRef } from 'react'
import { runLodEngine, type LodEngineInput, type LodEngineResult } from '../lib/lodCore'
import { MAP_CONFIG } from '../lib/mapConfig'
import type { WorkerRequest, WorkerResponse } from '../workers/mapLod.worker'

let workerSingleton: Worker | null = null

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') {
    return null
  }
  if (!workerSingleton) {
    workerSingleton = new Worker(new URL('../workers/mapLod.worker.ts', import.meta.url), {
      type: 'module',
    })
  }
  return workerSingleton
}

export function useMapLodEngine() {
  const seqRef = useRef(0)
  const pendingRef = useRef(new globalThis.Map<number, (r: LodEngineResult) => void>())

  useEffect(() => {
    const worker = getWorker()
    if (!worker) {
      return
    }
    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, result } = event.data
      pendingRef.current.get(id)?.(result)
      pendingRef.current.delete(id)
    }
    worker.addEventListener('message', onMessage)
    return () => worker.removeEventListener('message', onMessage)
  }, [])

  const compute = useCallback((input: LodEngineInput): Promise<LodEngineResult> => {
    const useWorker = input.compactNodes.length >= MAP_CONFIG.lodWorkerMinNodes
    if (!useWorker) {
      return Promise.resolve(runLodEngine(input))
    }

    const worker = getWorker()
    if (!worker) {
      return Promise.resolve(runLodEngine(input))
    }

    const id = ++seqRef.current
    return new Promise((resolve) => {
      pendingRef.current.set(id, resolve)
      worker.postMessage({ id, input } satisfies WorkerRequest)
    })
  }, [])

  return { compute }
}
