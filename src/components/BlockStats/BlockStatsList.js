import React from "react";
import "./BlockStatsList.css";
import { format } from "d3-format";
import { Link } from "react-router-dom";

export function BlockStatsList(props) {
  const { igBlockList } = props;

  return (
    <div>
      <table className="blockStatsList">
        <thead>
          <tr>
            <td>Height</td>
            <td>Miner name</td>
            <td>Lost reward</td>
            <td>Lost reward excluding not in mempool txs</td>
            <td>Block date:</td>
            <td>#Txs in mined block</td>
            <td>#Txs in candidate block</td>
            <td>#Txs in mempool when mined</td>
          </tr>
        </thead>
        <tbody>
          {igBlockList.map((igb) => (
            <tr key={igb.h}>
              <td>
                <Link to={"/block/" + igb.h}>{igb.h}</Link>
              </td>
              <td>{igb.mn}</td>
              <td>{format(",")(igb.lr)}</td>
              <td>{format(",")(igb.lreNIM)}</td>
              <td>{new Date(igb.t).toISOString()}</td>
              <td>{igb.nInMB}</td>
              <td>{igb.nInCB}</td>
              <td>{igb.nInMP}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

