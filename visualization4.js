let rawGapData = [];
let gapSpeciesSet = new Set();
let gapEndpointSet = [];

function getSustainabilityKeywords() {
    const input = document.getElementById("sustainKeywordsInput").value;
    return input.split(",").map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
}

function initGapVisualization() {
    d3.select("#chartArea").selectAll("*").remove(); // clean old chart
    const startYearSelect = document.getElementById("startYear");
    const endYearSelect = document.getElementById("endYear");

    // initiate year
    for (let year = 1946; year <= 2019; year++) {
        const option1 = document.createElement("option");
        option1.value = year;
        option1.text = year;
        startYearSelect.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = year;
        option2.text = year;
        endYearSelect.appendChild(option2);
    }
    startYearSelect.value = "1980";
    endYearSelect.value = "2000";

    // render
    d3.csv("data.csv").then(data => {
        rawGapData = data;

        gapSpeciesSet = new Set(data.map(d => d["species_category"]?.trim()));
        gapEndpointSet = Array.from(new Set(data.map(d => d["Exposure Endpoint Type"]))).sort();

        setupGapFilterButton(); 
        updateGapVisualization();
    });
}

function setupGapFilterButton() {
    const filterButton = document.getElementById("filterButton");
    if (filterButton) {
        filterButton.onclick = () => {
            updateGapVisualization();
        };
    }
}

function updateGapVisualization() {
    d3.select("#chartArea").selectAll("*").remove(); //clean

    const start = +document.getElementById("startYear").value;
    const end = +document.getElementById("endYear").value;
    const sustainOnly = document.getElementById("sustainOnly").checked;
    const sustainabilityKeywords = getSustainabilityKeywords();

    const countMap = d3.rollup(
        rawGapData,
        v => v.length,
        d => d["species_category"]?.trim(),
        d => d["Exposure Endpoint Type"],
        d => +d["document_year"]
    );

    const allCombos = [];
    gapSpeciesSet.forEach(species => {
        gapEndpointSet.forEach(endpoint => {
            const endpointLC = endpoint?.toLowerCase() || "";
            const isSustainable = sustainabilityKeywords.some(k => endpointLC.includes(k));
            if (sustainOnly && !isSustainable) return;

            let count = 0;
            for (let year = start; year <= end; year++) {
                count += countMap.get(species)?.get(endpoint)?.get(year) || 0;
            }

            allCombos.push({ species, endpoint, count, isSustainable });
        });
    });

    drawGapChart(allCombos);
}

function drawGapChart(data) {
    const margin = { top: 55, right: 200, bottom: 80, left: 60 },
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom,
        svg = d3.select("#chartArea").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom + 60)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

    const speciesList = Array.from(gapSpeciesSet).sort();
    const endpointList = Array.from(new Set(data.map(d => d.endpoint)));

    const x = d3.scaleBand().domain(endpointList).range([0, width]).padding(0.01);
    const y = d3.scaleBand().domain(speciesList).range([0, height]).padding(0.04);
    const maxCount = d3.max(data, d => d.count);
    const color = d3.scaleLinear().domain([0, maxCount || 1]).range(["#EAF4FF", "#1A73E8"]);

    const tooltip = d3.select("#tooltip");

    svg.selectAll("rect")
        .data(data)
        .enter().append("rect")
        .attr("x", d => x(d.endpoint))
        .attr("y", d => y(d.species))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("class", "cell")
        .style("fill", d => color(d.count))
        .style("stroke", "white")
        .on("mouseover", function (event, d) {
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`${d.species}<br>${d.endpoint}: ${d.count}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));

    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickFormat(d => {
            const match = getSustainabilityKeywords().some(k => d.toLowerCase().includes(k));
            return match ? "🌱 " + d : d;
        }))
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end")
        .style("fill", d => getSustainabilityKeywords().some(k => d.toLowerCase().includes(k)) ? "green" : "black");

    svg.append("g").call(d3.axisLeft(y));
    const legendWidth = 160;
    const legendHeight = 10;

    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "legend-gradient");

    linearGradient.selectAll("stop")
        .data([
            { offset: "0%", color: color(0) },
            { offset: "100%", color: color(maxCount || 1) }
        ])
        .enter()
        .append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - legendWidth - 10}, -40)`);

    legend.append("text")
        .attr("x", 0)
        .attr("y", -6)
        .text("Count (records)")
        .style("font-size", "10px")
        .style("font-weight", "bold");

    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");

    const legendScale = d3.scaleLinear()
        .domain([0, maxCount || 1])
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickSize(legendHeight);

    legend.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis)
        .select(".domain").remove();

}
