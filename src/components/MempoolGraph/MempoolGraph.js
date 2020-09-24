import React, { useEffect } from "react";
import "./MempoolGraph.css";
import { htmlTip } from "./HtmlTip";
import { select, selectAll } from "d3-selection";
import { json } from "d3-fetch";
import { scaleLinear } from "d3-scale";
import { interpolateHcl } from "d3-interpolate";
import { path } from "d3-path";
import { axisRight, axisLeft } from "d3-axis";
import { format } from "d3-format";
import {} from "d3-transition";

const fullBlockWeight = 4000000;

//Props and props options, not needed but is usefull having all of them centralized
export const MempoolGraphProps = {
  verticalSize: "verticalSize",
  barWidth: "barWidth",
  by: "by",
  byOpt: { byNumTx: "byNumTx", byWeight: "byWeight", byBoth: "byBoth" },
};

export function MempoolGraph(props) {
  const layout = createLayout(props);

  //UseEffect Hook
  useEffect(() => {
    json("http://localhost:3001/graphicData.json")
      .then((data) => {
        AddData(data);
        dataViz(data, props, layout);
      })
      .catch((error) => console.log(error));
  });

  return (
    <div className="MempoolGraph">
      <svg
        id="svgMempoolGraph"
        width={layout.size.X}
        height={layout.size.Y}
      ></svg>
    </div>
  );
}

// Sizes of MempoolGraph
function createLayout(props) {
  const sizeY = props.verticalSize;
  const graphMarginVertical = 20;
  const vTextSize = 12;

  const layout = {
    size: { Y: sizeY },
    graphMargin: { up: 10, down: 10, graphMarginVertical },
    barSize: {
      X: props.barWidth,
      Y: sizeY - graphMarginVertical,
    },
    axisMargin: { left: 40, right: 40, both: 80 },
    textMargin: { left: 15, right: 15, both: 30 },
    vTextSize: vTextSize,
    vTextSizeStr: vTextSize + "px",
    rightVerticalTextCorrection: 10,
  };

  layout.graphMargin.horizontal =
    layout.axisMargin.both +
    layout.textMargin.both -
    layout.rightVerticalTextCorrection;
  layout.size.X = layout.barSize.X + layout.graphMargin.horizontal;

  return layout;
}

//Adds addional data to data
function AddData(data) {
  let totalWeight = 0;
  let totalTxs = 0;
  let maxSatVByte = 0;

  data.candidateBlockRecapList.forEach((e, i, a) => {
    totalWeight += e.weight;
    totalTxs += e.numTxs;
    if (i === 0) {
      e.acumWeight = 0;
      e.acumNumTx = 0;
    } else {
      e.acumNumTx = a[i - 1].acumNumTx + a[i - 1].numTxs;
      e.acumWeight = a[i - 1].acumWeight + a[i - 1].weight;
    }
    e.satVByte = e.totalFees / (e.weight / 4);
    maxSatVByte = maxSatVByte < e.satVByte ? e.satVByte : maxSatVByte;
  });

  data.totalWeight = totalWeight;
  data.totalTxs = totalTxs;
  data.maxSatVByte = maxSatVByte;
  data.numBlocks = data.candidateBlockRecapList.length;
}

//Function that draws mempool graph using d3 library
function dataViz(data, props, layout) {
  const svg = select("#svgMempoolGraph");

  //groups all graph elements and transate them
  const graph = svg
    .append("g")
    .attr("id", "graphId")
    .attr("transform", "translate(0," + layout.graphMargin.up + ")");

  const scales = createScales(data, layout);

  drawBar(graph, data, props, layout, scales);

  drawAxis(graph, data, props, layout, scales);

  drawVerticalTexts(graph, props, layout);
}

function drawLeftVerticalText(graph, props, layout) {
  const { textMargin, barSize, vTextSizeStr } = layout;

  let lText = "Weight in Mb";
  let vCorrection = 45;
  if (props.by === "byNumTx") {
    lText = "Unconfirmed Tx count";
    vCorrection = 65;
  }

  const textWeightPos = { X: textMargin.left, Y: barSize.Y / 2 + vCorrection };
  graph
    .append("text")
    .text(lText)
    .attr("x", textWeightPos.X)
    .attr("y", textWeightPos.Y)
    .attr(
      "transform",
      "rotate(-90 " + textWeightPos.X + "," + textWeightPos.Y + ")"
    )
    .style("font-size", vTextSizeStr);
}

function drawRightVerticalText(graph, props, layout) {
  if (props.by !== "byBoth") return;
  const {
    textMargin,
    barSize,
    vTextSize,
    rightVerticalTextCorrection,
    vTextSizeStr,
    axisMargin,
  } = layout;

  const textNumTxPos = {
    X:
      axisMargin.both +
      textMargin.both +
      barSize.X -
      (vTextSize + rightVerticalTextCorrection),
    Y: barSize.Y / 2 - 60,
  };
  graph
    .append("text")
    .text("Unconfirmed Tx count")
    .attr("x", textNumTxPos.X)
    .attr("y", textNumTxPos.Y)
    .attr(
      "transform",
      "rotate(90 " + textNumTxPos.X + "," + textNumTxPos.Y + ")"
    )
    .style("font-size", vTextSizeStr);
}

function drawVerticalTexts(graph, props, layout) {
  drawLeftVerticalText(graph, props, layout);
  drawRightVerticalText(graph, props, layout);
}

function drawAxis(graph, data, props, layout, scales) {
  const { textMargin, axisMargin, barSize } = layout;
  const axis = axisBy(data, props, layout, scales);

  if (axis.left !== null) {
    graph
      .append("g")
      .attr("id", "leftAxis")
      .attr(
        "transform",
        "translate(" + (textMargin.left + axisMargin.left) + ",0)"
      )
      .call(axis.left);
  }
  if (axis.right !== null) {
    graph
      .append("g")
      .attr("id", "rightAxis")
      .attr(
        "transform",
        "translate(" + (textMargin.left + axisMargin.left + barSize.X) + ",0)"
      )
      .call(axis.right);
  }
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
    //console.log(this.attributes.blockIndex.nodeValue);
    console.log(datum.clientX);
  }

  function blockMouseOver(datum, data) {
    select(this).style("fill", "grey");

    if (select("#infobox").empty()) {
      select("body")
        .append("div")
        .attr("id", "infobox")
        .html(htmlTip)
        .style("pointer-events", "none")
        .style("position", "fixed")
        .style("left", datum.clientX + 10 + "px")
        .style("top", datum.clientY + 10 + "px");

      selectAll("td.data")
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

    const infobox = select("#infobox");
    if (!infobox.empty()) {
      infobox.remove();
    }
  }

  function blockMouseMove(datum) {
    //console.log(datum.clientY);
    const infobox = select("#infobox");
    if (!infobox.empty()) {
      infobox
        .style("left", datum.clientX + 10 + "px")
        .style("top", datum.clientY + 10 + "px");
    }
  }
}

//Returns a path for a block, given x, y(left and right), height(left and right) and width
//Draw a path Clockwise form upper left corner
function pathFrom(x, yl, yr, hl, hr, w) {
  var pathRes = path();
  pathRes.moveTo(x, yl);
  pathRes.lineTo(x + w, yr);
  pathRes.lineTo(x + w, yr + hr);
  pathRes.lineTo(x, yl + hl);
  pathRes.closePath();
  return pathRes.toString();
}

//Returns the function that draws the path from  data (candidateBlockRecap)
//depending on props.by
function barPathFunction(props, layout, scales) {
  const { scaleWeight, scaleNumTx } = scales;
  const { barSize } = layout;

  if (props.by === "byNumTx") {
    return (d) =>
      pathFrom(
        0,
        scaleNumTx(d.acumNumTx),
        scaleNumTx(d.acumNumTx),
        scaleNumTx(d.numTxs),
        scaleNumTx(d.numTxs),
        barSize.X
      );
  } else if (props.by === "byWeight") {
    return (d) =>
      pathFrom(
        0,
        scaleWeight(d.acumWeight),
        scaleWeight(d.acumWeight),
        scaleWeight(d.weight),
        scaleWeight(d.weight),
        barSize.X
      );
  } else if (props.by === "byBoth") {
    return (d) =>
      pathFrom(
        0,
        scaleWeight(d.acumWeight),
        scaleNumTx(d.acumNumTx),
        scaleWeight(d.weight),
        scaleNumTx(d.numTxs),
        barSize.X
      );
  } else {
    console.log("props.by not allowed");
  }
}
