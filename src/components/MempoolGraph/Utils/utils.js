export function byFrom(left, right) {
  if (left && right) {
    return "byBoth";
  }
  if (left) return "byLeft";
  if (right) return "byRight";
  return "byBoth";
}
