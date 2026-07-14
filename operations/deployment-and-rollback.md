# Production deployment and rollback

## Normal release path

1. Merge a reviewed pull request into `main` only after **Site quality** passes.
2. The **Deploy generated site to Pages** workflow checks the source again, builds `_site`, validates routes and links, deploys the Pages artifact and runs live smoke tests.
3. Treat a release as complete only when the deployment and smoke-test jobs both pass.
4. Keep the repository's Pages source set to **GitHub Actions** (`build_type: workflow`). Legacy branch publishing must remain disabled so raw source cannot overwrite the generated artifact.
5. After a successful deployment, the **IndexNow ping** workflow verifies the public ownership key, reads the deployed sitemap and submits those live URLs.

## Fast rollback

Use a revert pull request rather than rewriting `main` history.

1. Identify the last known-good merge commit in GitHub.
2. Revert the faulty merge commit using GitHub's **Revert** action, or create a branch that reverses only the faulty changes.
3. Let **Site quality** pass on the revert pull request.
4. Merge the revert. The Pages workflow will rebuild and redeploy the previous state automatically.
5. Verify the homepage, `/services/`, `/tools/`, `/contact/`, `/privacy/` and one insight article after deployment.

## Emergency deployment retry

If the source is correct but the Pages deployment fails because of a transient GitHub or network problem:

1. Open the failed **Deploy generated site to Pages** workflow run.
2. Re-run the failed jobs once.
3. Do not make an empty commit merely to trigger another deployment.
4. If the retry fails, inspect the build, deploy and smoke-test job separately before changing source.

## Safety rules

- Do not deploy directly from a developer workstation.
- Do not upload a hand-edited `_site` directory.
- Do not force-push `main` to roll back.
- Do not bypass build checks for content-only changes; templates and data can affect every route.
- Preserve `CNAME` in the generated artifact so the custom domain remains attached.
- Preserve the IndexNow ownership file in the generated artifact; its contents must exactly match its filename without the `.txt` suffix.
- Never enable legacy branch publishing alongside the generated Pages workflow. Two active publishers can race and expose stale source HTML.
- Never place secrets, private client files or internal operational data in the public repository or Pages artifact.
