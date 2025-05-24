const explorer = {
  // background: "#0C2446",
  // circleColor: "#0C2446",
  // circleStrokeColor: "#000",
  // circleLabelsColor: "#fff",
  // circleLabelsHaloColor: "#0C2446",
  // circleLabelsHaloWidth: 1,

  // placeLabelsColor: "#222",
  // placeLabelsHaloColor: "#fff",
  // placeLabelsHaloWidth: 1,

  background: '#030E2E',

  circleColor: "#EAEDEF",
  circleStrokeColor: "#000",
  circleLabelsColor: "#FFF",
  circleLabelsHaloColor: "#111",
  circleLabelsHaloWidth: 0,

  placeLabelsColor: "#FFF",
  placeLabelsHaloColor: "#000",
  placeLabelsHaloWidth: 0.2,
  color: [
    {input: '#516ebc', output: '#013185'}, // '#AAD8E6'},
    {input: '#00529c', output: '#1373A9'}, // '#2B7499'},
    {input: '#153477', output: '#05447C'}, // '#56A9CE'},
    {input: '#37009c', output: '#013161'}, // '#2692C6'},
    {input: '#00789c', output: '#022D6D'}, // '#1CA0E3'},
    {input: '#37549c', output: '#00154D'}, // '#00396D'},
    {input: '#9c4b00', output: '#00154D'}, // '#00396D'}
  ]
} 

const original = {
  background: '#101010',

  circleColor: "#fff",
  circleStrokeColor: "#000",
  circleLabelsColor: "#FFF",
  circleLabelsHaloColor: "#111",
  circleLabelsHaloWidth: 0,

  placeLabelsColor: "#FFF",
  placeLabelsHaloColor: "#000",
  placeLabelsHaloWidth: 1,

  color: [
    {input: '#516ebc', output: '#516ebc'},
    {input: '#00529c', output: '#00529c'},
    {input: '#153477', output: '#153477'},
    {input: '#37009c', output: '#37009c'},
    {input: '#00789c', output: '#00789c'},
    {input: '#37549c', output: '#37549c'},
  ]
};


export default function getColorTheme() {
  return explorer;
}