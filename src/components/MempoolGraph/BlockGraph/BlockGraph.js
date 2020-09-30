import { axisLeft, axisRight } from "d3-axis";
import { format } from "d3-format";
import { interpolateHcl } from "d3-interpolate";
import { path } from "d3-path";
import { scaleLinear } from "d3-scale";
import { select, selectAll } from "d3-selection";
import React, { useEffect } from "react";
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
  const layout = createLayout(props);

  if (props.data.candidateBlockHistogram != null) {
    prunedData = {
      histogram: props.data.candidateBlockHistogram,
      selectedCandidateBlock: props.data.selectedCandidateBlock,
      maxModSatVByte: props.data.maxModSatVByte,
      drawBar: true,
    };
    scales = createScales(props, layout, prunedData);
    modifyLayout(layout, scales, prunedData.histogram);
  } else {
    prunedData = {
      histogram: null,
      selectedCandidateBlock: props.data.selectedCandidateBlock,
      maxModSatVByte: props.data.maxModSatVByte,
      drawBar: false,
    };
  }

  console.log("layout:" + layout);
  //UseEffect Hook
  useEffect(() => {
    console.log("prunedData" + prunedData);
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

function createLayout(props) {
  const sizeY = props.verticalSize;
  const graphMarginVertical = 20;
  const vTextSize = 12;

  const layout = {
    size: { Y: sizeY },
    outerSize: {},
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
    pxMin: 1,
  };

  layout.graphMargin.horizontal =
    layout.axisMargin.both +
    layout.textMargin.both -
    layout.rightVerticalTextCorrection;
  layout.size.X = layout.barSize.X + layout.graphMargin.horizontal;
  layout.outerSize.X = layout.size.X + 15;
  layout.outerSize.Y = layout.size.Y + 10;
  return layout;
}

function modifyLayout(layout, scales, histogram) {
  const { scaleWeight, scaleNumTx } = scales;

  //it should be the same
  const heightByWeight = scaleWeight(histogram.blockTotalWeight);
  //const heightByTxsNum = scaleNumTx(histogram.blockTotalTxs);

  layout.size.Y = heightByWeight;
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
    .attr("id", "BlockGraphId")
    .attr("transform", "translate(0," + layout.graphMargin.up + ")");

  if (data.drawBar) {
    drawBar(graph, data, props, layout, scales);

    drawAxis(graph, data, props, layout, scales);

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
  const values = Object.values(data.histogram);

  console.log(values);

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
    .style("stroke-width", ".1")
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

function drawAxis(graph, data, props, layout, scales) {
  const { textMargin, axisMargin, barSize } = layout;
  const axis = axisBy(data, props, layout, scales);

  if (axis.left !== null) {
    graph
      .append("g")
      .attr("id", "blockGraphLeftAxis")
      .attr(
        "transform",
        "translate(" + (textMargin.left + axisMargin.left) + ",0)"
      )
      .call(axis.left);
  }
  if (axis.right !== null) {
    graph
      .append("g")
      .attr("id", "blockGraphRightAxis")
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
      //.tickValues([...Array(numBlocks).keys()].map((d) => d * fullBlockWeight))
      .tickFormat(format("~s"));
    if (props.by === "byBoth") {
      axis.right = axisRight().scale(scaleNumTx).tickFormat(format("~s"));
    }
  }
  return axis;
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
