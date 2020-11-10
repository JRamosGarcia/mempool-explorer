import React, { useEffect, useState } from "react";
import "./MempoolGraph.css";
import { ScaleCheckers } from "./ScaleCheckers/ScaleCheckers";
import { TDStackBarGraph } from "./TDStackBarGraph/TDStackBarGraph";
import { TxSpeedGraph } from "./TxSpeedGraph/TxSpeedGraph";
import { ForceGraph } from "../ForceGraph/ForceGraph";
import { ForceGraphHeader } from "../ForceGraph/ForceGraphHeader";
import { getNumberWithOrdinal, petitionTo } from "../../utils/utils";
import { UpdateBox } from "../UpdateBox/UpdateBox";
import { IgnoringBlocksTable } from "../IgnoringBlocksTable/IgnoringBlocksTable";
import {
  dataForMiningQueueGraph,
  dataForBlockGraph,
  dataForTxsGraph,
  dataForForceGraph,
} from "./dataCreation";
import { useParams } from "react-router-dom";
import { TxDetails } from "../TxDetails/TxDetails";

const clone = require("rfdc")();

export function MempoolGraph(props) {
  const [mempoolBy, setMempoolBy] = useState("byBoth");
  const [blockBy, setBlockBy] = useState("byBoth");
  const [txsBy, setTxsBy] = useState("byBoth");

  const [data, setData] = useState({ txIdSelected: "" });
  const [txIdNotFoundState, setTxIdNotFound] = useState(false);
  const [txIdTextState, setTxIdText] = useState("");
  const [lockMempool, setLockMempool] = useState(false);
  const [interactive, setInteractive] = useState(true);

  const emptyCache = {
    blockHistogram: {},
    satVByteHistogram: {},
    txDataByIndex: {}, //Contains txDependenciesInfo, txIndexSelected and txIdSelected
    txDataById: {}, //Contains txDependenciesInfo, txIndexSelected and txIdSelected
  };

  const [cache, setCache] = useState(clone(emptyCache));

  let { txId } = useParams();

  //After each render, this method executes, whatever state changes
  useEffect(() => {
    const timerId = setInterval(() => updateDataByTimer(), 5000);
    return function cleanup() {
      clearInterval(timerId);
    };
  });

  //Only executed once at begining.
  useEffect(() => {
    console.log(txId);
    if (txId !== undefined) {
      setTxIdText(txId);
      petitionTo(
        "http://localhost:3001/miningQueueAPI/tx/" + txId + "/" + 0 + "/false",
        (incomingData) => {
          if (incomingData.txIdSelected === "") {
            setTxIdNotFound(true);
          }
          setData(incomingData);
        }
      );
    } else {
      petitionTo(
        "http://localhost:3001/miningQueueAPI/miningQueue/" + 0 + "/false",
        setData
      );
    }
  }, [txId]);

  function updateDataByTimer() {
    if (lockMempool === true) return;
    if (data.txIdSelected !== "") {
      petitionTo(
        "http://localhost:3001/miningQueueAPI/tx/" +
          data.txIdSelected +
          "/" +
          data.lastModTime +
          "/true",
        onTimer
      );
    } else if (data.blockSelected === -1) {
      petitionTo(
        "http://localhost:3001/miningQueueAPI/miningQueue/" +
          data.lastModTime +
          "/true",
        onTimer
      );
    } else if (data.satVByteSelected === -1) {
      petitionTo(
        "http://localhost:3001/miningQueueAPI/block/" +
          data.blockSelected +
          "/" +
          data.lastModTime +
          "/true",
        onTimer
      );
    } else if (data.txIndexSelected === -1) {
      petitionTo(
        "http://localhost:3001/miningQueueAPI/histogram/" +
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
        incomingData.tx !== null &&
        incomingData.txIgnoredData.length !== 0 &&
        incomingData.txIdSelected !== ""
      ) {
        const txData = {
          txIndexSelected: incomingData.txIndexSelected,
          txIdSelected: incomingData.txIdSelected,
          txDependenciesInfo: incomingData.txDependenciesInfo,
          txIgnoredData: incomingData.txIgnoredData,
          tx: incomingData.tx,
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
        "http://localhost:3001/miningQueueAPI/block/" +
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
    newData.tx = null;
    newData.satVByteHistogram = [];
    newData.txIgnoredData = null;
    setTxIdText("");
    setTxIdNotFound(false);
  }

  /**********************************************SatVByte Functions *********************************************/
  function onSatVByteSelected(satVByteSelected) {
    if (!checkHistogramCache(satVByteSelected)) {
      petitionTo(
        "http://localhost:3001/miningQueueAPI/histogram/" +
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
    newData.tx = null;
    newData.txIgnoredData = null;
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
        "http://localhost:3001/miningQueueAPI/txIndex/" +
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
      newData.txIgnoredData = txData.txIgnoredData;
      newData.tx = txData.tx;
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
        newData.txIgnoredData = incomingData.txIgnoredData;
        newData.tx = incomingData.tx;
        setData(newData);
        setTxIdText(incomingData.txIdSelected);

        let newCache = clone(cache);
        const txData = {
          txIndexSelected: incomingData.txIndexSelected,
          txIdSelected: incomingData.txIdSelected,
          txDependenciesInfo: incomingData.txDependenciesInfo,
          txIgnoredData: incomingData.txIgnoredData,
          tx: incomingData.tx,
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

  function onTxInputKeyPress(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      onTxSearchButton();
    }
  }

  function onTxSearchButton() {
    petitionTo(
      "http://localhost:3001/miningQueueAPI/tx/" +
        txIdTextState +
        "/" +
        0 +
        "/false",
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

  /*************************************************TxIdChanged Functions ********************************************/
  function onTxIdSelected(tId) {
    petitionTo(
      "http://localhost:3001/miningQueueAPI/tx/" + tId + "/" + 0 + "/false",
      (incomingData) => {
        if (incomingData.txIdSelected === "") {
          setTxIdNotFound(true);
          setData(incomingData); //It will return basic mempool data if tx not found
        } else {
          setTxIdNotFound(false);
          setTxIdText(tId);
          setData(incomingData);
        }
      }
    );
  }

  function onSetLockMempool(lock) {
    setLockMempool(lock);
    if (!lock && data.txIdSelected !== "") {
      onTxIdSelected(data.txIdSelected);
    }
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
            onKeyPress={onTxInputKeyPress}
          ></input>
        </label>
        <button onClick={onTxSearchButton}>Go!</button>
        {txIdNotFoundState && (
          <p className="txIdNotFound">TxId not Found in mempool</p>
        )}
      </div>
      <UpdateBox
        lockMempool={lockMempool}
        setLockMempool={onSetLockMempool}
        lastUpdate={data.lastModTime}
      />
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
        <div>
          <ForceGraphHeader
            interactive={interactive}
            setInteractive={setInteractive}
          />
          <ForceGraph
            colorRange={["LightGreen", "red"]}
            interactive={interactive}
            data={dataForForceGraph(data, onTxIdSelected)}
          />
        </div>
      )}
      {data.txIgnoredData !== null && data.txDependenciesInfo !== undefined && (
        <IgnoringBlocksTable
          igData={data.txIgnoredData}
          nodeData={data.txDependenciesInfo.nodes[0]}
        />
      )}
      {data.tx !== null && data.txDependenciesInfo !== undefined && (
        <div>
          <p>Transaction Details:</p>
          <TxDetails
            data={data.tx}
            nodeData={data.txDependenciesInfo.nodes[0]}
            fblTxSatVByte={data.fblTxSatVByte}
          />
        </div>
      )}
    </div>
  );
}
