import { Clone, GameState } from './gameState';
import Vec2 from './Vec2';

export enum NodeType {
  Literal = 'literal',
  Sensor = 'sensor',
  Add = 'add',
  IfGreater = 'ifGreater',
  Controller = 'controller',
};

export type CodeGraph = {
  nodes: {[id: string]: NodeData}
  edges: EdgeData[]
}

export type NodeData = {
  id: string
  type: NodeType
  config: {[val:string]:any}
  inputHandles: string[]
  outputHandles: string[]
};

export type EdgeData = {
  from: string
  to: string
  fromHandle: string
  toHandle: string
};

type NodeSignal = {
  from: string
  to: string
  fromHandle: string
  toHandle: string
  value: any
};

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (typeof a !== typeof b || a == null || b == null) return false;

  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!deepEqual(a[key], b[key])) return false;
    }

    return true;
  }

  return false;
}

export default function ApplyGraph(nodes: {[key: string]: NodeData}, edges: EdgeData[], gameState: GameState, timeout: number = 200): GameState {
  let next = Clone(gameState);
  let priorSignals: NodeSignal[] = [];
  let signals: NodeSignal[] = [];
  for(const nodeId in nodes) {
    const node = nodes[nodeId]
    if(node.type == NodeType.Sensor) {
      const sensor = gameState.entities.find(x => x.id === node.config.value && x.type == 'sensor');
      if(!sensor)
        throw new Error(`Sensor id ${node.config.value} referenced by node ${nodeId} not present`);
      if(sensor.data.radius === undefined)
        throw new Error(`Sensor id ${node.config.value} does not have a set 'radius'. (Radius: ${sensor.data.radius}`);

      const pos: Vec2 = sensor.pos.Add(new Vec2(0.5, 0.5)).Mult(gameState.simulationResolution).Floor();
      
      let max = -Infinity
      for(let i = 0; i < gameState.temp.length; i++)
        for(let j = 0; j < gameState.temp[i].length; j++)
          if(pos.Sub(new Vec2(j, i)).SqrLength() < sensor.data.radius**2 && gameState.temp[i][j] > max)
            max = gameState.temp[i][j];

      edges.filter(x => x.from == nodeId).forEach(x => signals.push({
        value: max,
        from: nodeId,
        fromHandle: node.outputHandles[0],
        to: x.to,
        toHandle: x.toHandle,
      }));
    }
  }

  const start = Date.now();
  let timedout: boolean = false;
  while(!timedout) {
    // console.log('before literal spawning: ', [...signals]);
    // Make sure const nodes always have a sending output
    for(const nodeId in nodes) {
      if(nodes[nodeId].type == NodeType.Literal) {
        edges.filter(x => x.from === nodeId).forEach(x => {
          if(!signals.some(y => y.to === x.to && y.toHandle === x.toHandle))
          {
            const obj: NodeSignal = {
              value: nodes[nodeId].config.value,
              fromHandle: nodes[nodeId].outputHandles[0],
              from: nodeId,
              to: x.to,
              toHandle: x.toHandle,
            }
            signals.push(obj);
          }
        });
      }
    }
    // console.log('after literal spawning: ', [...signals]);
    if(deepEqual(signals, priorSignals))
      break;
    priorSignals = signals;

    let nextSignals: NodeSignal[] = [];
    for(const nodeId in nodes) {
      const node = nodes[nodeId];
      const incomingSignals = signals.filter(x => x.to === nodeId);
      // Optim
      if(incomingSignals.length === 0)
        continue;

      // Send a signal from a specific output handle through all open edges.
      const sendOutput = (val: any, fromHandle: string) =>
        edges.filter(x => x.from === nodeId && x.fromHandle === fromHandle).forEach(x => {
          if(!nextSignals.some(y => y.to === x.to && y.toHandle === x.toHandle))
            nextSignals.push({
              value: val,
              fromHandle,
              toHandle: x.toHandle,
              from: nodeId,
              to: x.to,
            });
        });

      // Check if a given output handle has any free outgoing edges
      const hasOutgoing = (fromHandle: string) => 
        edges.some(x => !nextSignals.some(y => x.to === y.to && x.toHandle === y.toHandle) && x.fromHandle === fromHandle && x.from === nodeId);

      switch(node.type) {
        case NodeType.Literal:
        case NodeType.Sensor:
          throw new Error(`Incoming signal to output-only node (id: ${nodeId})`);

        case NodeType.Add:
          if(hasOutgoing(node.outputHandles[0]))
          {
            // console.log('sending add output');
            sendOutput(incomingSignals.reduce((a,b) => a+b.value, 0), node.outputHandles[0]);
          }
          else
            nextSignals.push(...incomingSignals);
          break;

        case NodeType.IfGreater:
          const aInput = incomingSignals.find(x => x.toHandle === node.inputHandles[0]);
          const bInput = incomingSignals.find(x => x.toHandle === node.inputHandles[1]);
          if(!aInput || !bInput || !hasOutgoing(node.outputHandles[0]))
            nextSignals.push(...incomingSignals);
          else {
            const decision = aInput.value > bInput.value ? 1 : 0;
            sendOutput(decision, node.outputHandles[0]);
          }
          break;

        case NodeType.Controller:
          const activationInput = incomingSignals.find(x => x.toHandle == node.inputHandles[0]);
          if(!activationInput)
            throw new Error('Invalid state: controller node without its input passed prior optim check');

          const controller = gameState.entities.find(x => x.id === node.config.value && x.type === 'controller')
          if(!controller)
            throw new Error(`Controller id ${node.config.value} referenced by node ${node.id} not present`);

          next.heatPoints = next.heatPoints.filter(x => {
            if(x.source != 'controller')
              return true;

            const gridPos = x.pos.Div(gameState.simulationResolution).Floor();
            return !gridPos.Equals(controller.pos);
          });

          if(activationInput.value === 1)
          {
            console.log(`Have to trigger controller at index ${node.id}:`, activationInput.value);
            next.heatPoints = [
              ...next.heatPoints,
              {
                pos: controller.pos.Mult(gameState.simulationResolution).Add(new Vec2(0.5).Mult(gameState.simulationResolution)),
                source: 'controller',
                vel: Vec2.zero(),
                strength: 25,
              }
            ];
          }
          break;
      }
    }
    timedout = Date.now() - start >= timeout
    signals = nextSignals;
    // console.log('after propagation: ', [...signals]);
  }

  return next;
}
