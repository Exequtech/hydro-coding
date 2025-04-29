import { GameState, HeatPoint } from "./gameState";
import Vec2 from "./Vec2";

export type NodeType = 'literal' | 'sensor' | 'add' | 'ifGreater' | 'controller';

export interface NodeData {
  id: string;
  type: NodeType;
  config?: any;   // e.g., thresholds for ifGreater
  inputs?: string[]; // connected input node IDs
}

export type CodeGraph = {
  nodes: NodeState
  edges: Edge[]
}
// Example edge (you can also model edges separately if you prefer)
export interface Edge {
  from: string;  // source node id
  to: string;    // target node id
}

export interface NodeState {
  [id: string]: NodeData;
}

// Calculation context (store node values as they're resolved)
interface CalcContext {
  [id: string]: any;
}

type NodeSignal = {
  value: any
  nodeId: string
}

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

export function applyGraph(nodes: NodeState, edges: Edge[], gameState: GameState, timeout: number = 200): GameState {
  let priorSignals: NodeSignal[] = [];
  let signals: NodeSignal[] = [];
  for(const nodeId in nodes) {
    if(nodes[nodeId].type == 'literal') {
      edges.filter(x => x.from == nodeId).forEach(x => signals.push({
        value: nodes[nodeId].config.value,
        nodeId: x.to,
      }));
    }
  }

  do {

  } while(!deepEqual(priorSignals, signals));

  return gameState;
}

export default function calculateGraph(nodes: NodeState, edges: Edge[], gameState: GameState): GameState {
  const context: CalcContext = {};

  let heatPoints: HeatPoint[] = gameState.heatPoints;

  // Build a quick input -> output map
  const inputMap: { [id: string]: string[] } = {}; // nodeId -> [targetIds]

  for (const edge of edges) {
    if (!inputMap[edge.to]) inputMap[edge.to] = [];
    inputMap[edge.to].push(edge.from);
  }

  // Recursive resolver
  const resolve = (nodeId: string): any => {
    if (context.hasOwnProperty(nodeId)) {
      return context[nodeId];
    }

    const node = nodes[nodeId];
    if (!node) {
      throw new Error(`Unknown node: ${nodeId}`);
    }

    let inputValues: any[] = [];

    if (inputMap[nodeId]) {
      inputValues = inputMap[nodeId].map((inputId) => resolve(inputId));
    }

    let result: any;

    switch (node.type) {
      case 'literal':
        result = node.config?.value ?? 0;
        break;
      case 'sensor':
        let max = -Infinity;
        const sensor = gameState.entities.find(x => x.id == node.config.value && x.type == 'sensor')
        if(!sensor)
          throw new Error(`Sensor id ${node.config.value} referenced by node ${node.id} not present`);
        if(sensor.data.radius == undefined)
          throw new Error(`Sensor id ${node.config.value} does not have a set 'radius'. (Radius: ${sensor.data.radius}`);

        const Pos: Vec2 = sensor.pos.Add(new Vec2(0.5, 0.5)).Mult(gameState.simulationResolution).Floor();

        for(let i = 0; i < gameState.temp.length; i++)
          for(let j = 0; j < gameState.temp[i].length; j++)
            if(Pos.Sub(new Vec2(j, i)).SqrLength() < sensor.data.radius**2 && gameState.temp[i][j] > max)
              max = gameState.temp[i][j];

        result = max;
        break;
      case 'add':
        result = inputValues.reduce((acc, val) => acc + val, 0);
        break;
      case 'ifGreater':
        const [inputVal] = inputValues;
        const threshold = node.config?.threshold ?? 0;
        result = inputVal > threshold ? 1 : 0;
        break;
      case 'controller':
        const outputVal = inputValues[0];
        const controller = gameState.entities.find(x => x.id == node.config.value && x.type == 'controller')
        if(!controller)
          throw new Error(`Controller id ${node.config.value} referenced by node ${node.id} not present`);


        heatPoints = heatPoints.filter(x => {
          if(x.source != 'controller')
            return true;

          const gridPos = x.pos.Div(gameState.simulationResolution).Floor();
          return !gridPos.Equals(controller.pos);
        });

        if(outputVal == 1)
        {
          console.log(`Have to trigger controller at index ${node.id}:`, outputVal);
          heatPoints = [
            ...heatPoints,
            {
              pos: controller.pos.Mult(gameState.simulationResolution).Add(new Vec2(0.5).Mult(gameState.simulationResolution)),
              source: 'controller',
              vel: Vec2.zero(),
              strength: 25,
            }
          ];
        }
        result = outputVal; // Still save it for consistency
        break;
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }

    context[nodeId] = result;
    return result;
  };

  // Start calculation: only trigger output nodes
  for (const nodeId in nodes) {
    if (nodes[nodeId].type === 'controller') {
      resolve(nodeId);
    }
  }
  return {...gameState, heatPoints};
}
