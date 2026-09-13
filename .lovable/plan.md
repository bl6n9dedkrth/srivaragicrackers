# Diwali Catalogue Frontend

## Goal
Build a polished, mobile-first seasonal catalogue in a dark navy and warm gold visual system, with no checkout, payment, delivery, or regulated-product purchasing features.

## Pages
- **Home (`/`)** — festive image-led introduction, business placeholder, one catalogue CTA, category cards, featured products, short business story, and contact footer.
- **Catalogue (`/catalogue`)** — category filters, search, availability labels, and a responsive product grid linking to product pages.
- **Product details (`/products/:id`)** — large product image, name, price, description, category, availability, and catalogue return link.
- **Owner dashboard (`/admin`)** — overview counts, editable product list, add/edit form, image upload preview, delete controls, and availability switches; all demo-only in browser memory.

## Shared experience
- Responsive site navigation with a compact mobile menu.
- Reusable product/category data and consistent product cards.
- Keyboard-accessible controls, visible focus states, semantic headings, descriptive image text, and reduced-motion support.
- Restrained transitions and polished empty/search states.

## Visual system
- Deep navy surfaces, warm gold accents, ivory text, and restrained crimson/green status colors.
- Editorial serif display type paired with a clean sans-serif interface type.
- Fine borders, subtle festive line motifs, small corner radii, generous spacing, and premium product photography.
- Generate a cohesive set of Diwali catalogue images and store them locally for fast loading.

## Technical details
- Keep the existing TanStack Start routing and Tailwind v4 setup.
- Add separate route files with unique metadata for every page.
- Use URL search parameters for catalogue filtering and dynamic route parameters for product details.
- Keep admin interactions explicitly non-persistent and frontend-only.
- Verify representative desktop and mobile views, navigation, filtering, product links, and admin interactions.
