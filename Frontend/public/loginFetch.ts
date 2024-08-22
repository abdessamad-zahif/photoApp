/**
 * Login Request an den Server mit dem eingegeben Benutzernamen und Passwort.
 * Bei Erfolg wird der Benutzer auf seine Albumseite weitergeleitet und die UserID in
 * Local Storage gespeichert
 * @param username Benutzername der eingegeben wird
 * @param password Passwort das eingegeben wird
 */
async function login(username: string, password: string): Promise<void> {
  const url = 'http://localhost:8888/login';
  const options: RequestInit = {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password }),
    credentials: 'include'
  };

  const res = await fetch(url, options);
  const data = await res.json();

  if (res.ok) {
    localStorage.setItem('userID', data.userID);
    window.location.href = 'album-management.html';
  } else {
    showMessage('result', 'Login failed: ' + data.message, 'alert-danger');
  }
}

/**
 * Zeigt eine Nachricht im festgelegten html element an und wendet eine css klasse an um die meldung zu stylen
 * @param elementId ID des html elements auf der die Nachricht angezeigt wird
 * @param message Nachricht die angezeigt wird
 * @param alertClass css klasse für das styling
 */
function showMessage(elementId: string, message: string, alertClass: string): void {
  const result: HTMLElement | null = document.getElementById(elementId);
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
  const loginForm: HTMLFormElement | null = document.getElementById('loginForm') as HTMLFormElement;

  if (loginForm) {
    loginForm.addEventListener('submit', async (event: Event) => {
      event.preventDefault(); // Prevent the default form submission

      const usernameInput: HTMLInputElement | null = document.getElementById('username') as HTMLInputElement;
      const passwordInput: HTMLInputElement | null = document.getElementById('password') as HTMLInputElement;

      if (usernameInput && passwordInput) {
        const username = usernameInput.value;
        const password = passwordInput.value;

        await login(username, password);
      }
    });
  }
});
