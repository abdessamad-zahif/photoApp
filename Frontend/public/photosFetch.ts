
/**
 * Fetcht Daten aus der erhaltenen url und handelt response je nachdem ob diese erfolgreich war oder nicht
 * @param url URL aus der die Daten gefetcht werden
 * @param options Optionen des Fetch requests
 * @param elementId ID des html elements auf der die Meldung angezeigt wird
 * @param successMessage Meldung die angezeigt wird bei erfolgreichem Request
 * @param errorMessage Meldung bei fehlgeschlagenem Request
 */
async function handleFetch(url: string, options: RequestInit, elementId: string, successMessage: string, errorMessage: string): Promise<void> {
  try {
    const res: Response = await fetch(url, options);

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
function showMessage(elementId: string, message: string, alertClass: string): void {
  const result: HTMLElement | null = document.getElementById(elementId);
  if (result) {
    result.textContent = message;
    result.className = `alert ${alertClass}`;
  }
}

/**
 * Entnimmt die User ID aus localStorage
 *  @returns Die User ID als String
 *  @throws Fehler falls die User ID nicht gefunden wird
 */
// @ts-ignore
function getUserID(): string {
  const userID = localStorage.getItem('userID');
  if (!userID) {
    throw new Error('User ID not found in localStorage. Please log in.');
  }
  return userID;
}

/**
 * Abmelden des Benutzers indem ein logout Request an den Server gesendet wird, die User ID aus localStorage
 * entfernt und man auf die login Seite weitergeleitet wird
 */
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

  await handleFetch(url, options, 'result', 'Logout successful', 'Logout failed');
  localStorage.removeItem('userID');
  window.location.href = 'login.html';
}

/**
 * Lädt Foto hoch mit eingegebenem Titel, Aufnahmedatum, Tags und der Datei
 * @param title Titel des Fotos
 * @param capture_date Aufnahmedatum des Fotos
 * @param tags Tags die mit dem Foto assoziiert werden
 * @param file Die Foto Datei
 */
async function uploadPhoto(title: string, capture_date: string, tags: string, file: File): Promise<void> {
  const userID = getUserID();
  const url = `http://localhost:8888/${userID}/photos`;
  const formData = new FormData();
  formData.append('title', title);
  formData.append('capture_date', capture_date);
  formData.append('tags', tags);
  formData.append('photo', file);

  const options: RequestInit = {
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
    body: formData
  };

  await handleFetch(url, options, 'result', 'Photo uploaded successfully', 'Photo upload failed');
}

/**
 * Ruft alle Fotos des Benutzers ab und zeigt diese in einem html element
 */
async function getAllPhotos(): Promise<void> {
  const userID = getUserID();
  const url = `http://localhost:8888/${userID}/photos`;
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
      const photosList: HTMLElement | null = document.getElementById('photosList');
      if (photosList) {
        photosList.innerHTML = '';

        if (data.length > 0) {
          data.forEach((photo: { photoID: number, title: string, tags: string, url: string }) => {
            const photoItem = document.createElement('div');
            photoItem.classList.add('photo-item', 'alert', 'alert-info');
            photoItem.innerHTML = `
                            <img src="http://localhost:8888/photos/${photo.photoID}" alt="${photo.title}" style="max-width: 100px; max-height: 100px;" class="photo-thumbnail" data-photo-url="http://localhost:8888/photos/${photo.photoID}">
                            <span class="photo-title" data-photo-id="${photo.photoID}">Title: ${photo.title}, Tags: ${photo.tags}</span>
                            <button class="edit-btn btn btn-warning btn-sm ml-2">Edit</button>
                            <button class="delete-btn btn btn-danger btn-sm ml-2">Delete</button>
                        `;
            photosList.appendChild(photoItem);

            const editBtn = photoItem.querySelector('.edit-btn');
            const deleteBtn = photoItem.querySelector('.delete-btn');
            const thumbnail = photoItem.querySelector('.photo-thumbnail');

            if (editBtn) {
              editBtn.addEventListener('click', () => {
                showEditForm(photo.photoID, photo.title, photo.tags);
              });
            }

            if (deleteBtn) {
              deleteBtn.addEventListener('click', async () => {
                await deletePhoto(photo.photoID);
                await getAllPhotos();
              });
            }

            if (thumbnail) {
              thumbnail.addEventListener('click', () => {
                showPhotoModal(thumbnail.getAttribute('data-photo-url') || '');
              });
            }
          });
        } else {
          photosList.textContent = "No photos found.";
        }
      }
    } else {
      showMessage('photosList', 'Failed to retrieve photos', 'alert-danger');
    }
  } catch (error) {
    showMessage('photosList', 'Failed to retrieve photos', 'alert-danger');
  }
}

/**
 * Sucht nach einem Foto basierend auf dem eingegeben Suchwort und zeigt das Ergebnis in einem html element
 * @param searchTerm Suchwort welches im Titel und Tags berücksichtigt wird
 */
async function searchPhoto(searchTerm: string): Promise<void> {
  const userID = getUserID();
  const url = `http://localhost:8888/${userID}/photos/search?searchTerm=${encodeURIComponent(searchTerm)}`;
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
      const photosList: HTMLElement | null = document.getElementById('photosList');
      if (photosList) {
        photosList.innerHTML = '';

        if (data.length > 0) {
          data.forEach((photo: { photoID: number, title: string, tags: string, url: string }) => {
            const photoItem = document.createElement('div');
            photoItem.classList.add('photo-item', 'alert', 'alert-info');
            photoItem.innerHTML = `
                            <img src="http://localhost:8888/photos/${photo.photoID}" alt="${photo.title}" style="max-width: 100px; max-height: 100px;" class="photo-thumbnail" data-photo-url="http://localhost:8888/photos/${photo.photoID}">
                            <span class="photo-title" data-photo-id="${photo.photoID}">Title: ${photo.title}, Tags: ${photo.tags}</span>
                            <button class="edit-btn btn btn-warning btn-sm ml-2">Edit</button>
                            <button class="delete-btn btn btn-danger btn-sm ml-2">Delete</button>
                        `;
            photosList.appendChild(photoItem);

            const editBtn = photoItem.querySelector('.edit-btn');
            const deleteBtn = photoItem.querySelector('.delete-btn');
            const thumbnail = photoItem.querySelector('.photo-thumbnail');

            if (editBtn) {
              editBtn.addEventListener('click', () => {
                showEditForm(photo.photoID, photo.title, photo.tags);
              });
            }

            if (deleteBtn) {
              deleteBtn.addEventListener('click', async () => {
                await deletePhoto(photo.photoID);
                await searchPhoto(searchTerm);
              });
            }

            if (thumbnail) {
              thumbnail.addEventListener('click', () => {
                showPhotoModal(thumbnail.getAttribute('data-photo-url') || '');
              });
            }
          });
        } else {
          photosList.textContent = "No photos found.";
        }
      }
    } else {
      showMessage('photosList', 'Failed to search photos', 'alert-danger');
    }
  } catch (error) {
    showMessage('photosList', 'Failed to search photos', 'alert-danger');
  }
}

/**
 * Zeige Form Element an um Fotoinformationen zu bearbeiten
 * @param photoID ID des Fotos
 * @param title Aktueller Titel des Fotos
 * @param tags Aktuelle Tags des Fotos
 */
function showEditForm(photoID: number, title: string, tags: string): void {
  const photosList: HTMLElement | null = document.getElementById('photosList');
  if (photosList) {
    photosList.innerHTML = `
            <div class="alert alert-info">
                <strong>Selected Photo:</strong> ${title}
            </div>
            <form id="editPhotoForm" class="mb-4">
                <div class="form-group">
                    <label for="newTitle">New Title:</label>
                    <input type="text" class="form-control" id="newTitle" name="newTitle" required>
                </div>
                <div class="form-group">
                    <label for="newTags">New Tags:</label>
                    <input type="text" class="form-control" id="newTags" name="newTags" value="${tags}">
                </div>
                <button type="submit" class="btn btn-warning btn-block">Edit Photo</button>
            </form>
            <button id="cancelEditButton" class="btn btn-secondary btn-block mb-3">Cancel</button>
        `;

    const editPhotoForm: HTMLFormElement | null = document.getElementById('editPhotoForm') as HTMLFormElement;
    const cancelEditButton: HTMLElement | null = document.getElementById('cancelEditButton');

    if (editPhotoForm) {
      editPhotoForm.addEventListener('submit', async (event: Event) => {
        event.preventDefault();

        const newTitleInput: HTMLInputElement | null = document.getElementById('newTitle') as HTMLInputElement;
        const newTagsInput: HTMLInputElement | null = document.getElementById('newTags') as HTMLInputElement;

        if (newTitleInput) {
          const newTitle = newTitleInput.value;
          const newTags = newTagsInput ? newTagsInput.value : '';

          await editPhoto(photoID, newTitle, newTags);
          await getAllPhotos();
        }
      });
    }

    if (cancelEditButton) {
      cancelEditButton.addEventListener('click', () => {
        getAllPhotos();
      });
    }
  }
}

/**
 * Bearbeitet Fotoinformationen
 * @param photoID ID des Fotos
 * @param newTitle Neuer Titel des Fotos
 * @param newTags Neue Tags des Fotos
 */
async function editPhoto(photoID: number, newTitle: string, newTags: string): Promise<void> {
  const userID = getUserID();
  const url = `http://localhost:8888/${userID}/photos/${photoID}`;
  const options: RequestInit = {
    method: 'PUT',
    mode: 'cors',
    headers: {
      "Content-type": "application/json"
    },
    credentials: 'include',
    body: JSON.stringify({ title: newTitle, tags: newTags })
  };

  await handleFetch(url, options, 'result', 'Photo updated successfully', 'Photo update failed');
}

/**
 * Löscht ein Foto anhand der ID
 * @param photoID ID des Fotos
 */
async function deletePhoto(photoID: number): Promise<void> {
  const userID = getUserID();
  const url = `http://localhost:8888/${userID}/photos/${photoID}`;
  const options: RequestInit = {
    method: 'DELETE',
    mode: 'cors',
    headers: {
      "Content-type": "application/json"
    },
    credentials: 'include'
  };

  await handleFetch(url, options, 'result', 'Photo deleted successfully', 'Photo deletion failed');
}

/**
 * Zeigt ein Modal mit dem ausgewählten Foto
 * @param imageUrl url des Fotos welches angezeigt werden soll
 */
function showPhotoModal(imageUrl: string): void {
  const modalImage: HTMLImageElement | null = document.getElementById('modalImage') as HTMLImageElement;

  if (modalImage) {
    modalImage.src = imageUrl;
  }

  const photoModal = $('#photoModal'); // Select the modal element using its ID
  if (photoModal.length) { // Check if the modal exists
    (photoModal as any).modal('show'); // Show the modal
  } else {
    console.error('Modal element not found');
  }
}

/**
 * Initialisiere die event listener sobald das Dokument vollständig geladen wurde
 */
document.addEventListener('DOMContentLoaded', () => {
  const uploadPhotoForm: HTMLFormElement | null = document.getElementById('uploadPhotoForm') as HTMLFormElement;
  const getAllPhotosButton: HTMLElement | null = document.getElementById('getAllPhotosButton');
  const searchPhotoForm: HTMLFormElement | null = document.getElementById('searchPhotoForm') as HTMLFormElement;
  const logoutButton: HTMLElement | null = document.getElementById('logoutButton');

  if (uploadPhotoForm) {
    uploadPhotoForm.addEventListener('submit', async (event: Event) => {
      event.preventDefault();

      const titleInput: HTMLInputElement | null = document.getElementById('title') as HTMLInputElement;
      const captureDateInput: HTMLInputElement | null = document.getElementById('capture_date') as HTMLInputElement;
      const tagsInput: HTMLInputElement | null = document.getElementById('tags') as HTMLInputElement;
      const photoInput: HTMLInputElement | null = document.getElementById('photo') as HTMLInputElement;

      if (titleInput && captureDateInput && photoInput && photoInput.files && photoInput.files.length > 0) {
        const title = titleInput.value;
        const capture_date = captureDateInput.value;
        const tags = tagsInput ? tagsInput.value : '';
        const file = photoInput.files[0];

        await uploadPhoto(title, capture_date, tags, file);
        await getAllPhotos();
      }
    });
  }

  if (getAllPhotosButton) {
    getAllPhotosButton.addEventListener('click', async () => {
      await getAllPhotos();
    });
  }

  if (searchPhotoForm) {
    searchPhotoForm.addEventListener('submit', async (event: Event) => {
      event.preventDefault();

      const searchTermInput: HTMLInputElement | null = document.getElementById('searchTerm') as HTMLInputElement;

      if (searchTermInput) {
        const searchTerm = searchTermInput.value;
        await searchPhoto(searchTerm);
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      await logout();
    });
  }

  // weiterführende links
  const userManagementLink: HTMLElement | null = document.getElementById('userManagementLink');
  const photoManagementLink: HTMLElement | null = document.getElementById('photoManagementLink');
  const albumManagementLink: HTMLElement | null = document.getElementById('albumManagementLink');

  if (userManagementLink) {
    userManagementLink.addEventListener('click', () => {
      window.location.href = 'user-management.html';
    });
  }

  if (photoManagementLink) {
    photoManagementLink.addEventListener('click', () => {
      window.location.href = 'photo-management.html';
    });
  }

  if (albumManagementLink) {
    albumManagementLink.addEventListener('click', () => {
      window.location.href = 'album-management.html';
    });
  }
});
