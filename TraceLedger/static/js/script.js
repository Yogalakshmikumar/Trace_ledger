/**
 * TRACELEDGER – Tamper-Resistant Sample Lifecycle Tracking and Audit System
 * Client-Side Application JavaScript
 */

document.addEventListener('DOMContentLoaded', function () {
    // 1. Mobile Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            sidebar.classList.toggle('show');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function (e) {
            if (window.innerWidth < 768 && sidebar.classList.contains('show')) {
                if (!sidebar.contains(e.target) && e.target !== sidebarToggle) {
                    sidebar.classList.remove('show');
                }
            }
        });
    }

    // 2. Hash Click-to-Copy Helper
    const hashElements = document.querySelectorAll('.hash-text-string code, .font-monospace code');
    hashElements.forEach(el => {
        el.style.cursor = 'pointer';
        el.title = 'Click to copy hash';
        el.addEventListener('click', function () {
            const textToCopy = this.textContent.trim();
            if (navigator.clipboard) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const originalText = this.textContent;
                    this.textContent = 'COPIED TO CLIPBOARD!';
                    this.style.color = '#10B981';
                    setTimeout(() => {
                        this.textContent = originalText;
                        this.style.color = '';
                    }, 1200);
                });
            }
        });
    });

    // 3. Auto-dismiss alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert-dismissible');
    alerts.forEach(alert => {
        setTimeout(() => {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
            if (bsAlert) {
                bsAlert.close();
            }
        }, 6000);
    });
});
