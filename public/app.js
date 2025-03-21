function wakeupApp() {
    return {
        uris: [],
        logs: [],
        newURL: '',
        showEditModal: false,
        editingURL: '',
        editingId: null,
        logsInterval: null,
        lastLog: null,
        defaultPingInterval: 5, // Default 5 minutes
        notification: {
            show: false,
            message: '',
            isError: false,
            timeout: null
        },

        init() {
            this.fetchURIs();
            this.fetchLogs();
            this.fetchSettings();

            // Set up polling for URIs and logs
            setInterval(() => this.fetchURIs(), 30000); // Every 30 seconds
            this.logsInterval = setInterval(() => this.fetchLogs(), 15000); // Every 15 seconds

            // Add animated 'connection' elements to the background
            this.initConnectionLines();

            // Add click handler to close settings panels when clicking outside
            document.addEventListener('click', () => {
                this.closeAllSettingsPanels();
            });
        },

        // Close all open settings panels
        closeAllSettingsPanels() {
            let hasOpenPanels = false;

            this.uris.forEach(uri => {
                if (uri.showSettings) {
                    uri.showSettings = false;
                    hasOpenPanels = true;
                }
            });

            if (hasOpenPanels) {
                this.uris = [...this.uris]; // Force refresh
            }
        },

        // Fetch global settings
        async fetchSettings() {
            try {
                const response = await fetch('/api/settings');
                if (response.ok) {
                    const settings = await response.json();
                    this.defaultPingInterval = settings.pingInterval;
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
            }
        },

        // Toggle endpoint settings panel
        toggleEndpointSettings(uri) {
            // First close any other open settings panels
            this.uris.forEach(u => {
                if (u.id !== uri.id && u.showSettings) {
                    u.showSettings = false;
                }
            });

            // Toggle this URI's settings panel
            uri.showSettings = !uri.showSettings;
            this.uris = [...this.uris]; // Force refresh

            // Prevent event bubbling
            if (event) {
                event.stopPropagation();
            }
        },

        // Set ping interval for specific endpoint
        async setEndpointPingInterval(uriId, minutes) {
            try {
                const response = await fetch(`/api/uris/${uriId}/interval`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ pingInterval: minutes })
                });

                if (response.ok) {
                    const index = this.uris.findIndex(uri => uri.id === uriId);
                    if (index !== -1) {
                        this.uris[index].pingInterval = minutes;
                        // Force refresh to update UI
                        this.uris = [...this.uris];
                    }

                    this.showNotification(`Ping interval set to ${minutes} minute${minutes === 1 ? '' : 's'}`);
                } else {
                    const error = await response.json();
                    this.showNotification(`Error: ${error.error || 'Failed to update interval'}`, true);
                }
            } catch (error) {
                console.error('Error setting endpoint ping interval:', error);
                this.showNotification('An error occurred while updating the interval', true);
            }
        },

        // Remove custom ping interval for endpoint (revert to default)
        async removeEndpointPingInterval(uriId) {
            try {
                const response = await fetch(`/api/uris/${uriId}/interval`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    const index = this.uris.findIndex(uri => uri.id === uriId);
                    if (index !== -1) {
                        // Remove the pingInterval property
                        delete this.uris[index].pingInterval;
                        // Force refresh to update UI
                        this.uris = [...this.uris];
                    }

                    this.showNotification('Endpoint is now using the default ping interval');
                } else {
                    const error = await response.json();
                    this.showNotification(`Error: ${error.error || 'Failed to reset interval'}`, true);
                }
            } catch (error) {
                console.error('Error removing endpoint ping interval:', error);
                this.showNotification('An error occurred while resetting the interval', true);
            }
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
                    const newUris = await response.json();

                    // Preserve showSettings state from previous URIs
                    if (this.uris.length > 0) {
                        newUris.forEach(uri => {
                            const oldUri = this.uris.find(u => u.id === uri.id);
                            if (oldUri) {
                                uri.showSettings = oldUri.showSettings || false;
                            } else {
                                uri.showSettings = false;
                                uri.isNew = true;
                                setTimeout(() => {
                                    uri.isNew = false;
                                }, 1000);
                            }
                        });
                    } else {
                        // Initialize showSettings for all URIs
                        newUris.forEach(uri => {
                            uri.showSettings = false;
                        });
                    }

                    this.uris = newUris;
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
                    if (data.logs && data.logs.length > 0) {
                        // Add new logs with animation
                        if (this.logs.length > 0 && data.logs.length > this.logs.length) {
                            this.lastLog = data.logs[data.logs.length - 1];
                            setTimeout(() => {
                                this.lastLog = null;
                            }, 3000);
                        }
                        this.logs = data.logs || [];
                    }
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
                    newURI.isNew = true; // Add animation flag
                    this.uris.push(newURI);
                    this.newURL = '';

                    // Remove animation class after animation completes
                    setTimeout(() => {
                        const index = this.uris.findIndex(u => u.id === newURI.id);
                        if (index !== -1) {
                            this.uris[index].isNew = false;
                            this.uris = [...this.uris]; // Force refresh
                        }
                    }, 1000);

                    // Visual feedback for successful addition
                    this.showNotification('Connection established');
                } else {
                    const error = await response.json();
                    this.showNotification(`Error: ${error.error || 'Failed to establish connection'}`, true);
                }
            } catch (error) {
                console.error('Error adding URI:', error);
                this.showNotification('An error occurred while establishing the connection.', true);
            }
        },

        async deleteURI(id) {
            if (!confirm('Are you sure you want to disconnect this endpoint?')) return;

            try {
                const response = await fetch(`/api/uris/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    // Add fade-out animation before removing
                    const index = this.uris.findIndex(uri => uri.id === id);
                    if (index !== -1) {
                        this.uris[index].isRemoving = true;
                        this.uris = [...this.uris]; // Force refresh

                        setTimeout(() => {
                            this.uris = this.uris.filter(uri => uri.id !== id);
                        }, 300);
                    }

                    this.showNotification('Connection terminated');
                } else {
                    const error = await response.json();
                    this.showNotification(`Error: ${error.message || 'Failed to terminate connection'}`, true);
                }
            } catch (error) {
                console.error('Error deleting URI:', error);
                this.showNotification('An error occurred while terminating the connection.', true);
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
                    updatedURI.isUpdated = true; // Add animation flag

                    const index = this.uris.findIndex(u => u.id === this.editingId);
                    if (index !== -1) {
                        this.uris[index] = updatedURI;

                        // Remove animation class after animation completes
                        setTimeout(() => {
                            this.uris[index].isUpdated = false;
                            this.uris = [...this.uris]; // Force refresh
                        }, 1000);
                    }

                    this.showEditModal = false;
                    this.editingId = null;
                    this.editingURL = '';
                    this.showNotification('Connection reconfigured');
                } else {
                    const error = await response.json();
                    this.showNotification(`Error: ${error.message || 'Failed to update connection'}`, true);
                }
            } catch (error) {
                console.error('Error updating URI:', error);
                this.showNotification('An error occurred while updating the connection.', true);
            }
        },

        // Helper methods
        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleString();
        },

        // Show notification
        showNotification(message, isError = false) {
            // Clear any existing timeout
            if (this.notification.timeout) {
                clearTimeout(this.notification.timeout);
            }

            // Set notification properties
            this.notification.message = message;
            this.notification.isError = isError;
            this.notification.show = true;

            // Auto-hide after 3 seconds
            this.notification.timeout = setTimeout(() => {
                this.notification.show = false;
            }, 3000);
        },

        initConnectionLines() {
            // Only add connection line animation if it's not already there
            if (document.querySelector('.connection-container')) return;

            const container = document.createElement('div');
            container.className = 'connection-container';

            // Create 15 connection lines with random properties
            for (let i = 0; i < 15; i++) {
                const line = document.createElement('div');
                line.className = 'connection-line';

                const duration = Math.random() * 15 + 20; // 20-35s
                const delay = Math.random() * 10;
                const size = Math.random() * 1 + 0.5; // 0.5-1.5px
                const posX = Math.random() * 100;
                const posY = Math.random() * 100;
                const opacity = Math.random() * 0.2 + 0.05; // 0.05-0.25

                line.style.width = `${size}px`;
                line.style.left = `${posX}%`;
                line.style.top = `${posY}%`;
                line.style.opacity = opacity.toString();
                line.style.animationDuration = `${duration}s`;
                line.style.animationDelay = `${delay}s`;

                container.appendChild(line);
            }

            document.body.appendChild(container);

            // Add CSS for connection animations if not already present
            if (!document.getElementById('connection-styles')) {
                const style = document.createElement('style');
                style.id = 'connection-styles';
                style.textContent = `
                    .connection-container {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        z-index: -2;
                        overflow: hidden;
                    }
                    .connection-line {
                        position: absolute;
                        height: 200vh;
                        background: linear-gradient(to bottom,
                                      transparent 0%,
                                      var(--primary-color) 30%,
                                      var(--secondary-color) 70%,
                                      transparent 100%);
                        animation: moveLine linear infinite;
                        transform-origin: top;
                    }
                    @keyframes moveLine {
                        0% {
                            transform: translateY(-100%) rotate(30deg);
                        }
                        100% {
                            transform: translateY(100%) rotate(30deg);
                        }
                    }
                    .hyperbridge-notification {
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        padding: 12px 20px;
                        background-color: var(--dark-color);
                        color: var(--text-color);
                        border-radius: 6px;
                        box-shadow: var(--shadow);
                        z-index: 1000;
                        opacity: 0;
                        transform: translateY(20px);
                        transition: all 0.3s ease;
                        border-left: 3px solid var(--success-color);
                    }
                    .hyperbridge-notification.error {
                        border-left-color: var(--danger-color);
                    }
                    .hyperbridge-notification.show {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    .uri-list li {
                        transition: all 0.3s ease;
                    }
                    .uri-list li.is-new {
                        animation: newConnection 1s ease;
                    }
                    .uri-list li.is-updated {
                        animation: updateConnection 1s ease;
                    }
                    .uri-list li.is-removing {
                        opacity: 0;
                        transform: translateX(20px);
                        transition: all 0.3s ease;
                    }
                    @keyframes newConnection {
                        0% {
                            opacity: 0;
                            transform: translateY(20px);
                            box-shadow: 0 0 0 rgba(20, 241, 217, 0);
                        }
                        50% {
                            opacity: 1;
                            transform: translateY(0);
                            box-shadow: 0 0 20px rgba(20, 241, 217, 0.5);
                        }
                        100% {
                            opacity: 1;
                            transform: translateY(0);
                            box-shadow: 0 0 0 rgba(20, 241, 217, 0);
                        }
                    }
                    @keyframes updateConnection {
                        0% {
                            box-shadow: 0 0 0 rgba(255, 184, 64, 0);
                        }
                        50% {
                            box-shadow: 0 0 20px rgba(255, 184, 64, 0.5);
                        }
                        100% {
                            box-shadow: 0 0 0 rgba(255, 184, 64, 0);
                        }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    };
}
