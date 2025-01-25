let totalUp = 0;
let totalDown = 0;
let xpData = [];
let projectTransactions = [];

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
                    transaction {
                        amount
                        createdAt
                        object {
                            id
                            name
                            object_type {
                                type
                            }
                            attrs
                        }
                        transaction_type {
                            type
                        }
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
        projectTransactions = result.data.transaction || [];

        console.log('User Data:', user);
        console.log('Project Transactions:', projectTransactions);

        // Populate profile data
        document.getElementById('first-name').textContent = user.firstName || 'N/A';
        document.getElementById('last-name').textContent = user.lastName || 'N/A';
        document.getElementById('email').textContent = user.email || 'N/A';
        document.getElementById('xp-earned').textContent = user.totalUp || 0;
        document.getElementById('audit-ratio').textContent = user.auditRatio?.toFixed(2) || 'N/A';
        document.getElementById('view-projects').addEventListener('click', () => {
            console.log('View Projects button clicked!');
            const detailsContainer = document.getElementById('projects-details');
            if (detailsContainer.style.display === 'none' || detailsContainer.style.display === '') {
                detailsContainer.style.display = 'block';
                renderCollapsibleProjects(detailsContainer);
            } else {
                detailsContainer.style.display = 'none';
            }
        });
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

        // Render graphs and project transactions
        renderGraphs();
    } catch (error) {
        console.error('Profile Fetch Error:', error.message);
        alert('Error fetching profile data.');
    }
});

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

function renderCollapsibleProjects(container) {
    container.innerHTML = '<h3>Project Transactions</h3>';

    if (projectTransactions.length === 0) {
        container.innerHTML += '<p>No project transactions found.</p>';
        return;
    }

    projectTransactions.forEach((t, index) => {
        const projectId = `project-${index}`;
        const attrs = t.object.attrs || {};

        container.innerHTML += `
            <div style="border: 1px solid #ddd; margin: 10px 0;">
                <button style="width: 100%; text-align: left;" onclick="toggleProject('${projectId}')">
                    <strong>${t.object.name || 'Unknown'}</strong>
                </button>
                <div id="${projectId}" style="display: none; padding: 10px;">
                    <p><strong>Object Type:</strong> ${t.object.object_type?.type || 'N/A'}</p>
                    <p><strong>Transaction Type:</strong> ${t.transaction_type?.type || 'N/A'}</p>
                    <p><strong>XP Earned/Deducted:</strong> ${t.amount}</p>
                    <p><strong>Created At:</strong> ${new Date(t.createdAt).toLocaleString()}</p>
                    <p><strong>Attributes:</strong></p>
                    <ul>
                        <li><strong>Group Max:</strong> ${attrs.groupMax || 'N/A'}</li>
                        <li><strong>Group Min:</strong> ${attrs.groupMin || 'N/A'}</li>
                        <li><strong>Language:</strong> ${attrs.language || 'N/A'}</li>
                    </ul>
                </div>
            </div>
        `;
    });
}

function toggleProject(projectId) {
    const projectElement = document.getElementById(projectId);
    if (projectElement.style.display === 'none') {
        projectElement.style.display = 'block';
    } else {
        projectElement.style.display = 'none';
    }
}
