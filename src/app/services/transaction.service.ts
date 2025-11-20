import { Injectable, signal } from '@angular/core';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for pdfjs
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = './assets/pdf.worker.min.js';

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  category?: string;
  type: 'income' | 'expense';
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  transactions = signal<Transaction[]>([]);
  totalIncome = signal(0);
  totalExpenses = signal(0);
  balance = signal(0);

  constructor() { }

  async parseFile(file: File): Promise<void> {
    const fileType = file.name.split('.').pop()?.toLowerCase();

    if (fileType === 'pdf') {
      await this.parsePdf(file);
    } else {
      await this.parseExcel(file);
    }
  }

  private async parseExcel(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          this.processData(jsonData);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  private async parsePdf(file: File): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }

    this.processPdfText(fullText);
  }

  private processPdfText(text: string) {
    const transactions: Transaction[] = [];
    let income = 0;
    let expense = 0;

    // Regex for specific format:
    // S No. (digits) | Value Date (Date) | Transaction Date (Date) | Cheque No (digits/text/empty) | Remarks (text) | Withdrawal (num) | Deposit (num) | Balance (num)
    // Example: 1 01/01/2024 05/01/2024 123456 Payment to Uber 15.00 0.00 1000.00
    // We want to capture: Transaction Date ($2), Remarks ($4), Withdrawal ($5), Deposit ($6)

    // Regex breakdown:
    // \d+ \s+                                      -> S No
    // \d{2}[/-]\d{2}[/-]\d{4} \s+                  -> Value Date
    // (\d{2}[/-]\d{2}[/-]\d{4}) \s+                -> Transaction Date (Group 1)
    // .*? \s+                                      -> Cheque No (Non-greedy match until next part) - tricky if empty
    // (.*?) \s+                                    -> Remarks (Group 2)
    // ([\d,]+\.\d{2}) \s+                          -> Withdrawal (Group 3)
    // ([\d,]+\.\d{2}) \s+                          -> Deposit (Group 4)
    // [\d,]+\.\d{2}                                -> Balance

    // Since Cheque No and Remarks can be tricky to separate if Cheque No is missing or text, 
    // and PDF text extraction might merge spaces.
    // Let's try a regex that anchors on the dates and the amounts at the end.

    const specificRegex = /.*?(\d{2}[/-]\d{2}[/-]\d{4})\s+.*?\s+(.*?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+[\d,]+\.\d{2}/;

    // Fallback Regex (Generic): Date ... Description ... Amount
    const genericRegex = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.*?)\s+(-?[\d,]+\.\d{2})/g;

    let match;
    // Try specific regex first? Or just iterate and see what matches.
    // The specific regex expects 3 numbers at the end (Withdrawal, Deposit, Balance).

    // Let's try to match lines that look like the specific format first.
    const lines = text.split('\n');

    for (const line of lines) {
      // Check for specific format
      // We look for 2 dates, then text, then 3 numbers.
      // Note: pdfjs might put everything on one line or split weirdly. 
      // But assuming 'text' passed here is joined by newlines from pages.

      // We'll use a slightly more loose regex for the line
      // Look for Transaction Date (2nd date usually if S No and Value Date exist)
      // Actually, let's just look for the pattern of amounts at the end.

      const specificMatch = specificRegex.exec(line);

      if (specificMatch) {
        const date = specificMatch[1];
        const description = specificMatch[2].trim();
        const withdrawal = parseFloat(specificMatch[3].replace(/,/g, ''));
        const deposit = parseFloat(specificMatch[4].replace(/,/g, ''));

        let amount = 0;
        let type: 'income' | 'expense' = 'expense';

        if (deposit > 0) {
          amount = deposit;
          type = 'income';
        } else {
          amount = withdrawal;
          type = 'expense';
        }

        if (amount > 0) { // Only add if there's a transaction amount
          if (type === 'income') income += amount;
          else expense += amount;

          transactions.push({
            date: date,
            description: description,
            amount: amount,
            type: type,
            category: this.categorizeTransaction(description)
          });
        }
        continue; // Move to next line
      }

      // Fallback to generic regex if specific line match fails
      // Note: This might double count if we mix strategies on the same text stream without consuming it.
      // But since we split by line, it's safer.

      // Reset lastIndex for genericRegex for each new line if it has the 'g' flag
      genericRegex.lastIndex = 0;
      const genericMatch = genericRegex.exec(line);
      if (genericMatch) {
        const date = genericMatch[1];
        const description = genericMatch[2].trim();
        const amountStr = genericMatch[3].replace(/,/g, '');
        const amount = parseFloat(amountStr);

        if (isNaN(amount)) continue;

        let type: 'income' | 'expense' = 'expense';
        if (amount > 0 && (description.toLowerCase().includes('deposit') || description.toLowerCase().includes('salary') || description.toLowerCase().includes('credit'))) {
          type = 'income';
        } else if (amount < 0) {
          type = 'expense';
        }

        const finalAmount = Math.abs(amount);
        if (type === 'income') income += finalAmount;
        else expense += finalAmount;

        transactions.push({
          date: date,
          description: description,
          amount: finalAmount,
          type: type,
          category: this.categorizeTransaction(description)
        });
      }
    }

    this.transactions.set(transactions);
    this.totalIncome.set(income);
    this.totalExpenses.set(expense);
    this.balance.set(income - expense);
  }

  private processData(data: any[]) {
    const transactions: Transaction[] = [];
    let income = 0;
    let expense = 0;

    if (data.length === 0) return;

    // Find header row
    let headerRowIndex = -1;
    let headers: string[] = [];

    // Look for specific headers
    for (let i = 0; i < Math.min(data.length, 10); i++) {
      const row = data[i];
      if (Array.isArray(row) && row.includes('Transaction Date') && row.includes('Transaction Remarks')) {
        headerRowIndex = i;
        headers = row.map(h => String(h)); // Ensure headers are strings
        break;
      }
    }

    // If no specific header found, fallback to basic heuristic (skip first row if not data)
    if (headerRowIndex === -1) {
      if (data.length > 0 && typeof data[0][0] === 'string' && isNaN(Date.parse(data[0][0]))) {
        headerRowIndex = 0; // Assume first row is header
      }
    }

    const startIndex = headerRowIndex + 1;

    // Column Indices
    const dateIdx = headers.indexOf('Transaction Date');
    const descIdx = headers.indexOf('Transaction Remarks');
    const withdrawalIdx = headers.indexOf('Withdrawal Amount(INR)');
    const depositIdx = headers.indexOf('Deposit Amount(INR)');

    for (let i = startIndex; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 3) continue;

      let date, description, amount, type: 'income' | 'expense';

      if (dateIdx !== -1 && descIdx !== -1 && withdrawalIdx !== -1 && depositIdx !== -1) {
        // Specific Format
        date = row[dateIdx];
        description = row[descIdx];
        const withdrawal = parseFloat(row[withdrawalIdx]) || 0;
        const deposit = parseFloat(row[depositIdx]) || 0;

        if (deposit > 0) {
          amount = deposit;
          type = 'income';
        } else {
          amount = withdrawal;
          type = 'expense';
        }
      } else {
        // Fallback Format (Date, Description, Amount)
        date = row[0];
        description = row[1];
        const rawAmount = parseFloat(row[2]);
        if (isNaN(rawAmount)) continue;

        amount = Math.abs(rawAmount);
        type = rawAmount > 0 ? 'income' : 'expense';
      }

      if (type === 'income') {
        income += amount;
      } else {
        expense += amount;
      }

      transactions.push({
        date: String(date),
        description: String(description),
        amount: amount,
        type: type,
        category: this.categorizeTransaction(description)
      });
    }

    this.transactions.set(transactions);
    this.totalIncome.set(income);
    this.totalExpenses.set(expense);
    this.balance.set(income - expense);
  }

  private categorizeTransaction(description: string): string {
    const desc = description.toLowerCase();
    if (desc.includes('food') || desc.includes('restaurant') || desc.includes('grocery')) return 'Food';
    if (desc.includes('uber') || desc.includes('fuel') || desc.includes('transport')) return 'Transport';
    if (desc.includes('bill') || desc.includes('utility') || desc.includes('internet')) return 'Bills';
    if (desc.includes('salary') || desc.includes('deposit')) return 'Income';
    return 'Other';
  }
}
