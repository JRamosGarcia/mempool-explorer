import React, { useEffect, useState } from "react";
import { json } from "d3-fetch";
import { format } from "d3-format";
import { TDStackBarGraph } from "./TDStackBarGraph/TDStackBarGraph";
import "./MempoolGraph.css";

export function MempoolGraph2(props) {
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
            setData(data);
          })
          .catch((error) => console.log(error));
      } else if (histoElementSelected === -1) {
        json("http://localhost:3001/api/block/" + blockSelected)
          .then((data) => {
            console.log(
              "petition at http://localhost:3001/api/block/" + blockSelected
            );
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

  function dataForMempoolGraph(data) {
    return {
      id: "MempoolGraph",
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
      tickFormat:{byRightAxisLeft:"~s",byLeftOrBothAxisLeft:"~s", byBothAxisRight:"~s"},
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

  function dataForBlockGraph(data) {
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
      tickFormat:{byRightAxisLeft:"~s",byLeftOrBothAxisLeft:"~s", byBothAxisRight:"~s"},
      htmlTip: `
        <table>
            <tr><td>modSatVByte:</td><td class="TipData"></td></tr>
            <tr><td>Txs#:</td><td class="TipData"></td></tr>
            <tr><td>Weight:</td><td class="TipData"></td></tr>
        </table>`,
      htmlTipData: [(e) => e.m, (e) => e.n, (e) => format(",")(e.w)],

    };
  }

  function dataForTxsGraph(data) {
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
      tickFormat:{byRightAxisLeft:"~s",byLeftOrBothAxisLeft:"~s", byBothAxisRight:""},
      htmlTip: `
        <table>
            <tr><td>Txid#:</td><td class="TipData"></td></tr>
            <tr><td>Weight:</td><td class="TipData"></td></tr>
        </table>`,
      htmlTipData: [(e) => e.i, (e) => format(",")(e.w)],
    };
  }

  return (
    <div>
      <div className="Mempool">
        <TDStackBarGraph
          data={dataForMempoolGraph(data)}
          verticalSize={600}
          barWidth={300}
          //by="byLeft"
          //by="byRight"
          by="byBoth"
        />
        <TDStackBarGraph
          data={dataForBlockGraph(data)}
          verticalSize={600}
          barWidth={300}
          //by="byLeft"
          //by="byRight"
          by="byBoth"
        />
        <TDStackBarGraph
          data={dataForTxsGraph(data)}
          verticalSize={600}
          barWidth={300}
          //by="byLeft"
          //by="byRight"
          by="byBoth"
        />
      </div>
      <p>Block: {blockSelected}</p>
      <p>SatVByte: {histoElementSelected}</p>
      <p>TxId: {txIdSelected}</p>
    </div>
  );
}
