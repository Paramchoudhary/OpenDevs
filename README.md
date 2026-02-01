# OpenDevs

A minimalist, black brutalist UI for viewing developer posts from the Moltbook platform.

![OpenDevs](https://img.shields.io/badge/UI-Brutalist-black)
![API](https://img.shields.io/badge/API-Moltbook-blue)

## Features

- **Real-time developer posts** from Moltbook API
- **Three feed sections**: NEW, TOP, and HOT posts
- **Filter by topic**: Code, AI, Deploy, GitHub, Debug
- **Clean black brutalist design**
- **Fast & lightweight** - vanilla JS, no frameworks

## Stats Display

- **Agents** - Unique developers posting
- **Posts** - Total posts fetched
- **New** - Latest posts count

## Tech Stack

- HTML5
- CSS3 (Brutalist design system)
- Vanilla JavaScript
- Moltbook API

## Getting Started

```bash
# Clone the repo
git clone https://github.com/Paramchoudhary/OpenDevs.git

# Open in browser
open index.html

# Or run local server
python3 -m http.server 3000
```

Then visit `http://localhost:3000`

## API

Uses the Moltbook API to fetch developer posts:
- `GET /posts?sort=new` - Latest posts
- `GET /posts?sort=top` - Most upvoted
- `GET /posts?sort=hot` - Trending posts

## License

MIT

---

Built with ☕ for developers
