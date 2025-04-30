import React, { useCallback, useRef, useState } from 'react';
import { ReactFlow, addEdge, Background, OnNodesChange, applyNodeChanges, Node, Edge, OnEdgesChange, applyEdgeChanges, Connection, BackgroundVariant } from '@xyflow/react';
import Simulator from './simulator';
 
import '@xyflow/react/dist/style.css';
import './App.css';
import { GameStateLvl1 } from './gameState';
import { nodeTypes } from './nodeTypes';
import { EdgeData, NodeData, NodeType } from './execCode';

export default function App() {
  const nodeState = useRef<{[id: string]: NodeData}>({})
  const edgeState = useRef<EdgeData[]>([])
  const [gameScreen, setGameScreen] = useState("programming")
  const [nodes, setNodes] = useState<Node[]>([]);
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((eds) => applyNodeChanges(changes, eds)),
    [setNodes]
  );
  const [edges, setEdges] = useState<Edge[]>([]);
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const gameState = GameStateLvl1(1, false);
 
  const addNode = useCallback((type: NodeType) =>
    
    setNodes((nodes: Node[]): Node[] => {
      const id = nodes.reduce((a: number, b): number => a > +b.id ? a : +b.id, 1) + 1 + ''
      nodeState.current[id] = {
        id,
        type,
        config: {},
        inputHandles: [],
        outputHandles: ['out'],
      };
      if(type === NodeType.Controller)
        nodeState.current[id].inputHandles = ['in'];
      else if([NodeType.Add, NodeType.IfGreater].includes(type))
        nodeState.current[id].inputHandles = ['a', 'b'];

      const setConfig = (config: any) => {
        nodeState.current[id].config = config;
      }
      const getConfig = () => nodeState.current[id].config;

      return [...nodes, {
        id,
        position: { x: 0, y: 0 },
        type,
        data: { setConfig, gameState, getConfig }
      }];
    }), [setNodes])

  const onConnect = useCallback(
    (connection: Connection) => {
      edgeState.current.push({
        from: connection.source,
        to: connection.target,
        fromHandle: connection.sourceHandle ?? '',
        toHandle: connection.targetHandle ?? '',
      });
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
        <div style={{ width: '40vw', height: '100vh' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
          >
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>
        <div style={{ position: "absolute", left: "40vw", width: "10vw", height: "100vh", top: "0vh" }}>
          <button onClick={() => addNode(NodeType.Literal)}> Add number Input </button> <br/>
          <button onClick={() => addNode(NodeType.Sensor)}> Add sensor input </button> <br/>
          <button onClick={() => addNode(NodeType.Add)}> Add additive node </button> <br/>
          <button onClick={() => addNode(NodeType.IfGreater)}> Add ifGreater node </button> <br/>
          <button onClick={() => addNode(NodeType.Controller)}> Add controller node </button> <br/>
          <br/>
          <button onClick={() => {
            // calculateGraph(nodeState.current, edgeState.current);
            setGameScreen("simulation");
          }}> Calculate </button>
        </div>
        <div style={{ position: "absolute", left: "50vw", width: "50vw", height: "100vh", top: "0vh" }}>
          <Simulator initialGameState={GameStateLvl1(12, false)} setGameScreen={setGameScreen}/>
        </div>
      </>
    );
  } else {
    return (
      <>
        <Simulator initialGameState={GameStateLvl1(12, true, {nodes:nodeState.current, edges:edgeState.current})} setGameScreen={setGameScreen}/>
        <button style={{ position: "absolute", right: "40px", bottom: "40px" }} onClick={() => setGameScreen("programming")}> Back </button>
      </>
    );
  }
}
