import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ReactFlow, useNodesState, useEdgesState, addEdge, Handle, Position } from '@xyflow/react';
import calculateGraph from './calculate';
import Simulator from './simulator';
 
import '@xyflow/react/dist/style.css';
import './App.css';
import { GameStateLvl1 } from './gameState';

const ConstNode = ({data}) => {
  const { setConfig } = data;
  const [ value, setValue ] = useState(0);
  useEffect(() => setConfig({ value }), [value]);

  return (
    <>
      <div>
        <label htmlFor="number">Number: </label>
        <input id="number" type="number" onChange={(e) => setValue(+e.target.value)} className="nodrag" value={value} />
      </div>
      <Handle type="source" position={Position.Right} />
    </>
  )
}

const SensorNode = ({data}) => {
  const { setConfig, gameState } = data;
  let sensorIds = [];
  gameState.entities.forEach((x, i) => {
    if(x.type == 'sensor')
      sensorIds.push(i);
  });

  const [ value, setValue ] = useState(sensorIds[0]);
  useEffect(() => setConfig({ value }), [value]);

  return (
    <>
      <div>
        <label htmlFor="sensor">Sensor: </label>
        <select id="sensor" onChange={(e) => setValue(+e.target.value)} value={value}>
          {sensorIds.map((j, i) => 
            <option key={j} value={j}> Sensor {i+1} </option>)}
        </select>
      </div>
      <Handle type="source" position={Position.Right} />
    </>
  )
}

const AddNode = () => {
  return (
    <>
      <p> Additive node </p>
      <Handle type="target" id="a" position={Position.Left} />
      <Handle type="target" id="b" position={Position.Left} style={{top: 10}} />
      <Handle type="source" position={Position.Right} />
    </>
  );
}

const IfGreaterNode = ({data}) => {
  const { setConfig } = data;
  const [ threshold, setThreshold ] = useState(0);
  useEffect(() => setConfig({ threshold }), [threshold]);

  return (
    <>
      <Handle type="target" position={Position.Left} />
      <div>
        <label htmlFor="threshold"> Threshold: </label>
        <input id="threshold" type="number" onChange={(e) => setThreshold(+e.target.value)} className="nodrag" value={threshold} />
      </div>
      <Handle type="source" position={Position.Right} />
    </>
  )
}

const ControllerNode = ({data}) => {
  const { setConfig, gameState } = data;
  let controllerIds = [];
  gameState.entities.forEach((x, i) => {
    if(x.type == 'controller')
      controllerIds.push(i);
  });

  const [ value, setValue ] = useState(controllerIds[0]);
  useEffect(() => setConfig({ value }), [value]);

  return (
    <>
      <Handle type="target" position={Position.Left} />
      <div>
        <label htmlFor='controller'> Controller: </label>
        <select id='controller' onChange={(e) => setValue(+e.target.value)} value={value}>
          {controllerIds.map((j, i) =>
            <option key={j} value={j}> Controller {i+1} </option>)}
        </select>
      </div>
    </>
  )
}
 
const nodeTypes = {literal: ConstNode, sensor: SensorNode, add: AddNode, ifGreater: IfGreaterNode, controller: ControllerNode};
 
export default function App() {
  const nodeState = useRef({})
  const edgeState = useRef([])
  const [gameScreen, setGameScreen] = useState("programming")
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const gameState = GameStateLvl1(1);
 
  const addNode = useCallback((type) =>
    
    setNodes(nodes => {
      const sorted = nodes.sort((a, b) => +a.id - +b.id);
      const id = (sorted.length == 0) ? '1' : `${+sorted[sorted.length - 1].id + 1}`;
      nodeState.current[id] = {
        id,
        type,
        config: {}
      };

      const setConfig = (config) => {
        nodeState.current[id].config = config;
      }

      return [...sorted, {
        id,
        position: { x: 0, y: 0 },
        type,
        data: { setConfig, gameState }
      }];
    }), [setNodes])

  const onConnect = useCallback(
    (connection) => {
      edgeState.current.push({from: connection.source, to: connection.target});
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges],
  );

  if(gameScreen == "game_over") {
    alert("Aw, you died :(");
    setGameScreen("programming");
  }
  if(gameScreen == "game_won") {
    alert("Yay, you won!");
    setGameScreen("programming");
  }
  if(gameScreen == "programming") {
    return (
      <>
        <div style={{ width: '80vw', height: '100vh' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
          />
        </div>
        <div style={{ position: "absolute", left: "80vw", width: "20vw", height: "100vh", top: "0vh" }}>
          <button onClick={() => addNode('literal')}> Add number Input </button> <br/>
          <button onClick={() => addNode('sensor')}> Add sensor input </button> <br/>
          <button onClick={() => addNode('add')}> Add additive node </button> <br/>
          <button onClick={() => addNode('ifGreater')}> Add ifGreater node </button> <br/>
          <button onClick={() => addNode('controller')}> Add output node </button> <br/>
          <br/>
          <button onClick={() => {
            // calculateGraph(nodeState.current, edgeState.current);
            setGameScreen("simulation");
          }}> Calculate </button>
        </div>
      </>
    );
  } else {
    return (
      <Simulator rows={10} columns={10} initialGameState={GameStateLvl1(12, {nodes:nodeState.current, edges:edgeState.current})} setGameScreen={setGameScreen}/>
    );
  }
}
