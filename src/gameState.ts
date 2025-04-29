import calculateGraph, { CodeGraph, Edge, NodeState } from "./calculate";
import { GameOverCheck } from "./simulation";
import { FarmIncome } from "./simulation";
import { Temps } from "./simulation";
import { HeatPoints } from "./simulation";
import Vec2 from "./Vec2";

type EntityType = 'sensor' | 'farm' | 'controller';

export type Entity = {
  id: number
  pos: Vec2
  type: EntityType
  data: {
    radius?: number
  },
}

export type HeatPointSource = 'random' | 'controller'
export type HeatPoint = {
  pos: Vec2
  strength: number
  source: HeatPointSource
  vel: Vec2
}

export type Simulation = (prev: GameState) => GameState;

export type GameState = {
  entities: Entity[]
  wind: Vec2
  simOffset: Vec2
  heatPoints: HeatPoint[]
  nextHeatPoint: number
  temp: number[][]
  simulations: Simulation[]
  coins: number
  score: number
  time: number
  code: {
    nodes: NodeState
    edges: Edge[]
  }

  // Originally meta-variables:
  targetFPS: number
  rows: number
  columns: number
  simulationResolution: number
  isGameOver: boolean
  gameFinished: boolean
}

export function BaseGameState(targetFPS: number, rows: number, columns: number, simulationResolution: number, simulations: Simulation[], isGameOver = false): GameState {
  let ret: GameState = {
    entities: [],
    wind: Vec2.zero(),
    simOffset: Vec2.zero(),
    heatPoints: [],
    nextHeatPoint: 0,
    temp: [],
    simulations,
    coins: 0,
    score: 0,
    time: 0,
    code: {
      nodes: {},
      edges: [],
    },

    targetFPS,
    rows,
    columns,
    simulationResolution,
    isGameOver,
    gameFinished: isGameOver,
  }

  for(let i = 0;i < rows * simulationResolution; i++) {
    ret.temp[i] = []
    for(let j = 0;j < columns * simulationResolution; j++) {
      ret.temp[i][j] = 0;
    }
  }

  return ret;
}

export function GameStateLvl1(targetFPS: number, real: boolean, code?: CodeGraph): GameState {
  const rows = 10, columns = 10, simulationResolution = 10;
  let baseSimulations: Simulation[] = [
    HeatPoints((_, state, maxStrength) => {
      return {
        pos: new Vec2(150, 50),
        strength: Math.random() * maxStrength,
        vel: state.wind,
      };
    }),
    Temps([18, 24],
          new Vec2(1, 1).Mult(0.05)),
    FarmIncome(1 / targetFPS, 10 / targetFPS),
  ];

  let realSimulations: Simulation[] = [
    GameOverCheck(),
    (state) => {
      if(!code)
        return state;
      return calculateGraph(code.nodes, code.edges, state);
    },
    (state) => {
      if(state.score > 5000)
        return {...state, isGameOver: false, gameFinished: true};
      return state;
    },
  ];

  let simulations: Simulation[] = !real ? baseSimulations : [...baseSimulations, ...realSimulations];

  let ret: GameState = BaseGameState(
    targetFPS, rows, columns, simulationResolution, simulations);

  ret.entities = [
    {
      id: 0,
      type: 'sensor',
      pos: new Vec2(5, 5),
      data: {
        radius: 20,
      },
    },
    {
      id: 1,
      type: 'farm',
      pos: new Vec2(4, 5),
      data: {},
    },
    {
      id: 2,
      type: 'controller',
      pos: new Vec2(4, 4),
      data: {},
    }
  ];
  ret.wind = new Vec2(-10, 0).Div(targetFPS)

  return ret;
}

export function Clone(state: GameState): GameState {
  let ret : GameState = {
    entities: [...state.entities],
    wind: state.wind,
    simOffset: state.simOffset,
    heatPoints: state.heatPoints.map(x => {return {
      pos: x.pos,
      strength: x.strength,
      source: x.source,
      vel: x.vel,
    };}),
    nextHeatPoint: state.nextHeatPoint,
    temp: state.temp.map(row => [...row]),
    simulations: state.simulations,
    coins: state.coins,
    score: state.score,
    time: state.time,
    code: {
      nodes: {...state.code.nodes},
      edges: [...state.code.edges],
    },

    targetFPS: state.targetFPS,
    rows: state.rows,
    columns: state.columns,
    simulationResolution: state.simulationResolution,
    isGameOver: state.isGameOver,
    gameFinished: state.gameFinished,
  }

  return ret;
}
