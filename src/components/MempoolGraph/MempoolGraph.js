import { json } from "d3-fetch";
import {} from "d3-transition";
import React, { useEffect, useState } from "react";
import { BlockGraph } from "./BlockGraph/BlockGraph";
import { CandidateBlocksGraph } from "./CandidateBlocksGraph/CandidateBlocksGraph";
import "./MempoolGraph.css";

export function MempoolGraph(props) {
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState({ candidateBlockRecapList: [] });
  const [blockSelected, setBlockSelected] = useState(-1);
  const [histoElementSelected, setHistoElementSelected] = useState(-1);

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
      } else {
        json("http://localhost:3001/api/block/" + blockSelected)
          .then((data) => {
            console.log(
              "petition at http://localhost:3001/api/block/" + blockSelected
            );
            addData(data);
            setData(data);
          })
          .catch((error) => console.log(error));
      }
    }

    updateData();
    const timerId = setInterval(() => updateData(), 100000);
    return function cleanup() {
      clearInterval(timerId);
    };
  }, [isLoading, blockSelected]); //execute if any of these array elements have changed

  function onBlockSelected(blockSelected) {
    setBlockSelected(blockSelected);
  }

  function onSatVByteSelected(histoElementSelected) {
    setHistoElementSelected(histoElementSelected);
  }

  return (
    <div className="MempoolGraph">
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
      <p>{histoElementSelected}</p>
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

  addDataTo(data.candidateBlockHistogram);
}

function addDataTo(candidateBlockHistogram) {
  if (candidateBlockHistogram != null) {
    let blockTotalTxs = 0;
    let blockTotalWeight = 0;
    let blockMaxModSatVByte = 0;
    let blockMinModSatVByte = 99999999;
    let minTxNumInHistogramElement = 99999999;
    let minWeightInHistogramElement = 99999999;

    Object.values(candidateBlockHistogram).forEach((e, i, a) => {
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
    candidateBlockHistogram.blockTotalTxs = blockTotalTxs;
    candidateBlockHistogram.blockTotalWeight = blockTotalWeight;
    candidateBlockHistogram.blockMaxModSatVByte = blockMaxModSatVByte;
    candidateBlockHistogram.blockMinModSatVByte = blockMinModSatVByte;
    candidateBlockHistogram.minTxNumInHistogramElement = minTxNumInHistogramElement;
    candidateBlockHistogram.minWeightInHistogramElement = minWeightInHistogramElement;
  }
}
