# Shell command tests

Open `tests/dashboard.html` through a local HTTP server to run the dashboard checks in a browser. The page reports whether date ordering, advisory grouping, missing dates, filtering, CSV export, reset, and older TSV files work.

Run `node tests/shells.cjs bash` from the repository. Replace `bash` with `fish`, `zsh`, `powershell`, `windows-powershell`, `cmd`, or `git-bash` to test another shell. Install Node.js, GitHub CLI, and the shell being tested. Set `PS_LEGACY=1` to exercise legacy PowerShell argument handling.

Windows tests run from a Visual Studio developer prompt so the runner can compile the native GitHub CLI adapter. Git Bash uses the Git for Windows installation under Program Files. Set `GIT_BASH` to use a different Bash executable.

The tests generate the same command shown in the dashboard and run it in a temporary directory whose path contains a space. A local HTTP server supplies repository and alert fixtures. The adapter directs GitHub CLI to that server, so its real pagination and built-in JSON filtering run without GitHub credentials or network requests to GitHub.

Checks cover multiple repositories, pagination, denied alert access, empty accounts, missing optional fields, and UTF-8 text containing quotes, backslashes, tabs, and line breaks. Output must match the expected TSV exactly.

The GitHub Action runs Bash, fish, Zsh, and PowerShell on Linux, plus Windows PowerShell 5.1, PowerShell, CMD, and Git Bash on Windows. A macOS job tests Zsh, its default shell. Local container checks can run the same Node command after installing the required tools. CMD can also run under Wine with `TEST_WINE=1`, `MOCK_GH_DIR` pointing to a compiled adapter, and `REAL_GH` pointing to the Windows GitHub CLI executable.
