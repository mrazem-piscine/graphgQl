
let totalUp = 0;
let totalDown = 0;
let xpData = [];
let projectTransactions = [];

document.addEventListener('DOMContentLoaded', async () => {
    let token = localStorage.getItem('token');

    if (!token) {
        alert('Unauthorized: Please log in.');
        localStorage.removeItem('token');
        window.location.href = 'index.html';
        return;
    }

    token = token.replace(/^"|"$/g, ''); 
    console.log('Token from localStorage:', token);

    try {
        const response = await fetch('https://adam-jerusalem.nd.edu/api/graphql-engine/v1/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
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
                    transaction {
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
            console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
            alert('GraphQL Error: ' + JSON.stringify(result.errors, null, 2));
            return;
        }

        const user = result.data.user[0];
        projectTransactions = result.data.transaction || [];

        console.log('User Data:', user);
        console.log('Project Transactions:', projectTransactions);

        // Update profile details
        updateElementText('first-name', user.firstName || 'N/A');
        updateElementText('last-name', user.lastName || 'N/A');
        updateElementText('email', user.email || 'N/A');
        updateElementText('xp-earned', user.totalUp || 0);
        updateElementText('audit-ratio', user.auditRatio?.toFixed(2) || 'N/A');

        totalUp = user.totalUp;
        totalDown = user.totalDown;

        // Prepare XP Data for Graphs
        xpData = projectTransactions
            .map(t => ({
                date: new Date(t.createdAt).toLocaleDateString(),
                xp: t.amount,
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        console.log('XP Data for Graphs:', xpData);

        // Render graphs only if the section exists
        if (document.getElementById('graphs')) {
            renderGraphs();
        } else {
            console.warn('Graphs section missing in profile.html');
        }
    } catch (error) {
        console.error('Profile Fetch Error:', error.message);
        alert('Error fetching profile data: ' + error.message);
    }
});

// Helper function to update text only if the element exists
function updateElementText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    } else {
        console.warn(`Element with id '${id}' not found.`);
    }
}



function renderGraphs() {
    const graphsContainer = document.getElementById('graphs');
    graphsContainer.innerHTML = '<h2>Graphs</h2>';

    if (!xpData || xpData.length === 0) {
        graphsContainer.innerHTML += '<p>No data available for graphs.</p>';
        return;
    }

    renderDefaultGraphs(graphsContainer, totalUp, totalDown, xpData);
}

function renderDefaultGraphs(container, totalUp, totalDown, xpData) {
    // Existing default graph logic
    const totalWidth = 400;
    const barHeight = 40;
    const scaleFactor = totalWidth / Math.max(totalUp, totalDown || 1);

    container.innerHTML += `
        <!-- Bar Chart: XP Earned vs Deducted -->
        <svg width="${totalWidth + 500}" height="200" style="border: 1px solid lightgray;">
            <text x="10" y="20" font-size="16px" font-weight="bold">XP Earned vs Deducted</text>
            <rect x="100" y="50" width="0" height="${barHeight}" fill="green" class="hover-bar">
                <animate attributeName="width" from="0" to="${totalUp * scaleFactor}" dur="1s" fill="freeze" />
            </rect>
            <text x="${100 + totalUp * scaleFactor + 10}" y="75" fill="black" font-size="14px">XP Earned (${totalUp})</text>
            <rect x="100" y="120" width="0" height="${barHeight}" fill="red" class="hover-bar">
                <animate attributeName="width" from="0" to="${totalDown * scaleFactor}" dur="1s" fill="freeze" />
            </rect>
            <text x="${100 + totalDown * scaleFactor + 10}" y="145" fill="black" font-size="14px">XP Deducted (${totalDown})</text>
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
    <svg width="${graphWidth + 100}" height="${graphHeight + 150}" style="border: 1px solid lightgray; font-family: Arial, sans-serif;">
        <defs>
            <!-- Gradient for the line -->
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#6a5acd" />
                <stop offset="100%" stop-color="#48d1cc" />
            </linearGradient>
        </defs>
        <!-- Title -->
        <text x="${(graphWidth + 100) / 2}" y="20" font-size="16px" font-weight="bold" text-anchor="middle">XP Progression Over Time</text>
        <!-- Axes -->
        <line x1="50" y1="${graphHeight + 50}" x2="${graphWidth + 50}" y2="${graphHeight + 50}" stroke="black" />
        <line x1="50" y1="${graphHeight + 50}" x2="50" y2="50" stroke="black" />
        <!-- Path -->
        <path d="${pathD}" fill="none" stroke="url(#lineGradient)" stroke-width="3">
            <animate attributeName="stroke-dasharray" from="0" to="${graphWidth + graphHeight}" dur="2s" fill="freeze" />
        </path>
    </svg>
`;
}


