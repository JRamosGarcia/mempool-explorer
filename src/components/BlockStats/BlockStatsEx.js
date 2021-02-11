import React from "react";
import { format } from "d3-format";
import "./BlockStatsEx.css";

export function BlockStatsEx(props) {
  const { igBlockEx } = props;
  return (
    <div>
      <table className="blockStatsEx">
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
          <tr>
            <td>{igBlockEx.h}</td>
            <td>{igBlockEx.mn}</td>
            <td>{format(",")(igBlockEx.lr)}</td>
            <td>{format(",")(igBlockEx.lreNIM)}</td>
            <td>{new Date(igBlockEx.t).toISOString()}</td>
            <td>{igBlockEx.nInMB}</td>
            <td>{igBlockEx.nInCB}</td>
            <td>{igBlockEx.nInMP}</td>
          </tr>
        </tbody>
      </table>
      <table className="blockStatsExSets">
        <tbody>
          <tr>
            <td rowSpan="12">In our mempool</td>
            <td rowSpan="8">In mined block</td>
            <td rowSpan="4">In our candiate block</td>
            <td rowSpan="4">(In common)</td>
            <td>#</td>
            <td>{format(",")(igBlockEx.mInCBn)}</td>
          </tr>
          <tr>
            <td>weight</td>
            <td>{format(",")(igBlockEx.mInCBw)}</td>
          </tr>
          <tr>
            <td>fees</td>
            <td>{format(",")(igBlockEx.mInCBf)}</td>
          </tr>
          <tr>
            <td>satVByte</td>
            <td>{format("6f")(igBlockEx.mInCBf / (igBlockEx.mInCBw / 4))}</td>
          </tr>
          <tr>
            <td rowSpan="4">Not in our candiate block</td>
            <td rowSpan="4">(Ignored by us)</td>
            <td>#</td>
            <td>{format(",")(igBlockEx.mInmnInCBn)}</td>
          </tr>
          <tr>
            <td>weight</td>
            <td>{format(",")(igBlockEx.mInmnInCBw)}</td>
          </tr>
          <tr>
            <td>fees</td>
            <td>{format(",")(igBlockEx.mInmnInCBf)}</td>
          </tr>
          <tr>
            <td>satVByte</td>
            <td>
              {format("6f")(igBlockEx.mInmnInCBf / (igBlockEx.mInmnInCBw / 4))}
            </td>
          </tr>
          <tr>
            <td rowSpan="4">Not in mined block</td>
            <td rowSpan="4">In our candiate block</td>
            <td rowSpan="4">(Ignored by miner)</td>
            <td>#</td>
            <td>{format(",")(igBlockEx.nmInCBn)}</td>
          </tr>
          <tr>
            <td>weight</td>
            <td>{format(",")(igBlockEx.nmInCBw)}</td>
          </tr>
          <tr>
            <td>fees</td>
            <td>{format(",")(igBlockEx.nmInCBf)}</td>
          </tr>
          <tr>
            <td>satVByte</td>
            <td>{format("6f")(igBlockEx.nmInCBf / (igBlockEx.nmInCBw / 4))}</td>
          </tr>
          <tr>
            <td rowSpan="4">Not in our mempool</td>
            <td rowSpan="4">In mined block</td>
            <td rowSpan="4">Not in candidate block</td>
            <td rowSpan="4">(not relayed to us)</td>
            <td>#</td>
            <td>{format(",")(igBlockEx.mnInMemn)}</td>
          </tr>
          <tr>
            <td>weight</td>
            <td>{format(",")(igBlockEx.mnInMemw)}</td>
          </tr>
          <tr>
            <td>fees</td>
            <td>{format(",")(igBlockEx.mnInMemf)}</td>
          </tr>
          <tr>
            <td>satVByte</td>
            <td>
              {format("6f")(igBlockEx.mnInMemf / (igBlockEx.mnInMemw / 4))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/*
@JsonProperty("mInCBn")
private int minedAndInCandidateBlockTxs;
@JsonProperty("mInCBw")
private int minedAndInCandidateBlockWeight;

@JsonProperty("mInmnInCBn")
private int minedInMempoolButNotInCandidateBlockDataTxs;
@JsonProperty("mInmnInCBw")
private int minedInMempoolButNotInCandidateBlockDataWeight;

@JsonProperty("nmInCBn")
private int notMinedButInCandidateBlockDataTxs;
@JsonProperty("nmInCBw")
private int notMinedButInCandidateBlockDataWeight;

@JsonProperty("mnInMemn")
private int minedButNotInMemPoolDataTxs;
@JsonProperty("mnInMemw")
private int minedButNotInMemPoolDataTxsWeight;
*/
