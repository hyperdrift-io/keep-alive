// Alpine component for the footer
document.addEventListener('alpine:init', () => {
    Alpine.data('footer', () => ({
        init() {
            // Check current path to set active class
            this.currentPath = window.location.pathname;
        },
        currentPath: '/',
        isActive(path) {
            return this.currentPath === path;
        }
    }));
});

// Create a helper to insert the footer HTML
function insertFooter() {
    const footerElement = document.querySelector('.site-footer');
    if (!footerElement) return;

    footerElement.innerHTML = `
        <nav class="footer-nav" x-data="footer()">
            <a href="/" :class="isActive('/') ? 'active' : ''">Home</a>
            <a href="/platform-comparison">Platform Comparison</a>
            <a href="/cold-starts.html" :class="isActive('/cold-starts.html') ? 'active' : ''">Cold Starts</a>
            <a href="/about.html" :class="isActive('/about.html') ? 'active' : ''">About</a>
            <a href="/faq.html" :class="isActive('/faq.html') ? 'active' : ''">FAQ</a>
        </nav>
        <div class="platform-links">
            <small>Platform Guides:</small>
            <a href="/aws-lambda-guide">AWS Lambda</a>
            <a href="/render-guide">Render</a>
            <a href="/amplify-guide">Amplify</a>
            <a href="/heroku-guide">Heroku</a>
            <a href="/vercel-guide">Vercel</a>
        </div>
        <div class="footer-bottom">
            <p>&copy; ${new Date().getFullYear()} Keep Alive. All rights reserved.</p>
        </div>
    `;
}
