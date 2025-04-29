import React, { useCallback, useRef, useState } from 'react';
import { ReactFlow, addEdge, Background, OnNodesChange, applyNodeChanges, Node, Edge, OnEdgesChange, applyEdgeChanges, Connection, BackgroundVariant } from '@xyflow/react';
import Simulator from './simulator';
 
import '@xyflow/react/dist/style.css';
import './App.css';
import { GameStateLvl1 } from './gameState';
import { nodeTypes } from './nodeTypes';
import { NodeState, NodeType } from './calculate';

export default function App() {
  const nodeState = useRef<NodeState>({})
  const edgeState = useRef<{from: string, to: string}[]>([])
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

  const gameState = GameStateLvl1(1);
 
  const addNode = useCallback((type: NodeType) =>
    
    setNodes(nodes => {
      const sorted = nodes.sort((a, b) => +a.id - +b.id);
      const id = (sorted.length == 0) ? '1' : `${+sorted[sorted.length - 1].id + 1}`;
      nodeState.current[id] = {
        id,
        type,
        config: {}
      };

      const setConfig = (config: any) => {
        nodeState.current[id].config = config;
      }
      const getConfig = () => nodeState.current[id].config;

      return [...sorted, {
        id,
        position: { x: 0, y: 0 },
        type,
        data: { setConfig, gameState, getConfig }
      }];
    }), [setNodes])

  const onConnect = useCallback(
    (connection: Connection) => {
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
          >
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>
        <div style={{ position: "absolute", left: "80vw", width: "20vw", height: "100vh", top: "0vh" }}>
          <button onClick={() => addNode('literal')}> Add number Input </button> <br/>
          <button onClick={() => addNode('sensor')}> Add sensor input </button> <br/>
          <button onClick={() => addNode('add')}> Add additive node </button> <br/>
          <button onClick={() => addNode('ifGreater')}> Add ifGreater node </button> <br/>
          <button onClick={() => addNode('controller')}> Add controller node </button> <br/>
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
