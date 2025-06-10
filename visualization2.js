d3.json("topic_year_data.json").then((data) => {
  const years = data.years.map(String).sort((a, b) => +a - +b);
  const topics = Object.keys(data.topics).sort((a, b) => +a - +b);
  const width = 960;
  const height = 600;
  const color = d3.scaleOrdinal(d3.schemeCategory10);


  const legend = d3
    .select("#chartArea")
    .append("div")
    .style("margin", "-20px auto") 
    .style("text-align", "center") 
    .style("font-size", "14px")
    .style("width", "fit-content"); 


  const svg = d3
    .select("#chartArea")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const wordGroup = svg
    .append("g")
    .attr("transform", `translate(${width / 2.5}, ${height / 2})`);

  const controls = d3.select("#controls");

  controls.append("label").text("Year: ").style("font-size", "14px");
  const slider = controls
    .append("input")
    .attr("type", "range")
    .attr("min", 0)
    .attr("max", years.length - 1)
    .attr("value", 0)
    .attr("step", 1);

  const yearLabel = controls
    .append("span")
    .attr("id", "yearLabel")
    .style("margin-left", "10px")
    .text(years[0])
    .style("font-size", "14px");

  const isPlaying = { status: false };
  const playBtn = controls
    .append("button")
    .style("margin-left", "20px")
    .text("▶ Play")
    .style("font-size", "14px")
    .on("click", () => {
      isPlaying.status = !isPlaying.status;
      playBtn.text(isPlaying.status ? "⏸ Pause" : "▶ Play");
    });



  topics.forEach((t, i) => {
    legend
      .append("span")
      .style("display", "inline-block")
      .style("width", "12px")
      .style("height", "12px")
      .style("margin-right", "6px")
      .style("background-color", color(t));

    legend
      .append("span")
      .style("margin-right", "15px")
      .text("Topic " + t);
  });

  function getTop5WordsPerTopic(topic, yearStr) {
    const entries = data.topics[topic]?.[yearStr] || [];
    return entries.sort((a, b) => b.weight - a.weight).slice(0, 5);
  }

  function getMergedWordsForYear(yearStr) {
    const wordMap = new Map();

    topics.forEach((topic) => {
      const topWords = getTop5WordsPerTopic(topic, yearStr);
      topWords.forEach(({ word, weight }) => {
        if (!wordMap.has(word) || weight > wordMap.get(word).weight) {
          wordMap.set(word, { weight, topic });
        }
      });
    });

    return Array.from(wordMap.entries()).map(([word, { weight, topic }]) => ({
      word,
      weight,
      topic,
    }));
  }

  function drawWordCloud(yearIdx) {
    const yearStr = years[yearIdx];
    yearLabel.text(yearStr);

    const wordArray = getMergedWordsForYear(yearStr);
    if (wordArray.length === 0) {
      wordGroup.selectAll("text").remove();
      return;
    }

    const weights = wordArray.map((d) => d.weight);
    const sizeScale = d3
      .scaleLinear()
      .domain([d3.min(weights), d3.max(weights)])
      .range([12, 60]);

    const layoutWords = wordArray.map((d) => ({
      text: d.word,
      size: sizeScale(d.weight),
      weight: d.weight,
      topic: d.topic,
    }));

    d3.layout
      .cloud()
      .size([width, height])
      .words(layoutWords)
      .padding(5)
      .rotate(() => (Math.random() > 0.5 ? 0 : 90))
      .fontSize((d) => d.size)
      .on("end", draw)
      .start();

    function draw(words) {
      const texts = wordGroup.selectAll("text").data(words, (d) => d.text);

      texts
        .exit()
        .transition()
        .duration(400)
        .attr("font-size", 1)
        .style("fill-opacity", 0)
        .remove();

      texts
        .transition()
        .duration(500)
        .attr(
          "transform",
          (d) => `translate(${d.x}, ${d.y}) rotate(${d.rotate})`
        )
        .style("font-size", (d) => d.size + "px")
        .style("fill-opacity", 1)
        .style("fill", (d) => color(d.topic));

      texts
        .enter()
        .append("text")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(0,0)`)
        .style("font-size", "1px")
        .style("fill-opacity", 0)
        .style("fill", (d) => color(d.topic))
        .text((d) => d.text)
        .transition()
        .duration(500)
        .attr(
          "transform",
          (d) => `translate(${d.x}, ${d.y}) rotate(${d.rotate})`
        )
        .style("font-size", (d) => d.size + "px")
        .style("fill-opacity", 1);
    }
  }

  let debounceTimer;
  slider.on("input", function () {
    clearTimeout(debounceTimer);
    const val = +slider.property("value");
    debounceTimer = setTimeout(() => {
      drawWordCloud(val);
    }, 100);
  });

  let currentYear = 0;
  d3.interval(() => {
    if (isPlaying.status) {
      currentYear = (currentYear + 1) % years.length;
      slider.property("value", currentYear);
      drawWordCloud(currentYear);
    }
  }, 1000);

  drawWordCloud(0);
});
