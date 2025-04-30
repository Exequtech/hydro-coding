import ApplyGraph, { CodeGraph, NodeData, EdgeData } from "./execCode";
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

  // Originally meta-variables:
  targetFPS: number
  rows: number
  columns: number
  simulationResolution: number
  isGameOver: boolean
  gameFinished: boolean
  targetScore: number
}

export function BaseGameState(targetFPS: number, rows: number, columns: number, simulationResolution: number, simulations: Simulation[], targetScore = 0, isGameOver = false): GameState {
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

    targetFPS,
    rows,
    columns,
    simulationResolution,
    isGameOver,
    gameFinished: isGameOver,
    targetScore
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
    }, 1/100),
    Temps([18, 24],
          new Vec2(1, 1).Mult(0.05)),
    FarmIncome(1 / targetFPS, 10 / targetFPS),
  ];

  let realSimulations: Simulation[] = [
    (state) => {
      return {...state, coins: state.coins - 0.1 / targetFPS, score: state.score - 1 / targetFPS};
    },
    (state) => {
      if(!code)
        return state;
      return ApplyGraph(code.nodes, code.edges, state);
    },
    (state) => {
      if(state.score > 200)
        return {...state, isGameOver: false, gameFinished: true};
      return state;
    },
    GameOverCheck(),
  ];

  let simulations: Simulation[] = !real ? baseSimulations : [...baseSimulations, ...realSimulations];

  let ret: GameState = BaseGameState(
    targetFPS, rows, columns, simulationResolution, simulations, 200);

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
  ret.wind = new Vec2(-20, 0).Div(targetFPS)

  ret.heatPoints = [{
    source: 'random',
    pos: new Vec2(150, 50),
    strength: 20,
    vel: ret.wind,
  }];

  return ret;
}

// Deep cloning function
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

    targetFPS: state.targetFPS,
    rows: state.rows,
    columns: state.columns,
    simulationResolution: state.simulationResolution,
    isGameOver: state.isGameOver,
    gameFinished: state.gameFinished,
    targetScore: state.targetScore,
  }

  return ret;
}
