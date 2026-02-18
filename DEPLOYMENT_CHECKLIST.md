# Deployment checklist (Filmhouse)

## Domain sanity check (must do before declaring "deployed")

- Verify custom domain aliases point to the intended production deployment:
  - `vercel alias list | head -n 30`
  - Confirm `filmhousesg.xyz` and `www.filmhousesg.xyz` source matches the intended project/deployment.

- Verify runtime headers from the live domain:
  - `curl -sI https://www.filmhousesg.xyz | egrep -i "server|x-vercel-id|x-vercel-cache|date"`

- If wrong, fix immediately:
  - `vercel alias remove www.filmhousesg.xyz --non-interactive`
  - `vercel alias remove filmhousesg.xyz --non-interactive`
  - `vercel alias set <deployment-url> www.filmhousesg.xyz --non-interactive`
  - `vercel alias set <deployment-url> filmhousesg.xyz --non-interactive`

## Post-deploy smoke

- Check backend health:
  - `curl -s https://backend-production-113d.up.railway.app/health`

- Check key user paths:
  - homepage loads
  - poster URLs resolve (including `/uploads/...`)
  - Stripe success redirect shows booking
