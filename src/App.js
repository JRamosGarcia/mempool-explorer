import React from "react";
import "./App.css";
import { MempoolGraph } from "./components/MempoolGraph/MempoolGraph.js";

function App() {
  return (
    <div className="App">
      <MempoolGraph verticalSize={600} barWidth={300} 
      //by="byWeight" 
      //by="byNumTx"
      by="byBoth"
      />
    </div>
  );
}

export default App;
