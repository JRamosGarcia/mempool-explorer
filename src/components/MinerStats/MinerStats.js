import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./MinerStats.css";
import { MinersStatsList } from "./MinersStatsList";
import { BlockStatsList } from "../BlockStats/BlockStatsList";
import { petitionTo } from "../../utils/utils";

export function MinerStats(props) {
  let { id } = useParams();

  const [minersStatsList, setMinersStatsList] = useState([]);
  const [igBlockList, setIgBlockList] = useState();

  useEffect(() => {
    if (id === undefined) {
      petitionTo(
        "/minersStatsAPI/historicStats",
        setMinersStatsList
      );
    } else {
      petitionTo(
        "/minersStatsAPI/ignoringBlocks/" + id,
        setIgBlockList
      );
    }
  }, [id]);

  if (id === undefined) {
    return <MinersStatsList minersStatsList={minersStatsList} />;
  } else if (igBlockList !== undefined) {
    return <BlockStatsList igBlockList={igBlockList} />;
  } else return null;
}
