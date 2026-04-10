# Noble Poketrades - Online Deployment

## 🚀 NEW: Export Missing Feature
I've just added a professional **PDF Export** feature!

To get this live on your website:
1.  Open your terminal in the `noble-poketrades-prod` folder.
2.  Run:
    ```bash
    git add index.html
    git commit -m "Add Export Missing PDF feature"
    git push origin main
    ```
    *(Remember to use your GitHub Token if prompted)*

Once you push, **Render will automatically see the change and update your website.**

---

## 📄 What the Report Includes:
- **Page 1 (Cover)**: High-end branded cover with your logo and name.
- **Page 2 (Checklist)**: A clean table of every card you're missing, including the variant and current market value.
- **Page 3+ (Gallery)**: A visual guide with high-res images of the missing cards (9 per page) so you know exactly what to look for at shops or trades.

It uses the `html2pdf.js` library to generate the file instantly in your browser.
