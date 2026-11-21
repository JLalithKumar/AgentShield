import argparse
import json
import sys

from .policies import PolicySet
from .service import run_suite


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="python -m evaluation")
    ap.add_argument("scenarios", help="JSON file containing a list of scenarios")
    ap.add_argument("--policy", help="JSON policy config")
    ap.add_argument("--output", help="write report JSON here")
    args = ap.parse_args(argv)

    with open(args.scenarios, encoding="utf-8") as fh:
        scenarios = json.load(fh)
    policies = PolicySet.from_json_file(args.policy) if args.policy else PolicySet.default()
    report = run_suite(scenarios, policies)

    text = json.dumps(report, indent=2)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            fh.write(text)
    else:
        print(text)
    return 1 if report["release_blocked"] else 0


if __name__ == "__main__":
    sys.exit(main())