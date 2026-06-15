/* ============================================
   BLOG ENGINE — mubi.me/blog
   Client-side blog with hash routing,
   Markdown rendering, and pagination
   ============================================ */

(function () {
    'use strict';

    // --- Configuration ---
    const CONFIG = {
        postsPerPage: 6,
        postsJsonPath: 'posts.json',
        postsDir: 'posts/',
        scrollTopThreshold: 300
    };

    // --- State ---
    const state = {
        posts: [],
        currentView: 'home', // 'home' | 'post'
        currentPage: 1,
        currentTag: null,
        currentSlug: null
    };

    // --- DOM References ---
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const DOM = {
        homeView: $('#home-view'),
        postView: $('#post-view'),
        postsGrid: $('#posts-grid'),
        tagFilterBar: $('#tag-filter-bar'),
        pagination: $('#pagination'),
        paginationPrev: $('#pagination-prev'),
        paginationNext: $('#pagination-next'),
        paginationInfo: $('#pagination-info'),
        readingProgress: $('#reading-progress'),
        scrollTopBtn: $('#scroll-top-btn'),
        articleTitle: $('#article-title'),
        articleDate: $('#article-date'),
        articleReadTime: $('#article-readtime'),
        articleTags: $('#article-tags'),
        articleDesc: $('#article-desc'),
        articleBody: $('#article-body'),
        articleAdSlot: $('#article-ad-slot'),
        blogHero: $('#blog-hero'),
        sidebarTags: $('#sidebar-tags')
    };

    // --- Marked.js Configuration ---
    function configureMarked() {
        const renderer = new marked.Renderer();

        // Custom code block rendering with language label
        renderer.code = function (code, lang) {
            const language = lang || '';
            let highlighted;
            if (language && hljs.getLanguage(language)) {
                highlighted = hljs.highlight(code, { language }).value;
            } else {
                highlighted = hljs.highlightAuto(code).value;
            }
            return `<pre data-lang="${language}"><code class="hljs language-${language}">${highlighted}</code></pre>`;
        };

        // Custom image rendering with lazy loading
        renderer.image = function (href, title, text) {
            const alt = text || '';
            const titleAttr = title ? ` title="${title}"` : '';
            return `<img src="${href}" alt="${alt}"${titleAttr} loading="lazy" />`;
        };

        marked.setOptions({
            renderer,
            gfm: true,
            breaks: false,
            pedantic: false,
            smartypants: false
        });
    }

    // --- Data Loading ---
    async function loadPosts() {
        try {
            const res = await fetch(CONFIG.postsJsonPath);
            if (!res.ok) throw new Error('Failed to load posts.json');
            state.posts = await res.json();
            // Sort by date (newest first)
            state.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (err) {
            console.error('Error loading posts:', err);
            state.posts = [];
        }
    }

    async function loadPostContent(slug) {
        try {
            const res = await fetch(`${CONFIG.postsDir}${slug}.md`);
            if (!res.ok) throw new Error(`Post not found: ${slug}`);
            return await res.text();
        } catch (err) {
            console.error('Error loading post:', err);
            return null;
        }
    }

    // --- Utility Functions ---
    function formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function getAllTags() {
        const tagMap = {};
        state.posts.forEach(post => {
            post.tags.forEach(tag => {
                tagMap[tag] = (tagMap[tag] || 0) + 1;
            });
        });
        return tagMap;
    }

    function getFilteredPosts() {
        if (!state.currentTag) return state.posts;
        return state.posts.filter(p => p.tags.includes(state.currentTag));
    }

    function getPagedPosts(posts) {
        const start = (state.currentPage - 1) * CONFIG.postsPerPage;
        return posts.slice(start, start + CONFIG.postsPerPage);
    }

    function getTotalPages(posts) {
        return Math.max(1, Math.ceil(posts.length / CONFIG.postsPerPage));
    }

    // --- Rendering: Home View ---
    function renderTagFilters() {
        const tags = getAllTags();
        const allCount = state.posts.length;
        let html = `<button class="tag-filter-btn ${!state.currentTag ? 'active' : ''}" data-tag="">All <span class="tag-count">${allCount}</span></button>`;
        Object.entries(tags)
            .sort((a, b) => b[1] - a[1])
            .forEach(([tag, count]) => {
                const active = state.currentTag === tag ? 'active' : '';
                html += `<button class="tag-filter-btn ${active}" data-tag="${tag}">${tag} <span class="tag-count">${count}</span></button>`;
            });
        DOM.tagFilterBar.innerHTML = html;

        // Bind events
        DOM.tagFilterBar.querySelectorAll('.tag-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.currentTag = btn.dataset.tag || null;
                state.currentPage = 1;
                renderHome();
            });
        });
    }

    function renderPostCards() {
        const filtered = getFilteredPosts();
        const paged = getPagedPosts(filtered);

        if (paged.length === 0) {
            DOM.postsGrid.innerHTML = `
                <div class="not-found" style="grid-column: 1/-1;">
                    <div class="not-found-code">∅</div>
                    <h2>No posts found</h2>
                    <p>No posts match the selected filter. Try another tag.</p>
                </div>`;
            DOM.pagination.style.display = 'none';
            return;
        }

        let html = '';
        paged.forEach((post, idx) => {
            // Insert ad after 3rd card
            if (idx === 3) {
                html += `<div class="ad-slot-infeed no-print" id="ad-infeed">
                    <ins class="adsbygoogle"
                         style="display:block"
                         data-ad-client="ca-pub-4851542991688278"
                         data-ad-slot="auto"
                         data-ad-format="fluid"
                         data-full-width-responsive="true"></ins>
                </div>`;
            }

            const tagsHtml = post.tags.map(t => `<span class="post-card-tag">${t}</span>`).join('');
            html += `
                <a href="#${post.slug}" class="post-card animate-in" style="animation-delay: ${idx * 0.08}s" data-slug="${post.slug}">
                    <div class="post-card-meta">
                        <span class="post-card-date">${formatDate(post.date)}</span>
                        <span class="post-card-readtime">⏱ ${post.readTime}</span>
                    </div>
                    <h2 class="post-card-title">${post.title}</h2>
                    <p class="post-card-desc">${post.description}</p>
                    <div class="post-card-tags">${tagsHtml}</div>
                </a>`;
        });

        DOM.postsGrid.innerHTML = html;

        // Push ads if available
        try {
            const adEl = document.querySelector('#ad-infeed .adsbygoogle');
            if (adEl && window.adsbygoogle) {
                (adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (e) { /* AdSense may not be loaded */ }
    }

    function renderPagination() {
        const filtered = getFilteredPosts();
        const total = getTotalPages(filtered);

        if (total <= 1) {
            DOM.pagination.style.display = 'none';
            return;
        }

        DOM.pagination.style.display = 'flex';
        DOM.paginationPrev.disabled = state.currentPage <= 1;
        DOM.paginationNext.disabled = state.currentPage >= total;
        DOM.paginationInfo.textContent = `Page ${state.currentPage} of ${total}`;
    }

    function renderSidebarTags() {
        if (!DOM.sidebarTags) return;
        const tags = getAllTags();
        DOM.sidebarTags.innerHTML = Object.keys(tags)
            .map(tag => `<span class="post-card-tag" data-tag="${tag}" style="cursor:pointer">${tag}</span>`)
            .join('');

        DOM.sidebarTags.querySelectorAll('.post-card-tag').forEach(el => {
            el.addEventListener('click', () => {
                state.currentTag = el.dataset.tag;
                state.currentPage = 1;
                window.location.hash = '';
                showHome();
            });
        });
    }

    function renderHome() {
        renderTagFilters();
        renderPostCards();
        renderPagination();
        renderSidebarTags();
    }

    // --- Rendering: Post View ---
    async function renderPost(slug) {
        const postMeta = state.posts.find(p => p.slug === slug);

        if (!postMeta) {
            showNotFound();
            return;
        }

        // Update meta
        DOM.articleTitle.textContent = postMeta.title;
        DOM.articleDate.textContent = formatDate(postMeta.date);
        DOM.articleReadTime.textContent = `⏱ ${postMeta.readTime}`;
        DOM.articleDesc.textContent = postMeta.description;

        DOM.articleTags.innerHTML = postMeta.tags
            .map(t => `<span class="post-card-tag">${t}</span>`)
            .join('');

        // Update page title and meta
        document.title = `${postMeta.title} — mubi.me blog`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.content = postMeta.description;
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.content = postMeta.title;
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.content = postMeta.description;

        // Show loading skeleton
        DOM.articleBody.innerHTML = `
            <div class="skeleton-card">
                <div class="skeleton-line title"></div>
                <div class="skeleton-line long"></div>
                <div class="skeleton-line long"></div>
                <div class="skeleton-line medium"></div>
                <div class="skeleton-line short"></div>
            </div>`;

        // Fetch and render markdown
        const markdown = await loadPostContent(slug);

        if (!markdown) {
            showNotFound();
            return;
        }

        const html = marked.parse(markdown);
        DOM.articleBody.innerHTML = html;
        DOM.articleBody.classList.add('view-fade-enter');


        // Push article ad
        try {
            const adEl = document.querySelector('#article-ad-slot .adsbygoogle');
            if (adEl && window.adsbygoogle) {
                (adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (e) { /* AdSense may not be loaded */ }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showNotFound() {
        DOM.homeView.style.display = 'none';
        DOM.postView.style.display = 'none';
        DOM.postView.parentElement.innerHTML += `
            <div class="not-found" id="not-found-view">
                <div class="not-found-code">404</div>
                <h2>Post Not Found</h2>
                <p>The post you're looking for doesn't exist or has been moved.</p>
                <a href="#" class="not-found-btn" onclick="window.location.hash='';return false;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Back to Blog
                </a>
            </div>`;
        state.currentView = 'post';
    }



    // --- View Management ---
    function showHome() {
        state.currentView = 'home';
        state.currentSlug = null;

        // Remove 404 if exists
        const nf = $('#not-found-view');
        if (nf) nf.remove();

        DOM.homeView.style.display = 'block';
        DOM.postView.style.display = 'none';
        DOM.readingProgress.style.width = '0%';
        DOM.homeView.classList.add('view-fade-enter');


        // Reset title
        document.title = 'Blog — Mubashar Ashraf | mubi.me';
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.content = 'Insights on AI engineering, automation workflows, and lessons learned — by Mubashar Ashraf.';

        renderHome();
    }

    async function showPost(slug) {
        state.currentView = 'post';
        state.currentSlug = slug;

        // Remove 404 if exists
        const nf = $('#not-found-view');
        if (nf) nf.remove();

        DOM.homeView.style.display = 'none';
        DOM.postView.style.display = 'block';
        DOM.postView.classList.add('view-fade-enter');

        await renderPost(slug);
    }

    // --- Hash Routing ---
    function handleRoute() {
        const hash = window.location.hash.slice(1); // Remove #
        if (hash && hash.length > 0) {
            showPost(hash);
        } else {
            showHome();
        }
    }

    // --- Reading Progress Bar ---
    function updateReadingProgress() {
        if (state.currentView !== 'post') {
            DOM.readingProgress.style.width = '0%';
            return;
        }
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        DOM.readingProgress.style.width = `${Math.min(100, progress)}%`;
    }

    // --- Scroll to Top ---
    function updateScrollTopBtn() {
        if (window.scrollY > CONFIG.scrollTopThreshold) {
            DOM.scrollTopBtn.classList.add('visible');
        } else {
            DOM.scrollTopBtn.classList.remove('visible');
        }
    }

    // --- Event Bindings ---
    function bindEvents() {
        // Hash change
        window.addEventListener('hashchange', handleRoute);

        // Scroll events (throttled)
        let scrollTicking = false;
        window.addEventListener('scroll', () => {
            if (!scrollTicking) {
                requestAnimationFrame(() => {
                    updateReadingProgress();
                    updateScrollTopBtn();
                    scrollTicking = false;
                });
                scrollTicking = true;
            }
        });

        // Scroll to top button
        DOM.scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Pagination
        DOM.paginationPrev.addEventListener('click', () => {
            if (state.currentPage > 1) {
                state.currentPage--;
                renderHome();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });

        DOM.paginationNext.addEventListener('click', () => {
            const filtered = getFilteredPosts();
            const total = getTotalPages(filtered);
            if (state.currentPage < total) {
                state.currentPage++;
                renderHome();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    // --- Mermaid Config ---
    function configureMermaid() {
        if (window.mermaid) {
            mermaid.initialize({
                startOnLoad: false,
                theme: 'default',
                securityLevel: 'loose',
                fontFamily: 'IBM Plex Sans, sans-serif',
                themeVariables: {
                    primaryColor: '#0f8b8d',
                    primaryTextColor: '#171918',
                    primaryBorderColor: '#0f8b8d',
                    lineColor: '#6e756d',
                    secondaryColor: '#f4d35e',
                    tertiaryColor: '#f3f5f1'
                }
            });
        }
    }

    // --- Public API (for CV homepage integration) ---
    window.BlogEngine = {
        getLatestPosts: function (count = 3) {
            return state.posts.slice(0, count);
        },
        getPosts: function () {
            return state.posts;
        }
    };

    // --- Initialization ---
    async function init() {
        configureMarked();
        configureMermaid();
        await loadPosts();
        bindEvents();
        handleRoute();
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
