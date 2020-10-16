import React, { useEffect, useReducer, useState } from "react";
import { json } from "d3-fetch";
import { format } from "d3-format";
import { TDStackBarGraph } from "./TDStackBarGraph/TDStackBarGraph";
import "./MempoolGraph.css";
import { ScaleCheckers } from "./ScaleCheckers/ScaleCheckers";
import { TxSpeedGraph } from "./TxSpeedGraph/TxSpeedGraph";

const clone = require("rfdc")();

export function MempoolGraph(props) {
  //useReducer as explained in:
  // https://stackoverflow.com/questions/53574614/multiple-calls-to-state-updater-from-usestate-in-component-causes-multiple-re-re
  const [selectionsState, setSelectionsState] = useReducer(
    (state, newState) => ({ ...state, ...newState }),
    {
      blockSelected: -1,
      satVByteSelected: -1,
      txIndexSelected: -1,
      txIdSelected: "",
    }
  );
  const [mempoolBy, setMempoolBy] = useState("byBoth");
  const [blockBy, setBlockBy] = useState("byBoth");
  const [txsBy, setTxsBy] = useState("byBoth");

  const [data, setData] = useState({ mempool: [] });
  const [cache, setCache] = useState({
    blockHistogram: {},
    satVByteHistogram: {},
  });

  //After each render, this method executes, whatever state changes
  useEffect(() => {
    const timerId = setInterval(() => updateDataByTimer(), 5000);
    return function cleanup() {
      clearInterval(timerId);
    };
  });

  useEffect(() => {
    updateData();
    // eslint-disable-next-line
  }, [selectionsState]);

  function updateDataByTimer() {
    if (selectionsState.txIdSelected !== "") {
      console.log(
        "searching for changes of txId:" + selectionsState.txIdSelected
      );
    } else if (selectionsState.blockSelected === -1) {
      petitionTo(
        "http://localhost:3001/api/miningQueue/" + data.lastModTime + "/true",
        onTimer
      );
    } else if (selectionsState.satVByteSelected === -1) {
      petitionTo(
        "http://localhost:3001/api/block/" +
          selectionsState.blockSelected +
          "/" +
          data.lastModTime +
          "/true",
        onTimer
      );
    } else if (selectionsState.txIndexSelected === -1) {
      petitionTo(
        "http://localhost:3001/api/histogram/" +
          selectionsState.blockSelected +
          "/" +
          selectionsState.satVByteSelected +
          "/" +
          data.lastModTime +
          "/true",
        onTimer
      );
    }
  }

  function updateData() {
    if (selectionsState.txIdSelected !== "") {
      console.log("selected TxId:" + selectionsState.txIdSelected);
    } else if (selectionsState.blockSelected === -1) {
      //petition when first loaded
      petitionTo("http://localhost:3001/api/miningQueue/0/false", setData);
    } else if (selectionsState.satVByteSelected === -1) {
      //petition when first or subsequent click on block
      if (!checkBlockCache()) {
        petitionTo(
          "http://localhost:3001/api/block/" +
            selectionsState.blockSelected +
            "/" +
            data.lastModTime +
            "/false",
          onChangeBlockData
        );
      }
    } else if (selectionsState.txIndexSelected === -1) {
      //petition when first or subsequent click on block histogram
      if (!checkHistogramCache()) {
        petitionTo(
          "http://localhost:3001/api/histogram/" +
            selectionsState.blockSelected +
            "/" +
            selectionsState.satVByteSelected +
            "/" +
            data.lastModTime +
            "/false",
          onChangeHistogramData
        );
      }
    } else {
      //petition when txIndex selected
      petitionTo(
        "http://localhost:3001/api/tx/" +
          selectionsState.blockSelected +
          "/" +
          selectionsState.satVByteSelected +
          "/" +
          selectionsState.txIndexSelected +
          "/" +
          data.lastModTime +
          "/false",
        onChangeTxData
      );
    }
  }

  function checkBlockCache() {
    if (
      typeof cache.blockHistogram[selectionsState.blockSelected] !== "undefined"
    ) {
      let newData = clone(data);
      newData.blockHistogram =
        cache.blockHistogram[selectionsState.blockSelected];
      newData.blockSelected = selectionsState.blockSelected;
      setData(newData);
      console.log("Cache found for block: " + selectionsState.blockSelected);
      return true;
    }
    console.log("Cache not found for block: " + selectionsState.blockSelected);
    return false;
  }

  function checkHistogramCache() {
    const histogramIndex = getHistogramIndex(
      selectionsState.blockSelected,
      selectionsState.satVByteSelected
    );
    if (typeof cache.satVByteHistogram[histogramIndex] !== "undefined") {
      let newData = clone(data);
      newData.satVByteHistogram = cache.satVByteHistogram[histogramIndex];
      newData.satVByteSelected = selectionsState.satVByteSelected;
      setData(newData);
      console.log("Cache found for Block-SatVByte: " + histogramIndex);
      return true;
    }
    console.log("Cache not found for Block-SatVByte: " + histogramIndex);
    return false;
  }

  function getHistogramIndex(blockSelected, satVByteSelected) {
    return blockSelected + "-" + satVByteSelected;
  }

  //REVISAR QUE PASA CON TANTOS CAMBIO DE ESTADO UNO DETRAS DEL OTRO.
  function onTimer(incomingData) {
    if (incomingData.lastModTime !== data.lastModTime) {
      setData(incomingData);
      const newCache = {
        blockHistogram: {},
        satVByteHistogram: {},
      };

      if (
        incomingData.blockSelected !== -1 &&
        incomingData.blockHistogram.length !== 0
      ) {
        newCache.blockHistogram[incomingData.blockSelected] =
          incomingData.blockHistogram;
      }

      if (
        incomingData.satVByteSelected !== -1 &&
        incomingData.satVByteHistogram.length !== 0
      ) {
        const histogramIndex =
          incomingData.blockSelected + "-" + incomingData.satVByteSelected;
        newCache.satVByteHistogram[histogramIndex] =
          incomingData.satVByteHistogram;
      }

      setCache(newCache);
      console.log("cache cleared");
      //This is in case the block, satVByteSelected,txIndex or txId no longer exist
      setSelectionsState({
        blockSelected: incomingData.blockSelected,
        satVByteSelected: incomingData.satVByteSelected,
        txIndexSelected: incomingData.txIndexSelected,
        txIdSelected: incomingData.txIdSelected,
      });
    }
  }

  function onChangeBlockData(incomingData) {
    if (incomingData.lastModTime !== data.lastModTime) {
      onTimer(incomingData);
    } else {
      if (incomingData.blockHistogram.length !== 0) {
        //data.blockHistogram = null; //Saves time cloning as it is going to be overwritten
        let newData = clone(data);
        newData.blockHistogram = incomingData.blockHistogram;
        newData.blockSelected = incomingData.blockSelected;
        setData(newData);
        let newCache = clone(cache);
        newCache.blockHistogram[incomingData.blockSelected] =
          incomingData.blockHistogram;
        setCache(newCache);
      }
    }
  }

  function onChangeHistogramData(incomingData) {
    if (incomingData.lastModTime !== data.lastModTime) {
      onTimer(incomingData);
    } else {
      if (incomingData.satVByteHistogram.length !== 0) {
        let newData = clone(data);
        newData.satVByteHistogram = incomingData.satVByteHistogram;
        newData.satVByteSelected = incomingData.satVByteSelected;
        setData(newData);
        let newCache = clone(cache);
        const histogramIndex = getHistogramIndex(
          selectionsState.blockSelected,
          incomingData.satVByteSelected
        );
        newCache.satVByteHistogram[histogramIndex] =
          incomingData.satVByteHistogram;
        setCache(newCache);
      }
    }
  }

  function onChangeTxData(incomingData) {
    if (incomingData.lastModTime !== data.lastModTime) {
      onTimer(incomingData);
    } else {
      if (incomingData.txIdSelected.length !== "") {
        let newData = clone(data);
        newData.txIdSelected = incomingData.txIdSelected;
        newData.txIndexSelected = incomingData.txIndexSelected;
        setData(newData);
        setSelectionsState({ txIdSelected: incomingData.txIdSelected });
      }
    }
  }

  function onBlockSelected(blockSelected) {
    setSelectionsState({
      blockSelected: blockSelected,
      satVByteSelected: -1,
      txIndexSelected: -1,
      txIdSelected: "",
    });
  }

  function onSatVByteSelected(satVByteSelected) {
    setSelectionsState({
      satVByteSelected: satVByteSelected,
      txIndexSelected: -1,
      txIdSelected: "",
    });
  }

  function onTxIndexSelected(txIndex) {
    setSelectionsState({
      txIndexSelected: txIndex,
      txIdSelected: "",
    });
  }

  function onTxIdTextChanged(event) {
    setSelectionsState({ txIdSelected: event.target.value });
    console.log(event.target.value);
  }

  return (
    <div>
      <div className="txIdSelector">
        <label>
          TxId:
          <input
            className="txIdInput"
            type="text"
            placeholder="Insert a TxId or choose one from mempool."
            size="70"
            value={selectionsState.txIdSelected}
            onChange={onTxIdTextChanged}
          ></input>
        </label>
      </div>
      <div className="Mempool">
        <div className="txSpeedGraph">
          <TxSpeedGraph
            heigth="250"
            width="100"
            speed={data.vsizeInLast10minutes}
          />
        </div>
        <div className="MiningQueueSection">
          <ScaleCheckers
            by={mempoolBy}
            leftText="Weight"
            rightText="Num Txs"
            onChange={setMempoolBy}
            label="Scale by:"
          />
          <TDStackBarGraph
            data={dataForMiningQueueGraph(
              data,
              onBlockSelected,
              selectionsState.blockSelected
            )}
            verticalSize={600}
            barWidth={300}
            by={mempoolBy}
          />
          <p>Current Mempool</p>
        </div>
        {selectionsState.blockSelected !== -1 && (
          <div className="CandidateBlockSection">
            <ScaleCheckers
              by={blockBy}
              leftText="Weight"
              rightText="Num Txs"
              onChange={setBlockBy}
              label="Scale by:"
            />
            <TDStackBarGraph
              data={dataForBlockGraph(
                data,
                onSatVByteSelected,
                selectionsState.satVByteSelected
              )}
              verticalSize={600}
              barWidth={300}
              by={blockBy}
            />

            {selectionsState.blockSelected !== -1 && (
              <p>
                {getNumberWithOrdinal(selectionsState.blockSelected + 1)} block
              </p>
            )}
          </div>
        )}
        {selectionsState.satVByteSelected !== -1 && (
          <div className="TxsSection">
            <ScaleCheckers
              by={txsBy}
              leftText="Weight"
              rightText="Num Txs"
              onChange={setTxsBy}
              label="Scale by:"
            />
            <TDStackBarGraph
              data={dataForTxsGraph(
                data,
                onTxIndexSelected,
                selectionsState.txIndexSelected
              )}
              verticalSize={600}
              barWidth={300}
              by={txsBy}
            />
            {selectionsState.satVByteSelected !== -1 && (
              <p>SatVByte: {selectionsState.satVByteSelected}</p>
            )}
            {selectionsState.txIndexSelected !== -1 && (
              <p>TxIndex: {selectionsState.txIndexSelected}</p>
            )}
          </div>
        )}
      </div>
      {selectionsState.txIdSelected !== "" && (
        <p>TxId: {selectionsState.txIdSelected}</p>
      )}
    </div>
  );
}

function dataForMiningQueueGraph(data, onBlockSelected, selectedIndex) {
  return {
    id: "MiningQueueGraph",
    adData: {}, // whathever more needed
    values: data.mempool, //Array of values to draw
    fnValues: {
      fnLDValue: (e) => e.w, //Left dimension value function: weight
      fnRDValue: (e) => e.n, //Right dimension value function: numTxs
      fnCDValue: (e) => e.t, //Color dimension value function: totalFees
    },
    selectedIndex: selectedIndex,
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
      (e) => getNumberWithOrdinal(e.index + 1),
      (e) => format(",")(e.w),
      (e) => format(",")(e.t),
      (e) => e.n,
      (e) => format(".6f")(e.t / (e.w / 4)),
    ],
  };
}

function dataForBlockGraph(data, onSatVByteSelected, selectedIndex) {
  return {
    id: "BlockGraph",
    adData: {}, // whathever more needed
    values: data.blockHistogram, //Array of values to draw
    fnValues: {
      fnLDValue: (e) => e.w, //Left dimension value function: weight
      fnRDValue: (e) => e.n, //Right dimension value function: numTxs
      fnCDValue: (e) => e.m, //Color dimension value function: modSatVByte
    },
    selectedIndex: selectedIndex,
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

function dataForTxsGraph(data, onTxIndexSelected, selectedIndex) {
  return {
    id: "TxsGraph",
    adData: {}, // whathever more needed
    values: data.satVByteHistogram, //Array of values to draw
    fnValues: {
      fnLDValue: (e) => e.w, //Left dimension value function: weight
      fnRDValue: (e) => 1, //Right dimension value function: Always 1
      fnCDValue: (e) => 1, //Color dimension value function: Always 1
    },
    selectedIndex: selectedIndex,
    strokeWidth: "0.5",
    colorRange: ["LightGreen", "red"],
    fnOnSelected: onTxIndexSelected, //when TxIndex is selected
    fnOnSelectedEval: (e) => e.index,
    tickFormat: {
      byRightAxisLeft: "~s",
      byLeftOrBothAxisLeft: "~s",
      byBothAxisRight: "",
    },
    htmlTip: `
      <table>
          <tr><td>Tx:</td><td class="TipData"></td></tr>
          <tr><td>Weight:</td><td class="TipData"></td></tr>
      </table>`,
    htmlTipData: [
      (e) => getNumberWithOrdinal(e.index + 1),
      (e) => format(",")(e.w),
    ],
  };
}

function getNumberWithOrdinal(n) {
  var s = ["th", "st", "nd", "rd"],
    v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function petitionTo(petition, onFunction) {
  json(petition)
    .then((incomingData) => {
      console.log("petition at " + petition);
      onFunction(incomingData);
    })
    .catch((error) => console.log(error));
}
