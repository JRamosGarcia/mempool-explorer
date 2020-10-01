import { json } from "d3-fetch";
import {} from "d3-transition";
import React, { useEffect, useState } from "react";
import { BlockGraph } from "./BlockGraph/BlockGraph";
import { CandidateBlocksGraph } from "./CandidateBlocksGraph/CandidateBlocksGraph";
import { HistogramGraph } from "./HistogramGraph/HistogramGraph";
import "./MempoolGraph.css";

export function MempoolGraph(props) {
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState({ candidateBlockRecapList: [] });
  const [blockSelected, setBlockSelected] = useState(-1);
  const [histoElementSelected, setHistoElementSelected] = useState(-1);
  const [txIdSelected, setTxIdSelected] = useState("");

  useEffect(() => {
    setLoading(false);

    function updateData() {
      if (blockSelected === -1) {
        json("http://localhost:3001/api/candidateBlocks")
          .then((data) => {
            console.log(
              "petition at http://localhost:3001/api/candidateBlocks"
            );
            addData(data);
            setData(data);
          })
          .catch((error) => console.log(error));
      } else if (histoElementSelected === -1) {
        json("http://localhost:3001/api/block/" + blockSelected)
          .then((data) => {
            console.log(
              "petition at http://localhost:3001/api/block/" + blockSelected
            );
            addData(data);
            setData(data);
          })
          .catch((error) => console.log(error));
      } else {
        const petition =
          "http://localhost:3001/api/histogram/" +
          blockSelected +
          "/" +
          histoElementSelected;
        json(petition).then((data) => {
          console.log("petition at " + petition);
          addData(data);
          setData(data);
        });
      }
    }

    updateData();
    const timerId = setInterval(() => updateData(), 100000);
    return function cleanup() {
      clearInterval(timerId);
    };
  }, [isLoading, blockSelected, histoElementSelected]); //execute if any of these array elements have changed

  function onBlockSelected(blockSelected) {
    setBlockSelected(blockSelected);
  }

  function onSatVByteSelected(histoElementSelected) {
    setHistoElementSelected(histoElementSelected);
  }

  function onTxSelected(txId) {
    setTxIdSelected(txId);
  }

  return (
    <div>
      <div className="Mempool">
        <CandidateBlocksGraph
          verticalSize={600}
          barWidth={300}
          //by="byWeight"
          //by="byNumTx"
          by="byBoth"
          data={data}
          onBlockSelected={onBlockSelected}
        />
        <BlockGraph
          verticalSize={600}
          barWidth={300}
          //by="byWeight"
          by="byNumTx"
          //by="byBoth"
          data={data}
          onSatVByteSelected={onSatVByteSelected}
        />
        <HistogramGraph
          verticalSize={600}
          barWidth={400}
          //by="byWeight"
          by="byNumTx"
          data={data}
          onTxSelected={onTxSelected}
        />
      </div>
      <p>{txIdSelected}</p>
    </div>
  );
}

function addData(data) {
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

  addDataToCandidateBlockHistogram(data);
  addDataToSatVByteHistogramElement(data);
}

function addDataToCandidateBlockHistogram(data) {
  if (data.candidateBlockHistogram != null) {
    let blockTotalTxs = 0;
    let blockTotalWeight = 0;
    let blockMaxModSatVByte = 0;
    let blockMinModSatVByte = 99999999;
    let minTxNumInHistogramElement = 99999999;
    let minWeightInHistogramElement = 99999999;

    Object.values(data.candidateBlockHistogram).forEach((e, i, a) => {
      blockTotalTxs += e.numTxs;

      blockTotalWeight += e.weight;
      if (i === 0) {
        e.acumWeight = 0;
        e.acumNumTx = 0;
      } else {
        e.acumNumTx = a[i - 1].acumNumTx + a[i - 1].numTxs;
        e.acumWeight = a[i - 1].acumWeight + a[i - 1].weight;
      }

      blockMaxModSatVByte =
        blockMaxModSatVByte < e.modSatVByte
          ? e.modSatVByte
          : blockMaxModSatVByte;

      blockMinModSatVByte =
        blockMinModSatVByte > e.modSatVByte
          ? e.modSatVByte
          : blockMinModSatVByte;

      minTxNumInHistogramElement =
        minTxNumInHistogramElement > e.numTxs
          ? e.numTxs
          : minTxNumInHistogramElement;

      minWeightInHistogramElement =
        minWeightInHistogramElement > e.weight
          ? e.weight
          : minWeightInHistogramElement;
    });
    data.candidateBlockHistogram = { values: data.candidateBlockHistogram };
    data.candidateBlockHistogram.blockTotalTxs = blockTotalTxs;
    data.candidateBlockHistogram.blockTotalWeight = blockTotalWeight;
    data.candidateBlockHistogram.blockMaxModSatVByte = blockMaxModSatVByte;
    data.candidateBlockHistogram.blockMinModSatVByte = blockMinModSatVByte;
    data.candidateBlockHistogram.minTxNumInHistogramElement = minTxNumInHistogramElement;
    data.candidateBlockHistogram.minWeightInHistogramElement = minWeightInHistogramElement;
  }
}

function addDataToSatVByteHistogramElement(data) {
  if (data.satVByteHistogramElement != null) {
    let histogramTotalTxs = 0;
    let histogramTotalWeight = 0;
    let histogramMinWeight = 99999999;
    Object.values(data.satVByteHistogramElement).forEach((e, i, a) => {
      histogramTotalWeight += e.w;
      histogramTotalTxs += 1;
      if (i === 0) {
        e.acumWeight = 0;
        e.acumNumTx = 0;
      } else {
        e.acumWeight = a[i - 1].acumWeight + a[i - 1].w;
        e.acumNumTx = a[i - 1].acumNumTx + 1;
      }
      histogramMinWeight = histogramMinWeight > e.w ? e.w : histogramMinWeight;
    });

    data.satVByteHistogramElement = { values: data.satVByteHistogramElement };
    data.satVByteHistogramElement.histogramTotalWeight = histogramTotalWeight;
    data.satVByteHistogramElement.histogramTotalTxs = histogramTotalTxs;
    data.satVByteHistogramElement.histogramMinWeight = histogramMinWeight;
  }
}
