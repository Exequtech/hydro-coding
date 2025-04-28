import { Noise } from "noisejs";
import { ApplyHeatpoints, GetEffectiveRadius, RayIntersectsBox } from "./math";
import Vec2 from "./Vec2";
import { GameState, Simulation } from "./gameState";

export function FarmIncome(coinRate: number, scoreRate: number): Simulation {
  return (prev: GameState): GameState => {
    const farms = prev.entities.filter(e => e.type == 'farm');
    const activeControllers = prev.heatPoints.filter(e => e.source == 'controller');
    return {
      ...prev,
      coins: prev.coins + (farms.length - activeControllers.length - 0.1) * coinRate,
      score: prev.score + (farms.length - activeControllers.length - 0.1) * scoreRate,
    };
  }
}

export function FarmSpawning(period: number, gameDimensions: Vec2): Simulation {
  return (prev: GameState): GameState => {
    if(prev.time % period == 0) {
      console.log("Spawning a farm");
      const possibleCoords: Vec2[] = [];
      for(let x = 0; x < gameDimensions.x; x++) {
        for(let y = 0; y < gameDimensions.y; y++) {
          const point = new Vec2(x, y);
          if(point.x == 0 || point.x == gameDimensions.x - 1)
            continue;
          if(point.y == 0 || point.y == gameDimensions.y - 1)
            continue;
          if(!prev.entities.some(e => e.pos.Equals(point))) {
            possibleCoords.push(point);
          }
        }
      }
      const middle = gameDimensions.Mult(1/2);
      possibleCoords.sort((a, b) => a.Sub(middle).SqrLength() - b.Sub(middle).SqrLength()); 
      let total = 0, weights: number[] = [];
      possibleCoords.forEach((_, i) => {
        let p = Math.exp(-i);
        total += p, weights.push(p);
      });
      let acc = 0, rand = Math.random()*total;
      let selected = 0;
      for(; selected < possibleCoords.length && acc <= rand; selected++)
        acc += weights[selected];
      const point = possibleCoords[selected]
      const noSensors = prev.entities.filter(x => x.type != 'sensor');

      return {
        ...prev,
        entities: [...noSensors, {
          id: noSensors.reduce((a, b) => a > b.id ? a : b.id, 0) + 1,
          type: 'farm',
          pos: point,
          data: {},
        }],
      }
    }
    return prev;
  }
}

export type HeatPointSpawner = (frequency: number, state: GameState, maxStrength: number) => {
  pos: Vec2,
  vel: Vec2,
  strength: number,
}

export function HeatPoints(spawner: HeatPointSpawner | null = null, frequency = 1/360, simDimensions = new Vec2(100, 100), maxStrength = 10, minEffect = 0.001, decayRate = 0.2): Simulation {
  if(spawner === null)
    spawner = (frequency, state, maxStrength) => {
      return {
        pos: new Vec2(state.rows, state.columns).Mult(state.simulationResolution).Random().Sub(state.wind.Div(frequency)),
        vel: state.wind,
        strength: Math.random() * maxStrength,
      };
    };

  return (prev: GameState): GameState => {
    let newHeatPoints = prev.heatPoints.filter(x => {
      if(x.source == 'controller') return true;

      const effectiveRadius = -Math.log(minEffect / (x.strength ?? 0)) / decayRate;
      const boxMin = new Vec2(0, 0), boxMax = simDimensions;
      const perd = new Vec2(-x.vel.y, x.vel.x).Mult(effectiveRadius);
      return RayIntersectsBox(x.pos.Sub(x.vel.Mult(effectiveRadius)), x.vel, boxMin, boxMax) ||
             RayIntersectsBox(x.pos.Add(perd), x.vel, boxMin, boxMax) ||
             RayIntersectsBox(x.pos.Sub(perd), x.vel, boxMin, boxMax);
    }).map(x => {
      return {
        pos: x.pos.Add(x.vel),
        strength: x.strength,
        source: x.source,
        vel: x.vel,
      };
    });

    let nextHeatPoint = prev.nextHeatPoint;
    if(prev.time >= prev.nextHeatPoint) {
      const { pos, vel, strength } = spawner(frequency, prev, maxStrength);
      nextHeatPoint = prev.time + Math.floor(-Math.log(Math.random()) / frequency);
      let spawnPosition = pos
      while((spawnPosition.x > 0 && spawnPosition.x < simDimensions.x) && (spawnPosition.y > 0 && spawnPosition.y < simDimensions.y))
        spawnPosition = spawnPosition.Sub(prev.wind);
      const heatPoint = {
        vel,
        source: 'random',
        pos,
        strength,
      };
      newHeatPoints.push(heatPoint);
      console.log("Heatpoint spawned: ", heatPoint);
      console.log("Current heatpoints: ", newHeatPoints);
    }
    return {...prev, heatPoints: newHeatPoints, nextHeatPoint};
  }
}

export function Temps(baseBounds= [18,24], sampleScale = new Vec2(1,1), simDimensions = new Vec2(100, 100), minEffect=0.001, decayRate=0.2): Simulation {
  const noise = new Noise(Math.random());
  return (prev: GameState): GameState => {
    const newTemps: number[][] = [];
    for(let i = 0;i < simDimensions.y; i++) {
      newTemps[i] = [];
      for(let j = 0;j < simDimensions.x; j++) {
        const point = new Vec2(j, i);
        const coordinate = point.Sub(prev.simOffset).Mult(sampleScale);
        const perlin = (noise.perlin2(coordinate.x, coordinate.y) + 1) / 2;
        newTemps[i][j] = baseBounds[0] + perlin * (baseBounds[1] - baseBounds[0]);
        newTemps[i][j] = ApplyHeatpoints(
          prev.heatPoints.filter(x => 
            GetEffectiveRadius(x, minEffect, decayRate)**2 >= x.pos.Sub(point).SqrLength()
          ), point, newTemps[i][j], decayRate);
      }
    }
    return {...prev, temp: newTemps};
  }
}

export function GameOverCheck(): Simulation {
  return (prev: GameState): GameState => {
    if(prev.coins < 0)
      return {...prev, isGameOver: true, gameFinished: true};
    const simResolution = prev.simulationResolution;
    for(let i = 0;i < prev.temp.length; i++) {
      for(let j = 0;j < prev.temp[i].length; j++) {
        const val = prev.temp[i][j];
        if(val >= 18 && val <= 24) {
          continue;
        }
        const gameCoords = new Vec2(j, i).Div(simResolution).Floor();
        if(prev.entities.some(x => x.pos.Equals(gameCoords) && x.type == 'farm'))
        {
          // alert(`Game over. Temperature is ${val} degrees on the farm at ${j}, ${i}`);
          return {...prev, isGameOver: true, gameFinished: true};
        }
      }
    }
    return prev;
  }
}
