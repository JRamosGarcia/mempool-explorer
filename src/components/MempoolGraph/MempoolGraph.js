import { json } from "d3-fetch";
import { format } from "d3-format";
import React, { useEffect, useState } from "react";
import "./MempoolGraph.css";
import { ScaleCheckers } from "./ScaleCheckers/ScaleCheckers";
import { TDStackBarGraph } from "./TDStackBarGraph/TDStackBarGraph";
import { TxSpeedGraph } from "./TxSpeedGraph/TxSpeedGraph";
import { ForceGraph } from "./ForceGraph/ForceGraph";

const clone = require("rfdc")();

export function MempoolGraph(props) {
  //useReducer as explained in:
  // https://stackoverflow.com/questions/53574614/multiple-calls-to-state-updater-from-usestate-in-component-causes-multiple-re-re
  /*  const [selectionsState, setSelectionsState] = useReducer(
    (state, newState) => ({ ...state, ...newState }),
    {
      blockSelected: -1,
      satVByteSelected: -1,
      txIndexSelected: -1,
      txIdSelected: "",
    }
  );
  */
  const [mempoolBy, setMempoolBy] = useState("byBoth");
  const [blockBy, setBlockBy] = useState("byBoth");
  const [txsBy, setTxsBy] = useState("byBoth");

  const [data, setData] = useState({ txIdSelected: "" });
  const [txIdNotFoundState, setTxIdNotFound] = useState(false);
  const [txIdTextState, setTxIdText] = useState("");

  const emptyCache = {
    blockHistogram: {},
    satVByteHistogram: {},
    txDataByIndex: {}, //Contains txDependenciesInfo, txIndexSelected and txIdSelected
    txDataById: {}, //Contains txDependenciesInfo, txIndexSelected and txIdSelected
  };

  const [cache, setCache] = useState(clone(emptyCache));

  //After each render, this method executes, whatever state changes
  useEffect(() => {
    const timerId = setInterval(() => updateDataByTimer(), 5000);
    return function cleanup() {
      clearInterval(timerId);
    };
  });

  //Only executed once at begining.
  useEffect(() => {
    petitionTo(
      "http://localhost:3001/api/miningQueue/" + 0 + "/false",
      setData
    );
  }, []);

  function updateDataByTimer() {
    if (data.txIdSelected !== "") {
      console.log("searching for changes of txId:" + data.txIdSelected);
      petitionTo(
        "http://localhost:3001/api/tx/" +
          data.txIdSelected +
          "/" +
          data.lastModTime +
          "/true",
        onTimer
      );
    } else if (data.blockSelected === -1) {
      petitionTo(
        "http://localhost:3001/api/miningQueue/" + data.lastModTime + "/true",
        onTimer
      );
    } else if (data.satVByteSelected === -1) {
      petitionTo(
        "http://localhost:3001/api/block/" +
          data.blockSelected +
          "/" +
          data.lastModTime +
          "/true",
        onTimer
      );
    } else if (data.txIndexSelected === -1) {
      petitionTo(
        "http://localhost:3001/api/histogram/" +
          data.blockSelected +
          "/" +
          data.satVByteSelected +
          "/" +
          data.lastModTime +
          "/true",
        onTimer
      );
    }
  }

  function onTimer(incomingData) {
    if (incomingData.lastModTime !== data.lastModTime) {
      setData(incomingData);
      const newCache = clone(emptyCache);

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

      if (
        incomingData.txIndexSelected !== -1 &&
        incomingData.txDependenciesInfo.length !== 0 &&
        incomingData.txIdSelected !== ""
      ) {
        const txData = {
          txIndexSelected: incomingData.txIndexSelected,
          txIdSelected: incomingData.txIdSelected,
          txDependenciesInfo: incomingData.txDependenciesInfo,
        };
        const txSelector = getTxSelector(
          incomingData.blockSelected,
          incomingData.satVByteSelected,
          incomingData.txIndexSelected
        );
        newCache.txDataByIndex[txSelector] = txData;
        newCache.txDataById[incomingData.txIdSelected] = txData;
      }

      setCache(newCache);
      console.log("cache cleared");
    }
  }

  /**********************************************Block Functions *********************************************/
  function onBlockSelected(blockSelected) {
    //petition when first or subsequent click on block
    if (!checkBlockCache(blockSelected)) {
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

  function checkBlockCache(blockSelected) {
    if (typeof cache.blockHistogram[blockSelected] !== "undefined") {
      let newData = clone(data);
      newData.blockHistogram = cache.blockHistogram[blockSelected];
      newData.blockSelected = blockSelected;
      clearNonBlockData(newData);
      setData(newData);
      console.log("Cache found for block: " + blockSelected);
      return true;
    }
    console.log("Cache not found for block: " + blockSelected);
    return false;
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
        clearNonBlockData(newData);
        setData(newData);
        let newCache = clone(cache);
        newCache.blockHistogram[incomingData.blockSelected] =
          incomingData.blockHistogram;
        setCache(newCache);
      }
    }
  }

  function clearNonBlockData(newData) {
    newData.satVByteSelected = -1;
    newData.txIndexSelected = -1;
    newData.txIdSelected = "";
    newData.txDependenciesInfo = null;
    newData.satVByteHistogram = [];
    setTxIdText("");
    setTxIdNotFound(false);
  }

  /**********************************************SatVByte Functions *********************************************/
  function onSatVByteSelected(satVByteSelected) {
    if (!checkHistogramCache(satVByteSelected)) {
      petitionTo(
        "http://localhost:3001/api/histogram/" +
          data.blockSelected +
          "/" +
          satVByteSelected +
          "/" +
          data.lastModTime +
          "/false",
        onChangeHistogramData
      );
    }
  }

  function checkHistogramCache(satVByteSelected) {
    const histogramIndex = getHistogramIndex(
      data.blockSelected,
      satVByteSelected
    );
    if (typeof cache.satVByteHistogram[histogramIndex] !== "undefined") {
      let newData = clone(data);
      newData.satVByteHistogram = cache.satVByteHistogram[histogramIndex];
      newData.satVByteSelected = satVByteSelected;
      clearNonBlockOrHistogramData(newData);
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

  function onChangeHistogramData(incomingData) {
    if (incomingData.lastModTime !== data.lastModTime) {
      onTimer(incomingData);
    } else {
      if (incomingData.satVByteHistogram.length !== 0) {
        let newData = clone(data);
        newData.satVByteHistogram = incomingData.satVByteHistogram;
        newData.satVByteSelected = incomingData.satVByteSelected;
        clearNonBlockOrHistogramData(newData);
        setData(newData);
        let newCache = clone(cache);
        const histogramIndex = getHistogramIndex(
          data.blockSelected, // Be careful, use data not incomingData
          incomingData.satVByteSelected
        );
        newCache.satVByteHistogram[histogramIndex] =
          incomingData.satVByteHistogram;
        setCache(newCache);
      }
    }
  }

  function clearNonBlockOrHistogramData(newData) {
    newData.txIndexSelected = -1;
    newData.txIdSelected = "";
    newData.txDependenciesInfo = null;
    setTxIdText("");
    setTxIdNotFound(false);
  }
  /**********************************************TxIndex Functions *********************************************/
  function onTxIndexSelected(txIndexSelected) {
    const txSelector = getTxSelector(
      data.blockSelected,
      data.satVByteSelected,
      txIndexSelected
    );
    if (!checkTxDataCacheByIndex(txSelector)) {
      petitionTo(
        "http://localhost:3001/api/txIndex/" +
          data.blockSelected +
          "/" +
          data.satVByteSelected +
          "/" +
          txIndexSelected +
          "/" +
          data.lastModTime +
          "/false",
        onChangeTxIndexData
      );
    }
  }

  function checkTxDataCacheByIndex(txSelector) {
    const txData = cache.txDataByIndex[txSelector];
    if (typeof txData !== "undefined") {
      let newData = clone(data);
      newData.txIndexSelected = txData.txIndexSelected;
      newData.txIdSelected = txData.txIdSelected;
      newData.txDependenciesInfo = txData.txDependenciesInfo;
      setData(newData);
      setTxIdText(txData.txIdSelected);
      console.log("Cache found for tx: " + txSelector);
      return true;
    }
    console.log("Cache not found for tx: " + txSelector);
    return false;
  }

  function getTxSelector(blockSelected, satVByteSelected, txIndexSelected) {
    return blockSelected + "-" + satVByteSelected + "-" + txIndexSelected;
  }

  function onChangeTxIndexData(incomingData) {
    if (incomingData.lastModTime !== data.lastModTime) {
      onTimer(incomingData);
    } else {
      if (incomingData.txDependenciesInfo !== null) {
        let newData = clone(data);
        newData.txIndexSelected = incomingData.txIndexSelected;
        newData.txIdSelected = incomingData.txIdSelected;
        newData.txDependenciesInfo = incomingData.txDependenciesInfo;
        setData(newData);
        setTxIdText(incomingData.txIdSelected);

        let newCache = clone(cache);
        const txData = {
          txIndexSelected: incomingData.txIndexSelected,
          txIdSelected: incomingData.txIdSelected,
          txDependenciesInfo: incomingData.txDependenciesInfo,
        };
        const txSelector = getTxSelector(
          data.blockSelected, // Be careful, use data not incomingData
          data.satVByteSelected, // Be careful, use data not incomingData
          incomingData.txIndexSelected
        );
        newCache.txDataByIndex[txSelector] = txData;
        newCache.txDataById[incomingData.txIdSelected] = txData;
        setCache(newCache);
      }
    }
  }

  /*************************************************TxIdText Functions *********************************************/
  function onTxIdTextChanged(event) {
    const txIdText = event.target.value;
    setTxIdText(txIdText);
  }

  function onTxSearchButton() {
    petitionTo(
      "http://localhost:3001/api/tx/" + txIdTextState + "/" + 0 + "/false",
      (incomingData) => {
        if (incomingData.txIdSelected === "") {
          setTxIdNotFound(true);
          setData(incomingData); //It will return basic mempool data if tx not found
        } else {
          setTxIdNotFound(false);
          setData(incomingData);
        }
      }
    );
  }
  /************************************************DRAWING ******************************************************/
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
            value={txIdTextState}
            onChange={onTxIdTextChanged}
          ></input>
        </label>
        <button onClick={onTxSearchButton}>Go!</button>
        {txIdNotFoundState && <p className="txIdNotFound">TxId not Found</p>}
      </div>
      <div className="Mempool">
        <div className="MiningQueueSection">
          <div className="miningQueueScaleCheckersDiv">
            <ScaleCheckers
              by={mempoolBy}
              leftText="Weight"
              rightText="Num Txs"
              onChange={setMempoolBy}
              label="Scale by:"
            />
          </div>
          <div className="txSpeedGraph">
            <div className="pad"></div>
            <TxSpeedGraph
              height="150"
              width="50"
              barWidth="30"
              speed={data.weightInLast10minutes}
            />
          </div>
          <div className="miningQueueGraphDiv">
            <TDStackBarGraph
              data={dataForMiningQueueGraph(
                data,
                onBlockSelected,
                data.blockSelected
              )}
              verticalSize={600}
              barWidth={300}
              by={mempoolBy}
            />
          </div>
          <div className="miningQueueLabel">
            <span>Current Mempool</span>
          </div>
        </div>
        {data.blockSelected !== -1 && (
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
                data.satVByteSelected
              )}
              verticalSize={600}
              barWidth={300}
              by={blockBy}
            />

            {data.blockSelected !== -1 && (
              <span>{getNumberWithOrdinal(data.blockSelected + 1)} block</span>
            )}
          </div>
        )}
        {data.satVByteSelected !== -1 && (
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
                data.txIndexSelected
              )}
              verticalSize={600}
              barWidth={300}
              by={txsBy}
            />
            {data.satVByteSelected !== -1 && (
              <span>
                SatVByte: {data.satVByteSelected}
                {data.txIndexSelected !== -1 && (
                  <span>/TxIndex: {data.txIndexSelected}</span>
                )}
              </span>
            )}
          </div>
        )}
      </div>
      {data.txIdSelected !== "" && (
        <ForceGraph
          height={400}
          width={600}
          colorRange={["LightGreen", "red"]}
          data={dataForForceGraph(data)}
        />
      )}

      <div className="txNetwork">
        {data.txDependenciesInfo !== null && (
          <pre>{JSON.stringify(data.txDependenciesInfo, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}
/*
      <ForceGraph height={400} width={600} data={dataDummyForForceGraph()} />
      */

function dataDummyForForceGraph() {
  return {
    nodeIndexSelected: 0,
    nodes: [
      {
        txId:
          "043d648f7c2cf17133dfafb0b6512fac129ee8b6bef530b04a70ef4de6387d48",
        weight: 904,
        baseFee: 904,
        timeInSecs: 1603698828,
        bip125Replaceable: false,
        containingBlockIndex: 1,
        modifiedSatVByte: 50.8875723830735,
      },
      {
        txId:
          "adc3538a5217b559179db552d42fdc3f2637aa3e2cb497bb7a636170119839ed",
        weight: 18016,
        baseFee: 468444,
        timeInSecs: 1603702407,
        bip125Replaceable: false,
        containingBlockIndex: 1,
        modifiedSatVByte: 50.8875723830735,
      },
      {
        txId:
          "d362f86bdf19d04593a149867ec053e956c98d07b75ba738d28117d3285945cf",
        weight: 5628,
        baseFee: 4230,
        timeInSecs: 1603697123,
        bip125Replaceable: false,
        containingBlockIndex: 1,
        modifiedSatVByte: 50.8875723830735,
      },
      {
        txId:
          "b0b7674377c29a4fd18a130fde19233f5b0f992e4c49fa0e1001b6c220e62437",
        weight: 1492,
        baseFee: 38728,
        timeInSecs: 1603702166,
        bip125Replaceable: false,
        containingBlockIndex: 1,
        modifiedSatVByte: 50.8875723830735,
      },
      {
        txId:
          "5bba0052747d27c97bc2857763836562563322d2b6f06cee05f59ef6dadd70e3",
        weight: 2524,
        baseFee: 8960,
        timeInSecs: 1603700870,
        bip125Replaceable: false,
        containingBlockIndex: 1,
        modifiedSatVByte: 50.8875723830735,
      },
      {
        txId:
          "062daa1a2f9089fe0af8466b0f32b8807c8395d9207e4f5abcdd45c07dcf3bb1",
        weight: 904,
        baseFee: 3616,
        timeInSecs: 1603700249,
        bip125Replaceable: false,
        containingBlockIndex: 1,
        modifiedSatVByte: 50.8875723830735,
      },
      {
        txId:
          "34e2faaf02c82f7106482b0cb0f54234d7472ab007788588e8b3e6f2bd1986e9",
        weight: 3716,
        baseFee: 15456,
        timeInSecs: 1603701173,
        bip125Replaceable: false,
        containingBlockIndex: 1,
        modifiedSatVByte: 50.8875723830735,
      },
      {
        txId:
          "ca2fa92736569cd4ecdaf73afa2022cdacc24d7e8112e433782ff08c73eaa4f4",
        weight: 4308,
        baseFee: 15597,
        timeInSecs: 1603700975,
        bip125Replaceable: false,
        containingBlockIndex: 1,
        modifiedSatVByte: 50.8875723830735,
      },
      {
        txId:
          "21a562533f50147d0f7cb866652b9179013b5274fe3f36d6878f2ac94632ae91",
        weight: 904,
        baseFee: 3164,
        timeInSecs: 1603700171,
        bip125Replaceable: false,
        containingBlockIndex: 1,
        modifiedSatVByte: 50.8875723830735,
      },
      {
        txId:
          "0eda50dcb465a53850bb5e891fb327ea59ae7f7bc4b50b3a5be8d9729ed6fad1",
        weight: 669,
        baseFee: 2533,
        timeInSecs: 1603700115,
        bip125Replaceable: false,
        containingBlockIndex: 1,
        modifiedSatVByte: 50.8875723830735,
      },
      {
        txId:
          "42258d80cd28309fc6258ad129a6574877bda47549c98aec8dd2cf53f70ef7e9",
        weight: 904,
        baseFee: 675,
        timeInSecs: 1603696249,
        bip125Replaceable: false,
        containingBlockIndex: 1,
        modifiedSatVByte: 50.8875723830735,
      },
      {
        txId:
          "1b315155b3e8b0b609020e065261011a1c40d742113e31000ddbf3f37136962a",
        weight: 1944,
        baseFee: 1566,
        timeInSecs: 1603697618,
        bip125Replaceable: false,
        containingBlockIndex: 1,
        modifiedSatVByte: 50.8875723830735,
      },
      {
        txId:
          "12e4cbfbf9e1b7a12759ddbeb5436c71f7a519cb7fe3bf8fcf525ca43aff1a92",
        weight: 904,
        baseFee: 3164,
        timeInSecs: 1603701930,
        bip125Replaceable: false,
        containingBlockIndex: 1,
        modifiedSatVByte: 50.8875723830735,
      },
      {
        txId:
          "b7a125d5dd01584539f7fef404f32ab8a6d438a685ccb12c8942c285880888c3",
        weight: 2080,
        baseFee: 4176,
        timeInSecs: 1603700422,
        bip125Replaceable: false,
        containingBlockIndex: 1,
        modifiedSatVByte: 50.8875723830735,
      },
    ],
    edges: [
      {
        o: 3,
        d: 6,
      },
      {
        o: 3,
        d: 4,
      },
      {
        o: 6,
        d: 7,
      },
      {
        o: 1,
        d: 0,
      },
      {
        o: 1,
        d: 12,
      },
      {
        o: 1,
        d: 11,
      },
      {
        o: 1,
        d: 10,
      },
      {
        o: 1,
        d: 3,
      },
      {
        o: 1,
        d: 2,
      },
      {
        o: 7,
        d: 9,
      },
      {
        o: 7,
        d: 8,
      },
      {
        o: 12,
        d: 13,
      },
      {
        o: 4,
        d: 5,
      },
    ],
    nodeIdFn: (node) => node.txId,
    edgeOriginFn: (edge) => edge.o,
    edgeDestinationFn: (edge) => edge.d,
  };
}

function dataForForceGraph(data) {
  return {
    nodeIndexSelected: 0,
    nodes: data.txDependenciesInfo.nodes,
    edges: data.txDependenciesInfo.edges,
    nodeIdFn: (node) => node.txId,
    edgeOriginFn: (edge) => edge.o,
    edgeDestinationFn: (edge) => edge.d,
  };
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
