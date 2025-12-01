import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { firstValueFrom } from 'rxjs';

export interface BudgetItem {
    _id?: string;
    description: string;
    amount: number;
    type?: 'income' | 'expense';
    date?: Date;
}

@Injectable({
    providedIn: 'root'
})
export class BudgetService {
    private http = inject(HttpClient);

    async getBudgetItems(): Promise<BudgetItem[]> {
        return firstValueFrom(this.http.get<BudgetItem[]>('/api/budget'));
    }

    async addBudgetItem(item: BudgetItem): Promise<BudgetItem> {
        return firstValueFrom(this.http.post<BudgetItem>('/api/budget', item));
    }

    async deleteBudgetItem(id: string): Promise<void> {
        return firstValueFrom(this.http.delete<void>(`/api/budget/${id}`));
    }

    async parseCSV(file: File): Promise<{ income: BudgetItem[], expenses: BudgetItem[] }> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e: any) => {
                try {
                    const data = e.target.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    // Convert to JSON
                    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

                    const income: BudgetItem[] = [];
                    const expenses: BudgetItem[] = [];

                    jsonData.forEach((row: any) => {
                        // Adjust these keys based on your CSV format
                        // Assuming columns: Type, Description, Amount
                        const type = row['Type']?.toLowerCase();
                        const description = row['Description'];
                        const amount = parseFloat(row['Amount']);

                        if (description && !isNaN(amount)) {
                            const item: BudgetItem = { description, amount, type: type === 'income' ? 'income' : 'expense' };
                            if (type === 'income') {
                                income.push(item);
                            } else if (type === 'expense') {
                                expenses.push(item);
                            }
                        }
                    });

                    resolve({ income, expenses });
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = (error) => reject(error);
            reader.readAsBinaryString(file);
        });
    }
}
