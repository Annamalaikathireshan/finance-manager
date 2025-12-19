import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';

export interface User {
    _id: string;
    googleId: string;
    displayName: string;
    email: string;
    photoUrl: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpClient);
    currentUser = signal<User | null>(null);

    constructor() {
        this.fetchUser();
    }

    fetchUser() {
        this.http.get<User>('/api/current_user')
            .pipe(
                tap(user => this.currentUser.set(user || null)),
                catchError(() => {
                    this.currentUser.set(null);
                    return of(null);
                })
            )
            .subscribe();
    }

    login() {
        window.location.href = '/auth/google';
    }

    logout() {
        window.location.href = '/api/logout';
    }
}
