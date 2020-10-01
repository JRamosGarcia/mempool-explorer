import { path } from "d3-path";

export function createLayout(props, idAppend) {
  const sizeY = props.verticalSize;
  const graphMarginVertical = 20;
  const vTextSize = 12;

  const layout = {
    idAppend: idAppend,
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
    txPxMin: 15,//NO PONER TEXTO EN LAS TRANSACCIONES, ES UN ROLLO. PONER 2 EJES Y 3 OPCIONES BY...
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

export function modifyLayout(layout, scales, totalWeight) {
  const { scaleWeight } = scales;

  //it should be the same
  const heightByWeight = scaleWeight(totalWeight);
  //const heightByTxsNum = scaleNumTx(histogram.blockTotalTxs);

  layout.size.Y = heightByWeight + layout.graphMargin.graphMarginVertical;
}

//Returns the function that draws the path from  data (candidateBlockRecap)
//depending on props.by
export function barPathFunction(props, layout, scales) {
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

export function drawVerticalTexts(graph, props, layout) {
  drawLeftVerticalText(graph, props, layout);
  drawRightVerticalText(graph, props, layout);
}

export function drawAxis(graph, layout, axis) {
  const { textMargin, axisMargin, barSize } = layout;

  if (axis.left !== null) {
    graph
      .append("g")
      .attr("id", layout.idAppend + "LeftAxis")
      .attr(
        "transform",
        "translate(" + (textMargin.left + axisMargin.left) + ",0)"
      )
      .call(axis.left);
  }
  if (axis.right !== null) {
    graph
      .append("g")
      .attr("id", layout.idAppend + "RightAxis")
      .attr(
        "transform",
        "translate(" + (textMargin.left + axisMargin.left + barSize.X) + ",0)"
      )
      .call(axis.right);
  }
}
