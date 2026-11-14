# Publishing QBasic Nexus

`.github/workflows/release.yml` publishes every release to the
**Visual Studio Marketplace** and the **Open VSX Registry** (used by VSCodium,
Cursor, Windsurf, Gitpod, Eclipse Theia), and attaches the `.vsix` to a GitHub
release. You set it up once by creating two tokens and storing them as
repository secrets.

## 1. Visual Studio Marketplace token (`VSCE_PAT`)

1. Sign in to <https://dev.azure.com> with the Microsoft account that owns the
   publisher `Thirawat27` (check at
   <https://marketplace.visualstudio.com/manage>). If you have no Azure DevOps
   organization yet, create one; it is free and only holds the token.
2. Open **User settings** (the person icon, top right) > **Personal access tokens** > **New Token**.
3. Fill in:
   - **Name**: `qbasic-nexus-release`
   - **Organization**: **All accessible organizations** (required; a single
     organization does not work for the Marketplace)
   - **Expiration**: up to one year (write the date down: the release fails when it expires)
   - **Scopes**: **Custom defined** > **Show all scopes** > **Marketplace** > tick **Manage**
4. **Create**, then copy the token. It is shown only once.
5. Optional local check: `npx vsce verify-pat Thirawat27 -p <token>`.

## 2. Open VSX token (`OVSX_PAT`)

1. Sign in to <https://open-vsx.org> with GitHub.
2. Open **Settings** (avatar) and sign the **Eclipse Foundation Publisher
   Agreement** (needs a free Eclipse account linked to the same GitHub user).
3. **Settings** > **Access Tokens** > **Generate New Token**, name it
   `qbasic-nexus-release`, and copy it.
4. The first time only, create the namespace that matches `publisher` in
   `package.json`:

   ```
   npx ovsx create-namespace Thirawat27 -p <token>
   ```

   To get the verified badge, claim the namespace afterwards (Open VSX issue
   tracker, "Claim namespace").

## 3. Store the tokens in GitHub

Repository **Settings** > **Secrets and variables** > **Actions** > **New repository secret**:

| Name | Value |
|---|---|
| `VSCE_PAT` | the Azure DevOps token |
| `OVSX_PAT` | the Open VSX token |

A registry whose secret is missing is skipped with a warning; the other one still publishes.

## 4. Release

1. Set `version` in `package.json` and add the entry to `CHANGELOG.md`.
2. Commit, then tag and push the tag (the tag must be `v` + the version):

   ```
   git tag v2.0.0
   git push origin v2.0.0
   ```

3. The **Release** workflow tests on Windows, Linux and macOS, packages the
   `.vsix`, publishes it to both registries and creates the GitHub release.

To try the pipeline without publishing, run **Actions** > **Release** >
**Run workflow** with **dry run** ticked; the `.vsix` is kept as a workflow
artifact. Ticking **pre-release** publishes to the pre-release channel of
both registries.

## Renewing a token

When a token expires the publish step fails with `401` / `Unauthorized`.
Create a new token as above and replace the secret; nothing else changes.
