function wakeupApp() {
    return {
        uris: [],
        logs: [],
        newURL: '',
        showEditModal: false,
        editingURL: '',
        editingId: null,
        logsInterval: null,

        init() {
            this.fetchURIs();
            this.fetchLogs();

            // Set up polling for URIs and logs
            setInterval(() => this.fetchURIs(), 30000); // Every 30 seconds
            this.logsInterval = setInterval(() => this.fetchLogs(), 15000); // Every 15 seconds
        },

        // Computed properties
        get isValidURL() {
            if (!this.newURL) return false;
            try {
                new URL(this.newURL);
                return true;
            } catch (e) {
                return false;
            }
        },

        get isEditURLValid() {
            if (!this.editingURL) return false;
            try {
                new URL(this.editingURL);
                return true;
            } catch (e) {
                return false;
            }
        },

        // API methods
        async fetchURIs() {
            try {
                const response = await fetch('/api/uris');
                if (response.ok) {
                    this.uris = await response.json();
                }
            } catch (error) {
                console.error('Error fetching URIs:', error);
            }
        },

        async fetchLogs() {
            try {
                const response = await fetch('/api/logs');
                if (response.ok) {
                    const data = await response.json();
                    this.logs = data.logs || [];
                }
            } catch (error) {
                console.error('Error fetching logs:', error);
            }
        },

        async addURI() {
            if (!this.isValidURL) return;

            try {
                const response = await fetch('/api/uris', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ url: this.newURL })
                });

                if (response.ok) {
                    const newURI = await response.json();
                    this.uris.push(newURI);
                    this.newURL = '';
                } else {
                    const error = await response.json();
                    alert(`Error: ${error.error || 'Failed to add URI'}`);
                }
            } catch (error) {
                console.error('Error adding URI:', error);
                alert('An error occurred while adding the URI.');
            }
        },

        async deleteURI(id) {
            if (!confirm('Are you sure you want to delete this URI?')) return;

            try {
                const response = await fetch(`/api/uris/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    this.uris = this.uris.filter(uri => uri.id !== id);
                } else {
                    const error = await response.json();
                    alert(`Error: ${error.message || 'Failed to delete URI'}`);
                }
            } catch (error) {
                console.error('Error deleting URI:', error);
                alert('An error occurred while deleting the URI.');
            }
        },

        editURI(uri) {
            this.editingId = uri.id;
            this.editingURL = uri.url;
            this.showEditModal = true;
        },

        async updateURI() {
            if (!this.isEditURLValid || !this.editingId) return;

            try {
                const response = await fetch(`/api/uris/${this.editingId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ url: this.editingURL })
                });

                if (response.ok) {
                    const updatedURI = await response.json();
                    const index = this.uris.findIndex(u => u.id === this.editingId);
                    if (index !== -1) {
                        this.uris[index] = updatedURI;
                    }
                    this.showEditModal = false;
                    this.editingId = null;
                    this.editingURL = '';
                } else {
                    const error = await response.json();
                    alert(`Error: ${error.message || 'Failed to update URI'}`);
                }
            } catch (error) {
                console.error('Error updating URI:', error);
                alert('An error occurred while updating the URI.');
            }
        },

        // Helper methods
        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleString();
        }
    };
}
