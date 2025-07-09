// LINE Integration for Newsletter Website
// LIFF ID: 2005494853-14Q67OOX

class LineIntegration {
    constructor() {
        this.liffId = '2005494853-14Q67OOX';
        this.isInitialized = false;
        this.userProfile = null;
        this.currentNewsletter = null;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    // Initialize LIFF
    async initialize() {
        try {
            console.log('Initializing LINE LIFF...');
            
            // Initialize LIFF
            await liff.init({ liffId: this.liffId });
            this.isInitialized = true;
            
            console.log('LIFF initialized successfully');
            
            // Check if user is logged in
            if (liff.isLoggedIn()) {
                await this.handleLoginSuccess();
            } else {
                this.showLoginButton();
            }
            
            // Setup event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('LIFF initialization failed:', error);
            this.handleInitError(error);
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Login button
        const loginBtn = document.getElementById('line-login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.login());
        }

        // Logout button
        const logoutBtn = document.getElementById('line-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Share buttons
        const shareBtn = document.getElementById('share-newsletter-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.openShareModal());
        }

        // Share options
        const shareChatBtn = document.getElementById('share-line-chat');
        if (shareChatBtn) {
            shareChatBtn.addEventListener('click', () => this.shareToChat());
        }

        const shareTimelineBtn = document.getElementById('share-line-timeline');
        if (shareTimelineBtn) {
            shareTimelineBtn.addEventListener('click', () => this.shareToTimeline());
        }

        const copyLinkBtn = document.getElementById('copy-link');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => this.copyLink());
        }

        // Close share modal
        const closeShareModal = document.getElementById('close-share-modal');
        if (closeShareModal) {
            closeShareModal.addEventListener('click', () => this.closeShareModal());
        }

        // Close share modal when clicking outside
        const shareModal = document.getElementById('share-modal');
        if (shareModal) {
            shareModal.addEventListener('click', (e) => {
                if (e.target === shareModal) {
                    this.closeShareModal();
                }
            });
        }
    }

    // Show login button
    showLoginButton() {
        const loginBtn = document.getElementById('line-login-btn');
        const userProfile = document.getElementById('line-user-profile');
        
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (userProfile) userProfile.classList.add('hidden');
    }

    // Show user profile
    showUserProfile() {
        const loginBtn = document.getElementById('line-login-btn');
        const userProfile = document.getElementById('line-user-profile');
        
        if (loginBtn) loginBtn.classList.add('hidden');
        if (userProfile) userProfile.classList.remove('hidden');
        
        // Update profile info
        if (this.userProfile) {
            const avatar = document.getElementById('user-avatar');
            const name = document.getElementById('user-name');
            
            if (avatar) avatar.src = this.userProfile.pictureUrl || '';
            if (name) name.textContent = this.userProfile.displayName || 'LINE User';
        }
    }

    // Handle login
    async login() {
        try {
            if (!this.isInitialized) {
                throw new Error('LIFF not initialized');
            }

            // Login
            await liff.login();
            
        } catch (error) {
            console.error('Login failed:', error);
            this.showError('การเข้าสู่ระบบล้มเหลว กรุณาลองใหม่อีกครั้ง');
        }
    }

    // Handle logout
    async logout() {
        try {
            if (!this.isInitialized) {
                throw new Error('LIFF not initialized');
            }

            // Logout
            liff.logout();
            
            // Update UI
            this.userProfile = null;
            this.showLoginButton();
            
            console.log('Logged out successfully');
            
        } catch (error) {
            console.error('Logout failed:', error);
            this.showError('การออกจากระบบล้มเหลว');
        }
    }

    // Handle login success
    async handleLoginSuccess() {
        try {
            // Get user profile
            this.userProfile = await liff.getProfile();
            console.log('User profile:', this.userProfile);
            
            // Update UI
            this.showUserProfile();
            
        } catch (error) {
            console.error('Failed to get user profile:', error);
            this.showError('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
        }
    }

    // Handle initialization error
    handleInitError(error) {
        console.error('LIFF init error:', error);
        
        // Hide LINE features if initialization fails
        const authSection = document.getElementById('line-auth-section');
        if (authSection) {
            authSection.style.display = 'none';
        }
    }

    // Set current newsletter for sharing
    setCurrentNewsletter(newsletter) {
        this.currentNewsletter = newsletter;
        
        // Show/hide share button based on LINE login status
        const shareBtn = document.getElementById('share-newsletter-btn');
        if (shareBtn) {
            if (this.isInitialized && liff.isLoggedIn()) {
                shareBtn.classList.remove('hidden');
            } else {
                shareBtn.classList.add('hidden');
            }
        }
    }

    // Open share modal
    openShareModal() {
        if (!this.currentNewsletter) {
            this.showError('ไม่พบข้อมูลข่าวสารที่จะแชร์');
            return;
        }

        const shareModal = document.getElementById('share-modal');
        const newsletterModal = document.getElementById('newsletter-modal');
        
        if (shareModal) {
            // ซ่อน newsletter modal ชั่วคราว เพื่อไม่ให้บัง share modal
            if (newsletterModal) {
                newsletterModal.style.zIndex = '40';
            }
            
            shareModal.classList.remove('hidden');
            // Force บังคับให้ share modal อยู่บนสุด
            shareModal.style.zIndex = '99999';
        }
    }

    // Close share modal
    closeShareModal() {
        const shareModal = document.getElementById('share-modal');
        const newsletterModal = document.getElementById('newsletter-modal');
        
        if (shareModal) {
            shareModal.classList.add('hidden');
            shareModal.style.zIndex = '';
        }
        
        // คืนค่า z-index ของ newsletter modal
        if (newsletterModal) {
            newsletterModal.style.zIndex = '50';
        }
    }

    // Create flex message for sharing
    createFlexMessage(newsletter) {
        const imageUrl = newsletter.images && newsletter.images.length > 0 
            ? newsletter.images[0].url 
            : 'https://via.placeholder.com/400x200?text=No+Image';
            
        const websiteUrl = window.location.origin;
        const articleUrl = `${websiteUrl}?article=${newsletter.id}`;

        return {
            type: 'flex',
            altText: `ข่าวสาร: ${newsletter.title}`,
            contents: {
                type: 'bubble',
                size: 'giga',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'image',
                            url: imageUrl,
                            size: 'full',
                            aspectRatio: '20:13',
                            aspectMode: 'cover',
                            action: {
                                type: 'uri',
                                uri: articleUrl
                            }
                        }
                    ],
                    paddingAll: '0px'
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: newsletter.title,
                            weight: 'bold',
                            size: 'lg',
                            wrap: true,
                            maxLines: 2
                        },
                        {
                            type: 'text',
                            text: newsletter.subtitle || newsletter.content.substring(0, 100) + '...',
                            size: 'sm',
                            color: '#666666',
                            wrap: true,
                            maxLines: 3,
                            margin: 'md'
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            margin: 'lg',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    spacing: 'sm',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'หมวดหมู่',
                                            color: '#aaaaaa',
                                            size: 'sm',
                                            flex: 1
                                        },
                                        {
                                            type: 'text',
                                            text: newsletter.category,
                                            wrap: true,
                                            color: '#666666',
                                            size: 'sm',
                                            flex: 3
                                        }
                                    ]
                                },
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    spacing: 'sm',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'ผู้เขียน',
                                            color: '#aaaaaa',
                                            size: 'sm',
                                            flex: 1
                                        },
                                        {
                                            type: 'text',
                                            text: newsletter.author,
                                            wrap: true,
                                            color: '#666666',
                                            size: 'sm',
                                            flex: 3
                                        }
                                    ]
                                },
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    spacing: 'sm',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'วันที่',
                                            color: '#aaaaaa',
                                            size: 'sm',
                                            flex: 1
                                        },
                                        {
                                            type: 'text',
                                            text: this.formatDateForShare(newsletter.publishDate),
                                            wrap: true,
                                            color: '#666666',
                                            size: 'sm',
                                            flex: 3
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'button',
                            style: 'primary',
                            height: 'sm',
                            action: {
                                type: 'uri',
                                label: 'อ่านข่าวเต็ม',
                                uri: articleUrl
                            }
                        },
                        {
                            type: 'spacer',
                            size: 'sm'
                        }
                    ],
                    flex: 0
                }
            }
        };
    }

    // Share to LINE chat
    async shareToChat() {
        try {
            if (!this.currentNewsletter) {
                this.showError('ไม่พบข้อมูลข่าวสารที่จะแชร์');
                return;
            }

            if (!this.isInitialized) {
                this.showError('LINE ยังไม่พร้อมใช้งาน');
                return;
            }

            const flexMessage = this.createFlexMessage(this.currentNewsletter);
            
            // ใช้ LIFF shareTargetPicker
            await liff.shareTargetPicker([flexMessage]);
            
            this.closeShareModal(); // ปิด share modal ก่อน
            this.showSuccess('แชร์ข่าวสารเรียบร้อยแล้ว');
            
        } catch (error) {
            console.error('Share to chat failed:', error);
            this.closeShareModal(); // ปิด modal แม้เกิด error
            this.showError('การแชร์ล้มเหลว กรุณาลองใหม่อีกครั้ง');
        }
    }

    // Share to LINE timeline (only for LIFF v2.1+)
    async shareToTimeline() {
        try {
            if (!this.currentNewsletter) {
                this.showError('ไม่พบข้อมูลข่าวสารที่จะแชร์');
                return;
            }

            if (!this.isInitialized) {
                this.showError('LINE ยังไม่พร้อมใช้งาน');
                return;
            }

            // เช็คว่ารองรับ timeline sharing หรือไม่
            if (!liff.isApiAvailable('shareTargetPicker')) {
                this.closeShareModal();
                this.showError('เบราว์เซอร์นี้ไม่รองรับการแชร์ไปยังไทม์ไลน์');
                return;
            }

            const websiteUrl = window.location.origin;
            const articleUrl = `${websiteUrl}?article=${this.currentNewsletter.id}`;
            
            // สำหรับ timeline ใช้ external link
            await liff.openWindow({
                url: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(this.currentNewsletter.title)}`,
                external: true
            });
            
            this.closeShareModal(); // ปิด modal หลังเปิด external window
            
        } catch (error) {
            console.error('Share to timeline failed:', error);
            this.closeShareModal(); // ปิด modal แม้เกิด error
            this.showError('การแชร์ไปยังไทม์ไลน์ล้มเหลว');
        }
    }

    // Copy link to clipboard
    async copyLink() {
        try {
            if (!this.currentNewsletter) {
                this.showError('ไม่พบข้อมูลข่าวสารที่จะแชร์');
                return;
            }

            const websiteUrl = window.location.origin;
            const articleUrl = `${websiteUrl}?article=${this.currentNewsletter.id}`;
            
            await navigator.clipboard.writeText(articleUrl);
            
            this.closeShareModal(); // ปิด modal ก่อน
            this.showSuccess('คัดลอกลิงก์เรียบร้อยแล้ว');
            
        } catch (error) {
            console.error('Copy link failed:', error);
            
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = articleUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            this.closeShareModal(); // ปิด modal แม้ใช้ fallback
            this.showSuccess('คัดลอกลิงก์เรียบร้อยแล้ว');
        }
    }

    // Format date for sharing
    formatDateForShare(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Show success message
    showSuccess(message) {
        // สร้าง toast notification
        const toast = document.createElement('div');
        toast.className = 'line-toast line-toast-success';
        toast.innerHTML = `
            <i class="fas fa-check-circle mr-2"></i>
            ${message}
        `;
        
        document.body.appendChild(toast);
        
        // แสดง toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // ซ่อน toast หลัง 3 วินาที
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    // Show error message
    showError(message) {
        // สร้าง toast notification
        const toast = document.createElement('div');
        toast.className = 'line-toast line-toast-error';
        toast.innerHTML = `
            <i class="fas fa-exclamation-circle mr-2"></i>
            ${message}
        `;
        
        document.body.appendChild(toast);
        
        // แสดง toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // ซ่อน toast หลัง 3 วินาที
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    // Check if user is logged in (for external use)
    isLoggedIn() {
        return this.isInitialized && liff.isLoggedIn();
    }

    // Get user profile (for external use)
    getUserProfile() {
        return this.userProfile;
    }
}

// Initialize LINE Integration
const lineIntegration = new LineIntegration();

// Make it globally available
window.lineIntegration = lineIntegration;
