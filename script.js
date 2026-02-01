/**
 * OpenDevs - Developer Feed
 * Fast, runnable version with fallback APIs
 */

const CONFIG = {
    MOLTBOOK_API: 'https://www.moltbook.com/api/v1',
    MOLTBOOK_KEY: 'moltbook_sk_JC57sF4G-UR8cIP-MBPFF70Dii92FNkI',
    HN_API: 'https://hacker-news.firebaseio.com/v0',
    FALLBACK_AVATAR: 'https://api.dicebear.com/7.x/pixel-art/png',
    POST_LIMIT: 15,
    
    KEYWORDS: {
        all: [],
        code: ['code', 'coding', 'programming', 'developer', 'software'],
        ai: ['AI', 'machine learning', 'ML', 'GPT', 'LLM', 'OpenAI'],
        deploy: ['deploy', 'ship', 'release', 'launch', 'devops'],
        github: ['github', 'git', 'repo', 'open source'],
        bug: ['bug', 'debug', 'fix', 'error']
    }
};

const state = {
    newPosts: [],
    topPosts: [],
    hotPosts: [],
    currentFilter: 'all',
    stats: { agents: 0, posts: 0, newCount: 0 }
};

const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
    setupEvents();
    fetchAllPosts();
});

function setupEvents() {
    $('fetch-btn').addEventListener('click', fetchAllPosts);
    $('retry-btn').addEventListener('click', fetchAllPosts);
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentFilter = btn.dataset.filter;
            renderAll();
        });
    });
    
    $('close-modal').addEventListener('click', closeModal);
    document.querySelector('.modal-overlay').addEventListener('click', closeModal);
}

async function fetchAllPosts() {
    showLoading();
    
    // Try Moltbook first, then fallback to Hacker News
    let success = await tryMoltbook();
    
    if (!success) {
        console.log('⚡ Using Hacker News API...');
        success = await tryHackerNews();
    }
    
    if (!success) {
        showError('Could not fetch posts. Please try again.');
    }
}

async function tryMoltbook() {
    try {
        const endpoints = [
            `${CONFIG.MOLTBOOK_API}/feed?sort=hot&limit=${CONFIG.POST_LIMIT}`,
            `${CONFIG.MOLTBOOK_API}/posts?sort=hot&limit=${CONFIG.POST_LIMIT}`,
        ];
        
        for (const url of endpoints) {
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${CONFIG.MOLTBOOK_KEY}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                const posts = extractPosts(data).map(formatMoltbookPost);
                
                if (posts.length > 0) {
                    state.newPosts = posts.slice(0, 5);
                    state.topPosts = posts.slice(5, 10);
                    state.hotPosts = posts.slice(10, 15);
                    updateAndRender();
                    console.log('✅ Moltbook API success');
                    return true;
                }
            }
        }
    } catch (e) {
        console.log('Moltbook failed:', e.message);
    }
    return false;
}

async function tryHackerNews() {
    try {
        // Fetch top, new, and best stories in parallel
        const [topIds, newIds, bestIds] = await Promise.all([
            fetch(`${CONFIG.HN_API}/topstories.json`).then(r => r.json()),
            fetch(`${CONFIG.HN_API}/newstories.json`).then(r => r.json()),
            fetch(`${CONFIG.HN_API}/beststories.json`).then(r => r.json())
        ]);
        
        // Get details for each category (5 each, in parallel)
        const [topPosts, newPosts, hotPosts] = await Promise.all([
            Promise.all(topIds.slice(0, 5).map(fetchHNItem)),
            Promise.all(newIds.slice(0, 5).map(fetchHNItem)),
            Promise.all(bestIds.slice(0, 5).map(fetchHNItem))
        ]);
        
        state.topPosts = topPosts.filter(Boolean);
        state.newPosts = newPosts.filter(Boolean);
        state.hotPosts = hotPosts.filter(Boolean);
        
        updateAndRender();
        console.log('✅ Hacker News API success');
        return true;
        
    } catch (e) {
        console.log('HN failed:', e.message);
        return false;
    }
}

async function fetchHNItem(id) {
    try {
        const item = await fetch(`${CONFIG.HN_API}/item/${id}.json`).then(r => r.json());
        if (!item || item.deleted || item.dead) return null;
        
        return {
            id: item.id,
            author: item.by || 'anonymous',
            avatar: `${CONFIG.FALLBACK_AVATAR}?seed=${item.by}`,
            content: item.title || item.text || '',
            upvotes: item.score || 0,
            comments: item.descendants || 0,
            timestamp: new Date(item.time * 1000).toISOString(),
            url: item.url || `https://news.ycombinator.com/item?id=${item.id}`
        };
    } catch {
        return null;
    }
}

function extractPosts(data) {
    if (Array.isArray(data)) return data;
    return data.posts || data.results || data.data || [];
}

function formatMoltbookPost(post) {
    return {
        id: post.id || Math.random().toString(36),
        author: post.author?.name || post.username || 'anonymous',
        avatar: post.author?.avatar_url || `${CONFIG.FALLBACK_AVATAR}?seed=${post.author?.name}`,
        content: post.content || post.title || post.text || '',
        upvotes: post.upvotes || post.score || 0,
        comments: post.comment_count || post.comments || 0,
        timestamp: post.created_at || new Date().toISOString()
    };
}

function updateAndRender() {
    const all = [...state.newPosts, ...state.topPosts, ...state.hotPosts];
    state.stats.agents = new Set(all.map(p => p.author)).size;
    state.stats.posts = all.length;
    state.stats.newCount = state.newPosts.length;
    
    animateNum($('agents-count'), state.stats.agents);
    animateNum($('posts-count'), state.stats.posts);
    animateNum($('new-count'), state.stats.newCount);
    
    renderAll();
    showContent();
}

function renderAll() {
    render('new-posts', filter(state.newPosts));
    render('top-posts', filter(state.topPosts));
    render('hot-posts', filter(state.hotPosts));
}

function filter(posts) {
    const kw = CONFIG.KEYWORDS[state.currentFilter];
    if (!kw || !kw.length) return posts;
    return posts.filter(p => kw.some(k => p.content.toLowerCase().includes(k.toLowerCase())));
}

function render(id, posts) {
    const el = $(id);
    if (!posts.length) {
        el.innerHTML = '<div class="empty-section">No posts</div>';
        return;
    }
    
    el.innerHTML = posts.map(p => `
        <article class="post-card" onclick="openPost('${p.id}')">
            <div class="post-header">
                <img src="${p.avatar}" class="post-avatar" onerror="this.src='${CONFIG.FALLBACK_AVATAR}?seed=x'">
                <div class="post-meta">
                    <div class="post-author">@${p.author}</div>
                    <div class="post-time">${timeAgo(p.timestamp)}</div>
                </div>
            </div>
            <div class="post-content">${esc(p.content)}</div>
            <div class="post-stats">
                <span class="post-stat"><span class="post-stat-value">${p.upvotes}</span> upvotes</span>
                <span class="post-stat"><span class="post-stat-value">${p.comments}</span> comments</span>
            </div>
        </article>
    `).join('');
}

window.openPost = function(id) {
    const all = [...state.newPosts, ...state.topPosts, ...state.hotPosts];
    const p = all.find(x => String(x.id) === String(id));
    if (!p) return;
    
    $('modal-avatar').src = p.avatar;
    $('modal-author').textContent = '@' + p.author;
    $('modal-time').textContent = timeAgo(p.timestamp);
    $('modal-content').textContent = p.content;
    $('modal-upvotes').textContent = p.upvotes;
    $('modal-comments').textContent = p.comments;
    $('post-modal').classList.remove('hidden');
};

function closeModal() {
    $('post-modal').classList.add('hidden');
}

function showLoading() {
    $('loading').classList.remove('hidden');
    $('error-state').classList.add('hidden');
    $('main-content').classList.add('hidden');
}

function showContent() {
    $('loading').classList.add('hidden');
    $('main-content').classList.remove('hidden');
}

function showError(msg) {
    $('loading').classList.add('hidden');
    $('error-state').classList.remove('hidden');
    $('error-msg').textContent = msg;
}

function animateNum(el, target) {
    const start = parseInt(el.textContent) || 0;
    const diff = target - start;
    let frame = 0;
    const frames = 20;
    
    const tick = () => {
        frame++;
        el.textContent = Math.round(start + diff * (frame / frames));
        if (frame < frames) requestAnimationFrame(tick);
        else el.textContent = target;
    };
    requestAnimationFrame(tick);
}

function timeAgo(ts) {
    const s = (Date.now() - new Date(ts)) / 1000;
    if (s < 60) return 'now';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    return Math.floor(s / 86400) + 'd';
}

function esc(t) {
    const d = document.createElement('div');
    d.textContent = t || '';
    return d.innerHTML;
}
