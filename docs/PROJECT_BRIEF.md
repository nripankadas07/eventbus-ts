        # Project Brief

        eventbus-ts exists to solve a narrow, inspectable developer-tooling problem:
        Type-safe pub-sub bus with dotted topics and */**/? glob subscriptions, handler-error isolation, snapshot dispatch.

        ## Portfolio Role

        This repository is part of the local-first engineering portfolio around
        agentic AI infrastructure, evaluation, parsing, safety boundaries, and
        small tools that can be understood from a fresh source checkout. It is not
        here to inflate repository count; it should either provide a reusable
        primitive, a benchmark surface, or a concrete local workflow.

        Topics: event-bus, pubsub, type-safe, typescript, zero-dependencies

        ## Current Gates

        - Latest completed CI: success
        - Source files counted by audit: 6
        - Test files counted by audit: 4
        - Latest release: not release-tracked yet
        - License: MIT

        ## Upgrade Path

        - Add type-level examples that prove the public API shape in editor-visible code.
- Add edge-case tests for async behavior, cancellation, inference, or numeric precision where relevant.
- Document package boundaries and benchmark any hot path before adding abstraction.

        ## Reviewer Contract

        A serious reviewer should be able to clone the repository, read the
        README and this brief, run the tests, and understand exactly what is
        claimed. Future work should prefer deeper correctness, better fixtures,
        clearer limits, and stronger local demos over broad feature lists.
