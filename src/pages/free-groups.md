---
layout: ../layouts/Base.astro
page: freegroups
---

# free_groups_26

An open-source, typed Python module for investigating and manipulating free
groups, built as a research assistant to Dr. Nicholas Touikan in the
Department of Mathematics at UNB.

[Documentation](/free_groups_26/) · [Source](https://github.com/Sudhboi/free_groups_26)

## Algorithms

- Whitehead minimization and automorphic orbit search, built on numpy,
  networkx, sortedcontainers and scipy.
- Visualizations with matplotlib.

## Engineering

- Fully typed, and documented with Sphinx.
- Reproducible development environment with Nix devenv; published on PyPI
  with declarative dependency management.
- CI/CD with GitHub Actions: pytest and doctests on every change, and
  documentation that updates itself.
