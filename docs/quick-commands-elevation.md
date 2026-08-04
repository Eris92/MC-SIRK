# Elevated Desktop Quick commands

Interactive Quick commands cannot be elevated by changing a scheduled task from `RunLevel Limited` to `Highest` when the logged-on user is a standard user. `Highest` only selects the highest token already available to that account.

SIRK therefore sends the launcher through MeshAgent with `runAsUser: 0`. MeshAgent executes it in the service context. On Windows, the launcher:

1. locates the `winlogon.exe` instance in the logged-on user's session;
2. duplicates its LocalSystem primary token;
3. starts the requested application with `CreateProcessAsUser` on `winsta0\\default`;
4. leaves background/non-interactive commands unchanged.

The launcher refuses execution when MeshAgent is not running as LocalSystem instead of falsely reporting elevation.
