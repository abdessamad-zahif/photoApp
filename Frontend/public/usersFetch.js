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
 * Fetcht Daten aus der erhaltenen url und handelt response je nachdem ob diese erfolgreich war oder nicht
 * @param url URL aus der die Daten gefetcht werden
 * @param options Optionen des Fetch requests
 * @param elementId ID des html elements auf der die Meldung angezeigt wird
 * @param successMessage Meldung die angezeigt wird bei erfolgreichem Request
 * @param errorMessage Meldung bei fehlgeschlagenem Request
 */ // @ts-ignore
function handleFetch(url, options, elementId, successMessage, errorMessage, expectJson = true) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield fetch(url, options);
            if (expectJson) {
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const data = yield res.json();
                    if (res.ok) {
                        showMessage(elementId, successMessage, 'alert-success');
                    }
                    else {
                        showMessage(elementId, `${errorMessage}: ${data.message || 'Unknown error'}`, 'alert-danger');
                    }
                }
                else {
                    const text = yield res.text();
                    console.error("Expected JSON response but got:", text);
                    showMessage(elementId, `${errorMessage}: Unexpected response format`, 'alert-danger');
                }
            }
            else {
                const text = yield res.text();
                if (res.ok) {
                    showMessage(elementId, successMessage, 'alert-success');
                    if (url.includes('logout')) {
                        window.location.href = 'login.html';
                    }
                }
                else {
                    console.error("Expected text response but got:", text);
                    showMessage(elementId, `${errorMessage}: ${text}`, 'alert-danger');
                }
            }
        }
        catch (error) {
            showMessage(elementId, errorMessage, 'alert-danger');
        }
    });
}
/**
 * Zeigt eine Nachricht im festgelegten html element an und wendet eine css klasse an um die meldung zu stylen
 * @param elementId ID des html elements auf der die Nachricht angezeigt wird
 * @param message Nachricht die angezeigt wird
 * @param alertClass css klasse für das styling
 */
// @ts-ignore
function showMessage(elementId, message, alertClass) {
    const result = document.getElementById(elementId);
    if (result) {
        result.textContent = message;
        result.className = `alert ${alertClass}`;
    }
}
/**
 * Abmelden des Benutzers indem ein logout Request an den Server gesendet wird, die User ID aus localStorage
 * entfernt und man auf die login Seite weitergeleitet wird
 */
// @ts-ignore
function logout() {
    return __awaiter(this, void 0, void 0, function* () {
        const url = 'http://localhost:8888/logout';
        const options = {
            method: 'POST',
            mode: 'cors',
            headers: {
                "Content-type": "application/json"
            },
            credentials: 'include'
        };
        yield handleFetch(url, options, 'result', 'Logout successful', 'Logout failed', false);
    });
}
/**
 * Erstellt einen neuen Benutzer mit den eingegebenen Benutzernamen und Passwort
 * @param username Benutzername des neuen Benutzers
 * @param password Passwort des neuen Benutzers
 */
function createUser(username, password) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = 'http://localhost:8888/users';
        const options = {
            method: 'POST',
            mode: 'cors',
            headers: {
                "Content-type": "application/json"
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        };
        yield handleFetch(url, options, 'result', 'User created successfully', 'User creation failed');
    });
}
/**
 * Fetcht und zeigt alle Benutzer vom Server an
 */
function getAllUsers() {
    return __awaiter(this, void 0, void 0, function* () {
        const url = 'http://localhost:8888/users';
        const options = {
            method: 'GET',
            mode: 'cors',
            headers: {
                "Content-type": "application/json"
            },
            credentials: 'include'
        };
        try {
            const res = yield fetch(url, options);
            const data = yield res.json();
            if (res.ok) {
                const usersList = document.getElementById('usersList');
                if (usersList) {
                    usersList.innerHTML = '';
                    if (data.length > 0) {
                        data.forEach((user) => {
                            const userItem = document.createElement('div');
                            userItem.classList.add('user-item', 'alert', 'alert-info');
                            userItem.innerHTML = `
                            <span class="username" data-user-id="${user.userID}">${user.username}</span>
                            <button class="edit-btn btn btn-warning btn-sm ml-2">Edit</button>
                            <button class="delete-btn btn btn-danger btn-sm ml-2">Delete</button>
                        `;
                            usersList.appendChild(userItem);
                            const editBtn = userItem.querySelector('.edit-btn');
                            const deleteBtn = userItem.querySelector('.delete-btn');
                            if (editBtn) {
                                editBtn.addEventListener('click', () => {
                                    showEditForm(user.userID, user.username);
                                });
                            }
                            if (deleteBtn) {
                                deleteBtn.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
                                    yield deleteUser(user.userID);
                                    yield getAllUsers();
                                }));
                            }
                        });
                    }
                    else {
                        usersList.textContent = "No users found.";
                    }
                }
            }
            else {
                showMessage('usersList', 'Failed to retrieve users', 'alert-danger');
            }
        }
        catch (error) {
            showMessage('usersList', 'Failed to retrieve users', 'alert-danger');
        }
    });
}
/**
 * Sucht nach einem Benutzer basierend auf dem eingegeben Suchwort und zeigt das Ergebnis in einem html element
 * @param searchTerm Suchwort welches im Titel und Tags berücksichtigt wird
 */
function searchUser(searchTerm) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `http://localhost:8888/users/search?searchTerm=${encodeURIComponent(searchTerm)}`;
        const options = {
            method: 'GET',
            mode: 'cors',
            headers: {
                "Content-type": "application/json"
            },
            credentials: 'include'
        };
        try {
            const res = yield fetch(url, options);
            const data = yield res.json();
            if (res.ok) {
                const usersList = document.getElementById('usersList');
                if (usersList) {
                    usersList.innerHTML = '';
                    if (data.length > 0) {
                        data.forEach((user) => {
                            const userItem = document.createElement('div');
                            userItem.classList.add('user-item', 'alert', 'alert-info');
                            userItem.innerHTML = `
                            <span class="username" data-user-id="${user.userID}">${user.username}</span>
                            <button class="edit-btn btn btn-warning btn-sm ml-2">Edit</button>
                            <button class="delete-btn btn btn-danger btn-sm ml-2">Delete</button>
                        `;
                            usersList.appendChild(userItem);
                            const editBtn = userItem.querySelector('.edit-btn');
                            const deleteBtn = userItem.querySelector('.delete-btn');
                            if (editBtn) {
                                editBtn.addEventListener('click', () => {
                                    showEditForm(user.userID, user.username);
                                });
                            }
                            if (deleteBtn) {
                                deleteBtn.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
                                    yield deleteUser(user.userID);
                                    yield searchUser(searchTerm);
                                }));
                            }
                        });
                    }
                    else {
                        usersList.textContent = "No users found.";
                    }
                }
            }
            else {
                showMessage('usersList', 'Failed to search users', 'alert-danger');
            }
        }
        catch (error) {
            showMessage('usersList', 'Failed to search users', 'alert-danger');
        }
    });
}
/**
 * Zeigt ein form element an um die Benutzerinformationen bearbeiten zu können
 * @param userID ID des zu bearbeitenden Benutzers
 * @param username Aktueller Benutzername des Benutzers
 */
// @ts-ignore
function showEditForm(userID, username) {
    const usersList = document.getElementById('usersList');
    if (usersList) {
        usersList.innerHTML = `
            <div class="alert alert-info">
                <strong>Selected User:</strong> ${username}
            </div>
            <form id="editUserForm" class="mb-4">
                <div class="form-group">
                    <label for="newUsername">New Username:</label>
                    <input type="text" class="form-control" id="newUsername" name="newUsername" required>
                </div>
                <div class="form-group">
                    <label for="newPassword">New Password:</label>
                    <input type="password" class="form-control" id="newPassword" name="newPassword" required>
                </div>
                <button type="submit" class="btn btn-warning btn-block">Edit User</button>
            </form>
            <button id="cancelEditButton" class="btn btn-secondary btn-block mb-3">Cancel</button>
        `;
        const editUserForm = document.getElementById('editUserForm');
        const cancelEditButton = document.getElementById('cancelEditButton');
        if (editUserForm) {
            editUserForm.addEventListener('submit', (event) => __awaiter(this, void 0, void 0, function* () {
                event.preventDefault(); // Prevent the default form submission
                const newUsernameInput = document.getElementById('newUsername');
                const newPasswordInput = document.getElementById('newPassword');
                if (newUsernameInput && newPasswordInput) {
                    const newUsername = newUsernameInput.value;
                    const newPassword = newPasswordInput.value;
                    yield editUser(userID, newUsername, newPassword);
                    yield getAllUsers();
                }
            }));
        }
        if (cancelEditButton) {
            cancelEditButton.addEventListener('click', () => {
                getAllUsers();
            });
        }
    }
}
/**
 * Bearbeitet Benutzerinformationen
 * @param userID ID des zu bearbeitenden Benutzers
 * @param newUsername Neuer Benutzername des Benutzers
 * @param newPassword Neues Passwort des Benutzers
 */
function editUser(userID, newUsername, newPassword) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `http://localhost:8888/users/${userID}`;
        const options = {
            method: 'PUT',
            mode: 'cors',
            headers: {
                "Content-type": "application/json"
            },
            credentials: 'include',
            body: JSON.stringify({ username: newUsername, password: newPassword })
        };
        yield handleFetch(url, options, 'result', 'User updated successfully', 'User update failed');
    });
}
/**
 * Löscht einen Benutzer anhand der ID
 * @param userID ID des Benutzers
 */
function deleteUser(userID) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `http://localhost:8888/users/${userID}`;
        const options = {
            method: 'DELETE',
            mode: 'cors',
            headers: {
                "Content-type": "application/json"
            },
            credentials: 'include'
        };
        yield handleFetch(url, options, 'result', 'User deleted successfully', 'User deletion failed');
    });
}
/**
 * Initialisiere die event listener sobald das Dokument vollständig geladen wurde
 */
document.addEventListener('DOMContentLoaded', () => {
    const createUserForm = document.getElementById('createUserForm');
    const getAllUsersButton = document.getElementById('getAllUsersButton');
    const searchUserForm = document.getElementById('searchUserForm');
    const logoutButton = document.getElementById('logoutButton');
    if (createUserForm) {
        createUserForm.addEventListener('submit', (event) => __awaiter(void 0, void 0, void 0, function* () {
            event.preventDefault(); // Prevent the default form submission
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            if (usernameInput && passwordInput) {
                const username = usernameInput.value;
                const password = passwordInput.value;
                yield createUser(username, password);
                yield getAllUsers();
            }
        }));
    }
    if (getAllUsersButton) {
        getAllUsersButton.addEventListener('click', () => __awaiter(void 0, void 0, void 0, function* () {
            yield getAllUsers();
        }));
    }
    if (searchUserForm) {
        searchUserForm.addEventListener('submit', (event) => __awaiter(void 0, void 0, void 0, function* () {
            event.preventDefault(); // Prevent the default form submission
            const searchTermInput = document.getElementById('searchTerm');
            if (searchTermInput) {
                const searchTerm = searchTermInput.value;
                yield searchUser(searchTerm);
            }
        }));
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', () => __awaiter(void 0, void 0, void 0, function* () {
            yield logout();
        }));
    }
});
