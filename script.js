/**
 * DevFeed - Moltbook Developer Posts
 * Black Brutalist UI - Real API Data Only
 */

const CONFIG = {
    API_BASE: 'https://www.moltbook.com/api/v1',
    API_KEY: 'moltbook_sk_JC57sF4G-UR8cIP-MBPFF70Dii92FNkI',
    POST_LIMIT: 20,
    FALLBACK_AVATAR: 'https://api.dicebear.com/7.x/pixel-art/png',
    
    KEYWORDS: {
        all: [],
        code: ['code', 'coding', 'programming', 'developer', 'software'],
        ai: ['AI', 'machine learning', 'ML', 'GPT', 'LLM', 'neural', 'OpenAI', 'Claude'],
        deploy: ['deploy', 'ship', 'release', 'launch', 'production', 'devops'],
        github: ['github', 'git', 'commit', 'PR', 'pull request', 'merge', 'repo'],
        bug: ['bug', 'debug', 'fix', 'error', 'issue', 'crash']
    }
};

const state = {
    newPosts: [],
    topPosts: [],
    hotPosts: [],
    currentFilter: 'all',
    stats: {
        agents: 0,
        posts: 0,
        newCount: 0
    }
};

// DOM
const $ = (id) => document.getElementById(id);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    fetchAllPosts();
});

function setupEventListeners() {
    $('fetch-btn').addEventListener('click', fetchAllPosts);
    $('retry-btn').addEventListener('click', fetchAllPosts);
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentFilter = btn.dataset.filter;
            renderAllSections();
        });
    });
    
    $('close-modal').addEventListener('click', closeModal);
    document.querySelector('.modal-overlay').addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => e.key === 'Escape' && closeModal());
}

async function fetchAllPosts() {
    showLoading();
    
    console.log('🚀 Starting API fetch...');
    
    // Try multiple endpoint patterns
    const endpointPatterns = [
        // Pattern 1: /feed endpoint
        { new: '/feed?sort=new', top: '/feed?sort=top', hot: '/feed?sort=hot' },
        // Pattern 2: /posts endpoint
        { new: '/posts?sort=new', top: '/posts?sort=top', hot: '/posts?sort=hot' },
        // Pattern 3: Search
        { new: '/search?q=dev&type=posts&sort=new', top: '/search?q=code&type=posts', hot: '/search?q=AI&type=posts' },
    ];
    
    for (const pattern of endpointPatterns) {
        console.log('Trying pattern:', pattern);
        
        const [newPosts, topPosts, hotPosts] = await Promise.all([
            tryFetch(pattern.new),
            tryFetch(pattern.top),
            tryFetch(pattern.hot)
        ]);
        
        const allPosts = [...newPosts, ...topPosts, ...hotPosts];
        
        if (allPosts.length > 0) {
            state.newPosts = newPosts;
            state.topPosts = topPosts;
            state.hotPosts = hotPosts;
            
            const uniqueIds = new Set(allPosts.map(p => p.id));
            const uniqueAuthors = new Set(allPosts.map(p => p.author));
            
            state.stats.agents = uniqueAuthors.size;
            state.stats.posts = uniqueIds.size;
            state.stats.newCount = newPosts.length;
            
            console.log(`✅ Success! ${newPosts.length} new, ${topPosts.length} top, ${hotPosts.length} hot`);
            
            updateStats();
            renderAllSections();
            showContent();
            return;
        }
    }
    
    // All patterns failed
    showError('Moltbook API returned 500 errors. The server may be down.');
}

async function tryFetch(endpoint) {
    const url = `${CONFIG.API_BASE}${endpoint}&limit=${CONFIG.POST_LIMIT}`;
    
    try {
        console.log(`📡 ${endpoint}`);
        
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${CONFIG.API_KEY}`
            }
        });
        
        console.log(`   → ${response.status}`);
        
        if (!response.ok) return [];
        
        const data = await response.json();
        const posts = extractPosts(data);
        console.log(`   → ${posts.length} posts`);
        return posts.map(formatPost);
        
    } catch (error) {
        console.log(`   → Error: ${error.message}`);
        return [];
    }
}


function extractPosts(data) {
    if (Array.isArray(data)) return data;
    if (data.posts) return data.posts;
    if (data.results) return data.results;
    if (data.data) return data.data;
    return [];
}

function formatPost(post) {
    return {
        id: post.id || post._id || Math.random().toString(36),
        author: post.author?.name || post.author_name || post.user?.name || 'Anonymous',
        avatar: post.author?.avatar_url || post.avatar_url || 
                `${CONFIG.FALLBACK_AVATAR}?seed=${post.author?.name || 'user'}`,
        content: post.content || post.text || post.body || post.title || '',
        upvotes: parseInt(post.upvotes || post.score || 0),
        comments: parseInt(post.comment_count || post.comments_count || 0),
        timestamp: post.created_at || post.timestamp || new Date().toISOString(),
    };
}

function filterPosts(posts) {
    const keywords = CONFIG.KEYWORDS[state.currentFilter];
    if (!keywords || keywords.length === 0) return posts;
    
    return posts.filter(post => {
        const text = post.content.toLowerCase();
        return keywords.some(kw => text.includes(kw.toLowerCase()));
    });
}

function renderAllSections() {
    renderSection('new-posts', filterPosts(state.newPosts));
    renderSection('top-posts', filterPosts(state.topPosts));
    renderSection('hot-posts', filterPosts(state.hotPosts));
}

function renderSection(containerId, posts) {
    const container = $(containerId);
    
    if (posts.length === 0) {
        container.innerHTML = '<div class="empty-section">No posts match this filter</div>';
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <article class="post-card" data-id="${post.id}" data-section="${containerId}">
            <div class="post-header">
                <img src="${post.avatar}" alt="" class="post-avatar" 
                     onerror="this.src='${CONFIG.FALLBACK_AVATAR}?seed=${post.author}'">
                <div class="post-meta">
                    <div class="post-author">@${post.author}</div>
                    <div class="post-time">${formatTime(post.timestamp)}</div>
                </div>
            </div>
            <div class="post-content">${escapeHtml(post.content)}</div>
            <div class="post-stats">
                <span class="post-stat"><span class="post-stat-value">${post.upvotes}</span> upvotes</span>
                <span class="post-stat"><span class="post-stat-value">${post.comments}</span> comments</span>
            </div>
        </article>
    `).join('');
    
    // Click handlers
    container.querySelectorAll('.post-card').forEach(card => {
        card.addEventListener('click', () => {
            const section = card.dataset.section;
            const posts = section.includes('new') ? state.newPosts : 
                          section.includes('top') ? state.topPosts : state.hotPosts;
            const post = posts.find(p => p.id === card.dataset.id);
            if (post) openModal(post);
        });
    });
}

function updateStats() {
    animateNumber($('agents-count'), state.stats.agents);
    animateNumber($('posts-count'), state.stats.posts);
    animateNumber($('new-count'), state.stats.newCount);
}

function animateNumber(el, target) {
    const start = parseInt(el.textContent) || 0;
    const diff = target - start;
    const duration = 400;
    const startTime = performance.now();
    
    el.classList.add('updating');
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(start + diff * eased);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.textContent = target;
            el.classList.remove('updating');
        }
    }
    
    requestAnimationFrame(update);
}

function openModal(post) {
    $('modal-avatar').src = post.avatar;
    $('modal-author').textContent = `@${post.author}`;
    $('modal-time').textContent = formatTime(post.timestamp);
    $('modal-content').textContent = post.content;
    $('modal-upvotes').textContent = post.upvotes;
    $('modal-comments').textContent = post.comments;
    
    $('post-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    $('post-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

function showLoading() {
    $('loading').classList.remove('hidden');
    $('error-state').classList.add('hidden');
    $('main-content').classList.add('hidden');
}

function showContent() {
    $('loading').classList.add('hidden');
    $('error-state').classList.add('hidden');
    $('main-content').classList.remove('hidden');
}

function showError(msg) {
    $('loading').classList.add('hidden');
    $('error-state').classList.remove('hidden');
    $('error-msg').textContent = msg;
    $('main-content').classList.add('hidden');
}

function formatTime(timestamp) {
    try {
        const diff = (Date.now() - new Date(timestamp)) / 1000;
        if (diff < 60) return 'now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return `${Math.floor(diff / 86400)}d`;
    } catch {
        return '';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}
