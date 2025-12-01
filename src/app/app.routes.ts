import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', redirectTo: 'budget', pathMatch: 'full' },
    { path: 'budget', loadComponent: () => import('./budget/budget.component').then(m => m.BudgetComponent) },
    { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard').then(m => m.DashboardComponent) },
];
