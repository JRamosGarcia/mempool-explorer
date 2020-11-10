import React from "react";
import { satsToBTC } from "./amount";
import "./TxOutput.css";

export function TxOutput(props) {
  const { txOutput, index } = props;

  return (
    <table className="txOutputTable">
      <tbody>
        {txOutput.addressIds.map((addr, i, a) => (
          <tr key={index}>
            <td>#{index}</td>
            <td>{`${addr} ${a.length - 1 === i ? "" : ", "}`}</td>
            <td>{satsToBTC(txOutput.amount)} BTC</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
