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
            <a href="index.html" :class="isActive('/') ? 'active' : ''">Home</a>
            <a href="platform/platform-comparison.html">Platform Comparison</a>
            <a href="cold-starts.html" :class="isActive('/cold-starts.html') ? 'active' : ''">Cold Starts</a>
            <a href="about.html" :class="isActive('/about.html') ? 'active' : ''">About</a>
            <a href="faq.html" :class="isActive('/faq.html') ? 'active' : ''">FAQ</a>
        </nav>
        <div class="platform-links">
            <small>Platform Guides:</small>
            <a href="platform/aws-lambda-guide.html">AWS Lambda</a>
            <a href="platform/render-guide.html">Render</a>
            <a href="platform/amplify-guide.html">Amplify</a>
            <a href="platform/heroku-guide.html">Heroku</a>
            <a href="platform/vercel-guide.html">Vercel</a>
        </div>
        <div class="footer-bottom">
            <p>&copy; ${new Date().getFullYear()} Keep Alive. All rights reserved.</p>
        </div>
    `;
}
