const width = 800;
const height = 600;
let svg, simulation;
let allData = [];
let allSpecies = [];
let allChemicals = [];

function initializeVisualization() {
    svg = d3.select("#chartArea")
        .append("svg")
        .attr("width", width)
        .attr("height", height);
}

function loadDataFromCSV() {
    

    d3.csv("ChemicalData.csv").then(data => {
        try {
            processData(data);
            setupFilters();
            updateVisualization();
            
            document.getElementById('filters').style.display = 'block';
        } catch (error) {
            
            console.error('Error:', error);
        }
    }).catch(error => {
       
        console.error('Error loading CSV:', error);
    });
}

function processData(rawData) {
    const dataMap = new Map();
    const speciesSet = new Set();
    const chemicalSet = new Set();

    rawData.forEach(row => {
        const species = row.species_category || row.species || 'Unknown Species';
        const chemical = row.Chemical || row.chemical || row.CHEMICAL || 'Unknown Chemical';

        if (species && chemical && species !== 'Unknown Species' && chemical !== 'Unknown Chemical') {
            speciesSet.add(species);
            chemicalSet.add(chemical);

            const key = `${species}-${chemical}`;
            if (!dataMap.has(key)) {
                dataMap.set(key, {
                    species: species,
                    chemical: chemical,
                    studies: 0
                });
            }
            dataMap.get(key).studies += 1;
        }
    });

    allData = Array.from(dataMap.values());
    allSpecies = Array.from(speciesSet).sort();
    allChemicals = Array.from(chemicalSet).sort();
}

function setupFilters() {
    const speciesSelect = document.getElementById('speciesFilter');
    const chemicalSelect = document.getElementById('chemicalFilter');

    speciesSelect.innerHTML = '';
    chemicalSelect.innerHTML = '';

    speciesSelect.style.fontSize = '14px';
    chemicalSelect.style.fontSize = '14px';

    allSpecies.forEach(species => {
        const option = document.createElement('option');
        option.value = species;
        option.textContent = species;
        option.selected = true;
        speciesSelect.appendChild(option);
    });

    allChemicals.forEach(chemical => {
        const formatted = chemical
            .toLowerCase()
            .replace(/\b\w/g, char => char.toUpperCase());  // 首字母大写
    
        const option = document.createElement('option');
        option.value = chemical; // 保留原始 value
        option.textContent = formatted; // 显示为格式化后
        option.selected = true;
        chemicalSelect.appendChild(option);
    });
    
}

function selectAll(type) {
    const selectId = type === 'species' ? 'speciesFilter' : 'chemicalFilter';
    const select = document.getElementById(selectId);

    for (let option of select.options) {
        option.selected = true;
    }

    updateVisualization();
}

function updateVisualization() {
    const selectedSpecies = Array.from(document.getElementById('speciesFilter').selectedOptions)
        .map(option => option.value);
    const selectedChemicals = Array.from(document.getElementById('chemicalFilter').selectedOptions)
        .map(option => option.value);

    const filteredData = allData.filter(d =>
        selectedSpecies.includes(d.species) && selectedChemicals.includes(d.chemical)
    );

    if (filteredData.length === 0) {
        svg.selectAll("*").remove();
       
        return;
    }

    createNetwork(filteredData);
    
}

function createNetwork(data) {
    svg.selectAll("*").remove();

    const nodes = [];
    const links = [];
    const nodeMap = new Map();

    data.forEach(d => {
        if (!nodeMap.has(d.species)) {
            const node = { id: d.species, type: 'species', studies: 0 };
            nodes.push(node);
            nodeMap.set(d.species, node);
        }
        if (!nodeMap.has(d.chemical)) {
            const node = { id: d.chemical, type: 'chemical', studies: 0 };
            nodes.push(node);
            nodeMap.set(d.chemical, node);
        }

        nodeMap.get(d.species).studies += d.studies;
        nodeMap.get(d.chemical).studies += d.studies;

        links.push({
            source: d.species,
            target: d.chemical,
            studies: d.studies
        });
    });

    const maxStudies = d3.max(nodes, d => d.studies);
    nodes.forEach(d => {
        d.radius = 5 + (d.studies / maxStudies) * 20;
    });

    simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(80))
        .force("charge", d3.forceManyBody().strength(-40))
        .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("class", "link")
        .attr("stroke-width", d => Math.sqrt(d.studies));

    const node = svg.append("g")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", d => d.radius)
        .attr("class", d => d.type)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    const labels = svg.append("g")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        .attr("class", "label")
        .text(d => d.id.length > 12 ? d.id.substring(0, 10) + "..." : d.id)
        .style("font-size","8px")
        .attr("dy", d => d.radius + 12);

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x = Math.max(d.radius, Math.min(width - d.radius, d.x)))
            .attr("cy", d => d.y = Math.max(d.radius, Math.min(height - d.radius, d.y)));

        labels
            .attr("x", d => d.x)
            .attr("y", d => d.y);
    });
}

function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}
function initSustainabilityVisualization() {
    d3.select("#chartArea").selectAll("*").remove(); // 清空旧图
    initializeVisualization();

    d3.csv("ChemicalData.csv").then(data => {
        processData(data);
        setupFilters();
        updateVisualization();
       
        document.getElementById('filters').style.display = 'block';
    }).catch(error => {
       
        console.error('Error loading CSV:', error);
    });
}
