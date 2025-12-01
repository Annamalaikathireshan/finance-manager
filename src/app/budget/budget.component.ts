import { Component, signal, computed, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { BudgetService, BudgetItem } from '../services/budget.service';
import { AuthService } from '../services/auth.service';

@Component({
    selector: 'app-budget',
    standalone: true,
    imports: [CommonModule, FormsModule, NgChartsModule],
    templateUrl: './budget.component.html',
    styleUrls: ['./budget.component.css']
})
export class BudgetComponent implements OnInit {
    private budgetService = inject(BudgetService);
    authService = inject(AuthService);

    // Signals for reactive data
    incomeItems = signal<BudgetItem[]>([]);
    expenseItems = signal<BudgetItem[]>([]);

    // Form data for new entries
    newIncome = signal({ description: '', amount: 0 });
    newExpense = signal({ description: '', amount: 0 });

    constructor() {
        effect(() => {
            if (this.authService.currentUser()) {
                this.loadBudgetItems();
            } else {
                this.incomeItems.set([]);
                this.expenseItems.set([]);
            }
        });
    }

    ngOnInit() {
        // Initial load handled by effect
    }

    async loadBudgetItems() {
        try {
            const items = await this.budgetService.getBudgetItems();
            this.incomeItems.set(items.filter(i => i.type === 'income'));
            this.expenseItems.set(items.filter(i => i.type === 'expense'));
        } catch (error) {
            console.error('Error loading budget items:', error);
        }
    }

    // Computed totals with precise calculations
    totalIncome = computed(() => {
        return this.incomeItems().reduce((sum, item) => sum + item.amount, 0);
    });

    totalExpenses = computed(() => {
        return this.expenseItems().reduce((sum, item) => sum + item.amount, 0);
    });

    moneyLeftOver = computed(() => {
        return this.totalIncome() - this.totalExpenses();
    });

    // Pie chart data
    pieChartData = computed<ChartConfiguration<'doughnut'>['data']>(() => {
        const expenses = this.expenseItems();
        const total = this.totalExpenses();

        if (total === 0 || expenses.length === 0) {
            return {
                labels: ['No Data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e0e0e0'],
                    borderWidth: 0
                }]
            };
        }

        const colors = [
            '#0d6efd', // Blue
            '#20c997', // Teal
            '#ffc107', // Yellow
            '#d63384', // Pink
            '#fd7e14', // Orange
            '#6f42c1', // Purple
            '#198754', // Green
            '#dc3545', // Red
            '#17a2b8', // Cyan
            '#6610f2'  // Indigo
        ];

        return {
            labels: expenses.map(e => e.description),
            datasets: [{
                data: expenses.map(e => e.amount),
                backgroundColor: colors.slice(0, expenses.length),
                borderWidth: 3,
                borderColor: '#fff',
                hoverOffset: 15,
                hoverBorderWidth: 4,
                offset: 5
            }]
        };
    });

    pieChartOptions: ChartConfiguration<'doughnut'>['options'] = {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '60%', // Makes it a doughnut
        animation: {
            animateRotate: true,
            animateScale: true,
            duration: 1500,
            easing: 'easeInOutQuart',
            delay: (context: any) => {
                let delay = 0;
                if (context.type === 'data' && context.mode === 'default') {
                    delay = context.dataIndex * 100;
                }
                return delay;
            }
        },
        transitions: {
            active: {
                animation: {
                    duration: 400
                }
            }
        },
        plugins: {
            legend: {
                display: true,
                position: 'right',
                labels: {
                    boxWidth: 15,
                    padding: 10,
                    font: {
                        size: 11
                    },
                    usePointStyle: true,
                    pointStyle: 'circle',
                    generateLabels: (chart) => {
                        const data = chart.data;
                        if (data.labels && data.datasets.length) {
                            const dataset = data.datasets[0];
                            const total = (dataset.data as number[]).reduce((a, b) => a + b, 0);

                            return data.labels.map((label, i) => {
                                const value = dataset.data[i] as number;
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

                                return {
                                    text: `${label} (${percentage}%)`,
                                    fillStyle: Array.isArray(dataset.backgroundColor)
                                        ? dataset.backgroundColor[i] as string
                                        : dataset.backgroundColor as string,
                                    hidden: false,
                                    index: i
                                };
                            });
                        }
                        return [];
                    }
                }
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: '#fff',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                callbacks: {
                    label: (context) => {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                        return `${label}: ₹${value.toFixed(2)} (${percentage}%)`;
                    }
                }
            }
        }
    };

    // Helper methods to update form signals
    updateNewIncomeDescription(value: string) {
        this.newIncome.update(v => ({ ...v, description: value }));
    }

    updateNewIncomeAmount(value: number) {
        this.newIncome.update(v => ({ ...v, amount: +value }));
    }

    updateNewExpenseDescription(value: string) {
        this.newExpense.update(v => ({ ...v, description: value }));
    }

    updateNewExpenseAmount(value: number) {
        this.newExpense.update(v => ({ ...v, amount: +value }));
    }

    // Add new income item
    async addIncome() {
        const income = this.newIncome();
        if (income.description.trim() && income.amount > 0) {
            try {
                const newItem = await this.budgetService.addBudgetItem({
                    description: income.description.trim(),
                    amount: income.amount,
                    type: 'income'
                });
                this.incomeItems.update(items => [...items, newItem]);
                this.newIncome.set({ description: '', amount: 0 });
            } catch (error) {
                console.error('Error adding income:', error);
            }
        }
    }

    // Add new expense item
    async addExpense() {
        const expense = this.newExpense();
        if (expense.description.trim() && expense.amount > 0) {
            try {
                const newItem = await this.budgetService.addBudgetItem({
                    description: expense.description.trim(),
                    amount: expense.amount,
                    type: 'expense'
                });
                this.expenseItems.update(items => [...items, newItem]);
                this.newExpense.set({ description: '', amount: 0 });
            } catch (error) {
                console.error('Error adding expense:', error);
            }
        }
    }

    // Remove income item
    async removeIncome(index: number) {
        const item = this.incomeItems()[index];
        if (item._id) {
            try {
                await this.budgetService.deleteBudgetItem(item._id);
                this.incomeItems.update(items => items.filter((_, i) => i !== index));
            } catch (error) {
                console.error('Error removing income:', error);
            }
        }
    }

    // Remove expense item
    async removeExpense(index: number) {
        const item = this.expenseItems()[index];
        if (item._id) {
            try {
                await this.budgetService.deleteBudgetItem(item._id);
                this.expenseItems.update(items => items.filter((_, i) => i !== index));
            } catch (error) {
                console.error('Error removing expense:', error);
            }
        }
    }

    // Handle CSV file upload
    async onFileSelected(event: any) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const data = await this.budgetService.parseCSV(file);

            // Upload parsed items to backend
            for (const item of data.income) {
                await this.budgetService.addBudgetItem(item);
            }
            for (const item of data.expenses) {
                await this.budgetService.addBudgetItem(item);
            }

            // Refresh list
            this.loadBudgetItems();

            alert('CSV file loaded and saved successfully!');
        } catch (error) {
            console.error('Error parsing CSV:', error);
            alert('Failed to parse CSV file. Please ensure it follows the correct format:\nType,Description,Amount');
        }
    }

    // Format number as currency
    formatCurrency(amount: number): string {
        return amount.toFixed(2);
    }
}
