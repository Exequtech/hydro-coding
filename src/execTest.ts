import { GameStateLvl1 } from './gameState';
import ApplyGraph, { NodeType } from './execCode';
console.log("test running");

const nodes = {
  sensor: {
    id: 'sensor',
    type: NodeType.Sensor,
    config: { value: 0 },
    inputHandles: [],
    outputHandles: ['out'],
  },
  literalThreshold: {
    id: 'literalThreshold',
    type: NodeType.Literal,
    config: { value: 10 },
    inputHandles: [],
    outputHandles: ['out'],
  },
  ifGreater: {
    id: 'ifGreater',
    type: NodeType.IfGreater,
    config: {},
    inputHandles: ['a', 'b'],
    outputHandles: ['out'],
  },
  controller: {
    id: 'controller',
    type: NodeType.Controller,
    config: { value: 2 },
    inputHandles: ['trigger'],
    outputHandles: [],
  },
};

const edges = [
  { from: 'sensor', fromHandle: 'out', to: 'ifGreater', toHandle: 'a' },
  { from: 'literalThreshold', fromHandle: 'out', to: 'ifGreater', toHandle: 'b' },
  { from: 'ifGreater', fromHandle: 'out', to: 'controller', toHandle: 'trigger' },
];

const gameState = GameStateLvl1(12, true);

console.log(ApplyGraph(nodes, edges, gameState));
