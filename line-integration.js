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
        console.log('Is in LINE client:', liff.isInClient());
        console.log('Is logged in:', liff.isLoggedIn());
        
        // Check if user is logged in
        if (liff.isLoggedIn()) {
            await this.handleLoginSuccess();
        } else {
            this.showLoginButton();
            
            // 🆕 แม้ไม่ login ก็ยังสามารถเปิดข่าวได้ (แต่ไม่สามารถแชร์)
            await this.handleLiffQueryParams();
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
    } catch (error) {
        console.error('LIFF initialization failed:', error);
        this.handleInitError(error);
    }
}

    // Handle LIFF query parameters when opened from LINE
async handleLiffQueryParams() {
    try {
        if (!this.isInitialized) {
            console.log('LIFF not initialized yet, waiting...');
            return;
        }

        // ตรวจสอบว่าเปิดจาก LINE หรือไม่
        if (!liff.isInClient()) {
            console.log('Not opened in LINE client');
            return;
        }

        // อ่าน query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('article');

        if (articleId) {
            console.log('LIFF opened with article ID:', articleId);
            
            // รอให้ main app โหลดเสร็จก่อน
            await this.waitForMainAppReady();
            
            // 🆕 โหลดข้อมูลข่าวก่อนเปิด modal
            try {
                const newsletter = await this.loadNewsletterForLiff(articleId);
                
                if (newsletter) {
                    // เซ็ต current newsletter ก่อนเปิด modal
                    this.setCurrentNewsletter(newsletter);
                    
                    // เปิด modal
                    if (window.openNewsletterModal) {
                        await window.openNewsletterModal(articleId);
                        
                        // แสดง toast notification
                        this.showSuccess('เปิดข่าวสารจาก LINE สำเร็จ');
                        
                        // 🆕 อัพเดตปุ่มแชร์หลังเปิด modal
                        setTimeout(() => {
                            this.updateShareButtonVisibility();
                        }, 500);
                        
                    } else {
                        console.error('openNewsletterModal function not available');
                    }
                } else {
                    this.showError('ไม่พบข่าวสารที่เลือก');
                }
                
            } catch (error) {
                console.error('Failed to load newsletter for LIFF:', error);
                this.showError('ไม่สามารถโหลดข่าวสารได้');
            }
        }

    } catch (error) {
        console.error('Handle LIFF query params error:', error);
        this.showError('ไม่สามารถเปิดข่าวสารได้');
    }
}

// 🆕 เพิ่มฟังก์ชันโหลดข่าวสำหรับ LIFF
async loadNewsletterForLiff(newsletterId) {
    try {
        console.log('Loading newsletter for LIFF:', newsletterId);
        
        // ใช้ apiCall หรือ apiCallCached จาก main script
        if (window.apiCall) {
            return await window.apiCall('getNewsletter', { id: newsletterId });
        } else if (window.apiCallCached) {
            return await window.apiCallCached('getNewsletter', { id: newsletterId });
        } else {
            console.error('API functions not available');
            return null;
        }
    } catch (error) {
        console.error('Load newsletter for LIFF error:', error);
        return null;
    }
}

    // รอให้ main application พร้อม
async waitForMainAppReady() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 40; // รอสูงสุด 20 วินาที
        
        const checkReady = () => {
            attempts++;
            
            // เช็คว่า functions และ data พร้อมหรือไม่
            const isReady = window.openNewsletterModal && 
                           (window.apiCall || window.apiCallCached) &&
                           (window.allNewsletters || attempts > 20); // ถ้ารอนานเกินไปให้ข้ามไป
            
            if (isReady || attempts >= maxAttempts) {
                console.log(`📱 Main app ready after ${attempts} attempts`);
                resolve();
            } else {
                console.log(`⏳ Waiting for main app... (${attempts}/${maxAttempts})`);
                setTimeout(checkReady, 500); // เช็คทุก 500ms
            }
        };
        
        checkReady();
    });
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
        
        // 🆕 อัพเดตปุ่มแชร์หลัง login สำเร็จ
        this.updateShareButtonVisibility();
        
        // จัดการ query parameters หลัง login สำเร็จ
        await this.handleLiffQueryParams();
        
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
    console.log('📄 Current newsletter set for sharing:', newsletter.title);
    
    // อัพเดตปุ่มแชร์ทันที
    this.updateShareButtonVisibility();
}

    // 🆕 เพิ่มฟังก์ชันอัพเดตปุ่มแชร์
updateShareButtonVisibility() {
    const shareBtn = document.getElementById('share-newsletter-btn');
    
    if (shareBtn) {
        if (this.isLoggedIn() && this.currentNewsletter) {
            // แสดงปุ่มแชร์
            shareBtn.classList.remove('hidden');
            shareBtn.style.display = 'inline-flex';
            console.log('✅ Share button is now visible');
        } else {
            // ซ่อนปุ่มแชร์
            shareBtn.classList.add('hidden');
            shareBtn.style.display = 'none';
            
            if (!this.isLoggedIn()) {
                console.log('❌ Share button hidden: Not logged in');
            }
            if (!this.currentNewsletter) {
                console.log('❌ Share button hidden: No newsletter set');
            }
        }
    } else {
        console.warn('⚠️ Share button element not found');
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
    
    // 🆕 เปลี่ยนจาก direct link เป็น LIFF URL
    const liffUrl = `https://liff.line.me/${this.liffId}?article=${newsletter.id}`;
    
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
                            uri: liffUrl  // 🆕 ใช้ LIFF URL แทน direct URL
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
                            uri: liffUrl  // 🆕 ใช้ LIFF URL แทน direct URL
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
        
        // 🆕 เพิ่มการนับยอดแชร์
        try {
            await apiCall('incrementShare', { id: this.currentNewsletter.id });
            console.log('Share count incremented for:', this.currentNewsletter.id);
        } catch (shareError) {
            console.error('Failed to increment share count:', shareError);
            // ไม่แสดง error ให้ user เพราะการแชร์สำเร็จแล้ว
        }
        
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

        // 🆕 ใช้ LIFF URL แทน direct website URL
        const liffUrl = `https://liff.line.me/${this.liffId}?article=${this.currentNewsletter.id}`;
        const shareText = `${this.currentNewsletter.title}\n\n${this.currentNewsletter.subtitle || this.currentNewsletter.content.substring(0, 100)}...`;
        
        // สำหรับ timeline ใช้ LINE Share URL with LIFF
        const timelineShareUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(liffUrl)}&text=${encodeURIComponent(shareText)}`;
        
        await liff.openWindow({
            url: timelineShareUrl,
            external: true
        });
        
        // 🆕 เพิ่มการนับยอดแชร์
        try {
            await apiCall('incrementShare', { id: this.currentNewsletter.id });
            console.log('Timeline share count incremented for:', this.currentNewsletter.id);
        } catch (shareError) {
            console.error('Failed to increment timeline share count:', shareError);
            // ไม่แสดง error ให้ user เพราะการแชร์สำเร็จแล้ว
        }
        
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

        // 🆕 สร้าง LIFF URL สำหรับ copy
        const liffUrl = `https://liff.line.me/${this.liffId}?article=${this.currentNewsletter.id}`;
        
        await navigator.clipboard.writeText(liffUrl);
        
        // ⚠️ หมายเหตุ: การคัดลอกลิงก์ไม่นับเป็นการแชร์
        // เพราะยังไม่แน่ใจว่าผู้ใช้จะนำไปแชร์จริงหรือไม่
        
        this.closeShareModal(); // ปิด modal ก่อน
        this.showSuccess('คัดลอก LIFF URL เรียบร้อยแล้ว');
        
    } catch (error) {
        console.error('Copy LIFF URL failed:', error);
        
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = liffUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        this.closeShareModal(); // ปิด modal แม้ใช้ fallback
        this.showSuccess('คัดลอก LIFF URL เรียบร้อยแล้ว');
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
