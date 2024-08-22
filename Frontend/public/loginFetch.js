"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * Login Request an den Server mit dem eingegeben Benutzernamen und Passwort.
 * Bei Erfolg wird der Benutzer auf seine Albumseite weitergeleitet und die UserID in
 * Local Storage gespeichert
 * @param username Benutzername der eingegeben wird
 * @param password Passwort das eingegeben wird
 */
function login(username, password) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = 'http://localhost:8888/login';
        const options = {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        };
        const res = yield fetch(url, options);
        const data = yield res.json();
        if (res.ok) {
            localStorage.setItem('userID', data.userID);
            window.location.href = 'album-management.html';
        }
        else {
            showMessage('result', 'Login failed: ' + data.message, 'alert-danger');
        }
    });
}
/**
 * Zeigt eine Nachricht im festgelegten html element an und wendet eine css klasse an um die meldung zu stylen
 * @param elementId ID des html elements auf der die Nachricht angezeigt wird
 * @param message Nachricht die angezeigt wird
 * @param alertClass css klasse für das styling
 */
function showMessage(elementId, message, alertClass) {
    const result = document.getElementById(elementId);
    if (result) {
        result.textContent = message;
        result.className = `alert ${alertClass}`;
    }
}
/**
 * Initialisiert den login form handler wenn das DOM vollständig geladen ist.
 * Der Handler entnimmt den Benutzernamen und das Passwort aus dem form input und triggert die login Funktion
 */
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => __awaiter(void 0, void 0, void 0, function* () {
            event.preventDefault(); // Prevent the default form submission
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            if (usernameInput && passwordInput) {
                const username = usernameInput.value;
                const password = passwordInput.value;
                yield login(username, password);
            }
        }));
    }
});
