import { json } from "d3-fetch";

export function getNumberWithOrdinal(n) {
  var s = ["th", "st", "nd", "rd"],
    v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function petitionTo(petition, onFunction) {
  json(petition)
    .then((incomingData) => {
      console.log("petition at " + petition);
      onFunction(incomingData);
    })
    .catch((error) => console.log(error));
}

//useReducer as explained in:
// https://stackoverflow.com/questions/53574614/multiple-calls-to-state-updater-from-usestate-in-component-causes-multiple-re-re
/*  const [selectionsState, setSelectionsState] = useReducer(
    (state, newState) => ({ ...state, ...newState }),
    {
      blockSelected: -1,
      satVByteSelected: -1,
      txIndexSelected: -1,
      txIdSelected: "",
    }
  );
  */
