import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { petitionTo } from "../../utils/utils";
import { BlockStatsList } from "./BlockStatsList";
import { BlockStatsEx } from "./BlockStatsEx";
import "./BlockStats.css";

export function BlockStats(props) {
  const { id } = useParams();

  const [igBlockList, setIgBlockList] = useState([]);
  const [igBlockEx, setIgBlockEx] = useState();

  useEffect(() => {
    if (id === undefined) {
      petitionTo(
        "http://localhost:3001/ignoringBlocksAPI/ignoringBlocks",
        setIgBlockList
      );
    } else {
      petitionTo(
        "http://localhost:3001/ignoringBlocksAPI/ignoringBlock/" + id,
        setIgBlockEx
      );
    }
  }, [id]);

  if (id === undefined) {
    return <BlockStatsList igBlockList={igBlockList} />;
  } else if (igBlockEx !== undefined) {
    return <BlockStatsEx igBlockEx={igBlockEx} />;
  } else return null;
}
