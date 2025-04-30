import { Handle, Position } from "@xyflow/react";
import { useEffect, useState } from "react";
import { GameState } from "./gameState";

type UINodeData = {
  setConfig: (config: any) => void
  getConfig: () => any
  gameState: GameState
}

export const ConstNode = ({data}: {data: UINodeData}) => {
  const { setConfig, getConfig } = data;
  const initialValue = getConfig().value ?? 0;
  const [ value, setValue ] = useState(initialValue);
  useEffect(() => setConfig({ value: +value }), [value]);

  return (
    <>
      <div style={{ backgroundColor: "Canvas", border: "1px solid CanvasText", padding: "0px 10px 10px 10px" }}>
        <p> <u>Constant</u> </p>
        <div>
          <label htmlFor="number">Number: </label>
          <input id="number" type="number" onChange={(e) => setValue(e.target.value)} className="nodrag" value={value} />
        </div>
        <Handle type="source" position={Position.Right} id='out' />
      </div>
    </>
  )
}

export const SensorNode = ({data}: {data: UINodeData}) => {
  const { setConfig, gameState, getConfig } = data;
  let sensorIds: number[] = [];
  gameState.entities.forEach((x) => {
    if(x.type == 'sensor')
      sensorIds.push(x.id);
  });

  const initialValue = getConfig().value ?? sensorIds[0];
  const [ value, setValue ] = useState(initialValue);
  useEffect(() => setConfig({ value }), [value]);

  return (
    <>
      <div style={{ backgroundColor: "Canvas", border: "1px solid CanvasText", padding: "0px 10px 10px 10px" }}>
        <p> <u> Sensor reading </u> </p>
        <div>
          <label htmlFor="sensor">Sensor: </label>
          <select id="sensor" onChange={(e) => setValue(+e.target.value)} value={value}>
            {sensorIds.map((j, i) => 
              <option key={j} value={j}> Sensor {i+1} </option>)}
          </select>
        </div>
        <Handle type="source" position={Position.Right} id='out' />
      </div>
    </>
  )
}

export const AddNode = () => {
  return (
    <>
      <div style={{ backgroundColor: "Canvas", border: "1px solid CanvasText", padding: "5px 14px" }}>
        <p> <u> Add numbers </u> </p>
        <Handle type="target" id="a" position={Position.Left} style={{top: "25%"}} />
        <Handle type="target" id="b" position={Position.Left} style={{top: "75%"}} />
        <Handle type="source" id='out' position={Position.Right} />
      </div>
    </>
  );
}

export const IfGreaterNode = () => {
  return (
    <>
      <div style={{ backgroundColor: "Canvas", border: "1px solid CanvasText", padding: "0px 10px 10px 10px" }}>
        <p style={{textAlign: "center", padding: "0em 1em"}}> a <br/> &gt; <br/> b </p>
        <Handle type="target" id="a" position={Position.Left} style={{top: "25%"}} />
        <Handle type="target" id="b" position={Position.Left} style={{top: "75%"}} />
        <Handle type="source" id="out" position={Position.Right} />
      </div>
    </>
  )
}

export const ControllerNode = ({data}: {data: UINodeData}) => {
  const { setConfig, gameState, getConfig } = data;
  let controllerIds: number[] = [];
  gameState.entities.forEach((x) => {
    if(x.type == 'controller')
      controllerIds.push(x.id);
  });

  const [ value, setValue ] = useState(getConfig().value ?? controllerIds[0]);
  useEffect(() => setConfig({ value }), [value]);

  return (
    <>
      <div style={{ backgroundColor: "Canvas", border: "1px solid CanvasText", padding: "0px 10px 10px 10px" }}>
        <p style={{textAlign: "center"}}> <u> Activate controller </u> </p>
        <Handle type="target" id='in' position={Position.Left} />
        <div>
          <label htmlFor='controller'> Controller: </label>
          <select id='controller' onChange={(e) => setValue(+e.target.value)} value={value}>
            {controllerIds.map((j, i) =>
              <option key={j} value={j}> Controller {i+1} </option>)}
          </select>
        </div>
      </div>
    </>
  )
}

export const nodeTypes = {literal: ConstNode, sensor: SensorNode, add: AddNode, ifGreater: IfGreaterNode, controller: ControllerNode};
