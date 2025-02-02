let totalUp = 0;
let totalDown = 0;
let xpData = [];
let projectTransactions = [];
let auditData = [];
let transactionData = [];

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
                        type
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
        auditData = result.data.audit || [];
        transactionData = result.data.transaction || [];

        console.log('User Data:', user);
        console.log('Project Transactions:', projectTransactions);
        console.log('Audit Data:', auditData);
        console.log('Transaction Data:', transactionData);

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

        // Render graphs
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

   

    if (transactionData.length > 0) {
        renderTransactionTypeGraph(transactionData);
    }
}
function renderDefaultGraphs(container, totalUp, totalDown, xpData) {

    
    // New Pie Chart: XP Earned vs XP Deducted
    if (totalUp !== 0 || totalDown !== 0) {
        const totalXP = totalUp + totalDown;
        const earnedPercentage = (totalUp / totalXP) * 360;
        const deductedPercentage = 360 - earnedPercentage;
        
        const radius = 100;
        const centerX = 150;
        const centerY = 150;
        
        function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
            let angleInRadians = (angleInDegrees - 90) * (Math.PI / 180);
            return {
                x: centerX + radius * Math.cos(angleInRadians),
                y: centerY + radius * Math.sin(angleInRadians),
            };
        }
        
        function describeArc(x, y, radius, startAngle, endAngle) {
            let start = polarToCartesian(x, y, radius, endAngle);
            let end = polarToCartesian(x, y, radius, startAngle);
            let largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
            
            return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} L ${x} ${y} Z`;
        }

        const earnedArc = describeArc(centerX, centerY, radius, 0, earnedPercentage);
        const deductedArc = describeArc(centerX, centerY, radius, earnedPercentage, 360);
        
        container.innerHTML += `
        <!-- Pie Chart: XP Earned vs XP Deducted -->
        <svg width="300" height="150" style="border: 1px solid lightgray;">
        <text x="150" y="20" font-size="16px" font-weight="bold" text-anchor="middle">XP Distribution</text>
        <path d="${earnedArc}" fill="green">
        <animate attributeName="opacity" from="0" to="1" dur="1s" fill="freeze" />
        </path>
        <path d="${deductedArc}" fill="red">
        <animate attributeName="opacity" from="0" to="1" dur="1s" fill="freeze" />
        </path>
        <circle cx="150" cy="150" r="50" fill="white" />
        <text x="120" y="155" font-size="14px" font-weight="bold">XP Earned</text>
        <text x="120" y="175" font-size="14px" font-weight="bold" fill="red">XP Deducted</text>
        </svg>
        `;
    }
    
        const graphWidth = 500;
        const graphHeight = 300;
        const maxXP = Math.max(...xpData.map(d => d.xp), 1);
        const xScale = graphWidth / (xpData.length - 1);
        const yScale = graphHeight / maxXP;
    
        let pathD = '';
        xpData.forEach((point, index) => {
            const x = index * xScale + 50; 
            const y = graphHeight + 50 - point.xp * yScale; 
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
            <path id="xpPath" d="${pathD}" fill="none" stroke="url(#lineGradient)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
        </svg>
        `;
    
        document.addEventListener("DOMContentLoaded", () => {
            const path = document.getElementById("xpPath");
            const totalLength = path.getTotalLength();
    
            path.style.strokeDasharray = totalLength;
            path.style.strokeDashoffset = totalLength;
    
            path.animate([
                { strokeDashoffset: totalLength },
                { strokeDashoffset: "0" }
            ], {
                duration: 2000,
                fill: "forwards"
            });
        });
}

function renderTransactionTypeGraph(transactions) {
    if (!transactions || transactions.length === 0) return;

    // Count transactions by type
    const transactionCounts = { xp: 0, up: 0, down: 0 };
    transactions.forEach(t => {
        if (transactionCounts[t.type] !== undefined) {
            transactionCounts[t.type]++;
        }
    });

    // Define graph dimensions
    const graphWidth = 400;
    const graphHeight = 250;
    const barWidth = 80;
    const maxCount = Math.max(...Object.values(transactionCounts), 1);
    const barSpacing = 50;

    let barsSVG = '';
    let xPosition = 50;

    Object.entries(transactionCounts).forEach(([type, count]) => {
        const barHeight = (count / maxCount) * graphHeight;
        const yPosition = graphHeight - barHeight + 50;

        barsSVG += `
            <rect x="${xPosition}" y="${yPosition}" width="${barWidth}" height="${barHeight}" fill="${type === 'xp' ? 'green' : type === 'up' ? 'blue' : 'red'}">
                <animate attributeName="height" from="0" to="${barHeight}" dur="1s" fill="freeze"/>
            </rect>
            <text x="${xPosition + barWidth / 2}" y="${graphHeight + 80}" font-size="14px" text-anchor="middle">${type.toUpperCase()}</text>
            <text x="${xPosition + barWidth / 2}" y="${yPosition - 5}" font-size="14px" text-anchor="middle" fill="black">${count}</text>
        `;
        xPosition += barWidth + barSpacing;
    });

    document.getElementById('graphs').innerHTML += `
        <!-- Transaction Type Graph -->
        <svg width="${graphWidth + 100}" height="${graphHeight + 100}" style="border: 1px solid lightgray; font-family: Arial, sans-serif;">
            <text x="${(graphWidth + 100) / 2}" y="20" font-size="16px" font-weight="bold" text-anchor="middle">Transaction Types Distribution</text>
            <line x1="50" y1="${graphHeight + 50}" x2="${graphWidth + 50}" y2="${graphHeight + 50}" stroke="black"/>
            ${barsSVG}
        </svg>
    `;
}
