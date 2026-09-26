---
layout: ../layouts/Base.astro
page: projects
---

# Projects

## [free_groups_26](/free-groups/)

<p class="meta">May 2026 – present</p>

A typed `Python` module for computing with free groups: Whitehead minimization,
automorphic orbit search, and visualizations. Built for research in the
Department of Mathematics at UNB.

## [Hext](https://github.com/Sudhboi/hext): a Haskell text editor

<p class="meta">August 2026</p>

- A terminal text editor built on `vty` around a pure functional core, with
  rendering, input handling and editor state in separate modules that are
  tested independently.
- Editor state (cursor, buffer, viewport) is an immutable record updated
  through lenses generated with `Template Haskell`, rather than by hand,
  field by field.

## [NixOS configuration](https://github.com/Sudhboi/nixos-public)

<p class="meta">January 2026 – present</p>

- Modular, declarative `NixOS` configurations deployed across several machines,
  using flakes and `Home Manager` to reproduce system configuration, user
  environments and applications.
- Custom `Nix` derivations for packages missing from `nixpkgs`, from build inputs
  and compilation steps to installation.

## Neural network from first principles

<p class="meta">May 2026</p>

- A configurable multilayer perceptron in `Python`, with nothing but `numpy`
  for the matrix arithmetic.
- Forward propagation, backpropagation, activation functions and their
  derivatives, and layer-wise gradients, all derived by hand, trained with
  gradient descent.

## [Lambda calculus interpreter](/lambda/)

<p class="meta">In progress</p>

An interactive interpreter that shows β-reduction one step at a time.
