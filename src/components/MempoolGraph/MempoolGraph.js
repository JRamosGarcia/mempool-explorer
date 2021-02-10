import React, { useEffect, useState } from "react";
import "./MempoolGraph.css";
import { ScaleCheckers } from "./ScaleCheckers/ScaleCheckers";
import { TDStackBarGraph } from "./TDStackBarGraph/TDStackBarGraph";
import { TxSpeedGraph } from "./TxSpeedGraph/TxSpeedGraph";
import { ForceGraph } from "./ForceGraph/ForceGraph";
import { ForceGraphHeader } from "./ForceGraph/ForceGraphHeader";
import { getNumberWithOrdinal, petitionTo } from "../../utils/utils";
import { UpdateBox } from "./UpdateBox/UpdateBox";
import { IgnoringBlocksTable } from "./IgnoringBlocksTable/IgnoringBlocksTable";
import {
  dataForMiningQueueGraph,
  dataForBlockGraph,
  dataForTxsGraph,
  dataForForceGraph,
} from "./dataCreation";
import { useParams } from "react-router-dom";
import { TxDetails } from "./TxDetails/TxDetails";

export function MempoolGraph(props) {
  const [mempoolBy, setMempoolBy] = useState("byBoth");
  const [blockBy, setBlockBy] = useState("byBoth");
  const [txsBy, setTxsBy] = useState("byBoth");

  const [data, setData] = useState({ txIdSelected: "" });
  const [txIdNotFoundState, setTxIdNotFound] = useState(false);
  const [txIdTextState, setTxIdText] = useState("");
  const [lockMempool, setLockMempool] = useState(false);
  const [interactive, setInteractive] = useState(true);

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
      petitionTo("/miningQueueAPI/tx/" + txId, (incomingData) => {
        if (incomingData.txIdSelected === "") {
          setTxIdNotFound(true);
        }
        setData(incomingData);
      });
    } else {
      petitionTo("/miningQueueAPI/miningQueue", setData);
    }
  }, [txId]);

  function updateDataByTimer() {
    if (lockMempool === true) return;
    if (data.txIdSelected !== "") {
      petitionTo("/miningQueueAPI/tx/" + data.txIdSelected, setData);
    } else if (data.blockSelected === -1) {
      petitionTo("/miningQueueAPI/miningQueue", setData);
    } else if (data.satVByteSelected === -1) {
      petitionTo("/miningQueueAPI/block/" + data.blockSelected, setData);
    } else if (data.txIndexSelected === -1) {
      petitionTo(
        "/miningQueueAPI/histogram/" +
          data.blockSelected +
          "/" +
          data.satVByteSelected,
        setData
      );
    }
  }

  /**********************************************Block Functions *********************************************/
  function onBlockSelected(blockSelected) {
    //petition when first or subsequent click on block
    petitionTo("/miningQueueAPI/block/" + blockSelected, setData);
    setTxIdText("");
    setTxIdNotFound(false);
  }

  /**********************************************SatVByte Functions *********************************************/
  function onSatVByteSelected(satVByteSelected) {
    petitionTo(
      "/miningQueueAPI/histogram/" +
        data.blockSelected +
        "/" +
        satVByteSelected,
      setData
    );
    setTxIdText("");
    setTxIdNotFound(false);
  }

  /**********************************************TxIndex Functions *********************************************/
  function onTxIndexSelected(txIndexSelected) {
    petitionTo(
      "/miningQueueAPI/txIndex/" +
        data.blockSelected +
        "/" +
        data.satVByteSelected +
        "/" +
        txIndexSelected,
      (incomingData) => {
        setData(incomingData);
        setTxIdText(incomingData.txIdSelected);
      }
    );
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
    petitionTo("/miningQueueAPI/tx/" + txIdTextState, (incomingData) => {
      if (incomingData.txIdSelected === "") {
        setTxIdNotFound(true);
        setData(incomingData); //It will return basic mempool data if tx not found
      } else {
        setTxIdNotFound(false);
        setData(incomingData);
      }
    });
  }

  /*************************************************TxIdChanged Functions ********************************************/
  function onTxIdSelected(tId) {
    petitionTo("/miningQueueAPI/tx/" + tId, (incomingData) => {
      if (incomingData.txIdSelected === "") {
        setTxIdNotFound(true);
        setData(incomingData); //It will return basic mempool data if tx not found
      } else {
        setTxIdNotFound(false);
        setTxIdText(tId);
        setData(incomingData);
      }
    });
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
