import React from "react";
import "./App.css";
import { MempoolGraph } from "./components/MempoolGraph/MempoolGraph";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";
import { MinerStats } from "./components/MinerStats/MinerStats";
import { BlockStats } from "./components/BlockStats/BlockStats";

function App() {
  return (
    <Router>
      <div className="App">
        <nav>
          <Link to="/tx">Txs</Link> <span>| </span>
          <Link to="/block">Blocks</Link> <span>| </span>
          <Link to="/miner">Miners</Link>
        </nav>

        <Switch>
          <Route path="/miner/:id">
            <MinerStats />
          </Route>
          <Route path="/miner">
            <MinerStats />
          </Route>
          <Route path="/block/:id">
            <BlockStats />
          </Route>
          <Route path="/block">
            <BlockStats />
          </Route>
          <Route path="/tx/:id">
            <MempoolGraph />
          </Route>
          <Route path="/tx">
            <MempoolGraph />
          </Route>
          <Route path="/">
            <MempoolGraph />
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

export default App;
