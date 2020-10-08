import React, { useEffect, useState } from "react";
import { json } from "d3-fetch";
import { format } from "d3-format";
import { TDStackBarGraph } from "./TDStackBarGraph/TDStackBarGraph";
import "./MempoolGraph.css";

const clone = require("rfdc")();

export function MempoolGraph(props) {
  const [blockSelected, setBlockSelected] = useState(-1);
  const [satVByteSelected, setSatVByteSelected] = useState(-1);
  const [txIdSelected, setTxIdSelected] = useState("");
  const [data, setData] = useState({ candidateBlockRecapList: [] });
  const [cache, setCache] = useState({
    candidateBlockHistogram: {},
    satVByteHistogramElement: {},
  });

  //After each render, this method executes, whatever state changes
  useEffect(() => {
    const timerId = setInterval(() => updateData(), 5000);
    return function cleanup() {
      clearInterval(timerId);
    };
  });

  useEffect(() => {
    updateData();
    // eslint-disable-next-line
  }, [blockSelected, satVByteSelected, txIdSelected]);

  function updateData() {
    if (blockSelected === -1) {
      if (data.candidateBlockRecapList.length === 0) {
        //petition when first loaded
        petitionTo(
          "http://localhost:3001/api/miningQueue/0/false",
          onFirstMiningQueueData
        );
      } else {
        //petition when updated by timer
        petitionTo(
          "http://localhost:3001/api/miningQueue/" + data.lastModTime + "/true",
          onTimer
        );
      }
    } else if (satVByteSelected === -1) {
      if (
        data.candidateBlockHistogram.length !== 0 &&
        data.selectedCandidateBlock === blockSelected
      ) {
        //petition when update by timer
        petitionTo(
          "http://localhost:3001/api/block/" +
            blockSelected +
            "/" +
            data.lastModTime +
            "/true",
          onTimer
        );
      } else {
        //petition when first or subsequent click on block
        if (!checkBlockCache()) {
          petitionTo(
            "http://localhost:3001/api/block/" +
              blockSelected +
              "/" +
              data.lastModTime +
              "/false",
            onChangeBlockData
          );
        }
      }
    } else if (txIdSelected === "") {
      if (
        data.satVByteHistogramElement.length !== 0 &&
        data.selectedSatVByte === satVByteSelected
      ) {
        //petition when update by timer
        petitionTo(
          "http://localhost:3001/api/histogram/" +
            blockSelected +
            "/" +
            satVByteSelected +
            "/" +
            data.lastModTime +
            "/true",
          onTimer
        );
      } else {
        //petition when first or subsequent click on block histogram
        if (!checkHistogramCache()) {
          petitionTo(
            "http://localhost:3001/api/histogram/" +
              blockSelected +
              "/" +
              satVByteSelected +
              "/" +
              data.lastModTime +
              "/false",
            onChangeHistogramData
          );
        }
      }
    }
  }

  function checkBlockCache() {
    if (typeof cache.candidateBlockHistogram[blockSelected] !== "undefined") {
      //data.candidateBlockHistogram = null; //Saves time cloning as it is going to be overwritten
      let newData = clone(data);
      newData.candidateBlockHistogram =
        cache.candidateBlockHistogram[blockSelected];
      newData.selectedCandidateBlock = blockSelected;
      setData(newData);
      console.log("Cache found for block: " + blockSelected);
      return true;
    }
    console.log("Cache not found for block: " + blockSelected);
    return false;
  }

  function checkHistogramCache(){
    if (typeof cache.satVByteHistogramElement[satVByteSelected] !== "undefined") {
      //data.candidateBlockHistogram = null; //Saves time cloning as it is going to be overwritten
      let newData = clone(data);
      newData.satVByteHistogramElement =
        cache.satVByteHistogramElement[satVByteSelected];
      newData.selectedSatVByte = satVByteSelected;
      setData(newData);
      console.log("Cache found for SatVByte: " + satVByteSelected);
      return true;
    }
    console.log("Cache not found for SatVByte: " + satVByteSelected);
    return false;

  }


  function onFirstMiningQueueData(incomingData) {
    setData(incomingData);
  }

  function onTimer(incomingData) {
    if (incomingData.lastModTime !== data.lastModTime) {
      setData(incomingData);
      const newCache = {
        candidateBlockHistogram: {},
        satVByteHistogramElement: {},
      };

      if (
        incomingData.selectedCandidateBlock !== -1 &&
        incomingData.candidateBlockHistogram.length !== 0
      ) {
        newCache.candidateBlockHistogram[incomingData.selectedCandidateBlock] =
          incomingData.candidateBlockHistogram;
      }

      if (
        incomingData.selectedSatVByte !== -1 &&
        incomingData.satVByteHistogramElement.length !== 0
      ) {
        newCache.satVByteHistogramElement[incomingData.selectedSatVByte] =
          incomingData.satVByteHistogramElement;
      }

      setCache(newCache);
      console.log("cache cleared");
      //This is in case the block, satVByteSelected or tx no longer exist
      if (incomingData.selectedCandidateBlock !== blockSelected) {
        setBlockSelected(incomingData.selectedCandidateBlock);
      }
      if (incomingData.selectedSatVByte !== satVByteSelected) {
        setSatVByteSelected(incomingData.selectedSatVByte);
      }
    }
  }

  function onChangeBlockData(incomingData) {
    if (incomingData.lastModTime !== data.lastModTime) {
      onTimer(incomingData);
    } else {
      if (incomingData.candidateBlockHistogram.length !== 0) {
        //data.candidateBlockHistogram = null; //Saves time cloning as it is going to be overwritten
        let newData = clone(data);
        newData.candidateBlockHistogram = incomingData.candidateBlockHistogram;
        newData.selectedCandidateBlock = incomingData.selectedCandidateBlock;
        newData.selectedSatVByte = -1;
        setData(newData);
        let newCache = clone(cache);
        newCache.candidateBlockHistogram[incomingData.selectedCandidateBlock] =
          incomingData.candidateBlockHistogram;
        setCache(newCache);
      }
    }
  }

  function onChangeHistogramData(incomingData) {
    if (incomingData.lastModTime !== data.lastModTime) {
      onTimer(incomingData);
    } else {
      if (incomingData.satVByteHistogramElement.length !== 0) {
        //data.satVByteHistogramElement = null; //Saves time cloning as it is going to be overwritten
        let newData = clone(data);
        newData.satVByteHistogramElement =
          incomingData.satVByteHistogramElement;
        newData.selectedSatVByte = incomingData.selectedSatVByte;
        setData(newData);
        let newCache = clone(cache);
        newCache.satVByteHistogramElement[incomingData.selectedSatVByte] =
          incomingData.satVByteHistogramElement;
        setCache(newCache);

      }
    }
  }

  function onBlockSelected(blockSelected) {
    setBlockSelected(blockSelected);
    setSatVByteSelected(-1);
    setTxIdSelected("");
  }

  function onSatVByteSelected(satVByteSelected) {
    setSatVByteSelected(satVByteSelected);
    setTxIdSelected("");
  }

  function onTxSelected(txId) {
    setTxIdSelected(txId);
  }

  return (
    <div>
      <div className="Mempool">
        <div className="MiningQueueSection">
          <TDStackBarGraph
            data={dataForMiningQueueGraph(data, onBlockSelected)}
            verticalSize={600}
            barWidth={300}
            //by="byLeft"
            //by="byRight"
            by="byBoth"
          />
          {blockSelected !== -1 && <p>Block: {blockSelected + 1}</p>}
        </div>
        {blockSelected !== -1 && (
          <div className="CandidateBlockSection">
            <TDStackBarGraph
              data={dataForBlockGraph(data, onSatVByteSelected)}
              verticalSize={600}
              barWidth={300}
              //by="byLeft"
              //by="byRight"
              by="byBoth"
            />
            {satVByteSelected !== -1 && <p>SatVByte: {satVByteSelected}</p>}
          </div>
        )}
        {satVByteSelected !== -1 && (
          <div className="TxsSection">
            <TDStackBarGraph
              data={dataForTxsGraph(data, onTxSelected)}
              verticalSize={600}
              barWidth={300}
              //by="byLeft"
              //by="byRight"
              by="byBoth"
            />
            {txIdSelected !== "" && <p>TxId: {txIdSelected}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function dataForMiningQueueGraph(data, onBlockSelected) {
  return {
    id: "MiningQueueGraph",
    adData: {}, // whathever more needed
    values: data.candidateBlockRecapList, //Array of values to draw
    fnValues: {
      fnLDValue: (e) => e.w, //Left dimension value function: weight
      fnRDValue: (e) => e.n, //Right dimension value function: numTxs
      fnCDValue: (e) => e.t, //Color dimension value function: totalFees
    },
    strokeWidth: "1",
    colorRange: ["LightGreen", "red"],
    fnOnSelected: onBlockSelected, //when block is selected
    fnOnSelectedEval: (e) => e.index,
    tickFormat: {
      byRightAxisLeft: "~s",
      byLeftOrBothAxisLeft: "~s",
      byBothAxisRight: "~s",
    },
    htmlTip: `
      <table>
          <tr><td>Block#:</td><td class="TipData"></td></tr>
          <tr><td>Weight:</td><td class="TipData"></td></tr>
          <tr><td>Total Fees (sat):</td><td class="TipData"></td></tr>
          <tr><td>Txs#:</td><td class="TipData"></td></tr>
          <tr><td>satVByte (average):</td><td class="TipData"></td></tr>
      </table>`,
    htmlTipData: [
      (e) => e.index + 1 + "º",
      (e) => format(",")(e.w),
      (e) => format(",")(e.t),
      (e) => e.n,
      (e) => format(".6f")(e.t / (e.w / 4)),
    ],
  };
}

function dataForBlockGraph(data, onSatVByteSelected) {
  return {
    id: "BlockGraph",
    adData: {}, // whathever more needed
    values: data.candidateBlockHistogram, //Array of values to draw
    fnValues: {
      fnLDValue: (e) => e.w, //Left dimension value function: weight
      fnRDValue: (e) => e.n, //Right dimension value function: numTxs
      fnCDValue: (e) => e.m, //Color dimension value function: modSatVByte
    },
    strokeWidth: "0.5",
    colorRange: ["LightGreen", "red"],
    fnOnSelected: onSatVByteSelected, //when satVByte is selected
    fnOnSelectedEval: (e) => e.m,
    tickFormat: {
      byRightAxisLeft: "~s",
      byLeftOrBothAxisLeft: "~s",
      byBothAxisRight: "~s",
    },
    htmlTip: `
      <table>
          <tr><td>modSatVByte:</td><td class="TipData"></td></tr>
          <tr><td>Txs#:</td><td class="TipData"></td></tr>
          <tr><td>Weight:</td><td class="TipData"></td></tr>
      </table>`,
    htmlTipData: [(e) => e.m, (e) => e.n, (e) => format(",")(e.w)],
  };
}

function dataForTxsGraph(data, onTxSelected) {
  return {
    id: "TxsGraph",
    adData: {}, // whathever more needed
    values: data.satVByteHistogramElement, //Array of values to draw
    fnValues: {
      fnLDValue: (e) => e.w, //Left dimension value function: weight
      fnRDValue: (e) => 1, //Right dimension value function: Always 1
      fnCDValue: (e) => 1, //Color dimension value function: Always 1
    },
    strokeWidth: "0.5",
    colorRange: ["LightGreen", "red"],
    fnOnSelected: onTxSelected, //when Txid is selected
    fnOnSelectedEval: (e) => e.i,
    tickFormat: {
      byRightAxisLeft: "~s",
      byLeftOrBothAxisLeft: "~s",
      byBothAxisRight: "",
    },
    htmlTip: `
      <table>
          <tr><td>Txid#:</td><td class="TipData"></td></tr>
          <tr><td>Weight:</td><td class="TipData"></td></tr>
      </table>`,
    htmlTipData: [(e) => e.i, (e) => format(",")(e.w)],
  };
}

function petitionTo(petition, onFunction) {
  json(petition)
    .then((incomingData) => {
      console.log("petition at " + petition);
      onFunction(incomingData);
    })
    .catch((error) => console.log(error));
}
