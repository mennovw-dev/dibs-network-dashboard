import { runLodEngine, type LodEngineInput, type LodEngineResult } from '../lib/lodCore'

export type WorkerRequest = { id: number; input: LodEngineInput }
export type WorkerResponse = { id: number; result: LodEngineResult }

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, input } = event.data
  const result = runLodEngine(input)
  self.postMessage({ id, result } satisfies WorkerResponse)
}
