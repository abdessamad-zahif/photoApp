/**
 * Fetcht Daten aus der erhaltenen url und handelt response je nachdem ob diese erfolgreich war oder nicht
 * @param url URL aus der die Daten gefetcht werden
 * @param options Optionen des Fetch requests
 * @param elementId ID des html elements auf der die Meldung angezeigt wird
 * @param successMessage Meldung die angezeigt wird bei erfolgreichem Request
 * @param errorMessage Meldung bei fehlgeschlagenem Request
 */
// @ts-ignore
async function handleFetch(url: string, options: RequestInit, elementId: string, successMessage: string, errorMessage: string): Promise<void> {
  try {
    const res: Response = await fetch(url, options);

    // überprüfe ob die antwort als json empfangen wird
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
// @ts-ignore
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

  await handleFetch(url, options, 'result', 'Logout successful', 'Logout failed');
  localStorage.removeItem('userID');
  window.location.href = 'login.html';
}

/**
 * Erstellt ein neues Album für den angemeldeten Benutzer
 * @param title Albumtitel
 * @param tags Tags des Albums
 */
async function createAlbum(title: string, tags: string): Promise<void> {
  const userID = getUserID();
  const url = `http://localhost:8888/${userID}/albums`;
  const options: RequestInit = {
    method: 'POST',
    mode: 'cors',
    headers: {
      "Content-type": "application/json"
    },
    credentials: 'include',
    body: JSON.stringify({ title, tags })
  };

  await handleFetch(url, options, 'result', 'Album created successfully', 'Album creation failed');
}

/**
 * Ruft alle Alben des Benutzers ab und zeigt diese in einem html element
 */
async function getAllAlbums(): Promise<void> {
  const userID = getUserID();
  const url = `http://localhost:8888/${userID}/albums`;
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
      const albumsList: HTMLElement | null = document.getElementById('albumsList');
      if (albumsList) {
        albumsList.innerHTML = '';

        if (data.length > 0) {
          data.forEach((album: { albumID: number, title: string, tags: string }) => {
            const albumItem = document.createElement('div');
            albumItem.classList.add('album-item', 'alert', 'alert-info');
            albumItem.innerHTML = `
                            <strong>Title:</strong> ${album.title} <br>
                            <strong>Tags:</strong> ${album.tags}
                            <button class="edit-btn btn btn-warning btn-sm ml-2">Edit</button>
                            <button class="delete-btn btn btn-danger btn-sm ml-2">Delete</button>
                            <button class="open-btn btn btn-info btn-sm ml-2">Open</button>
                        `;
            albumsList.appendChild(albumItem);

            const editBtn = albumItem.querySelector('.edit-btn');
            const deleteBtn = albumItem.querySelector('.delete-btn');
            const openBtn = albumItem.querySelector('.open-btn');

            if (editBtn) {
              editBtn.addEventListener('click', () => {
                showEditForm(album.albumID, album.title, album.tags);
              });
            }

            if (deleteBtn) {
              deleteBtn.addEventListener('click', async () => {
                await deleteAlbum(album.albumID);
                await getAllAlbums();
              });
            }

            if (openBtn) {
              openBtn.addEventListener('click', () => {
                openAlbum(album.albumID, album.title);
              });
            }
          });
        } else {
          albumsList.textContent = "No albums found.";
        }
      }
    } else {
      showMessage('albumsList', 'Failed to retrieve albums', 'alert-danger');
    }
  } catch (error) {
    showMessage('albumsList', 'Failed to retrieve albums', 'alert-danger');
  }
}

/**
 * Sucht nach einem Album basierend auf dem eingegeben Suchwort und zeigt das Ergebnis in einem html element
 * @param searchTerm Suchwort welches in Albumtitel und Tags berücksichtigt wird
 */
async function searchAlbum(searchTerm: string): Promise<void> {
  const userID = getUserID();
  const url = `http://localhost:8888/${userID}/albums/search?searchTerm=${encodeURIComponent(searchTerm)}`;
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
      const albumsList: HTMLElement | null = document.getElementById('albumsList');
      if (albumsList) {
        albumsList.innerHTML = '';

        if (data.length > 0) {
          data.forEach((album: { albumID: number, title: string, tags: string }) => {
            const albumItem = document.createElement('div');
            albumItem.classList.add('album-item', 'alert', 'alert-info');
            albumItem.innerHTML = `
                            <strong>Title:</strong> ${album.title} <br>
                            <strong>Tags:</strong> ${album.tags}
                            <button class="edit-btn btn btn-warning btn-sm ml-2">Edit</button>
                            <button class="delete-btn btn btn-danger btn-sm ml-2">Delete</button>
                            <button class="open-btn btn btn-info btn-sm ml-2">Open</button>
                        `;
            albumsList.appendChild(albumItem);

            const editBtn = albumItem.querySelector('.edit-btn');
            const deleteBtn = albumItem.querySelector('.delete-btn');
            const openBtn = albumItem.querySelector('.open-btn');

            if (editBtn) {
              editBtn.addEventListener('click', () => {
                showEditForm(album.albumID, album.title, album.tags);
              });
            }

            if (deleteBtn) {
              deleteBtn.addEventListener('click', async () => {
                await deleteAlbum(album.albumID);
                await searchAlbum(searchTerm);
              });
            }

            if (openBtn) {
              openBtn.addEventListener('click', () => {
                openAlbum(album.albumID, album.title);
              });
            }
          });
        } else {
          albumsList.textContent = "No albums found.";
        }
      }
    } else {
      showMessage('albumsList', 'Failed to search albums', 'alert-danger');
    }
  } catch (error) {
    showMessage('albumsList', 'Failed to search albums', 'alert-danger');
  }
}

/**
 * Öffnet ein Album anhand der Id und zeigt die enthaltenen Fotos, sowie die Option Fotos hinzuzufügen oder zu löschen
 * @param albumID ID des Albums welches geöffnet wird
 * @param title Titel des Albums
 */
function openAlbum(albumID: number, title: string): void {
  const albumPhotosSection = document.getElementById('albumPhotosSection');
  if (albumPhotosSection) {
    albumPhotosSection.style.display = 'block';

    const photosList: HTMLElement | null = document.getElementById('photosList');
    const albumTitle = document.createElement('h5');
    albumTitle.textContent = `Album: ${title}`;
    photosList?.insertAdjacentElement('beforebegin', albumTitle);

    getAllPhotos();

    const addPhotoForm: HTMLFormElement | null = document.getElementById('addPhotoForm') as HTMLFormElement;
    if (addPhotoForm) {
      addPhotoForm.addEventListener('submit', async (event: Event) => {
        event.preventDefault(); // Prevent the default form submission

        const photoIDInput: HTMLInputElement | null = document.getElementById('photoID') as HTMLInputElement;
        if (photoIDInput) {
          const photoID = parseInt(photoIDInput.value);
          await addPhotoToAlbum(albumID, photoID);
          await getAllPhotosFromAlbum(albumID);
        }
      });
    }

    getAllPhotosFromAlbum(albumID); // fotos die sich im album befinden laden
  }
}

/**
 * Zeigt alle Fotos sowie die Option diese zu einem Album hinzuzufügen
 */
// @ts-ignore
async function getAllPhotos(): Promise<void> {
  const url = 'http://localhost:8888/photos';
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
                            <img src="http://localhost:8888/photos/${photo.photoID}" alt="${photo.title}" style="max-width: 100px; max-height: 100px;">
                            <span class="photo-title" data-photo-id="${photo.photoID}">Title: ${photo.title}, Tags: ${photo.tags}</span>
                        `;
            photosList.appendChild(photoItem);

            photoItem.addEventListener('click', () => {
              const photoIDInput = document.getElementById('photoID') as HTMLInputElement;
              if (photoIDInput) {
                photoIDInput.value = photo.photoID.toString();
              }
            });
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
 * Alle Fotos eines bestimmten Albums anzeigen sowie die Option Fotos aus dem Album zu entfernen
 * @param albumID ID des Albums
 */
async function getAllPhotosFromAlbum(albumID: number): Promise<void> {
  const userID = getUserID();
  const url = `http://localhost:8888/${userID}/albums/${albumID}/photos`;
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
                            <img src="http://localhost:8888/photos/${photo.photoID}" alt="${photo.title}" style="max-width: 100px; max-height: 100px;">
                            <span class="photo-title" data-photo-id="${photo.photoID}">Title: ${photo.title}, Tags: ${photo.tags}</span>
                            <button class="remove-btn btn btn-danger btn-sm ml-2">Remove from Album</button>
                        `;
            photosList.appendChild(photoItem);

            const removeBtn = photoItem.querySelector('.remove-btn');
            if (removeBtn) {
              removeBtn.addEventListener('click', async () => {
                await deletePhotoFromAlbum(albumID, photo.photoID);
                await getAllPhotosFromAlbum(albumID);
              });
            }
          });
        } else {
          photosList.textContent = "No photos in this album.";
        }
      }
    } else {
      showMessage('photosList', 'Failed to retrieve album photos', 'alert-danger');
    }
  } catch (error) {
    showMessage('photosList', 'Failed to retrieve album photos', 'alert-danger');
  }
}

/**
 * Fügt ein Foto zu einem Album hinzu
 * @param albumID ID des Albums
 * @param photoID ID des Fotos
 */
async function addPhotoToAlbum(albumID: number, photoID: number): Promise<void> {
  const userID = getUserID();
  const url = `http://localhost:8888/${userID}/albums/${albumID}/photos/${photoID}`;
  const options: RequestInit = {
    method: 'POST',
    mode: 'cors',
    headers: {
      "Content-type": "application/json"
    },
    credentials: 'include'
  };

  await handleFetch(url, options, 'result', 'Photo added to album successfully', 'Failed to add photo to album');
}

/**
 * Entfernt ein Foto aus einem Album
 * @param albumID ID des Albums
 * @param photoID ID des Fotos
 */
async function deletePhotoFromAlbum(albumID: number, photoID: number): Promise<void> {
  const userID = getUserID();
  const url = `http://localhost:8888/${userID}/albums/${albumID}/photos/${photoID}`;
  const options: RequestInit = {
    method: 'DELETE',
    mode: 'cors',
    headers: {
      "Content-type": "application/json"
    },
    credentials: 'include'
  };

  await handleFetch(url, options, 'result', 'Photo removed from album successfully', 'Failed to remove photo from album');
}

/**
 * Zeigt Form Element an um Albuminformationen zu bearbeiten
 * @param albumID ID des Albums
 * @param title Aktueller Titel des Albums
 * @param tags Aktuelle Tags des Albums
 */
// @ts-ignore
function showEditForm(albumID: number, title: string, tags: string): void {
  const albumsList: HTMLElement | null = document.getElementById('albumsList');
  if (albumsList) {
    albumsList.innerHTML = `
            <div class="alert alert-info">
                <strong>Selected Album:</strong> ${title}
            </div>
            <form id="editAlbumForm" class="mb-4">
                <div class="form-group">
                    <label for="newTitle">New Title:</label>
                    <input type="text" class="form-control" id="newTitle" name="newTitle" value="${title}" required>
                </div>
                <div class="form-group">
                    <label for="newTags">New Tags:</label>
                    <input type="text" class="form-control" id="newTags" name="newTags" value="${tags}">
                </div>
                <button type="submit" class="btn btn-warning btn-block">Edit Album</button>
            </form>
            <button id="cancelEditButton" class="btn btn-secondary btn-block mb-3">Cancel</button>
        `;

    const editAlbumForm: HTMLFormElement | null = document.getElementById('editAlbumForm') as HTMLFormElement;
    const cancelEditButton: HTMLElement | null = document.getElementById('cancelEditButton');

    if (editAlbumForm) {
      editAlbumForm.addEventListener('submit', async (event: Event) => {
        event.preventDefault(); // Prevent the default form submission

        const newTitleInput: HTMLInputElement | null = document.getElementById('newTitle') as HTMLInputElement;
        const newTagsInput: HTMLInputElement | null = document.getElementById('newTags') as HTMLInputElement;

        if (newTitleInput && newTagsInput) {
          const newTitle = newTitleInput.value;
          const newTags = newTagsInput.value;

          await editAlbum(albumID, newTitle, newTags);
          await getAllAlbums();
        }
      });
    }

    if (cancelEditButton) {
      cancelEditButton.addEventListener('click', () => {
        getAllAlbums();
      });
    }
  }
}

/**
 * Bearbeitet Albuminformationen
 * @param albumID ID des Albums
 * @param newTitle Neuer Titel des Albums
 * @param newTags Neue Tags des Albums
 */
async function editAlbum(albumID: number, newTitle: string, newTags: string): Promise<void> {
  const userID = getUserID();
  const url = `http://localhost:8888/${userID}/albums/${albumID}`;
  const options: RequestInit = {
    method: 'PUT',
    mode: 'cors',
    headers: {
      "Content-type": "application/json"
    },
    credentials: 'include',
    body: JSON.stringify({ title: newTitle, tags: newTags })
  };

  await handleFetch(url, options, 'result', 'Album updated successfully', 'Album update failed');
}

/**
 * Löscht ein Album anhand der ID
 * @param albumID ID des Albums
 */
async function deleteAlbum(albumID: number): Promise<void> {
  const userID = getUserID();
  const url = `http://localhost:8888/${userID}/albums/${albumID}`;
  const options: RequestInit = {
    method: 'DELETE',
    mode: 'cors',
    headers: {
      "Content-type": "application/json"
    },
    credentials: 'include'
  };

  await handleFetch(url, options, 'result', 'Album deleted successfully', 'Album deletion failed');
}

/**
 * Initialisiere die event listener sobald das Dokument vollständig geladen wurde
 */
document.addEventListener('DOMContentLoaded', () => {
  const createAlbumForm: HTMLFormElement | null = document.getElementById('createAlbumForm') as HTMLFormElement;
  const getAllAlbumsButton: HTMLElement | null = document.getElementById('getAllAlbumsButton');
  const searchAlbumForm: HTMLFormElement | null = document.getElementById('searchAlbumForm') as HTMLFormElement;
  const addPhotoForm: HTMLFormElement | null = document.getElementById('addPhotoForm') as HTMLFormElement;
  const logoutButton: HTMLElement | null = document.getElementById('logoutButton');

  if (createAlbumForm) {
    createAlbumForm.addEventListener('submit', async (event: Event) => {
      event.preventDefault();

      const titleInput: HTMLInputElement | null = document.getElementById('title') as HTMLInputElement;
      const tagsInput: HTMLInputElement | null = document.getElementById('tags') as HTMLInputElement;

      if (titleInput) {
        const title = titleInput.value;
        const tags = tagsInput ? tagsInput.value : '';

        await createAlbum(title, tags);
        await getAllAlbums();
      }
    });
  }

  if (getAllAlbumsButton) {
    getAllAlbumsButton.addEventListener('click', async () => {
      await getAllAlbums();
    });
  }

  if (searchAlbumForm) {
    searchAlbumForm.addEventListener('submit', async (event: Event) => {
      event.preventDefault();

      const searchTermInput: HTMLInputElement | null = document.getElementById('searchTerm') as HTMLInputElement;

      if (searchTermInput) {
        const searchTerm = searchTermInput.value;
        await searchAlbum(searchTerm);
      }
    });
  }

  if (addPhotoForm) {
    addPhotoForm.addEventListener('submit', async (event: Event) => {
      event.preventDefault();

      const photoIDInput: HTMLInputElement | null = document.getElementById('photoID') as HTMLInputElement;
      const albumID = parseInt(addPhotoForm.dataset.albumId!);

      if (photoIDInput && albumID) {
        const photoID = parseInt(photoIDInput.value);
        await addPhotoToAlbum(albumID, photoID);
        await getAllPhotosFromAlbum(albumID);
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      await logout();
    });
  }

  // weiterführende links auf der album management seite
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

