# OUTFYST — Launching Soon

Premium Indian streetwear for ambitious, self-made young people.  
**Earn Your Fit.**

---

## What is this?

A fully static, high-conversion "launching soon" landing page for **OUTFYST** — a premium Indian streetwear brand. The page captures interest registrations directly to your email via [Web3Forms](https://web3forms.com).

**Tech stack:** Pure HTML / CSS / JS. No frameworks. No build tools. No npm.

---

## Run Locally

**Option A — Just open the file:**
```
Open index.html in your browser
```

**Option B — Local server (recommended for full functionality):**
```bash
# Python 3
python -m http.server 8000

# Then open http://localhost:8000
```

---

## Set Up Form Submissions (60 seconds)

The registration form sends submissions directly to your email using **Web3Forms** (free, no account needed).

1. Go to [https://web3forms.com](https://web3forms.com)
2. Enter the email address where you want submissions to land
3. They'll email you an **access key** — copy it
4. Open `js/main.js` and find this line at the top:
   ```js
   const WEB3FORMS_ACCESS_KEY = 'YOUR_ACCESS_KEY_HERE';
   ```
5. Replace `YOUR_ACCESS_KEY_HERE` with your actual key
6. Save and deploy — submissions will land directly in your inbox

---

## Deploy

### Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New > Project**
3. Drag and drop the entire `outfyst` folder
4. Done — live in seconds

### Netlify
1. Go to [netlify.com](https://www.netlify.com) and sign in
2. Drag and drop the folder onto the deploy area
3. Done

### GitHub Pages
1. Push the repo to GitHub
2. Go to **Settings > Pages**
3. Set source to the `main` branch, root folder
4. Your site will be live at `https://username.github.io/repo-name`

---

## Customize

### Copy (text content)
All copy is in `index.html`. Edit the headlines, manifesto lines, product names, and form text directly.

### Colors
All colors are defined as CSS custom properties in `css/style.css` under `:root`. Change them there:
```css
:root {
  --black:      #000000;
  --off-white:  #F5F5F5;
  --dark-grey:  #1A1A1A;
  --grey-2A:    #2A2A2A;
  --grey-555:   #555555;
  --grey-888:   #888888;
  --silver:     #C0C0C0;
  --red:        #8B0000;
}
```

### Product Names
Find the product cards in `index.html` and update:
```html
<p class="product-card__name">THE FOUNDATION TEE</p>
```

### Social Links
Update the `href="#"` values in the footer to your actual social URLs.

---

## Project Structure

```
outfyst/
  index.html          Main page
  css/
    style.css         All styles (design tokens, layout, responsive)
  js/
    main.js           Animations, form handler, custom cursor
  assets/             Empty — for future product images
  README.md           This file
```

---

## Features

- Fully responsive (mobile, tablet, desktop)
- Custom cursor with hover scaling (desktop only)
- Scroll-triggered manifesto animations (IntersectionObserver)
- Hero entrance animations with stagger
- Form with inline success/error states
- Respects `prefers-reduced-motion`
- Semantic HTML with full accessibility
- Zero dependencies, zero build step
- Under 200KB total page weight
- WCAG AA color contrast compliance

---

**OUTFYST** — Built in India.
