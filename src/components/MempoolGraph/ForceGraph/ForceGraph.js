import React, { useEffect } from "react";
import {
  forceLink,
  forceSimulation,
  forceManyBody,
  forceCenter,
} from "d3-force";
import { select } from "d3-selection";
import { scaleLinear } from "d3-scale";
import { interpolateHcl } from "d3-interpolate";
import "./ForceGraph.css";

const clone = require("rfdc")();

export function ForceGraph(props) {
  const layout = createLayout(props);

  const cData = clone(props.data); //never change incoming data
  // const cData = props.data; //never change incoming data
  processData(cData);

  const scaleColor = scaleLinear()
    .interpolate(interpolateHcl)
    .domain([cData.minSatVByte, cData.maxSatVByte])
    .range(["LightGreen", "red"]);

  //UseEffect Hook
  useEffect(() => {
    const sim = dataViz(props.width, props.height, layout, scaleColor, cData);
    return function stop() {
      sim.stop();
    };
  });

  return (
    <div
      className="divForceGraph"
      width={layout.divSize.X}
      height={layout.divSize.Y}
    >
      <svg
        id="svgForceGraph"
        width={layout.svgSize.X}
        height={layout.svgSize.Y}
      ></svg>
    </div>
  );
}

function createLayout(props) {
  const margins = {};
  const sizes = {
    divSize: { X: props.width, Y: props.height },
    svgSize: { X: props.width, Y: props.height },
  };

  const layout = { ...margins, ...sizes };
  return layout;
}

function dataViz(x, y, layout, scaleColor, cData) {
  const { nodes, edges, nodeIdFn, edgeOriginFn, edgeDestinationFn } = cData;

  /*const nodeHash = nodes.reduce((hash, node) => {
    hash[nodeIdFn(node)] = node;
    return hash;
  }, {});
*/
  const nodeRadius = 15;
  const nodeStrokeWidth = 3;

  //console.log(nodeHash);

  edges.forEach((edge) => {
    //edge.weight = parseInt(edge.weight);
    edge.source = nodes[edgeOriginFn(edge)];
    edge.target = nodes[edgeDestinationFn(edge)];
  });

  console.log("nodes: ", nodes);
  console.log("edges: ", edges);

  const sim = forceSimulation(nodes)
    .force("charge", forceManyBody().strength(-400))
    .force("link", forceLink(edges))
    .force(
      "center",
      forceCenter()
        .x(layout.svgSize.X / 2)
        .y(layout.svgSize.Y / 2)
    )
    .on("tick", forceTick);

  select("#svgForceGraph").selectAll("*").remove();

  select("#svgForceGraph")
    .selectAll("line.link")
    .data(edges)
    .enter()
    .append("line")
    .attr("class", "link")
    .style("stroke", "black")
    .style("stroke-width", 1);

  const nodeGroup = select("#svgForceGraph")
    .selectAll("g.node")
    .data(nodes)
    .enter()
    .append("g")
    .attr("class", "node");

  nodeGroup
    .append("circle")
    .attr("r", nodeRadius)
    .style("fill", (n) => scaleColor(n.satVByte))
    .style("stroke-width", nodeStrokeWidth)
    .style("stroke-dasharray", (n) =>
      n.bip125Replaceable === true ? "6,6" : "none"
    )
    .style("stroke", (n) => (n.index !== 0 ? "lightGrey" : "DarkSlateGray"));

  nodeGroup
    .append("text")
    .style("text-anchor", "middle")
    .style("font-size", 9)
    .style("pointer-events", "none")
    .attr("y", 3)
    .text((n) => n.txId.substr(0, 4));

  select("#svgForceGraph")
    .append("defs")
    .append("marker")
    .attr("id", "triangle")
    .attr("refX", nodeRadius + nodeStrokeWidth + 12)
    .attr("refY", 6)
    .attr("markerUnits", "userSpaceOnUse")
    .attr("markerWidth", 12)
    .attr("markerHeight", 18)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M 0 0 12 6 0 12 3 6");

  select("#svgForceGraph")
    .selectAll("line.link")
    .attr("marker-end", "url(#triangle)");

  function forceTick() {
    select("#svgForceGraph")
      .selectAll("g.node")
      .attr("transform", (n) => {
        const totalRadius = nodeRadius + nodeStrokeWidth;
        n.x = Math.max(
          totalRadius,
          Math.min(layout.svgSize.X - totalRadius, n.x)
        );
        n.y = Math.max(
          totalRadius,
          Math.min(layout.svgSize.Y - totalRadius, n.y)
        );
        return `translate(${n.x},${n.y})`;
      });

    select("#svgForceGraph")
      .selectAll("line.link")
      .attr("x1", (e) => nodes[edgeOriginFn(e)].x)
      .attr("x2", (e) => nodes[edgeDestinationFn(e)].x)
      .attr("y1", (e) => nodes[edgeOriginFn(e)].y)
      .attr("y2", (e) => nodes[edgeDestinationFn(e)].y);
  }

  return sim;
}

function processData(cData) {
  cData.maxSatVByte = 0;
  cData.minSatVByte = Number.MAX_VALUE;
  cData.nodes.forEach((n) => {
    n.satVByte = n.baseFee / (n.weight / 4);
    cData.maxSatVByte = Math.max(cData.maxSatVByte, n.satVByte);
    cData.minSatVByte = Math.min(cData.minSatVByte, n.satVByte);
  });
}
