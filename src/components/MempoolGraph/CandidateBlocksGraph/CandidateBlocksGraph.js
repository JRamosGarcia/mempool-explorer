import React, { useEffect } from "react";
import { axisLeft, axisRight } from "d3-axis";
//import { json } from "d3-fetch";
import { format } from "d3-format";
import { interpolateHcl } from "d3-interpolate";
import { scaleLinear } from "d3-scale";
import { select, selectAll } from "d3-selection";
//import { } from "d3-transition";
import { htmlTip } from "./HtmlTip";
import {
  createLayout,
  barPathFunction,
  drawAxis,
  drawVerticalTexts,
} from "../Utils/Utils";
import "./CandidateBlocksGraph.css";

const fullBlockWeight = 4000000;

//Props and props options, not needed but is usefull having all of them centralized
export const CandidateBlocksGraphProps = {
  verticalSize: "verticalSize",
  barWidth: "barWidth",
  by: "by",
  byOpt: { byNumTx: "byNumTx", byWeight: "byWeight", byBoth: "byBoth" },
  data: "data",
  onBlockSelected: "onBlockSelected",
};

export function CandidateBlocksGraph(props) {
  const layout = createLayout(props, "candidateBlocksGraph");

  //UseEffect Hook
  useEffect(() => {
    const prunedData = {
      candidateBlockRecapList: props.data.candidateBlockRecapList,
      totalWeight: props.data.totalWeight,
      totalTxs: props.data.totalTxs,
      maxSatVByte: props.data.maxSatVByte,
      numBlocks: props.data.numBlocks,
    };
    dataViz(prunedData, props, layout);
  });

  return (
    <div className="CandidateBlocksGraph">
      <svg
        id="svgCandidateBlocksGraph"
        width={layout.size.X}
        height={layout.size.Y}
      ></svg>
    </div>
  );
}

//Function that draws candidate blocks graph using d3 library
function dataViz(data, props, layout) {
  const svg = select("#svgCandidateBlocksGraph");
  svg.selectAll("*").remove();

  const infobox = select("#candidateBlocksInfobox");
  if (!infobox.empty()) {
    infobox.remove();
  }
  //groups all graph elements and transate them
  const graph = svg
    .append("g")
    .attr("id", "candidateBlocksGraphId")
    .attr("transform", "translate(0," + layout.graphMargin.up + ")");

  const scales = createScales(data, layout);

  drawBar(graph, data, props, layout, scales);

  const axis = axisBy(data, props, layout, scales);
  drawAxis(graph, layout, axis);

  drawVerticalTexts(graph, props, layout);
}

function axisBy(data, props, layout, scales) {
  const { scaleNumTx, scaleWeight } = scales;
  const { numBlocks } = data;

  const axis = { left: null, right: null };
  if (props.by === "byNumTx") {
    axis.left = axisLeft().scale(scaleNumTx).tickFormat(format("~s"));
  } else if (props.by === "byWeight" || props.by === "byBoth") {
    axis.left = axisLeft()
      .scale(scaleWeight)
      .tickValues([...Array(numBlocks).keys()].map((d) => d * fullBlockWeight))
      .tickFormat(format("~s"));
    if (props.by === "byBoth") {
      axis.right = axisRight().scale(scaleNumTx).tickFormat(format("~s"));
    }
  }
  return axis;
}

// Creates the scales used
function createScales(data, layout) {
  const { totalWeight, totalTxs, maxSatVByte } = data;
  const { barSize } = layout;

  const scales = {};
  //Various scales
  scales.scaleWeight = scaleLinear()
    .domain([0, totalWeight])
    .range([0, barSize.Y]);

  scales.scaleNumTx = scaleLinear().domain([0, totalTxs]).range([0, barSize.Y]);

  scales.scaleColor = scaleLinear()
    .interpolate(interpolateHcl)
    .domain([0, maxSatVByte])
    .range(["LightGreen", "red"]);

  return scales;
}

//Draw the Bar
function drawBar(graph, data, props, layout, scales) {
  const { textMargin, axisMargin } = layout;
  const { scaleColor } = scales;

  graph
    .append("g")
    .attr("id", "barGroupId")
    .attr(
      "transform",
      "translate(" + (textMargin.left + axisMargin.left) + ",0)"
    )
    .selectAll("path")
    .data(data.candidateBlockRecapList)
    .enter()
    .append("path")
    .attr("blockIndex", (d, i) => i)
    .style("fill", (d) => scaleColor(d.satVByte))
    .style("stroke", "grey")
    .style("stroke-width", "1")
    .attr("d", barPathFunction(props, layout, scales))
    .on("click", blockClick)
    .on("mouseover", blockMouseOver)
    .on("mouseout", blockMouseOut)
    .on("mousemove", blockMouseMove);

  function blockClick(datum, data, nodes) {
    props.onBlockSelected(this.attributes.blockIndex.nodeValue);
  }

  function blockMouseOver(datum, data) {
    select(this).style("fill", "grey");

    if (select("#candidateBlocksInfobox").empty()) {
      select("body")
        .append("div")
        .attr("id", "candidateBlocksInfobox")
        .html(htmlTip)
        .style("pointer-events", "none")
        .style("position", "fixed")
        .style("left", datum.clientX + 10 + "px")
        .style("top", datum.clientY + 10 + "px");

      selectAll("td.blockData")
        .data([
          parseInt(this.attributes.blockIndex.nodeValue) + 1 + "º",
          format(",")(data.weight),
          format(",")(data.totalFees),
          data.numTxs,
          format(".6f")(data.satVByte),
        ])
        .html((d) => d);
    }
  }

  function blockMouseOut() {
    select(this).style("fill", (d) => scaleColor(d.satVByte));

    const infobox = select("#candidateBlocksInfobox");
    if (!infobox.empty()) {
      infobox.remove();
    }
  }

  function blockMouseMove(datum) {
    const infobox = select("#candidateBlocksInfobox");
    if (!infobox.empty()) {
      infobox
        .style("left", datum.clientX + 10 + "px")
        .style("top", datum.clientY + 10 + "px");
    }
  }
}
