import React, { useEffect } from "react";
import { axisLeft } from "d3-axis";
import { format } from "d3-format";
import { scaleLinear } from "d3-scale";
import { select, selectAll } from "d3-selection";
import { createLayout, modifyLayout } from "../Utils/Utils";

import "./HistogramGraph.css";
import { htmlTip } from "./HtmlTip";

export const HistogramGraphProps = {
  verticalSize: "verticalSize",
  barWidth: "barWidth",
  by: "by",
  byOpt: { byNumTx: "byNumTx", byWeight: "byWeight" },
  data: "data",
  onTxSelected: "onTxSelected",
};

export function HistogramGraph(props) {
  let prunedData;
  let scales;
  const layout = createLayout(props, "histogramGraph");

  if (props.data.satVByteHistogramElement != null) {
    prunedData = {
      satVByteHistogramElement: props.data.satVByteHistogramElement,
      selectedSatVByte: props.data.selectedSatVByte,
      drawBar: true,
    };
    scales = createScales(props, layout, prunedData);
    modifyLayout(
      layout,
      scales,
      prunedData.satVByteHistogramElement.histogramTotalWeight
    );
  } else {
    prunedData = {
      histogram: null,
      selectedSatVByte: props.data.selectedSatVByte,
      drawBar: false,
    };
  }

  //UseEffect Hook
  useEffect(() => {
    dataViz(prunedData, props, layout, scales);
  });

  return (
    <div>
      {parseInt(props.data.selectedSatVByte) >= 0 && (
        <p id="satVByteLabel">SatVByte: {props.data.selectedSatVByte}</p>
      )}
      <div
        className="HistogramGraph"
        style={{
          width: layout.outerSize.X + "px",
          height: layout.outerSize.Y + "px",
          overflowY: "scroll",
        }}
      >
        <svg
          id="svgHistogramGraph"
          width={layout.size.X}
          height={layout.size.Y}
        ></svg>
      </div>
    </div>
  );
}

function createScales(props, layout, prunedData) {
  const { satVByteHistogramElement } = prunedData;
  const {
    histogramTotalTxs,
    histogramTotalWeight,
    histogramMinWeight,
  } = satVByteHistogramElement;

  const { barSize, txPxMin } = layout;

  const scales = {};

  //Various scales
  scales.scaleWeight = scaleLinear()
    .domain([0, histogramTotalWeight])
    .range([0, barSize.Y]);

  scales.scaleNumTx = scaleLinear()
    .domain([0, histogramTotalTxs])
    .range([0, barSize.Y]);

  //We assure that no tx is so small to not been correctly displayed.
  if (scales.scaleWeight(histogramMinWeight) < txPxMin) {
    scales.scaleWeight = scaleLinear()
      .domain([0, histogramMinWeight])
      .range([0, txPxMin]);
  }
  //We take the longer scale for reference to the other
  const heightByWeight = scales.scaleWeight(histogramTotalWeight);

  scales.scaleWeight = scaleLinear()
    .domain([0, histogramTotalWeight])
    .range([0, heightByWeight]);

  return scales;
}

function dataViz(data, props, layout, scales) {
  const svg = select("#svgHistogramGraph");
  svg.selectAll("*").remove();

  const infobox = select("#txInfobox");
  if (!infobox.empty()) {
    infobox.remove();
  }
  //groups all graph elements and transate them
  const graph = svg
    .append("g")
    .attr("id", "histogramGraphId")
    .attr("transform", "translate(0," + layout.graphMargin.up + ")");

  if (data.drawBar) {
    drawBar(graph, data, props, layout, scales);

    //const axis = axisBy(data, props, layout, scales);
    //drawAxis(graph, layout, axis);

    //drawVerticalTexts(graph, props, layout);
  }
}

function drawBar(graph, data, props, layout, scales) {
  const { textMargin, axisMargin, barSize } = layout;
  const { scaleWeight, scaleNumTx } = scales;
  const values = Object.values(data.satVByteHistogramElement.values);

  console.log("values: ", values);

  graph
    .append("g")
    .attr("id", "histogramGroupId")
    .attr(
      "transform",
      "translate(" + (textMargin.left + axisMargin.left) + ",0)"
    )
    .selectAll("rect")
    .data(values)
    .enter()
    .append("rect")
    .attr("txId", (d) => d.id)
    .style("fill", "LightGreen")
    .style("stroke", "grey")
    .style("stroke-width", "1")
    .attr("x", 0)
    .attr("y", YBy(props))
    .attr("width", barSize.X)
    .attr("height", heightBy(props))
    .on("click", txClick)
    .on("mouseover", blockMouseOver)
    .on("mouseout", blockMouseOut)
    .on("mousemove", blockMouseMove);

  function YBy(props) {
    if (props.by === "byWeight") {
      return (d) => scaleWeight(d.acumWeight);
    } else if (props.by === "byNumTx") {
      return (d) => scaleNumTx(d.acumNumTx);
    } else {
      console.log("props.by not allowed");
    }
  }

  function heightBy(props) {
    if (props.by === "byWeight") {
      return (d) => scaleWeight(d.w);
    } else if (props.by === "byNumTx") {
      return (d) => scaleNumTx(1);
    } else {
      console.log("props.by not allowed");
    }
  }

  function txClick(datum, data, nodes) {
    props.onTxSelected(this.attributes.txId.nodeValue);
  }

  function blockMouseOver(datum, data) {
    select(this).style("fill", "grey");

    if (select("#txInfobox").empty()) {
      select("body")
        .append("div")
        .attr("id", "txInfobox")
        .html(htmlTip)
        .style("pointer-events", "none")
        .style("position", "fixed")
        .style("left", datum.clientX + 10 + "px")
        .style("top", datum.clientY + 10 + "px");

      selectAll("td.txData")
        .data([data.id, format(",")(data.w)])
        .html((d) => d);
    }
  }

  function blockMouseOut() {
    select(this).style("fill", "LightGreen");

    const infobox = select("#txInfobox");
    if (!infobox.empty()) {
      infobox.remove();
    }
  }

  function blockMouseMove(datum) {
    const infobox = select("#txInfobox");
    if (!infobox.empty()) {
      infobox
        .style("left", datum.clientX + 10 + "px")
        .style("top", datum.clientY + 10 + "px");
    }
  }
}
