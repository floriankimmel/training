"""CLI entry: `python -m training <command> [args]`. Commands are added per module."""
import sys

COMMANDS: dict[str, str] = {
    "insights": "training.insights",
    "lint": "training.lint",
    "page": "training.page",
    "zones": "training.zones",
}


def main(argv: list[str]) -> int:
    if not argv or argv[0] not in COMMANDS:
        print(f"usage: python -m training <{'|'.join(sorted(COMMANDS)) or 'command'}> ...", file=sys.stderr)
        return 2
    mod = __import__(COMMANDS[argv[0]], fromlist=["main"])
    return mod.main(argv[1:])


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
