// chart-config.js
let expenseChart = null;
let chartInitialized = false;

// Initialize the chart
function initChart() {
    if (chartInitialized) return;

    const ctx = document.getElementById('expenseChart').getContext('2d');

    // Create empty chart
    expenseChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ₱${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    chartInitialized = true;
}

// Update the chart with expense data
function updateChart(expenses) {
    if (!chartInitialized) initChart();

    // Calculate totals by category
    const categoryTotals = {};
    const categories = [
        "Baon", "Groceries", "Transportation",
        "Kapilya", "Savings", "Uncategorized"
    ];

    // Initialize all categories with 0
    categories.forEach(cat => {
        categoryTotals[cat] = 0;
    });

    // Sum amounts by category
    expenses.forEach(expense => {
        const category = expense.category || "Uncategorized";
        categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
    });

    // Filter out categories with 0 amount
    const filteredCategories = categories.filter(cat => categoryTotals[cat] > 0);
    const filteredData = filteredCategories.map(cat => categoryTotals[cat]);

    // Colors for each category
    const backgroundColors = [
        '#FF6384', // Baon (red)
        '#36A2EB', // Groceries (blue)
        '#FFCE56', // Transportation (yellow)
        '#4BC0C0', // Kapilya (teal)
        '#9966FF', // Savings (purple)
        '#FF9F40'  // Uncategorized (orange)
    ];

    // Filter colors to match filtered categories
    const filteredColors = filteredCategories.map((_, index) => {
        const categoryIndex = categories.indexOf(filteredCategories[index]);
        return backgroundColors[categoryIndex % backgroundColors.length];
    });

    // Update chart data
    expenseChart.data.labels = filteredCategories;
    expenseChart.data.datasets[0].data = filteredData;
    expenseChart.data.datasets[0].backgroundColor = filteredColors;

    if (filteredData.length > 0) {
        expenseChart.update();
    } else {
        // Show placeholder if no data
        const ctx = expenseChart.ctx;
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'center';
        ctx.font = '16px Arial';
        ctx.fillText('No expense data yet', ctx.canvas.width/2, ctx.canvas.height/2);
    }
}
