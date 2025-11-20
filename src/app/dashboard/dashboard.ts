import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { CountUpModule } from 'ngx-countup';
import { ChartConfiguration, ChartData } from 'chart.js';
import { TransactionService } from '../services/transaction.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgChartsModule, CountUpModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent {
  private transactionService = inject(TransactionService);

  // Finance stats linked to service signals
  totalIncome = this.transactionService.totalIncome;
  totalExpenses = this.transactionService.totalExpenses;
  totalSavings = this.transactionService.balance;

  // Dark mode signal
  isDarkMode = signal(false);

  // Chart Data Signals
  doughnutChartData = signal<ChartConfiguration<'doughnut'>['data']>({
    labels: [],
    datasets: [{ data: [], backgroundColor: [] }]
  });

  barChartData = signal<ChartConfiguration<'bar'>['data']>({
    labels: [],
    datasets: [{ data: [], label: 'Monthly Expenses', backgroundColor: '#4e73df' }]
  });

  polarAreaChartData = signal<ChartConfiguration<'polarArea'>['data']>({
    labels: [],
    datasets: [{ data: [], backgroundColor: [] }]
  });

  constructor() {
    effect(() => {
      this.updateCharts();
    });
  }

  toggleTheme() {
    this.isDarkMode.update(v => !v);
    document.body.classList.toggle('dark-mode', this.isDarkMode());
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    console.log('File selected:', file);
    if (file) {
      try {
        console.log('Parsing file...');
        await this.transactionService.parseFile(file);
        console.log('File parsed successfully');
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Failed to parse file. Please ensure it is a valid Excel/CSV/PDF file.');
      }
    }
  }

  updateCharts() {
    const transactions = this.transactionService.transactions();

    // Process for Doughnut Chart (Expenses by Category)
    const categoryMap = new Map<string, number>();
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || 'Other';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + Math.abs(t.amount));
    });

    this.doughnutChartData.set({
      labels: Array.from(categoryMap.keys()),
      datasets: [{
        data: Array.from(categoryMap.values()),
        hoverOffset: 10,
        backgroundColor: ['#0d6efd', '#6f42c1', '#d63384', '#fd7e14', '#20c997', '#ffc107', '#198754']
      }]
    });

    // Process for Bar Chart (Monthly Expenses) - Simplified for now (using transaction index or date if available)
    // For better visualization, we'd group by month. Assuming date string is parseable.
    const monthlyExpenses = new Map<string, number>();
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const date = new Date(t.date);
      if (!isNaN(date.getTime())) {
        const month = date.toLocaleString('default', { month: 'short' });
        monthlyExpenses.set(month, (monthlyExpenses.get(month) || 0) + Math.abs(t.amount));
      }
    });

    // Sort months if needed, for now just taking keys
    this.barChartData.set({
      labels: Array.from(monthlyExpenses.keys()),
      datasets: [{
        data: Array.from(monthlyExpenses.values()),
        label: 'Monthly Expenses',
        backgroundColor: '#4e73df'
      }]
    });

    // Process for Polar Area Chart (Income vs Expense vs Savings)
    const income = this.totalIncome();
    const expense = this.totalExpenses();
    const savings = this.totalSavings();

    this.polarAreaChartData.set({
      labels: ['Income', 'Expenses', 'Savings'],
      datasets: [{
        data: [income, expense, savings],
        backgroundColor: ['#198754', '#dc3545', '#0d6efd']
      }]
    });
  }

  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { x: {}, y: { beginAtZero: true } }
  };
}
