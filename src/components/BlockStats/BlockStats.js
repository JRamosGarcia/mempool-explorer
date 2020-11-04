import React from "react";
import "./BlockStats.css";
import { useParams } from "react-router-dom";

export function BlockStats(props) {
  let { id } = useParams();
  return (
    <div>
      <p>Block Stats for: {id}</p>
    </div>
  );
}
