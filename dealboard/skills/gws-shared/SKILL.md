# GWS Shared Skills

## Authentication
All GWS CLI commands require authentication via `gws auth`. Run `gws auth status` to check.

## Output Format
All commands output JSON. Use `--json` flag for machine-readable output.

## Error Handling
On auth failure: exit code 1, stderr: "Authentication required"
On not found: exit code 0, stdout: `{"results": []}`
