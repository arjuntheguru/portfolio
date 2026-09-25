# arjunsubedi.com

Personal site, built with [Astro](https://astro.build) and served as static files by nginx on Kubernetes.

## Editing content

| What | Where |
| --- | --- |
| Name, bio, email, links, skills, certifications, terminal system info | `src/data/profile.ts` |
| Jobs and education (one YAML file each) | `src/content/experience/` |
| Projects | `src/content/projects/` |
| Portrait | replace `scripts/portrait.jpg`, adjust the crop in `scripts/dither-portrait.mjs`, run `npm run portrait` |

Each experience file has a `commit` block that places it in the git graph. `order` sets the row (1 is the top).
`lane: 0` puts it on main; consecutive `lane: 1` entries form a branch that forks from the main commit below them and merges into the main commit above them.

## Commands

```sh
npm install
npm run dev       # http://localhost:4321
npm run check     # type-check .astro and .ts files
npm run build     # static output in dist/
```

## Pages

- `/` is the site. Press <kbd>`</kbd> or open `/#terminal` for the terminal.
- `404.html` is served by the site's nginx for unknown paths, with a real 404 status.
- `503.html` is served by the site's nginx for its own 5xx errors. It has no external files, so it works when nothing else can load.

## Deploying

The image serves the site on port 80 (`nginx/site.conf`).

```sh
docker build -t arjuntheguru/portfolio:latest .
docker push arjuntheguru/portfolio:latest
kubectl apply -f k8s/
kubectl -n personal-site rollout restart deploy/personal-site-deployment
```

The cluster is MicroK8s with the NGINX ingress controller (class `public`). The site answers its own 404s and 5xx errors. If it has no ready pods at all, the cluster's default backend answers.

`k8s/cluster/error-pages.yml` is the cluster-wide fallback page service. The ingress controller points at it for every site on the cluster, so it is kept separate from the site's own manifests. Apply it on purpose, not as part of a site deploy.
