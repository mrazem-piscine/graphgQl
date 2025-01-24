let totalUp = 0;
let totalDown = 0;
let xpData = [];
let currentGraph = 'default';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');

    if (!token) {
        alert('Unauthorized: Please log in.');
        localStorage.removeItem('token');
        window.location.href = '/';
        return;
    }

    console.log('Token from localStorage:', token);

    try {
        const response = await fetch('https://adam-jerusalem.nd.edu/api/graphql-engine/v1/graphql', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `
                query {
                    user {
                        firstName
                        lastName
                        email
                        auditRatio
                        totalUp
                        totalDown
                    }
                    transaction(where: { type: { _eq: "xp" } }) {
                        amount
                        createdAt
                    }
                }
                `,
            }),
        });

        const result = await response.json();
        console.log('GraphQL Response:', result);

        if (!response.ok || result.errors) {
            console.error('GraphQL Errors:', result.errors || 'Unknown error');
            alert('Error fetching profile data.');
            return;
        }

        const user = result.data.user[0];
        const transactions = result.data.transaction;

        console.log('User Data:', user);
        console.log('Transaction Data:', transactions);

        // Populate profile data
        document.getElementById('first-name').textContent = user.firstName || 'N/A';
        document.getElementById('last-name').textContent = user.lastName || 'N/A';
        document.getElementById('email').textContent = user.email || 'N/A';
        document.getElementById('xp-earned').textContent = user.totalUp || 0;
        document.getElementById('audit-ratio').textContent = user.auditRatio?.toFixed(2) || 'N/A';

        // Store data in global variables
        totalUp = user.totalUp;
        totalDown = user.totalDown;
        xpData = transactions
            .map(t => ({
                date: new Date(t.createdAt).toLocaleDateString(),
                xp: t.amount,
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        console.log('XP Data for Graphs:', xpData);

        // Render graphs
        renderGraphs();
    } catch (error) {
        console.error('Profile Fetch Error:', error.message);
        alert('Error fetching profile data.');
    }
});

function renderGraphs() {
  const graphsContainer = document.getElementById('graphs');

  // Clear any existing content
  graphsContainer.innerHTML = '<h2>Graphs</h2>';

  if (!xpData || xpData.length === 0) {
      graphsContainer.innerHTML += '<p>No data available for graphs.</p>';
      return;
  }

  if (currentGraph === 'default') {
      // Render Default Graphs
      renderDefaultGraphs(graphsContainer, totalUp, totalDown, xpData);
  } else if (currentGraph === 'alternate') {
      // Render Alternate Graphs
      renderAlternateGraphs(graphsContainer, xpData);
  }

  // Add interactive buttons
  graphsContainer.innerHTML += `
      <div style="margin-top: 20px;">
          <button onclick="switchGraph()">Switch Graph</button>
      </div>
  `;
}


function renderDefaultGraphs(container, totalUp, totalDown, xpData) {
    const totalWidth = 400;
    const barHeight = 40;
    const scaleFactor = totalWidth / Math.max(totalUp, totalDown || 1);

    container.innerHTML += `
        <!-- Bar Chart: XP Earned vs Deducted -->
        <svg width="${totalWidth + 150}" height="200" style="border: 1px solid lightgray;">
            <text x="10" y="20" font-size="16px" font-weight="bold">XP Earned vs Deducted</text>
            <rect x="100" y="50" width="0" height="${barHeight}" fill="green" class="hover-bar">
                <animate attributeName="width" from="0" to="${totalUp * scaleFactor}" dur="1s" fill="freeze" />
            </rect>
            <text x="${100 + totalUp * scaleFactor + 10}" y="75" fill="black" font-size="14px">XP Earned (${totalUp})</text>
            <rect x="100" y="120" width="0" height="${barHeight}" fill="red" class="hover-bar">
                <animate attributeName="width" from="0" to="${totalDown * scaleFactor}" dur="1s" fill="freeze" />
            </rect>
            <text x="${100 + totalDown * scaleFactor + 10}" y="145" fill="black" font-size="14px">XP Deducted (${totalDown})</text>
            <text x="10" y="75" fill="black" font-size="16px" font-weight="bold">Earned</text>
            <text x="10" y="145" fill="black" font-size="16px" font-weight="bold">Deducted</text>
        </svg>
    `;

    const graphWidth = 500;
    const graphHeight = 300;
    const maxXP = Math.max(...xpData.map(d => d.xp));
    const xScale = graphWidth / (xpData.length - 1);
    const yScale = graphHeight / maxXP;

    let pathD = '';
    xpData.forEach((point, index) => {
        const x = index * xScale;
        const y = graphHeight - point.xp * yScale;
        pathD += `${index === 0 ? 'M' : 'L'} ${x},${y} `;
    });

    container.innerHTML += `
        <!-- Line Graph: XP Progression -->
        <svg width="${graphWidth + 100}" height="${graphHeight + 150}" style="border: 1px solid lightgray;">
            <text x="10" y="20" font-size="16px" font-weight="bold">XP Progression Over Time</text>
            <line x1="50" y1="${graphHeight + 50}" x2="${graphWidth + 50}" y2="${graphHeight + 50}" stroke="black">
                <animate attributeName="x2" from="50" to="${graphWidth + 50}" dur="1s" fill="freeze" />
            </line>
            <line x1="50" y1="${graphHeight + 50}" x2="50" y2="50" stroke="black">
                <animate attributeName="y2" from="${graphHeight + 50}" to="50" dur="1s" fill="freeze" />
            </line>
            <path d="${pathD}" fill="none" stroke="blue" stroke-width="2" stroke-dasharray="0">
                <animate attributeName="stroke-dasharray" from="0" to="${graphWidth + graphHeight}" dur="2s" fill="freeze" />
            </path>
            ${xpData
                .map(
                    (point, index) => {
                        const x = 50 + index * xScale;
                        const y = graphHeight + 50 - point.xp * yScale;
                        return `
                            <circle cx="${x}" cy="${y}" r="0" fill="blue" class="hover-point">
                                <animate attributeName="r" from="0" to="5" dur="0.5s" begin="${index * 0.1}s" fill="freeze" />
                            </circle>
                            <title>${point.date}: ${point.xp} XP</title>
                        `;
                    }
                )
                .join('')}
        </svg>
    `;
}

function renderAlternateGraphs(container, xpData) {
  // Example: Grouped Bar Chart for XP Earned vs. Deducted Over Time
  const graphWidth = 500;
  const graphHeight = 300;
  const barWidth = 20;
  const maxXP = Math.max(...xpData.map(d => d.xp)) * 1.1; // Add a buffer for visualization
  const xScale = 50; // Horizontal spacing between groups

  container.innerHTML += `
      <svg width="${xpData.length * xScale + 100}" height="${graphHeight + 100}" style="border: 1px solid lightgray;">
          <text x="10" y="20" font-size="16px" font-weight="bold">XP Earned and Deducted Over Time</text>

          <!-- Axes -->
          <line x1="50" y1="${graphHeight + 50}" x2="${xpData.length * xScale + 50}" y2="${graphHeight + 50}" stroke="black" />
          <line x1="50" y1="${graphHeight + 50}" x2="50" y2="50" stroke="black" />

          <!-- Bars -->
          ${xpData
              .map((point, index) => {
                  const xGroup = 50 + index * xScale; // Start of the group
                  const earnedBarHeight = (point.xp / maxXP) * graphHeight;
                  const deductedBarHeight = Math.random() * earnedBarHeight * 0.5; // Mock deducted data for now
                  const earnedBarY = graphHeight + 50 - earnedBarHeight;
                  const deductedBarY = graphHeight + 50 - deductedBarHeight;

                  return `
                      <!-- Earned Bar -->
                      <rect x="${xGroup}" y="${earnedBarY}" width="${barWidth}" height="${earnedBarHeight}" fill="green">
                          <title>${point.date}: XP Earned - ${point.xp}</title>
                      </rect>

                      <!-- Deducted Bar -->
                      <rect x="${xGroup + barWidth + 5}" y="${deductedBarY}" width="${barWidth}" height="${deductedBarHeight}" fill="red">
                          <title>${point.date}: XP Deducted - ${deductedBarHeight.toFixed(0)}</title>
                      </rect>

                      <!-- Labels -->
                      <text x="${xGroup + 5}" y="${graphHeight + 75}" font-size="10px" text-anchor="middle">${point.date}</text>
                  `;
              })
              .join('')}
      </svg>
  `;
}

function filterData(range) {
  let filteredXPData;
  const now = new Date();

  if (range === 'last7') {
      filteredXPData = xpData.filter(d => new Date(d.date) >= new Date(now.setDate(now.getDate() - 7)));
  } else if (range === 'last30') {
      filteredXPData = xpData.filter(d => new Date(d.date) >= new Date(now.setDate(now.getDate() - 30)));
  } else {
      filteredXPData = xpData; // Default: All data
  }

  console.log(`Filtered Data (${range}):`, filteredXPData);
  xpData = filteredXPData; // Update global xpData
  renderGraphs(); // Re-render graphs with filtered data
}

function switchGraph() {
  currentGraph = currentGraph === 'default' ? 'alternate' : 'default';
  renderGraphs(); // Re-render with the toggled graph type
}

function isTokenExpired(token) {
  const [, payload] = token.split('.');
  const { exp } = JSON.parse(atob(payload));
  return Date.now() >= exp * 1000;
}

