import React, { ReactNode, useCallback, useRef, useState } from 'react';
import { ReactFlow, addEdge, Background, OnNodesChange, applyNodeChanges, Node, Edge, OnEdgesChange, applyEdgeChanges, Connection, BackgroundVariant } from '@xyflow/react';
import { CodeGraph } from './execCode';
import Simulator from './simulator';
 
import '@xyflow/react/dist/style.css';
import './App.css';
import { GameStateLvl1, GameStateLvl2 } from './gameState';
import { nodeTypes } from './nodeTypes';
import { EdgeData, NodeData, NodeType } from './execCode';

export default function App() {
  const nodeState = useRef<{[id: string]: NodeData}>({})
  const edgeState = useRef<EdgeData[]>([])
  const [gameScreen, setGameScreen] = useState("level_select")
  const [nodes, setNodes] = useState<Node[]>([]);
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      for(let change of changes) {
        if(change.type === 'remove')
          delete nodeState.current[change.id];
      }

      setNodes((eds) => applyNodeChanges(changes, eds));
    },
    [setNodes]
  );
  const [completedLevels, setCompletedLevels] = useState<{[levelnum: number]: boolean}>({});
  const [level, setLevel] = useState(0);
  const [edges, setEdges] = useState<Edge[]>([]);
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      console.log(changes);
      const removals = changes.filter(x => x.type === 'remove').map(x => x.id);
      const additions = changes.filter(x => x.type === 'add').map((x): EdgeData => {
        return {
            id: x.item.id,
            from: x.item.source,
            to: x.item.target,
            fromHandle: x.item.sourceHandle ?? '',
            toHandle: x.item.targetHandle ?? '',
        };
      });
      if(removals.length != 0 || additions.length != 0)
        edgeState.current = [
          ...edgeState.current.filter(x => !removals.includes(x.id)),
          ...additions,
        ];

      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges]
  );
  
  const levels = [
    (real: boolean, code?: CodeGraph) => GameStateLvl1(12, real, code),
    (real: boolean, code?: CodeGraph) => GameStateLvl2(12, real, code),
  ];

  const previewGameState = levels[level](false);
  const realGameState = levels[level](true, {nodes: nodeState.current, edges: edgeState.current});
 
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
        data: { setConfig, gameState: previewGameState, getConfig }
      }];
    }), [setNodes])

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge(connection, eds);
        const edge = newEdges.find(x => x.source === connection.source && x.sourceHandle === connection.sourceHandle && x.target === connection.target && x.targetHandle === connection.targetHandle);
        if(!edge)
          throw new Error('Added edge does not exist (impossible!)');
      
        edgeState.current = [
          ...edgeState.current.filter(x => x.id != edge.id),
          {
            id: edge.id,
            from: edge.source,
            to: edge.target,
            fromHandle: edge.sourceHandle ?? '',
            toHandle: edge.targetHandle ?? '',
          }
        ];

        return addEdge(connection, eds);
      });
    },
    [setEdges],
  );

  if(gameScreen == "game_over") {
    alert("Aw, you died :(");
    setGameScreen("programming");
  }
  if(gameScreen == "game_won") {
    setCompletedLevels(x => {
      return {...x, [level]: true};
    });
    alert("Yay, you won!");
    setGameScreen("level_select");
  }
  if(gameScreen == "level_select") {
    return (
      <>
        <div style={{ position: 'absolute', left: '10%', top: '10%', width: '80%', height: '80%', backgroundColor: 'Canvas', border: "1px solid CanvasText" }}>
          <h1 style={{margin: '20px 20px'}}> Select a level </h1>
          <div style={{ display: 'flex', margin: '20px 20px' }}>
            {(() => {
              let ret: ReactNode[] = [];
              for(let i = 0;i < levels.length; i++) {
                let disabled = true;
                if(i === 0)
                  disabled = false;
                else
                  disabled = !!!completedLevels[i-1];
                ret.push(<button onClick={() => {
                  setGameScreen("programming");
                  setLevel(i);
                }} key={i} disabled={disabled} style={{background: 'ButtonFace'}}> {i+1} </button>);
              }

              return ret;
            })()}
          </div>
        </div>
      </>
    );
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
          <Simulator initialGameState={previewGameState} setGameScreen={setGameScreen} real={false}/>
        </div>
      </>
    );
  } else {
    return (
      <>
        <Simulator initialGameState={realGameState} setGameScreen={setGameScreen} real={true}/>
        <button style={{ position: "absolute", right: "40px", bottom: "40px" }} onClick={() => setGameScreen("programming")}> Back </button>
      </>
    );
  }
}
