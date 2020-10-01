import { axisLeft, axisRight } from "d3-axis";
import { format } from "d3-format";
import { interpolateHcl } from "d3-interpolate";
import { scaleLinear } from "d3-scale";
import { select, selectAll } from "d3-selection";
import React, { useEffect } from "react";
import {
  barPathFunction,
  createLayout,
  modifyLayout,
  drawAxis,
  drawVerticalTexts,
} from "../Utils/Utils";
import "./BlockGraph.css";
import { htmlTip } from "./HtmlTip";

export const BlockGraphProps = {
  verticalSize: "verticalSize",
  barWidth: "barWidth",
  by: "by",
  byOpt: { byNumTx: "byNumTx", byWeight: "byWeight", byBoth: "byBoth" },
  data: "data",
  onSatVByteSelected: "onSatVByteSelected",
};

export function BlockGraph(props) {
  let prunedData;
  let scales;
  const layout = createLayout(props, "blockGraph");

  if (props.data.candidateBlockHistogram != null) {
    prunedData = {
      histogram: props.data.candidateBlockHistogram,
      selectedCandidateBlock: props.data.selectedCandidateBlock,
      maxModSatVByte: props.data.maxModSatVByte,
      drawBar: true,
    };
    scales = createScales(props, layout, prunedData);
    modifyLayout(layout, scales, prunedData.histogram.blockTotalWeight);
  } else {
    prunedData = {
      histogram: null,
      selectedCandidateBlock: props.data.selectedCandidateBlock,
      maxModSatVByte: props.data.maxModSatVByte,
      drawBar: false,
    };
  }

  //UseEffect Hook
  useEffect(() => {
    dataViz(prunedData, props, layout, scales);
  });

  return (
    <div>
      {parseInt(props.data.selectedCandidateBlock) >= 0 && (
        <p id="blockNumLabel">
          Block: {parseInt(props.data.selectedCandidateBlock) + 1}º
        </p>
      )}
      <div
        className="BlockGraph"
        style={{
          width: layout.outerSize.X + "px",
          height: layout.outerSize.Y + "px",
          overflowY: "scroll",
        }}
      >
        <svg
          id="svgBlockGraph"
          width={layout.size.X}
          height={layout.size.Y}
        ></svg>
      </div>
    </div>
  );
}

function dataViz(data, props, layout, scales) {
  const svg = select("#svgBlockGraph");
  svg.selectAll("*").remove();

  const infobox = select("#blockInfobox");
  if (!infobox.empty()) {
    infobox.remove();
  }
  //groups all graph elements and transate them
  const graph = svg
    .append("g")
    .attr("id", "blockGraphId")
    .attr("transform", "translate(0," + layout.graphMargin.up + ")");

  if (data.drawBar) {
    drawBar(graph, data, props, layout, scales);

    const axis = axisBy(data, props, layout, scales);
    drawAxis(graph, layout, axis);

    drawVerticalTexts(graph, props, layout);
  }
}

function createScales(props, layout, prunedData) {
  // const { maxModSatVByte } = prunedData;
  const { histogram } = prunedData;
  const {
    blockTotalTxs,
    blockTotalWeight,
    minTxNumInHistogramElement,
    minWeightInHistogramElement,
    blockMinModSatVByte,
    blockMaxModSatVByte,
  } = histogram;

  const { barSize, pxMin } = layout;

  const scales = {};

  //Various scales
  scales.scaleWeight = scaleLinear()
    .domain([0, blockTotalWeight])
    .range([0, barSize.Y]);

  scales.scaleNumTx = scaleLinear()
    .domain([0, blockTotalTxs])
    .range([0, barSize.Y]);

  scales.scaleBlockColor = scaleLinear()
    .interpolate(interpolateHcl)
    .domain([blockMinModSatVByte, blockMaxModSatVByte])
    .range(["LightGreen", "red"]);

  let normalize = false;

  //We assure that no tx is so small to not been correctly displayed.
  if (scales.scaleWeight(minWeightInHistogramElement) < pxMin) {
    scales.scaleWeight = scaleLinear()
      .domain([0, minWeightInHistogramElement])
      .range([0, pxMin]);
    normalize = true;
  }
  if (scales.scaleNumTx(minTxNumInHistogramElement) < pxMin) {
    scales.scaleNumTx = scaleLinear()
      .domain([0, minTxNumInHistogramElement])
      .range([0, pxMin]);
    normalize = true;
  }
  if (normalize) {
    //We take the longer scale for reference to the other
    const heightByWeight = scales.scaleWeight(histogram.blockTotalWeight);
    const heightByTxsNum = scales.scaleNumTx(histogram.blockTotalTxs);

    let maxHeight;

    if (props.by === "byNumTx") {
      maxHeight = heightByTxsNum;
    } else if (props.by === "byWeight") {
      maxHeight = heightByWeight;
    } else if (props.by === "byBoth") {
      maxHeight =
        heightByTxsNum > heightByWeight ? heightByTxsNum : heightByWeight;
    } else {
      console.log("props.by not allowed");
    }

    scales.scaleWeight = scaleLinear()
      .domain([0, blockTotalWeight])
      .range([0, maxHeight]);

    scales.scaleNumTx = scaleLinear()
      .domain([0, blockTotalTxs])
      .range([0, maxHeight]);
  }
  return scales;
}

function drawBar(graph, data, props, layout, scales) {
  const { textMargin, axisMargin } = layout;
  const { scaleBlockColor } = scales;
  const values = Object.values(data.histogram.values);

  graph
    .append("g")
    .attr("id", "blockBarGroupId")
    .attr(
      "transform",
      "translate(" + (textMargin.left + axisMargin.left) + ",0)"
    )
    .selectAll("path")
    .data(values)
    .enter()
    .append("path")
    .attr("modSatVByte", (d) => d.modSatVByte)
    .style("fill", (d) => scaleBlockColor(d.modSatVByte))
    .style("stroke", "grey")
    .style("stroke-width", ".2")
    .attr("d", barPathFunction(props, layout, scales))
    .on("click", histoElementClick)
    .on("mouseover", blockMouseOver)
    .on("mouseout", blockMouseOut)
    .on("mousemove", blockMouseMove);

  function histoElementClick(datum, data, nodes) {
    props.onSatVByteSelected(this.attributes.modSatVByte.nodeValue);
  }

  function blockMouseOver(datum, data) {
    select(this).style("fill", "grey");

    if (select("#histoElementInfobox").empty()) {
      select("body")
        .append("div")
        .attr("id", "histoElementInfobox")
        .html(htmlTip)
        .style("pointer-events", "none")
        .style("position", "fixed")
        .style("left", datum.clientX + 10 + "px")
        .style("top", datum.clientY + 10 + "px");

      selectAll("td.histoElementData")
        .data([
          parseInt(this.attributes.modSatVByte.nodeValue),
          data.numTxs,
          format(",")(data.weight),
        ])
        .html((d) => d);
    }
  }

  function blockMouseOut() {
    select(this).style("fill", (d) => scaleBlockColor(d.modSatVByte));

    const infobox = select("#histoElementInfobox");
    if (!infobox.empty()) {
      infobox.remove();
    }
  }

  function blockMouseMove(datum) {
    const infobox = select("#histoElementInfobox");
    if (!infobox.empty()) {
      infobox
        .style("left", datum.clientX + 10 + "px")
        .style("top", datum.clientY + 10 + "px");
    }
  }
}

function axisBy(data, props, layout, scales) {
  const { scaleNumTx, scaleWeight } = scales;

  const axis = { left: null, right: null };
  if (props.by === "byNumTx") {
    axis.left = axisLeft().scale(scaleNumTx).tickFormat(format("~s"));
  } else if (props.by === "byWeight" || props.by === "byBoth") {
    axis.left = axisLeft().scale(scaleWeight).tickFormat(format("~s"));
    if (props.by === "byBoth") {
      axis.right = axisRight().scale(scaleNumTx).tickFormat(format("~s"));
    }
  }
  return axis;
}
