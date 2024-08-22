/**
 * Fetcht Daten aus der erhaltenen url und handelt response je nachdem ob diese erfolgreich war oder nicht
 * @param url URL aus der die Daten gefetcht werden
 * @param options Optionen des Fetch requests
 * @param elementId ID des html elements auf der die Meldung angezeigt wird
 * @param successMessage Meldung die angezeigt wird bei erfolgreichem Request
 * @param errorMessage Meldung bei fehlgeschlagenem Request
 */// @ts-ignore
async function handleFetch(url: string, options: RequestInit, elementId: string, successMessage: string, errorMessage: string, expectJson: boolean = true): Promise<void> {
  try {
    const res: Response = await fetch(url, options);

    if (expectJson) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (res.ok) {
          showMessage(elementId, successMessage, 'alert-success');
        } else {
          showMessage(elementId, `${errorMessage}: ${data.message || 'Unknown error'}`, 'alert-danger');
        }
      } else {
        const text = await res.text();
        console.error("Expected JSON response but got:", text);
        showMessage(elementId, `${errorMessage}: Unexpected response format`, 'alert-danger');
      }
    } else {
      const text = await res.text();
      if (res.ok) {
        showMessage(elementId, successMessage, 'alert-success');
        if (url.includes('logout')) {
          window.location.href = 'login.html';
        }
      } else {
        console.error("Expected text response but got:", text);
        showMessage(elementId, `${errorMessage}: ${text}`, 'alert-danger');
      }
    }
  } catch (error) {
    showMessage(elementId, errorMessage, 'alert-danger');
  }
}

/**
 * Zeigt eine Nachricht im festgelegten html element an und wendet eine css klasse an um die meldung zu stylen
 * @param elementId ID des html elements auf der die Nachricht angezeigt wird
 * @param message Nachricht die angezeigt wird
 * @param alertClass css klasse für das styling
 */
// @ts-ignore
function showMessage(elementId: string, message: string, alertClass: string): void {
  const result: HTMLElement | null = document.getElementById(elementId);
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
async function logout(): Promise<void> {
  const url = 'http://localhost:8888/logout';
  const options: RequestInit = {
    method: 'POST',
    mode: 'cors',
    headers: {
      "Content-type": "application/json"
    },
    credentials: 'include'
  };

  await handleFetch(url, options, 'result', 'Logout successful', 'Logout failed', false);
}

/**
 * Erstellt einen neuen Benutzer mit den eingegebenen Benutzernamen und Passwort
 * @param username Benutzername des neuen Benutzers
 * @param password Passwort des neuen Benutzers
 */
async function createUser(username: string, password: string): Promise<void> {
  const url = 'http://localhost:8888/users';
  const options: RequestInit = {
    method: 'POST',
    mode: 'cors',
    headers: {
      "Content-type": "application/json"
    },
    credentials: 'include',
    body: JSON.stringify({ username, password })
  };

  await handleFetch(url, options, 'result', 'User created successfully', 'User creation failed');
}

/**
 * Fetcht und zeigt alle Benutzer vom Server an
 */
async function getAllUsers(): Promise<void> {
  const url = 'http://localhost:8888/users';
  const options: RequestInit = {
    method: 'GET',
    mode: 'cors',
    headers: {
      "Content-type": "application/json"
    },
    credentials: 'include'
  };

  try {
    const res: Response = await fetch(url, options);
    const data = await res.json();

    if (res.ok) {
      const usersList: HTMLElement | null = document.getElementById('usersList');
      if (usersList) {
        usersList.innerHTML = '';

        if (data.length > 0) {
          data.forEach((user: { userID: number, username: string }) => {
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
              deleteBtn.addEventListener('click', async () => {
                await deleteUser(user.userID);
                await getAllUsers();
              });
            }
          });
        } else {
          usersList.textContent = "No users found.";
        }
      }
    } else {
      showMessage('usersList', 'Failed to retrieve users', 'alert-danger');
    }
  } catch (error) {
    showMessage('usersList', 'Failed to retrieve users', 'alert-danger');
  }
}

/**
 * Sucht nach einem Benutzer basierend auf dem eingegeben Suchwort und zeigt das Ergebnis in einem html element
 * @param searchTerm Suchwort welches im Titel und Tags berücksichtigt wird
 */
async function searchUser(searchTerm: string): Promise<void> {
  const url = `http://localhost:8888/users/search?searchTerm=${encodeURIComponent(searchTerm)}`;
  const options: RequestInit = {
    method: 'GET',
    mode: 'cors',
    headers: {
      "Content-type": "application/json"
    },
    credentials: 'include'
  };

  try {
    const res: Response = await fetch(url, options);
    const data = await res.json();

    if (res.ok) {
      const usersList: HTMLElement | null = document.getElementById('usersList');
      if (usersList) {
        usersList.innerHTML = '';

        if (data.length > 0) {
          data.forEach((user: { userID: number, username: string }) => {
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
              deleteBtn.addEventListener('click', async () => {
                await deleteUser(user.userID);
                await searchUser(searchTerm);
              });
            }
          });
        } else {
          usersList.textContent = "No users found.";
        }
      }
    } else {
      showMessage('usersList', 'Failed to search users', 'alert-danger');
    }
  } catch (error) {
    showMessage('usersList', 'Failed to search users', 'alert-danger');
  }
}

/**
 * Zeigt ein form element an um die Benutzerinformationen bearbeiten zu können
 * @param userID ID des zu bearbeitenden Benutzers
 * @param username Aktueller Benutzername des Benutzers
 */
// @ts-ignore
function showEditForm(userID: number, username: string): void {
  const usersList: HTMLElement | null = document.getElementById('usersList');
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

    const editUserForm: HTMLFormElement | null = document.getElementById('editUserForm') as HTMLFormElement;
    const cancelEditButton: HTMLElement | null = document.getElementById('cancelEditButton');

    if (editUserForm) {
      editUserForm.addEventListener('submit', async (event: Event) => {
        event.preventDefault(); // Prevent the default form submission

        const newUsernameInput: HTMLInputElement | null = document.getElementById('newUsername') as HTMLInputElement;
        const newPasswordInput: HTMLInputElement | null = document.getElementById('newPassword') as HTMLInputElement;

        if (newUsernameInput && newPasswordInput) {
          const newUsername = newUsernameInput.value;
          const newPassword = newPasswordInput.value;

          await editUser(userID, newUsername, newPassword);
          await getAllUsers();
        }
      });
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
async function editUser(userID: number, newUsername: string, newPassword: string): Promise<void> {
  const url = `http://localhost:8888/users/${userID}`;
  const options: RequestInit = {
    method: 'PUT',
    mode: 'cors',
    headers: {
      "Content-type": "application/json"
    },
    credentials: 'include',
    body: JSON.stringify({ username: newUsername, password: newPassword })
  };

  await handleFetch(url, options, 'result', 'User updated successfully', 'User update failed');
}

/**
 * Löscht einen Benutzer anhand der ID
 * @param userID ID des Benutzers
 */
async function deleteUser(userID: number): Promise<void> {
  const url = `http://localhost:8888/users/${userID}`;
  const options: RequestInit = {
    method: 'DELETE',
    mode: 'cors',
    headers: {
      "Content-type": "application/json"
    },
    credentials: 'include'
  };

  await handleFetch(url, options, 'result', 'User deleted successfully', 'User deletion failed');
}

/**
 * Initialisiere die event listener sobald das Dokument vollständig geladen wurde
 */
document.addEventListener('DOMContentLoaded', () => {
  const createUserForm: HTMLFormElement | null = document.getElementById('createUserForm') as HTMLFormElement;
  const getAllUsersButton: HTMLElement | null = document.getElementById('getAllUsersButton');
  const searchUserForm: HTMLFormElement | null = document.getElementById('searchUserForm') as HTMLFormElement;
  const logoutButton: HTMLElement | null = document.getElementById('logoutButton');

  if (createUserForm) {
    createUserForm.addEventListener('submit', async (event: Event) => {
      event.preventDefault(); // Prevent the default form submission

      const usernameInput: HTMLInputElement | null = document.getElementById('username') as HTMLInputElement;
      const passwordInput: HTMLInputElement | null = document.getElementById('password') as HTMLInputElement;

      if (usernameInput && passwordInput) {
        const username = usernameInput.value;
        const password = passwordInput.value;

        await createUser(username, password);
        await getAllUsers();
      }
    });
  }

  if (getAllUsersButton) {
    getAllUsersButton.addEventListener('click', async () => {
      await getAllUsers();
    });
  }

  if (searchUserForm) {
    searchUserForm.addEventListener('submit', async (event: Event) => {
      event.preventDefault(); // Prevent the default form submission

      const searchTermInput: HTMLInputElement | null = document.getElementById('searchTerm') as HTMLInputElement;

      if (searchTermInput) {
        const searchTerm = searchTermInput.value;
        await searchUser(searchTerm);
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      await logout();
    });
  }
});
