let budget = 0;
let todayBudget = 0;
let expenses = [];
let editIndex = -1;
let allocations = {};
let editAllocationCategory = null; // Track which allocation is being edited

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHLvfNVnZ7JTKzBCuYV9AOhneOa31qGq8",
  authDomain: "expense-tracker-cf40c.firebaseapp.com",
  projectId: "expense-tracker-cf40c",
  storageBucket: "expense-tracker-cf40c.appspot.com",
  messagingSenderId: "334144233098",
  appId: "1:334144233098:web:7959e543e1f34a5f355773"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Load shared data from Firestore
async function loadData() {
  try {
    const doc = await db.collection("shared").doc("sharedExpenses").get();
    if (doc.exists) {
      const data = doc.data();
      budget = data.budget || 0;
      todayBudget = data.todayBudget || 0;
      expenses = data.expenses || [];
      allocations = data.allocations || {};
      updateAllocationsList();
      const firestoreLastVisitDate = data.lastVisitDate;
      const today = new Date().toDateString();
      if (firestoreLastVisitDate && firestoreLastVisitDate !== today) {
        Swal.fire({
          icon: 'info',
          title: 'New Day!',
          text: 'New gastos nanaman',
          confirmButtonText: 'Omsim :('
        });
        todayBudget = 0;
        await saveData();
      }
      updateBudgetDisplay();
      updateTodayBudgetDisplay();
      renderExpenses();
    }
  } catch (error) {
    console.error("Error loading data:", error);
    Swal.fire({
      icon: 'error',
      title: 'Oops!',
      text: 'Failed to load expenses. Check console for details.'
    });
  }
}

// Save data to Firestore
async function saveData() {
  try {
    await db.collection("shared").doc("sharedExpenses").set({
      budget,
      todayBudget,
      expenses,
      allocations,
      lastVisitDate: new Date().toDateString()
    });
  } catch (error) {
    console.error("Error saving data:", error);
    Swal.fire({
      icon: 'error',
      title: 'Oops!',
      text: 'Failed to save expenses. Check console for details.'
    });
  }
}

// Listen for real-time updates
db.collection("shared").doc("sharedExpenses").onSnapshot((doc) => {
  if (doc.exists) {
    const data = doc.data();
    budget = data.budget || 0;
    todayBudget = data.todayBudget || 0;
    expenses = data.expenses || [];
    allocations = data.allocations || {};
    updateBudgetDisplay();
    updateTodayBudgetDisplay();
    renderExpenses();
    updateAllocationsList();
  }
});

// Set today's budget
function setTodayBudget() {
  const todayBudgetInput = document.getElementById('todayBudgetInput');
  todayBudget = parseFloat(todayBudgetInput.value);
  if (isNaN(todayBudget)) {
    Swal.fire({
      icon: 'error',
      title: 'Invalid Budget',
      text: 'Please enter a valid number for today\'s budget.'
    });
    return;
  }
  updateTodayBudgetDisplay();
  saveData();
  todayBudgetInput.value = '';
  Swal.fire({
    icon: 'success',
    title: 'Today\'s Budget Set',
    text: `Your budget for today is now ₱${todayBudget.toFixed(2)}.`
  });
}

// Handle budget allocation
async function allocateBudget() {
  const categorySelect = document.getElementById('allocationCategory');
  const selectedOption = categorySelect.options[categorySelect.selectedIndex];
  const category = selectedOption ? selectedOption.text : '';
  const amount = parseFloat(document.getElementById('allocationAmount').value);

  if (!category || isNaN(amount) || amount <= 0) {
    Swal.fire({
      icon: 'error',
      title: 'Invalid Input',
      text: 'Please select a category and enter a valid amount.'
    });
    return;
  }

  // Check if we're editing an existing allocation
  if (editAllocationCategory) {
    // Delete the old category key if it's different from the new one
    if (editAllocationCategory !== category) {
      delete allocations[editAllocationCategory];
    }
    // Update with the properly cased category name
    allocations[category] = amount;
    editAllocationCategory = null;
    document.getElementById('allocateBudgetBtn').textContent = 'Allocate Budget';
    document.getElementById('allocationCategory').disabled = false;
  } else {
    // Check for duplicate category (case-sensitive)
    if (Object.keys(allocations).some(key => key === category)) {
      Swal.fire({
        icon: 'warning',
        title: 'Category Already Exists',
        text: `This category already has an allocation. You can edit it by clicking the edit button.`,
        confirmButtonText: 'OK'
      });
      return;
    }

    // Add new allocation with properly cased category name
    allocations[category] = amount;
  }

  updateAllocationsList();
  saveData();
  document.getElementById('allocationCategory').value = '';
  document.getElementById('allocationAmount').value = '';
  Swal.fire({
    icon: 'success',
    title: 'Budget Allocated!',
    text: `₱${amount.toFixed(2)} allocated to ${category}.`
  });
}

// Edit allocation
function editAllocation(category) {
  editAllocationCategory = category;
  document.getElementById('allocationCategory').value = category;
  document.getElementById('allocationAmount').value = allocations[category];
  document.getElementById('allocateBudgetBtn').textContent = 'Update Allocation';
  document.getElementById('allocationCategory').disabled = true;
}

// Cancel allocation edit
function cancelAllocationEdit() {
  editAllocationCategory = null;
  document.getElementById('allocationCategory').value = '';
  document.getElementById('allocationAmount').value = '';
  document.getElementById('allocateBudgetBtn').textContent = 'Allocate Budget';
  document.getElementById('allocationCategory').disabled = false;
}

// Remove allocation
async function removeAllocation(category) {
  const result = await Swal.fire({
    icon: 'warning',
    title: 'Remove Allocation',
    text: `Are you sure you want to remove the allocation for ${category}?`,
    showCancelButton: true,
    confirmButtonText: 'Yes, remove it!',
    cancelButtonText: 'Cancel'
  });

  if (result.isConfirmed) {
    delete allocations[category];
    updateAllocationsList();
    saveData();
    Swal.fire({
      icon: 'success',
      title: 'Allocation Removed',
      text: `The allocation for ${category} has been removed.`
    });
  }
}

// Update the updateAllocationsList function to include a summary
function updateAllocationsList() {
  const allocationsList = document.getElementById('allocationsList');
  allocationsList.innerHTML = '';

  // Calculate total spent per category
  const categorySpending = {};
  expenses.forEach(expense => {
    const category = expense.category || 'Uncategorized';
    categorySpending[category] = (categorySpending[category] || 0) + expense.amount;
  });

  // Calculate totals
  const totalAllocated = Object.values(allocations).reduce((sum, amount) => sum + amount, 0);
  const totalSpent = Object.entries(categorySpending)
    .filter(([category]) => allocations[category])
    .reduce((sum, [_, amount]) => sum + amount, 0);
  const totalRemaining = totalAllocated - totalSpent;

  // Add summary section
  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'mb-4 p-3 bg-gray-50 rounded-lg';
  summaryDiv.innerHTML = `
    <div class="flex justify-between mb-2">
      <span class="font-semibold">Total Allocated:</span>
      <span>₱${totalAllocated.toFixed(2)}</span>
    </div>
    <div class="flex justify-between mb-2">
      <span class="font-semibold">Total Spent:</span>
      <span class="${totalSpent > totalAllocated ? 'text-red-500' : 'text-green-500'}">
        ₱${totalSpent.toFixed(2)}
      </span>
    </div>
    <div class="flex justify-between">
      <span class="font-semibold">Total Remaining:</span>
      <span class="${totalRemaining < 0 ? 'text-red-500' : 'text-green-500'}">
        ₱${Math.abs(totalRemaining).toFixed(2)}
      </span>
    </div>
    <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
      <div class="${totalSpent > totalAllocated ? 'bg-red-500' : 'bg-blue-500'} h-2.5 rounded-full"
           style="width: ${totalAllocated > 0 ? Math.min(100, (totalSpent / totalAllocated) * 100) : 0}%">
      </div>
    </div>
  `;
  allocationsList.appendChild(summaryDiv);

  // Add individual allocations
  const sortedAllocations = Object.entries(allocations)
    .sort((a, b) => b[1] - a[1]);

  if (sortedAllocations.length === 0) {
    allocationsList.innerHTML = '<p class="text-gray-500 text-center py-4">No allocations yet</p>';
    return;
  }

  // Rest of the function remains the same...
  sortedAllocations.forEach(([category, amount]) => {
    const spent = categorySpending[category] || 0;
    const remaining = amount - spent;
    const percentageUsed = amount > 0 ? Math.round((spent / amount) * 100) : 0;

    const div = document.createElement('div');
    div.className = 'flex flex-col p-2 bg-white rounded shadow-sm mb-2';

    // Progress bar color based on usage
    let progressColor = 'bg-blue-500';
    if (percentageUsed > 80) progressColor = 'bg-red-500';
    else if (percentageUsed > 50) progressColor = 'bg-yellow-500';

    div.innerHTML = `
      <div class="flex justify-between items-center mb-1">
        <span class="font-medium">${category}</span>
        <span>₱${amount.toFixed(2)}</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2.5 mb-1">
        <div class="${progressColor} h-2.5 rounded-full" style="width: ${percentageUsed}%"></div>
      </div>
      <div class="flex justify-between text-sm">
        <span>Spent: ₱${spent.toFixed(2)} (${percentageUsed}%)</span>
        <span class="${remaining < 0 ? 'text-red-500' : 'text-green-500'}">
          ${remaining < 0 ? 'Over' : 'Remaining'}: ₱${Math.abs(remaining).toFixed(2)}
        </span>
      </div>
      <div class="flex space-x-2 mt-1">
        <button onclick="editAllocation('${category}')" class="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 text-xs">
          Edit
        </button>
        <button onclick="removeAllocation('${category}')" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-xs">
          Remove
        </button>
      </div>
    `;
    allocationsList.appendChild(div);
  });

  // Add cancel button if editing
  if (editAllocationCategory) {
    const cancelDiv = document.createElement('div');
    cancelDiv.className = 'mt-2';
    cancelDiv.innerHTML = `
      <button onclick="cancelAllocationEdit()" class="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 w-full text-xs">
        Cancel Editing
      </button>
    `;
    allocationsList.appendChild(cancelDiv);
  }
}

// Update today's budget display and remaining
function updateTodayBudgetDisplay() {
  const todayBudgetDisplay = document.getElementById('todayBudgetDisplay');
  todayBudgetDisplay.textContent = `Today's Budget: ₱${todayBudget ? todayBudget.toFixed(2) : 'Not set'}`;
  updateRemainingToday();
}

// Update remaining budget for today
function updateRemainingToday() {
  const today = new Date().toDateString();
  const todayTotal = expenses
    .filter(expense => new Date(expense.date).toDateString() === today)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const remainingToday = todayBudget - todayTotal;
  document.getElementById('budgetRemainingToday').textContent = `Remaining Budget Today: ₱${remainingToday.toFixed(2)}`;
  document.getElementById('totalExpensesToday').textContent = '₱' + todayTotal.toFixed(2);

  // Color coding for remaining budget
  if (remainingToday < 0) {
    document.getElementById('budgetRemainingToday').style.color = "red";
  }
  else if (remainingToday < 100) {
    document.getElementById('budgetRemainingToday').style.color = "darkorange";
  }
  else {
    document.getElementById('budgetRemainingToday').style.color = "green";
  }
}

// Set budget
function setBudget() {
  const budgetInput = document.getElementById('budgetInput');
  budget = parseFloat(budgetInput.value);
  if (isNaN(budget)) {
    Swal.fire({
      icon: 'error',
      title: 'Invalid Budget',
      text: 'Please enter a valid number for the budget.'
    });
    return;
  }
  updateBudgetDisplay();
  saveData();
  budgetInput.value = '';
  Swal.fire({
    icon: 'success',
    title: 'Budget Set',
    text: `Your budget is now ₱${budget.toFixed(2)}.`
  });
}

// Update budget display and remaining
function updateBudgetDisplay() {
  const budgetDisplay = document.getElementById('budgetDisplay');
  budgetDisplay.textContent = `This Week's Budget: ₱${budget ? budget.toFixed(2) : 'Not set'}`;
  updateRemaining();
}

// Update remaining budget this week
function updateRemaining() {
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remaining = budget - total;

  document.getElementById('budgetRemaining').textContent = `Remaining Budget This Week: ₱${remaining.toFixed(2)}`;
  document.getElementById('totalExpenses').textContent = '₱' + total.toFixed(2);

  // Color coding for remaining budget
  if (remaining < 0) {
    document.getElementById('budgetRemaining').style.color = "red";
  }
  else {
    document.getElementById('budgetRemaining').style.color = "green";
  }
}

// Add expense
async function addExpense() {
  const expenseName = document.getElementById('expenseName').value.trim();
  const expenseAmount = parseFloat(document.getElementById('expenseAmount').value);
  const categorySelect = document.getElementById('expenseCategory');
  const category = categorySelect.value || 'Uncategorized'; // Use value, not text

  if (!expenseName || isNaN(expenseAmount)) {
    Swal.fire({
      icon: 'error',
      title: 'Invalid Input',
      text: 'Please enter both expense name and amount.'
    });
    return;
  }

  if (expenseAmount > 499) {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Baby you\'re overspending na',
      text: 'This expense is over ₱500. Sure ka?',
      showCancelButton: true,
      confirmButtonText: 'Omsimm',
      cancelButtonText: 'Hell nah'
    });
    if (!result.isConfirmed) return;
  }

  const expense = {
    name: expenseName,
    amount: expenseAmount,
    category: category,
    date: new Date().toLocaleDateString()
  };

  if (editIndex === -1) {
    expenses.push(expense);
  } else {
    expenses[editIndex] = expense;
    editIndex = -1;
  }

  saveData();
  renderExpenses();
  document.getElementById('expenseName').value = '';
  document.getElementById('expenseAmount').value = '';
  document.getElementById('expenseCategory').value = '';
  Swal.fire({
    icon: 'success',
    title: 'Expense Added',
    text: 'Dahan-dahan sa pag gastos ha'
  });
}

// Clear all expenses
async function clearAllExpenses() {
  const result = await Swal.fire({
    icon: 'warning',
    title: 'Clear All Expenses',
    text: 'Are you sure you want to clear ALL expenses? This cannot be undone.',
    showCancelButton: true,
    confirmButtonText: 'Yes, clear all!',
    cancelButtonText: 'Cancel'
  });
  if (result.isConfirmed) {
    expenses = [];
    saveData();
    renderExpenses();
    Swal.fire({
      icon: 'success',
      title: 'Byebye gastos',
      text: 'Panibagong week panibagong gastos'
    });
  }
}

// Edit expense
function editExpense(index) {
  const expense = expenses[index];
  document.getElementById('expenseName').value = expense.name;
  document.getElementById('expenseAmount').value = expense.amount;
  document.getElementById('expenseCategory').value = expense.category || '';
  editIndex = index;
  Swal.fire({
    icon: 'info',
    title: 'Edit Mode',
    text: 'You are now editing an expense. Update and click "Add Expense" to save.'
  });
}

// Remove expense
async function removeExpense(index) {
  const result = await Swal.fire({
    icon: 'warning',
    title: 'Remove Expense',
    text: 'Are you sure you want to remove this expense?',
    showCancelButton: true,
    confirmButtonText: 'Yes, remove it!',
    cancelButtonText: 'Cancel'
  });
  if (result.isConfirmed) {
    expenses.splice(index, 1);
    editIndex = -1;
    saveData();
    renderExpenses();
    Swal.fire({
      icon: 'success',
      title: 'Expense Removed',
      text: 'The expense has been removed.'
    });
  }
}

// Render expenses in table
function renderExpenses() {
  const tableBody = document.getElementById('expenseTableBody');
  tableBody.innerHTML = '';

  // Sort expenses by date (newest first)
  const sortedExpenses = [...expenses].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  sortedExpenses.forEach((expense, index) => {
    const row = document.createElement('tr');
    // Add category class for styling
    let categoryClass = '';
    if (expense.category) {
      categoryClass = `category-${expense.category.replace(' ', '-').toLowerCase()}`;
    }

    row.innerHTML = `
      <td class="py-2 px-4 border">${expense.name}</td>
      <td class="py-2 px-4 border">₱${expense.amount.toFixed(2)}</td>
      <td class="py-2 px-4 border ${categoryClass}">${expense.category || 'Uncategorized'}</td>
      <td class="py-2 px-4 border">${expense.date}</td>
      <td class="py-2 px-4 border">
        <button onclick="editExpense(${expenses.indexOf(expense)})" class="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 mr-1">
          Edit
        </button>
        <button onclick="removeExpense(${expenses.indexOf(expense)})" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">
          Remove
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  updateRemaining();
  // Update chart if it exists
  if (typeof updateChart === 'function') {
    updateChart(expenses);
  }
}

// Download as CSV
function downloadCSV() {
  let csv = 'Name,Amount,Category,Date\n';
  expenses.forEach(expense => {
    csv += `${expense.name},${expense.amount},${expense.category || 'Uncategorized'},${expense.date}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'expenses.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  Swal.fire({
    icon: 'success',
    title: 'CSV Downloaded',
    text: 'Your expenses have been downloaded as CSV.'
  });
}

// Download as PDF
function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text('Expense Report', 10, 10);
  doc.text(`Budget: ₱${budget ? budget.toFixed(2) : 'Not set'}`, 10, 20);
  doc.text(`Total Expenses: ₱${expenses.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2)}`, 10, 30);
  doc.text(`Remaining: ₱${(budget - expenses.reduce((sum, expense) => sum + expense.amount, 0)).toFixed(2)}`, 10, 40);

  const table = document.getElementById('expenseTable');
  const rows = [];
  const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
  rows.push(headers);

  // Clone the table body to avoid modifying the original
  const tableClone = table.cloneNode(true);
  Array.from(tableClone.querySelectorAll('td:nth-child(2)')).forEach(td => {
    if (!td.textContent.startsWith('₱')) {
      td.textContent = '₱' + td.textContent;
    }
  });

  tableClone.querySelectorAll('tbody tr').forEach(tr => {
    const row = Array.from(tr.querySelectorAll('td')).map(td => td.textContent);
    rows.push(row);
  });

  doc.autoTable({
    head: [rows[0]],
    body: rows.slice(1),
    startY: 50
  });
  doc.save('expenses.pdf');
  Swal.fire({
    icon: 'success',
    title: 'PDF Downloaded',
    text: 'Your expenses have been downloaded as PDF.'
  });
}

// Download as Image
async function downloadImage() {
  const container = document.querySelector('.full-width-container');
  const tempDiv = document.createElement('div');
  tempDiv.style.padding = '20px';
  tempDiv.style.backgroundColor = 'white';
  tempDiv.style.borderRadius = '8px';
  tempDiv.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';

  // Clone the summary cards
  const summaryCards = document.querySelectorAll('.summary-card');
  summaryCards.forEach(card => {
    const clone = card.cloneNode(true);
    tempDiv.appendChild(clone);
  });

  // Add some spacing
  const spacing = document.createElement('div');
  spacing.style.height = '20px';
  tempDiv.appendChild(spacing);

  // Clone the expense table
  const table = document.getElementById('expenseTable');
  const tableClone = table.cloneNode(true);
  tempDiv.appendChild(tableClone);

  document.body.appendChild(tempDiv);
  const canvas = await html2canvas(tempDiv);
  const imgData = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = imgData;
  a.download = 'expenses.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  document.body.removeChild(tempDiv);
  Swal.fire({
    icon: 'success',
    title: 'Image Downloaded',
    text: 'Your expenses have been downloaded as an image.'
  });
}

// Initialize
loadData();
