Deployment guide (GitHub + Fly.io)

1) Clean embedded frontend repo (important):
   If `frontend` is a separate git repo, remove its `.git` so it becomes part of this repo:

   ```bash
   rm -rf frontend/.git
   git add frontend
   git commit -m "Include frontend in root repo"
   ```

2) Create GitHub repo and push (replace URL):

   ```bash
   git remote add origin https://github.com/<username>/<repo>.git
   git branch -M main
   git push -u origin main
   ```

3) Frontend -> GitHub Pages (automated):
   - The included GitHub Actions workflow `/.github/workflows/deploy-frontend.yml` builds `frontend` and publishes `frontend/build` to `gh-pages` on every push to `main`.
   - Make sure `frontend/package.json` has a `build` script (create-react-app typically has `npm run build`).

4) Backend -> Fly.io (free tier available):
   - Install `flyctl`: https://fly.io/docs/hands-on/install-flyctl/
   - Login & create app:

   ```bash
   fly auth signup   # or fly auth login
   fly launch --name my-diet-app --region sin
   ```

   - Set secrets (example):

   ```bash
   fly secrets set JWT_SECRET="your-secret" GEMINI_API_KEY="..." GEMINI_PLANNER_API_KEY="..." GEMINI_PANTRY_API_KEY="..."
   ```

   - Deploy (flyctl will build Dockerfile):

   ```bash
   fly deploy
   ```

5) After deploy:
   - Update frontend `REACT_APP_API_URL` environment variable in the build or use runtime config pointing to your Fly app URL (e.g. `https://my-diet-app.fly.dev`).
   - Ensure backend allows CORS from your Pages domain or allow all for testing.

6) Notes:
   - Do NOT commit `.env` or secrets to GitHub.
   - Fly.io free tier has resource limits; for light usage it's fine.
