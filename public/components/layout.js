// Layout utility that integrates all common components
document.addEventListener('DOMContentLoaded', () => {
    // Create an Alpine component to manage common app state
    if (window.Alpine) {
        Alpine.data('commonLayout', () => ({
            init() {
                // Initialize the layout components
                this.setupLayout();
            },
            setupLayout() {
                // Insert header and footer
                this.insertHeaderAndFooter();
            },
            insertHeaderAndFooter() {
                // Get page-specific metadata
                const title = document.title.split('-').pop().trim() || 'URI Health Monitor';
                const metaDesc = document.querySelector('meta[name="description"]');
                const description = metaDesc ? metaDesc.content.split('.')[0] : 'Keep your services responsive and prevent cold starts.';

                // Insert the components
                insertHeader(title, title, description);
                insertFooter();
            }
        }));
    }
});

// Helper function to include the layout components in a page
function includeLayoutComponents() {
    const head = document.querySelector('head');
    if (!head) return;

    // Create script elements for the components
    const headerScript = document.createElement('script');
    headerScript.src = '/components/header.js';

    const footerScript = document.createElement('script');
    footerScript.src = '/components/footer.js';

    // Append scripts to head
    head.appendChild(headerScript);
    head.appendChild(footerScript);

    // Initialize the layout once Alpine is ready
    const layoutScript = document.createElement('script');
    layoutScript.textContent = `
        document.addEventListener('alpine:init', () => {
            // Initialize layout when Alpine is ready
            document.querySelector('body').setAttribute('x-data', 'commonLayout()');
        });
    `;

    head.appendChild(layoutScript);
}
