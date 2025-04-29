import './App.css';
import { useState, useEffect, useRef } from "react";
import Vec2 from './Vec2';
import { Grid, Entities, TempDiagnosticCanvas, WaterAnimation } from './SVGComponents';
import { FullFreeze } from './math';
import { Clone, GameState } from './gameState';

export type SimulatorProps = {
  initialGameState: GameState
  setGameScreen: React.Dispatch<any>
}
export default function Simulator({initialGameState, setGameScreen}: SimulatorProps) {
  const [gameState, setGameState] = useState(initialGameState);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState(Vec2.zero());

  const simulationResolution = gameState.simulationResolution;
  const targetFPS = gameState.targetFPS;
  const rows = gameState.rows;
  const columns = gameState.columns;

  useEffect(() => {
    const handleResize = () => {
      if(!containerRef.current)
        throw new Error("No containerRef found");
      const { width, height } = containerRef.current.getBoundingClientRect();
      setContainerSize(new Vec2(width, height));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  let svgViewport = new Vec2(1000, 1000);
  if(!containerSize.Equals(Vec2.zero()))
    if(containerSize.x > containerSize.y) {
      svgViewport = svgViewport.Mult(containerSize.x / containerSize.y, 1)
    } else {
      svgViewport = svgViewport.Mult(1, containerSize.y / containerSize.x)
    }
  let svgGameAnchor = svgViewport.Mult(1/2).Sub(new Vec2(500, 500));

  const min = Math.min(containerSize.x, containerSize.y);
  const gameAnchor = containerSize.Sub(new Vec2(min, min)).Mult(1/2);
  

  useEffect(() => {
    console.log(gameState.heatPoints);
  }, [gameState.heatPoints?.length]);
  useEffect(() => {
    if(!gameState.gameFinished)
      return;

    if(gameState.isGameOver) {
      setGameScreen("game_over");
    } else {
      setGameScreen("game_won");
    }
  }, [gameState.gameFinished]);
  useEffect(() => {
    console.log("Starting simulation loop")

    // Simulate and update game state
    const interval = setInterval(() => setGameState(prev => {
      // Deep clone prev
      let next = {
        ...Clone(prev),
        simOffset: prev.simOffset.Add(prev.wind),
        time: prev.time + 1,
      };

      // Initialize everything if not initialized
      if(prev.simulations.length == 0) {
        throw new Error("GameState has no simulations to advance it.");
      }

      const simulations = [...next.simulations];
      for(let sim of simulations) {
        // Fly trap for <Strict> mutation bugs:
        FullFreeze(next);
        next = sim(next);
      }

      return next;
    }), 1000 / targetFPS)

    return () => {
      console.log("Performing cleanup")
      clearInterval(interval)
    }
  }, [])

  

  return (
    <>
      <div style={{ position: "absolute", width: "100%", height: "100%", left: "0%", top: "0%" }} ref={containerRef}>
        <svg
          style={{ position: "absolute", width: "100%", height: "100%", touchAction: "none"}}
          viewBox={`0 0 ${svgViewport.x} ${svgViewport.y}`}>
          <rect width={svgViewport.x} height={svgViewport.y} fill="lightblue"/>
        </svg>
        <WaterAnimation simOffset={gameState.simOffset} columns={columns*simulationResolution} rows={rows*simulationResolution} colors={[{x:0,r:100,g:100,b:100},{x:1,r:3,g:232,b:252}]} sampleScale={new Vec2(1,1).Mult(0.4)} style={{position: 'absolute', width: `${min}px`, height: `${min}px`, left: `${gameAnchor.x}px`, top: `${gameAnchor.y}px`}}/>
        <TempDiagnosticCanvas temps={gameState.temp} rows={rows * simulationResolution} columns={columns*simulationResolution} colors={[{x:16,r:0,g:0,b:255},{x:21,r:0,g:255,b:0},{x:26,r:255,g:0,b:0}]} style={{position: 'absolute', width: `${min}px`, height: `${min}px`, left: `${gameAnchor.x}px`, top: `${gameAnchor.y}px`}} filter={(pos, _) => {
          const gameCoords = pos.Mult(1/simulationResolution).Floor();
          // Uncomment for full temp diagnostic
          return gameState.entities.some(x => x.pos.Equals(gameCoords) && x.type == 'sensor');
        }}/>
        <svg
          style={{ position: "absolute", width: "100%", height: "100%", touchAction: "none"}}
          viewBox={`0 0 ${svgViewport.x} ${svgViewport.y}`}>
          <g transform={`translate(${svgGameAnchor.x}, ${svgGameAnchor.y})`}>
            {/*<TempDiagnostic temps={gameState.temp} width={1000} height={1000} rows={rows * simulationResolution} columns={columns * simulationResolution}/>*/}
            {/*<TempDiagnostic temps={gameState.temp} width={1000} height={1000} rows={rows * simulationResolution} columns={columns * simulationResolution} filter={(pos, _) => {
              const gameCoords = pos.Mult(1/simulationResolution).Floor()
              return gameState.entities.some(x => x.type == 'sensor' && x.pos.Equals(gameCoords));
            }}/>*/}
            <Entities entities={gameState.entities} width={1000} height={1000} rows={rows} columns={columns}/>           
          </g>
        </svg>
        <svg
          style={{ position: "absolute", width: "100%", height: "100%", touchAction: "none"}}
          viewBox={`0 0 ${svgViewport.x} ${svgViewport.y}`}>
          <g transform={`translate(${svgGameAnchor.x}, ${svgGameAnchor.y})`}>
            <Grid stroke='black' fill='none' rows={10} columns={10} width={1000} height={1000}/>
          </g>
        </svg>
      </div>
    </>
  )
}
