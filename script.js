let budget = 0;
let todayBudget = 0;
let expenses = [];
let editIndex = -1;

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
      updateBudgetDisplay();
      updateTodayBudgetDisplay();
      renderExpenses();
      checkDayChange();
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

// Check if the day has changed
function checkDayChange() {
  const lastVisitDate = localStorage.getItem('lastVisitDate');
  const today = new Date().toDateString();
  if (lastVisitDate && lastVisitDate !== today) {
    Swal.fire({
      icon: 'info',
      title: 'New Day!',
      text: 'New gastos nanaman',
      confirmButtonText: 'Omsim :('
    });
    todayBudget = 0;
    saveData();
  }
  localStorage.setItem('lastVisitDate', today);
}

// Listen for real-time updates
db.collection("shared").doc("sharedExpenses").onSnapshot((doc) => {
  if (doc.exists) {
    const data = doc.data();
    budget = data.budget || 0;
    todayBudget = data.todayBudget || 0;
    expenses = data.expenses || [];
    updateBudgetDisplay();
    updateTodayBudgetDisplay();
    renderExpenses();
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
    text: `Your budget for today is now ₱${todayBudget}.`
  });
}

// Update today's budget display and remaining
function updateTodayBudgetDisplay() {
  const todayBudgetDisplay = document.getElementById('todayBudgetDisplay');
  todayBudgetDisplay.textContent = `Today's Budget: ₱${todayBudget || 'Not set'}`;
  updateRemainingToday();
}

// Update remaining budget for today
function updateRemainingToday() {
  const today = new Date().toDateString();
  const todayTotal = expenses
    .filter(expense => new Date(expense.date).toDateString() === today)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const remainingToday = todayBudget - todayTotal;
  document.getElementById('budgetRemainingToday').textContent = `Remaining Budget Today: ₱${remainingToday}`;
  document.getElementById('totalExpensesToday').textContent = '₱'+todayTotal;
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
    text: `Your budget is now ₱${budget}.`
  });
}

// Update budget display and remaining
function updateBudgetDisplay() {
  const budgetDisplay = document.getElementById('budgetDisplay');
  budgetDisplay.textContent = `This Week's Budget: ₱${budget || 'Not set'}`;
  updateRemaining();
}

// Update remaining budget this week
function updateRemaining() {
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remaining = budget - total;
  document.getElementById('budgetRemaining').textContent = `Remaining Budget This Week: ₱${remaining}`;
  document.getElementById('totalExpenses').textContent = '₱'+total;
  updateRemainingToday();
}

// Add expense
async function addExpense() {
  const expenseName = document.getElementById('expenseName').value.trim();
  const expenseAmount = parseFloat(document.getElementById('expenseAmount').value);
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
      text: 'This expense is over 500. Sure ka?',
      showCancelButton: true,
      confirmButtonText: 'Omsimm',
      cancelButtonText: 'Hell nah'
    });
    if (!result.isConfirmed) return;
  }
  const expense = {
    name: expenseName,
    amount: expenseAmount,
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
  expenses.forEach((expense, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="py-2 px-4 border">${expense.name}</td>
      <td class="py-2 px-4 border">₱${expense.amount}</td>
      <td class="py-2 px-4 border">${expense.date}</td>
      <td class="py-2 px-4 border">
        <button onclick="editExpense(${index})" class="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 mr-1">
          Edit
        </button>
        <button onclick="removeExpense(${index})" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">
          Remove
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });
  updateRemaining();
}

// Download as CSV
function downloadCSV() {
  let csv = 'Name,Amount,Date\n';
  expenses.forEach(expense => {
    csv += `${expense.name},${expense.amount},${expense.date}\n`;
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
  doc.text(`Budget: ${budget || 'Not set'}`, 10, 20);
  doc.text(`Total Expenses: ${expenses.reduce((sum, expense) => sum + expense.amount, 0)}`, 10, 30);
  doc.text(`Remaining: ${budget - expenses.reduce((sum, expense) => sum + expense.amount, 0)}`, 10, 40);
  const table = document.getElementById('expenseTable');
  const rows = [];
  const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
  rows.push(headers);
  table.querySelectorAll('tbody tr').forEach(tr => {
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
  const container = document.querySelector('.max-w-4xl');
  const budgetDisplay = document.getElementById('budgetDisplay');
  const budgetRemaining = document.getElementById('budgetRemaining');
  const table = document.getElementById('expenseTable');
  const tempDiv = document.createElement('div');
  tempDiv.style.padding = '20px';
  tempDiv.style.backgroundColor = 'white';
  tempDiv.style.borderRadius = '8px';
  tempDiv.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  const budgetClone = budgetDisplay.cloneNode(true);
  budgetClone.style.marginBottom = '10px';
  budgetClone.style.fontSize = '18px';
  budgetClone.style.fontWeight = 'bold';
  const remainingClone = budgetRemaining.cloneNode(true);
  remainingClone.style.marginBottom = '20px';
  remainingClone.style.fontSize = '18px';
  remainingClone.style.fontWeight = 'bold';
  const tableClone = table.cloneNode(true);
  tempDiv.appendChild(budgetClone);
  tempDiv.appendChild(remainingClone);
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
