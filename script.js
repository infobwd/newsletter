// script.js - Optimized Version
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
let directArticleId = null;
let quickSearch = null;
let filterTimeout = null;
let searchCache = new Map();

// ⚡ Cache Management
class CacheManager {
    constructor() {
        this.cache = new Map();
        this.maxAge = 5 * 60 * 1000; // 5 นาที
        this.maxSize = 100; // จำกัดขนาด cache
    }

    set(key, data) {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() - item.timestamp > this.maxAge) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    clear() {
        this.cache.clear();
    }

    has(key) {
        const item = this.cache.get(key);
        if (!item) return false;
        
        if (Date.now() - item.timestamp > this.maxAge) {
            this.cache.delete(key);
            return false;
        }
        
        return true;
    }
}

// สร้าง cache instance
const cacheManager = new CacheManager();

// ⚡ Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = {};
    }

    start(label) {
        this.metrics[label] = {
            start: performance.now()
        };
    }

    end(label) {
        if (this.metrics[label]) {
            this.metrics[label].duration = performance.now() - this.metrics[label].start;
            console.log(`⚡ ${label}: ${this.metrics[label].duration.toFixed(2)}ms`);
        }
    }

    getMetrics() {
        return this.metrics;
    }
}

// สร้าง performance monitor
const perfMonitor = new PerformanceMonitor();

// ⚡ Lazy Loading Implementation
class LazyImageLoader {
    constructor() {
        this.imageObserver = null;
        this.initObserver();
    }

    initObserver() {
        if ('IntersectionObserver' in window) {
            this.imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        this.imageObserver.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01
            });
        }
    }

    loadImage(img) {
        const src = img.dataset.src;
        if (src) {
            img.src = src;
            img.classList.add('loaded');
            img.classList.remove('lazy');
        }
    }

    observe(img) {
        if (this.imageObserver) {
            this.imageObserver.observe(img);
        } else {
            this.loadImage(img);
        }
    }
}

// สร้าง lazy loader instance
const lazyLoader = new LazyImageLoader();

// ⚡ Preloading System
class PreloadManager {
    constructor() {
        this.preloadQueue = [];
        this.isPreloading = false;
        this.preloadedNewsletters = new Set();
    }

    addToQueue(newsletterId) {
        if (!this.preloadedNewsletters.has(newsletterId) && 
            !this.preloadQueue.includes(newsletterId)) {
            this.preloadQueue.push(newsletterId);
        }
    }

    async startPreloading() {
        if (this.isPreloading || this.preloadQueue.length === 0) return;
        
        this.isPreloading = true;
        
        while (this.preloadQueue.length > 0) {
            const newsletterId = this.preloadQueue.shift();
            
            try {
                await apiCallCached('getNewsletter', { id: newsletterId });
                this.preloadedNewsletters.add(newsletterId);
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.error('Preload failed for:', newsletterId, error);
            }
        }
        
        this.isPreloading = false;
    }

    preloadVisible(newsletters) {
        newsletters.slice(0, 10).forEach(newsletter => {
            this.addToQueue(newsletter.id);
        });
        
        setTimeout(() => this.startPreloading(), 1000);
    }
}

// สร้าง preload manager
const preloadManager = new PreloadManager();

// ⚡ Image Preloading
class ImagePreloader {
    constructor() {
        this.preloadedImages = new Set();
        this.preloadQueue = [];
        this.maxConcurrent = 3;
        this.currentLoading = 0;
    }

    preload(imageUrl) {
        if (this.preloadedImages.has(imageUrl) || 
            this.preloadQueue.includes(imageUrl)) {
            return;
        }

        this.preloadQueue.push(imageUrl);
        this.processQueue();
    }

    async processQueue() {
        while (this.preloadQueue.length > 0 && 
               this.currentLoading < this.maxConcurrent) {
            
            const imageUrl = this.preloadQueue.shift();
            this.currentLoading++;
            
            try {
                await this.loadImage(imageUrl);
                this.preloadedImages.add(imageUrl);
            } catch (error) {
                console.warn('Failed to preload image:', imageUrl);
            } finally {
                this.currentLoading--;
            }
        }
    }

    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load ${url}`));
            img.src = url;
        });
    }

    preloadVisibleImages(newsletters) {
        newsletters.forEach(newsletter => {
            if (newsletter.images && newsletter.images.length > 0) {
                if (newsletter.images[0].thumbnailUrl) {
                    this.preload(newsletter.images[0].thumbnailUrl);
                }
                this.preload(newsletter.images[0].url);
            }
        });
    }
}

// สร้าง image preloader
const imagePreloader = new ImagePreloader();

// ⚡ Quick Search Implementation
class QuickSearch {
    constructor() {
        this.searchIndex = null;
        this.buildSearchIndex();
    }

    buildSearchIndex() {
        if (!allNewsletters.length) return;
        
        perfMonitor.start('build-search-index');
        
        this.searchIndex = allNewsletters.map(newsletter => ({
            id: newsletter.id,
            searchText: `${newsletter.title} ${newsletter.content} ${newsletter.author} ${newsletter.category} ${(newsletter.tags || []).join(' ')}`.toLowerCase(),
            newsletter: newsletter
        }));
        
        perfMonitor.end('build-search-index');
        console.log('🔍 Search index built with', this.searchIndex.length, 'items');
    }

    search(query) {
        if (!this.searchIndex || !query) return allNewsletters;
        
        perfMonitor.start('quick-search');
        
        const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
        const results = this.searchIndex.filter(item => {
            return searchTerms.every(term => item.searchText.includes(term));
        }).map(item => item.newsletter);
        
        perfMonitor.end('quick-search');
        
        return results;
    }

    rebuildIndex() {
        this.buildSearchIndex();
    }
}

// ⚡ Progressive Loading Strategy
class ProgressiveLoader {
    constructor() {
        this.loadingSteps = [
            { name: 'categories', priority: 1 },
            { name: 'featured', priority: 2 },
            { name: 'recent', priority: 3 },
            { name: 'all', priority: 4 }
        ];
        this.loadedSteps = new Set();
    }

    async loadStep(stepName) {
        if (this.loadedSteps.has(stepName)) return;

        perfMonitor.start(`load-${stepName}`);
        
        try {
            switch (stepName) {
                case 'categories':
                    await this.loadCategories();
                    break;
                case 'featured':
                    await this.loadFeaturedNewsletters();
                    break;
                case 'recent':
                    await this.loadRecentNewsletters();
                    break;
                case 'all':
                    await this.loadAllNewsletters();
                    break;
            }
            
            this.loadedSteps.add(stepName);
            console.log(`✅ Loaded: ${stepName}`);
            
        } catch (error) {
            console.error(`❌ Failed to load: ${stepName}`, error);
        }
        
        perfMonitor.end(`load-${stepName}`);
    }

    async loadCategories() {
        const categories = await apiCallCached('getCategories');
        populateCategoryFilters();
    }

    async loadFeaturedNewsletters() {
        if (!allNewsletters.length) {
            const newsletters = await apiCallCached('getNewsletters');
            allNewsletters = newsletters;
        }
        
        const featured = allNewsletters.filter(n => n.featured).slice(0, 3);
        displayNewsletterGrid(featured, 'featured-newsletters');
        
        const featuredSection = document.getElementById('featured-section');
        if (featured.length > 0) {
            featuredSection.classList.remove('hidden');
        }
    }

    async loadRecentNewsletters() {
        if (!allNewsletters.length) {
            const newsletters = await apiCallCached('getNewsletters');
            allNewsletters = newsletters;
        }
        
        const recent = allNewsletters.filter(n => !n.featured).slice(0, 12);
        displayNewsletterGrid(recent, 'newsletters-container');
        
        imagePreloader.preloadVisibleImages(recent);
    }

    async loadAllNewsletters() {
        if (!allNewsletters.length) {
            const newsletters = await apiCallCached('getNewsletters');
            allNewsletters = newsletters;
        }
        
        filteredNewsletters = [...allNewsletters];
        updateTagsList();
        displayNewsletters();
        
        preloadManager.preloadVisible(filteredNewsletters);
        imagePreloader.preloadVisibleImages(filteredNewsletters.slice(0, 20));
        
        hideLoading();
    }

    async loadProgressively() {
        showLoadingOptimized("กำลังโหลด...", true);
        
        for (const step of this.loadingSteps) {
            await this.loadStep(step.name);
            
            if (step.name !== 'all') {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }
}

// สร้าง progressive loader
const progressiveLoader = new ProgressiveLoader();

// ⚡ Skeleton Loading Generator
class SkeletonLoader {
    static createNewsletterCardSkeleton() {
        return `
            <div class="skeleton-card">
                <div class="skeleton-image"></div>
                <div class="p-6">
                    <div class="flex justify-between items-start mb-3">
                        <div class="skeleton-text short"></div>
                        <div class="skeleton-text" style="width: 60px;"></div>
                    </div>
                    
                    <div class="skeleton-text long mb-2"></div>
                    <div class="skeleton-text" style="width: 80%;"></div>
                    
                    <div class="skeleton-text short mt-4 mb-4"></div>
                    
                    <div class="skeleton-text mb-2" style="width: 90%;"></div>
                    <div class="skeleton-text mb-2" style="width: 85%;"></div>
                    <div class="skeleton-text mb-4" style="width: 70%;"></div>
                    
                    <div class="flex justify-between items-center mb-3">
                        <div class="skeleton-text" style="width: 100px;"></div>
                        <div class="skeleton-text" style="width: 80px;"></div>
                    </div>
                    
                    <div class="skeleton-text" style="width: 100%; height: 2.5rem; border-radius: 0.5rem;"></div>
                </div>
            </div>
        `;
    }

    static showSkeletonGrid(containerId, count = 6) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const skeletonHTML = Array(count)
            .fill(this.createNewsletterCardSkeleton())
            .join('');

        container.innerHTML = `<div class="newsletter-grid">${skeletonHTML}</div>`;
    }
}

// App Initialization
function checkDirectArticleLink() {
    const urlParams = new URLSearchParams(window.location.search);
    directArticleId = urlParams.get('article');
    
    if (directArticleId) {
        console.log('Direct article link detected:', directArticleId);
    }
}

function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const tagFilter = document.getElementById('tag-filter'); 
    const sortFilter = document.getElementById('sort-filter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterNewslettersWithQuickSearch, 150));
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterNewslettersWithQuickSearch);
    }
  
    if (tagFilter) {
        tagFilter.addEventListener('change', filterNewslettersWithQuickSearch);
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', filterNewslettersWithQuickSearch);
    }
    
    const scrollBtn = document.getElementById('scroll-to-news');
    if (scrollBtn) {
        scrollBtn.addEventListener('click', () => {
            document.getElementById('main-content').scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    const closeModal = document.getElementById('close-newsletter-modal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('newsletter-modal').classList.add('hidden');
            clearDirectArticleLink();
        });
    }
    
    const modal = document.getElementById('newsletter-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.getElementById('newsletter-modal').classList.add('hidden');
                clearDirectArticleLink();
            }
        });
    }
    
    window.addEventListener('resize', debounce(() => {
        itemsPerPage = getItemsPerPage();
        displayNewsletters();
    }, 300));
}

async function initializeApp() {
    setupEventListeners();
    loadCategories();
    await loadNewslettersProgressively();
    
    // สร้าง quick search หลังจากโหลดข้อมูลเสร็จ
    setTimeout(() => {
        if (allNewsletters.length > 0) {
            quickSearch = new QuickSearch();
        }
    }, 2000);
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
    if (width < 640) return 4;
    if (width < 768) return 6;
    if (width < 1024) return 8;
    if (width < 1280) return 9;
    return 12;
}

function showLoading(message = "กำลังโหลด...") {
    const overlay = document.getElementById('loading-overlay');
    const text = document.getElementById('loading-text');
    if (text) text.textContent = message;
    if (overlay) overlay.classList.add('active');
}

function showLoadingOptimized(message = "กำลังโหลด...", useSkeletons = false) {
    if (useSkeletons) {
        const containers = ['newsletters-container', 'featured-newsletters'];
        containers.forEach(containerId => {
            SkeletonLoader.showSkeletonGrid(containerId, 6);
        });
    } else {
        showLoading(message);
    }
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

function clearDirectArticleLink() {
    if (directArticleId) {
        const url = new URL(window.location);
        url.searchParams.delete('article');
        window.history.replaceState({}, '', url);
        directArticleId = null;
    }
}

// API functions
async function apiCallCached(action, params = {}) {
    const cacheKey = `${action}_${JSON.stringify(params)}`;
    
    const cachedData = cacheManager.get(cacheKey);
    if (cachedData) {
        console.log('📦 Using cached data for:', action);
        return cachedData;
    }

    try {
        const data = await apiCall(action, params);
        
        if (!['incrementView', 'incrementShare'].includes(action)) {
            cacheManager.set(cacheKey, data);
        }
        
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

async function apiCall(action, params = {}) {
    return new Promise((resolve, reject) => {
        try {
            const url = new URL(API_BASE_URL);
            url.searchParams.append('action', action);
            
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });
            
            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
            url.searchParams.append('callback', callbackName);
            
            const script = document.createElement('script');
            
            window[callbackName] = function(data) {
                document.head.removeChild(script);
                delete window[callbackName];
                
                if (data.status === 'error') {
                    reject(new Error(data.message));
                } else {
                    resolve(data.data);
                }
            };
            
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

async function loadNewslettersProgressively() {
    try {
        hideError();
        
        await progressiveLoader.loadProgressively();
        
        if (directArticleId) {
            await handleDirectArticleLink();
        }
        
        console.log(`🚀 Progressive loading completed - ${allNewsletters.length} newsletters`);
    } catch (error) {
        console.error('Progressive loading error:', error);
        hideLoading();
        showError('ไม่สามารถโหลดข่าวสารได้ กรุณาลองใหม่อีกครั้ง');
    }
}

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

function filterNewslettersWithQuickSearch() {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => {
        perfMonitor.start('filter-newsletters');
        
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const categoryFilter = document.getElementById('category-filter').value;
        const tagFilter = document.getElementById('tag-filter').value;
        const sortFilter = document.getElementById('sort-filter').value;

        // สร้าง cache key สำหรับการค้นหา
        const cacheKey = `${searchTerm}_${categoryFilter}_${tagFilter}_${sortFilter}`;
        
        // ตรวจสอบ search cache
        if (searchCache.has(cacheKey)) {
            filteredNewsletters = searchCache.get(cacheKey);
            currentPage = 1;
            displayNewsletters();
            return;
        }

        let searchResults = allNewsletters;

        // ใช้ quick search ถ้ามีการค้นหา
        if (searchTerm && quickSearch) {
            searchResults = quickSearch.search(searchTerm);
        }

        // Filter หมวดหมู่และแท็ก
        filteredNewsletters = searchResults.filter(newsletter => {
            const matchesCategory = !categoryFilter || newsletter.category === categoryFilter;
            const matchesTag = !tagFilter || 
                (newsletter.tags && newsletter.tags.some(tag => tag.trim() === tagFilter));
            
            return matchesCategory && matchesTag;
        });

        // Sort newsletters
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
            default:
                filteredNewsletters.sort((a, b) => {
                    const dateA = new Date(a.publishDate || a.createdDate);
                    const dateB = new Date(b.publishDate || b.createdDate);
                    return dateB - dateA;
                });
        }

        // เก็บผลลัพธ์ลง cache
        searchCache.set(cacheKey, [...filteredNewsletters]);

        // จำกัดขนาด search cache
        if (searchCache.size > 20) {
            const firstKey = searchCache.keys().next().value;
            searchCache.delete(firstKey);
        }

        currentPage = 1;
        displayNewsletters();
        
        perfMonitor.end('filter-newsletters');
        
        // Preload images สำหรับผลลัพธ์
        imagePreloader.preloadVisibleImages(filteredNewsletters.slice(0, 12));
        
    }, 150);
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

    // ⚡ ใช้ DocumentFragment สำหรับ performance
    const fragment = document.createDocumentFragment();

    newsletters.forEach((newsletter, index) => {
        // ⚡ Lazy loading image
        const imageHtml = newsletter.images && newsletter.images.length > 0 
            ? `<img data-src="${newsletter.images[0].thumbnailUrl || newsletter.images[0].url}" 
                   alt="${newsletter.images[0].alt || newsletter.title}" 
                   class="newsletter-image w-full lazy"
                   style="background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%); min-height: 200px;">
               <div class="image-placeholder">
                   <i class="fas fa-image text-gray-400 text-2xl"></i>
               </div>`
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
        card.style.setProperty('--animation-delay', `${index * 0.1}s`);
        
        card.innerHTML = `
            ${newsletter.featured ? '<div class="featured-badge"><i class="fas fa-star mr-1"></i> ข่าวเด่น</div>' : ''}
            ${shareButtonHtml}
            <div class="relative overflow-hidden image-container">
                ${imageHtml}
            </div>
            <div class="p-6">
                <div class="flex justify-between items-start mb-3">
                    <span class="category-badge">
                        <i class="fas fa-tag"></i> ${newsletter.category}
                    </span>
                    <div class="flex items-center space-x-3 text-xs text-gray-500">
                        <div>
                            <i class="fas fa-eye mr-1"></i> ${newsletter.views || 0}
                        </div>
                        <div class="share-count">
                            <i class="fas fa-share-alt mr-1"></i> ${newsletter.shares || 0}
                        </div>
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

        fragment.appendChild(card);
    });

    // ⚡ เพิ่มทุกการ์ดพร้อมกันแทนทีละใบ
    container.appendChild(fragment);

    // ⚡ เริ่ม lazy loading สำหรับรูปภาพ
    const lazyImages = container.querySelectorAll('img.lazy');
    lazyImages.forEach(img => lazyLoader.observe(img));

    // ⚡ Trigger animation สำหรับการ์ดใหม่
    requestAnimationFrame(() => {
        const cards = container.querySelectorAll('.newsletter-card');
        cards.forEach(card => card.classList.add('animate-in'));
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
        
        // ใช้ cached API call
        const newsletter = await apiCallCached('getNewsletter', { id: newsletterId });
        
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
            
            // Increment view count (fire and forget) - ไม่ใช้ cache
            apiCall('incrementView', { id: newsletterId }).catch(console.error);
            
            // Preload ข่าวที่เกี่ยวข้อง
            preloadRelatedNewsletters(newsletter);
            
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

function preloadRelatedNewsletters(currentNewsletter) {
    const related = allNewsletters
        .filter(n => n.id !== currentNewsletter.id)
        .filter(n => n.category === currentNewsletter.category || 
                    (n.tags && currentNewsletter.tags && 
                     n.tags.some(tag => currentNewsletter.tags.includes(tag))))
        .slice(0, 5);
    
    related.forEach(newsletter => {
        preloadManager.addToQueue(newsletter.id);
    });
    
    setTimeout(() => preloadManager.startPreloading(), 500);
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
                <span class="share-count">
                    <i class="fas fa-share-alt mr-1"></i> ${newsletter.shares || 0} ครั้ง
                </span>
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
    const tagSelect = document.getElementById('tag-filter');
    if (tagSelect) {
        tagSelect.value = tagName;
    }
    
    document.getElementById('category-filter').value = '';
    document.getElementById('search-input').value = '';
    
    document.getElementById('newsletter-modal').classList.add('hidden');
    clearDirectArticleLink();
    
    filterNewslettersWithQuickSearch();
    document.getElementById('main-content').scrollIntoView({ behavior: 'smooth' });
}

// DOMContentLoaded Event
document.addEventListener('DOMContentLoaded', function() {
    perfMonitor.start('app-init');
    console.log('🚀 Starting Optimized Newsletter App...');
    
    checkDirectArticleLink();
    initializeApp();
    
    perfMonitor.end('app-init');
});

// Global functions for onclick handlers
window.openNewsletterModal = openNewsletterModal;
window.changePage = changePage;
window.filterByTag = filterByTag;
window.quickShareNewsletter = quickShareNewsletter;

console.log('Newsletter App with LINE Integration loaded successfully!');
