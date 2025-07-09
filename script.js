// Newsletter Frontend for Glitch with LINE Integration
// เชื่อมต่อกับ Google Apps Script API

// ⭐ เปลี่ยน URL นี้เป็น Web App URL ของคุณ
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbxCCFKJ_TbSjVwDSphCrk10Jr2EtIhcCs1nelPZR97hvqSEj-LVPDMucwa2xtd4YY0f/exec';

// Global variables
let allNewsletters = [];
let categories = [];
let filteredNewsletters = [];
let currentPage = 1;
let itemsPerPage = getItemsPerPage();
let allTags = []; 
let directArticleId = null; // สำหรับ direct link

// เริ่มต้นแอป
document.addEventListener('DOMContentLoaded', function() {
    console.log('Starting Newsletter App...');
    
    // เช็ค URL parameters สำหรับ direct article link
    checkDirectArticleLink();
    
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    loadCategories();
    loadNewsletters();
}

// เช็ค URL parameters สำหรับ direct article link
function checkDirectArticleLink() {
    const urlParams = new URLSearchParams(window.location.search);
    directArticleId = urlParams.get('article');
    
    if (directArticleId) {
        console.log('Direct article link detected:', directArticleId);
    }
}

function setupEventListeners() {
    // Search and filter
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const tagFilter = document.getElementById('tag-filter'); 
    const sortFilter = document.getElementById('sort-filter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterNewsletters, 300));
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterNewsletters);
    }
  
    if (tagFilter) {
        tagFilter.addEventListener('change', filterNewsletters);
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', filterNewsletters);
    }
    
    // Scroll to news
    const scrollBtn = document.getElementById('scroll-to-news');
    if (scrollBtn) {
        scrollBtn.addEventListener('click', () => {
            document.getElementById('main-content').scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    // Modal close
    const closeModal = document.getElementById('close-newsletter-modal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('newsletter-modal').classList.add('hidden');
            // Clear URL parameter เมื่อปิด modal
            clearDirectArticleLink();
        });
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('newsletter-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.getElementById('newsletter-modal').classList.add('hidden');
                clearDirectArticleLink();
            }
        });
    }
    
    // Window resize
    window.addEventListener('resize', debounce(() => {
        itemsPerPage = getItemsPerPage();
        displayNewsletters();
    }, 300));
}

// Clear direct article link from URL
function clearDirectArticleLink() {
    if (directArticleId) {
        const url = new URL(window.location);
        url.searchParams.delete('article');
        window.history.replaceState({}, '', url);
        directArticleId = null;
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function getItemsPerPage() {
    const width = window.innerWidth;
    if (width < 640) return 4;      // มือถือ: 4 รายการ
    if (width < 768) return 6;      // แท็บเล็ต: 6 รายการ  
    if (width < 1024) return 8;     // แท็บเล็ตใหญ่: 8 รายการ
    if (width < 1280) return 9;     // เดสก์ท็อป: 9 รายการ
    return 12;                      // จอใหญ่: 12 รายการ
}

function showLoading(message = "กำลังโหลด...") {
    const overlay = document.getElementById('loading-overlay');
    const text = document.getElementById('loading-text');
    if (text) text.textContent = message;
    if (overlay) overlay.classList.add('active');
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('active');
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    if (errorText) errorText.textContent = message;
    if (errorDiv) errorDiv.classList.remove('hidden');
}

function hideError() {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) errorDiv.classList.add('hidden');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// API functions
// ⭐ เปลี่ยนจาก fetch เป็น JSONP
async function apiCall(action, params = {}) {
    return new Promise((resolve, reject) => {
        try {
            const url = new URL(API_BASE_URL);
            url.searchParams.append('action', action);
            
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });
            
            // สร้าง callback function name
            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
            url.searchParams.append('callback', callbackName);
            
            // สร้าง script tag
            const script = document.createElement('script');
            
            // สร้าง global callback function
            window[callbackName] = function(data) {
                // ลบ script tag และ callback function
                document.head.removeChild(script);
                delete window[callbackName];
                
                if (data.status === 'error') {
                    reject(new Error(data.message));
                } else {
                    resolve(data.data);
                }
            };
            
            // Error handling
            script.onerror = function() {
                document.head.removeChild(script);
                delete window[callbackName];
                reject(new Error('Network error'));
            };
            
            script.src = url.toString();
            document.head.appendChild(script);
            
        } catch (error) {
            console.error('API Error:', error);
            reject(error);
        }
    });
}

async function loadCategories() {
    try {
        showLoading("กำลังโหลดหมวดหมู่...");
        categories = await apiCall('getCategories');
        populateCategoryFilters();
        hideLoading();
    } catch (error) {
        console.error('Load categories error:', error);
        hideLoading();
        showError('ไม่สามารถโหลดหมวดหมู่ได้');
    }
}

function populateCategoryFilters() {
    const filterSelect = document.getElementById('category-filter');
    if (!filterSelect) return;
    
    filterSelect.innerHTML = '<option value="">ทุกหมวดหมู่</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = category.name;
        filterSelect.appendChild(option);
    });
}

async function loadNewsletters() {
    try {
        showLoading("กำลังโหลดข่าวสาร...");
        hideError();
        
        allNewsletters = await apiCall('getNewsletters');
        filteredNewsletters = [...allNewsletters];
        updateTagsList();
        displayNewsletters();
        
        // เช็คว่ามี direct article link หรือไม่
        if (directArticleId) {
            await handleDirectArticleLink();
        }
        
        hideLoading();
        console.log(`Loaded ${allNewsletters.length} newsletters`);
    } catch (error) {
        console.error('Load newsletters error:', error);
        hideLoading();
        showError('ไม่สามารถโหลดข่าวสารได้ กรุณาลองใหม่อีกครั้ง');
    }
}

// Handle direct article link
async function handleDirectArticleLink() {
    if (!directArticleId) return;
    
    try {
        console.log('Opening direct article:', directArticleId);
        await openNewsletterModal(directArticleId);
    } catch (error) {
        console.error('Failed to open direct article:', error);
        showError('ไม่พบข่าวสารที่เลือก');
        clearDirectArticleLink();
    }
}

function updateTagsList() {
    const tagSet = new Set();
    
    allNewsletters.forEach(newsletter => {
        if (newsletter.tags && newsletter.tags.length > 0) {
            newsletter.tags.forEach(tag => {
                if (tag.trim()) {
                    tagSet.add(tag.trim());
                }
            });
        }
    });
    
    allTags = Array.from(tagSet).sort();
    populateTagFilter();
}

function populateTagFilter() {
    const tagSelect = document.getElementById('tag-filter');
    if (!tagSelect) return;
    
    tagSelect.innerHTML = '<option value="">ทุกแท็ก</option>';
    
    allTags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagSelect.appendChild(option);
    });
}

function filterNewsletters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value;
    const tagFilter = document.getElementById('tag-filter').value; 
    const sortFilter = document.getElementById('sort-filter').value;

    filteredNewsletters = allNewsletters.filter(newsletter => {
        const matchesSearch = !searchTerm || 
            newsletter.title.toLowerCase().includes(searchTerm) ||
            newsletter.content.toLowerCase().includes(searchTerm) ||
            newsletter.author.toLowerCase().includes(searchTerm);
        
        const matchesCategory = !categoryFilter || newsletter.category === categoryFilter;
      
        const matchesTag = !tagFilter || 
            (newsletter.tags && newsletter.tags.some(tag => tag.trim() === tagFilter));
        
        return matchesSearch && matchesCategory && matchesTag; 
    });
        

    // Sort
    switch(sortFilter) {
        case 'oldest':
            filteredNewsletters.sort((a, b) => {
                const dateA = new Date(a.publishDate || a.createdDate);
                const dateB = new Date(b.publishDate || b.createdDate);
                return dateA - dateB;
            });
            break;
        case 'views':
            filteredNewsletters.sort((a, b) => (b.views || 0) - (a.views || 0));
            break;
        case 'featured':
            filteredNewsletters.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
            break;
        default: // newest
            filteredNewsletters.sort((a, b) => {
                const dateA = new Date(a.publishDate || a.createdDate);
                const dateB = new Date(b.publishDate || b.createdDate);
                return dateB - dateA;
            });
    }

    currentPage = 1;
    displayNewsletters();
}

function displayNewsletters() {
    // Featured newsletters
    const featured = filteredNewsletters.filter(n => n.featured).slice(0, 3);
    displayNewsletterGrid(featured, 'featured-newsletters');
    
    const featuredSection = document.getElementById('featured-section');
    if (featured.length === 0) {
        featuredSection.classList.add('hidden');
    } else {
        featuredSection.classList.remove('hidden');
    }

    // All newsletters (excluding featured from main list)
    const nonFeatured = filteredNewsletters.filter(n => !n.featured);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageNewsletters = nonFeatured.slice(startIndex, endIndex);
    
    displayNewsletterGrid(pageNewsletters, 'newsletters-container');
    setupPagination(nonFeatured.length);
    
    const noResults = document.getElementById('no-results');
    if (filteredNewsletters.length === 0) {
        noResults.classList.remove('hidden');
    } else {
        noResults.classList.add('hidden');
    }
}

function displayNewsletterGrid(newsletters, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';

    newsletters.forEach(newsletter => {
        const imageHtml = newsletter.images && newsletter.images.length > 0 
            ? `<img src="${newsletter.images[0].thumbnailUrl || newsletter.images[0].url}" 
                   alt="${newsletter.images[0].alt || newsletter.title}" 
                   class="newsletter-image w-full">`
            : `<div class="newsletter-image w-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                   <i class="fas fa-newspaper text-4xl text-gray-400"></i>
               </div>`;

        const tagsHtml = newsletter.tags && newsletter.tags.length > 0
            ? newsletter.tags.slice(0, 3).map(tag => 
                `<span class="tag" onclick="filterByTag('${tag.trim()}')">${tag.trim()}</span>`
              ).join('')
            : '';

        // เช็คว่า LINE integration พร้อมใช้งานหรือไม่
        const isLineReady = window.lineIntegration && window.lineIntegration.isLoggedIn();
        const shareButtonHtml = isLineReady 
            ? `<button class="quick-share-btn" onclick="quickShareNewsletter('${newsletter.id}')" title="แชร์ด่วน">
                   <i class="fas fa-share-alt"></i>
               </button>`
            : '';

        const card = document.createElement('div');
        card.className = 'card fade-in newsletter-card';
        card.innerHTML = `
            ${newsletter.featured ? '<div class="featured-badge"><i class="fas fa-star mr-1"></i> ข่าวเด่น</div>' : ''}
            ${shareButtonHtml}
            <div class="relative overflow-hidden">
                ${imageHtml}
            </div>
            <div class="p-6">
                <div class="flex justify-between items-start mb-3">
                    <span class="category-badge">
                        <i class="fas fa-tag"></i> ${newsletter.category}
                    </span>
                    <div class="text-xs text-gray-500">
                        <i class="fas fa-eye mr-1"></i> ${newsletter.views || 0} ครั้ง
                    </div>
                </div>
                
                <h3 class="text-xl font-bold text-gray-800 mb-2 line-clamp-2 cursor-pointer hover:text-blue-600 transition" onclick="openNewsletterModal('${newsletter.id}')">
                    ${newsletter.title}
                </h3>
                
                ${newsletter.subtitle ? `<p class="text-gray-600 mb-3 line-clamp-1">${newsletter.subtitle}</p>` : ''}
                
                <p class="text-gray-600 mb-4 line-clamp-3 content-preview">${newsletter.content.substring(0, 150)}...</p>
                
                <div class="mb-3">
                    ${tagsHtml}
                </div>
                
                <div class="flex justify-between items-center text-sm text-gray-500 mb-3">
                    <div>
                        <i class="fas fa-user mr-1"></i> ${newsletter.author}
                    </div>
                    <div>
                        <i class="fas fa-calendar mr-1"></i> ${formatDate(newsletter.publishDate)}
                    </div>
                </div>
                
                <button class="w-full btn-primary justify-center read-more-btn" onclick="openNewsletterModal('${newsletter.id}')">
                    <i class="fas fa-book-open mr-2"></i> อ่านต่อ
                </button>
            </div>
        `;

        container.appendChild(card);
    });
}

function setupPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const container = document.getElementById('pagination-container');
    if (!container) return;
    
    container.innerHTML = '';

    if (totalPages <= 1) return;

    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'flex justify-center space-x-2';

    // Previous button
    if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.onclick = () => changePage(currentPage - 1);
        paginationDiv.appendChild(prevBtn);
    }

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `px-4 py-2 rounded-lg transition ${
            i === currentPage 
                ? 'bg-blue-600 text-white' 
                : 'bg-white border border-gray-300 hover:bg-gray-50'
        }`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => changePage(i);
        paginationDiv.appendChild(pageBtn);
    }

    // Next button
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.onclick = () => changePage(currentPage + 1);
        paginationDiv.appendChild(nextBtn);
    }

    container.appendChild(paginationDiv);
}

function changePage(page) {
    currentPage = page;
    displayNewsletters();
    document.getElementById('main-content').scrollIntoView({ behavior: 'smooth' });
}

async function openNewsletterModal(newsletterId) {
    try {
        showLoading("กำลังโหลดเนื้อหา...");
        
        const newsletter = await apiCall('getNewsletter', { id: newsletterId });
        
        if (newsletter) {
            displayNewsletterInModal(newsletter);
            document.getElementById('newsletter-modal').classList.remove('hidden');
            
            // เซ็ต current newsletter สำหรับ LINE sharing
            if (window.lineIntegration) {
                window.lineIntegration.setCurrentNewsletter(newsletter);
            }
            
            // อัพเดต URL สำหรับ direct link
            if (!directArticleId) {
                const url = new URL(window.location);
                url.searchParams.set('article', newsletterId);
                window.history.pushState({}, '', url);
            }
            
            // Increment view count (fire and forget)
            apiCall('incrementView', { id: newsletterId }).catch(console.error);
        } else {
            showError('ไม่พบข่าวสารที่เลือก');
        }
        
        hideLoading();
    } catch (error) {
        console.error('Get newsletter error:', error);
        hideLoading();
        showError('ไม่สามารถโหลดข่าวสารได้');
    }
}

function displayNewsletterInModal(newsletter) {
    document.getElementById('modal-title').textContent = newsletter.title;
    
    let contentHtml = '';
    
    // Images
    if (newsletter.images && newsletter.images.length > 0) {
        contentHtml += '<div class="mb-6">';
        newsletter.images.forEach(image => {
            contentHtml += `
                <img src="${image.url}" alt="${image.alt || newsletter.title}" 
                     class="w-full max-w-2xl mx-auto rounded-lg shadow-lg mb-4">
                ${image.caption ? `<p class="text-center text-sm text-gray-600 italic">${image.caption}</p>` : ''}
            `;
        });
        contentHtml += '</div>';
    }
    
    // Meta info
    contentHtml += `
        <div class="mb-6 pb-4 border-b border-gray-200">
            <div class="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span class="category-badge">${newsletter.category}</span>
                <span><i class="fas fa-user mr-1"></i> ${newsletter.author}</span>
                <span><i class="fas fa-calendar mr-1"></i> ${formatDate(newsletter.publishDate)}</span>
                <span><i class="fas fa-eye mr-1"></i> ${newsletter.views || 0} ครั้ง</span>
            </div>
            ${newsletter.subtitle ? `<p class="text-lg text-gray-600 mt-2">${newsletter.subtitle}</p>` : ''}
            ${newsletter.tags && newsletter.tags.length > 0 ? `
                <div class="mt-3">
                    ${newsletter.tags.map(tag => `<span class="tag" onclick="filterByTag('${tag.trim()}')">${tag.trim()}</span>`).join('')}
                </div>
            ` : ''}
            ${newsletter.photoAlbumUrl ? `
                <div class="mt-3">
                    <a href="${newsletter.photoAlbumUrl}" target="_blank" class="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition">
                        <i class="fas fa-images mr-2"></i> ดูอัลบั้มรูปเพิ่มเติม
                    </a>
                </div>
            ` : ''}
        </div>
    `;
    
    // Content
    const formattedContent = newsletter.content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
    contentHtml += `<div class="newsletter-content text-lg leading-relaxed"><p>${formattedContent}</p></div>`;
    
    document.getElementById('modal-content').innerHTML = contentHtml;
}

// Quick share function for newsletter cards
async function quickShareNewsletter(newsletterId) {
    try {
        if (!window.lineIntegration || !window.lineIntegration.isLoggedIn()) {
            showError('กรุณาเข้าสู่ระบบ LINE ก่อนแชร์');
            return;
        }

        showLoading("กำลังโหลดข้อมูลข่าวสาร...");
        
        const newsletter = await apiCall('getNewsletter', { id: newsletterId });
        
        if (newsletter) {
            window.lineIntegration.setCurrentNewsletter(newsletter);
            await window.lineIntegration.shareToChat();
        } else {
            showError('ไม่พบข่าวสารที่เลือก');
        }
        
        hideLoading();
    } catch (error) {
        console.error('Quick share error:', error);
        hideLoading();
        showError('การแชร์ล้มเหลว กรุณาลองใหม่อีกครั้ง');
    }
}

function filterByTag(tagName) {
    // ตั้งค่า tag filter
    const tagSelect = document.getElementById('tag-filter');
    if (tagSelect) {
        tagSelect.value = tagName;
    }
    
    // รีเซ็ต filters อื่น
    document.getElementById('category-filter').value = '';
    document.getElementById('search-input').value = '';
    
    // Close modal if open
    document.getElementById('newsletter-modal').classList.add('hidden');
    clearDirectArticleLink();
    
    // Filter and scroll
    filterNewsletters();
    document.getElementById('main-content').scrollIntoView({ behavior: 'smooth' });
}

// Global functions for onclick handlers
window.openNewsletterModal = openNewsletterModal;
window.changePage = changePage;
window.filterByTag = filterByTag;
window.quickShareNewsletter = quickShareNewsletter;

console.log('Newsletter App with LINE Integration loaded successfully!');
