function renderFocusChart(){
const margin = { top: 40, right: 100, bottom: 50, left: 80 },
width = 800 - margin.left - margin.right,
height = 500 - margin.top - margin.bottom;

const svg = d3.select("#chartArea")
.append("svg")
.attr("width", width + margin.left + margin.right)
.attr("height", height + margin.top + margin.bottom)
.append("g")
.attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("#tooltip");

d3.csv("data.csv", d3.autoType).then(data => {
// Step 1: Group counts by year & species
const nested = d3.rollup(
data,
v => v.length,
d => d.document_year,
d => d.species_category
);

const years = Array.from(nested.keys()).sort((a, b) => a - b);
const speciesSet = new Set();

nested.forEach(speciesMap => {
speciesMap.forEach((_, species) => speciesSet.add(species));
});

const speciesList = Array.from(speciesSet);

const stackedData = years
.filter(year => year >= 1946) // ✅ 先过滤年份
.map(year => {
const entry = { year };
const speciesMap = nested.get(year);
speciesList.forEach(species => {
entry[species] = speciesMap?.get(species) || 0;
});
return entry;
});

// Step 2: Prepare scales and stack layout
const x = d3.scaleLinear()
.domain([1946, d3.max(stackedData, d => d.year)])
.range([0, width]);



const stack = d3.stack()
.keys(speciesList)
.order(d3.stackOrderNone)
.offset(d3.stackOffsetWiggle); // Streamgraph layout

const series = stack(stackedData);

const y = d3.scaleLinear()
.domain([
d3.min(series, layer => d3.min(layer, d => d[0])),
d3.max(series, layer => d3.max(layer, d => d[1]))
])
.range([height, 0]);

const color = d3.scaleOrdinal()
.domain(speciesList)
.range(d3.schemeTableau10);

const area = d3.area()
.x((d, i) => x(stackedData[i].year))
.y0(d => y(d[0]))
.y1(d => y(d[1]))
.curve(d3.curveCatmullRom);

// Step 3: Draw streamgraph
svg.selectAll("path")
.data(series)
.enter()
.append("path")
.attr("d", area)
.attr("fill", d => color(d.key))
.attr("stroke", "black")
.attr("stroke-width", 0.3)
.on("mousemove", function (event, d) {
const [mouseX, mouseY] = d3.pointer(event);
const x0 = Math.round(x.invert(mouseX)); // 获取鼠标对应的年份
const i = stackedData.findIndex(e => e.year === x0);
if (i === -1) return;

const count = d[i] ? d[i][1] - d[i][0] : 0;

tooltip
  .style("left", `${event.pageX + 10}px`)
  .style("top", `${event.pageY - 20}px`)
  .style("opacity", 0.9)  // ✅ 设置透明度而不是 display
  .html(`
<strong>Species:</strong> ${d.key}<br/>
<strong>Year:</strong> ${x0}<br/>
<strong>Count:</strong> ${count}
`);
})

.on("mouseleave", () => tooltip.style("opacity", 0));


// Step 4: Draw X axis
svg.append("g")
.attr("transform", `translate(0,${height})`)
.call(d3.axisBottom(x).tickFormat(d3.format("d")));

svg.append("text")
.attr("x", width / 2)
.attr("y", height + 40)
.style("text-anchor", "middle")
.text("Year");
svg.append("g")
.call(d3.axisLeft(y));

svg.append("text")
.attr("text-anchor", "middle")
.attr("transform", `translate(${-35}, ${height / 2}) rotate(-90)`)
.text("Species Count");

// Optional: Add a legend (species names and colors)
const legend = svg.selectAll(".legend")
.data(speciesList)
.enter()
.append("g")
.attr("transform", (d, i) => `translate(${width + 10},${i * 20})`);

legend.append("rect")
.attr("width", 12)
.attr("height", 12)
.attr("fill", d => color(d));

legend.append("text")
.attr("x", 18)
.attr("y", 10)
.text(d => d)
.style("font-size", "14px");
});
}