import React, { useEffect } from "react";
import { axisLeft } from "d3-axis";
import { format } from "d3-format";
import { select, selectAll } from "d3-selection";
import { scaleLinear } from "d3-scale";

import "./TxSpeedGraph.css";

export function TxSpeedGraph(props) {
  const avgSpeed = 1000000; //a million satVByte each 10 minutes (aprox)

  const maxSpeed = Math.max(avgSpeed, props.speed);

  const layout = createLayout(props);

  const scale = scaleLinear().domain([0, maxSpeed]).range([0, props.height]);

  //UseEffect Hook
  useEffect(() => {
    dataViz(props.width, props.height, props.speed, layout, scale);
  });

  return (
    <div
      className="divSpeedChart"
      style={{
        width: layout.divSize.w + "px",
        height: layout.divSize.h + "px",
      }}
    >
      <svg
        id="svgSpeedChart"
        width={layout.svgSize.w}
        height={layout.svgSize.h}
      ></svg>
    </div>
  );
}

function createLayout(props) {
  return {
    divSize: { w: props.width, height: props.height },
    svgSize: { w: props.width - 10, height: props.height - 10 },
    graphMargin: { up: 10, left: 10 },
    textMargin: { up: 10, left: 10 },
    axisMargin: { up: 10, left: 10 },
  };
}

function dataViz(w, h, speed, layout, scale) {
  const svg = select("#svgSpeedChart");
  svg.selectAll("*").remove();
  const graph = svg
    .append("g")
    .attr("id", "svgGroup")
    .attr("transform", "translate(0," + layout.graphMargin.up + ")");
  drawBar(graph, speed, layout, scale);
  drawAxis(graph, speed, layout, scale);
}

function drawBar(graph, speeed, layout, scale) {}
function drawAxis(graph, speeed, layout, scale) {
  const { textMargin, axisMargin } = layout;
  const axis = axisLeft().scale(scale).tickFormat(format("~s"));
  graph
    .append("g")
    .attr("id", "leftAxis")
    .attr(
      "transform",
      "translate(" + (textMargin.left + axisMargin.left) + ",0)"
    )
    .call(axis);
}
