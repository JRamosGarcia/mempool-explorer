import React from "react";
import "./MinerStats.css";
import { useParams } from "react-router-dom";

export function MinerStats(props) {
  let { id } = useParams();

  return (
    <div>
      <p>Miner Stats for: {id}</p>
    </div>
  );
}
