# Changelog

## [0.9.1-next.2](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.9.1-next.1...auditable-item-graph-rest-client-v0.9.1-next.2) (2026-06-29)


### Features

* enhanced rest testing ([#119](https://github.com/iotaledger/twin-auditable-item-graph/issues/119)) ([11f5653](https://github.com/iotaledger/twin-auditable-item-graph/commit/11f5653d297066983b5787429a262eca6a6f3fa7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.9.1-next.1 to 0.9.1-next.2

## [0.9.1-next.1](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.9.1-next.0...auditable-item-graph-rest-client-v0.9.1-next.1) (2026-06-26)


### Features

* add context id features ([#30](https://github.com/iotaledger/twin-auditable-item-graph/issues/30)) ([a35d37c](https://github.com/iotaledger/twin-auditable-item-graph/commit/a35d37c0db62a240adde493965c0a9f7971fec45))
* add unique flag for alias, and exact match option for id query ([33dbd19](https://github.com/iotaledger/twin-auditable-item-graph/commit/33dbd19cabd9fbfaba81032f1d1a6527584c3f5a))
* add validate-locales ([e76e6f6](https://github.com/iotaledger/twin-auditable-item-graph/commit/e76e6f6b3ec9c447a04315d353442e32233601d3))
* add versions ([#60](https://github.com/iotaledger/twin-auditable-item-graph/issues/60)) ([5c36f94](https://github.com/iotaledger/twin-auditable-item-graph/commit/5c36f94b1155c01dddbc8d62f3f65d599916c521))
* add vertex validation ([#54](https://github.com/iotaledger/twin-auditable-item-graph/issues/54)) ([d3ef124](https://github.com/iotaledger/twin-auditable-item-graph/commit/d3ef1241f60956dc296e22d063f188921255d68c))
* additional query conditions ([#100](https://github.com/iotaledger/twin-auditable-item-graph/issues/100)) ([4fc6b7a](https://github.com/iotaledger/twin-auditable-item-graph/commit/4fc6b7afd7a854806537954fcd334619304da49c))
* changeset endpoints ([#44](https://github.com/iotaledger/twin-auditable-item-graph/issues/44)) ([7c854de](https://github.com/iotaledger/twin-auditable-item-graph/commit/7c854de39b247d6f24cd94a04a9f99fa9edde51d))
* eslint migration to flat config ([1b42a3a](https://github.com/iotaledger/twin-auditable-item-graph/commit/1b42a3a27bd6e32d7816de406b92b6332472edf6))
* id optional in edge updates ([6b63fe3](https://github.com/iotaledger/twin-auditable-item-graph/commit/6b63fe34553104843ae15aa5066775f5872859e9))
* improved versioning ([#66](https://github.com/iotaledger/twin-auditable-item-graph/issues/66)) ([1b497cd](https://github.com/iotaledger/twin-auditable-item-graph/commit/1b497cdc88eec9b6707b097283773e109baae3aa))
* replace nextItem property with Link header ([#39](https://github.com/iotaledger/twin-auditable-item-graph/issues/39)) ([b29a333](https://github.com/iotaledger/twin-auditable-item-graph/commit/b29a333ca78ca2091e54e3e6f4355f84c350007d))
* rest client expose remove verifiable ([a22a743](https://github.com/iotaledger/twin-auditable-item-graph/commit/a22a743ddc39377630ea0a51ca3f6e97890832c9))
* typescript 6 update ([2483c31](https://github.com/iotaledger/twin-auditable-item-graph/commit/2483c3171cff4c5ecedc83d958ab551291a4a487))
* update background task service ([e483ddb](https://github.com/iotaledger/twin-auditable-item-graph/commit/e483ddbc948f035334f92b8342248caa6abbe441))
* update dependencies ([6986689](https://github.com/iotaledger/twin-auditable-item-graph/commit/698668957a1fcb7f85ce2f117914d5980043924f))
* update edges to use targetId instead of id ([6c5d0e3](https://github.com/iotaledger/twin-auditable-item-graph/commit/6c5d0e31b6e2ea74bfa2f3344e4be628e5f237af))
* update framework core ([88ad4e6](https://github.com/iotaledger/twin-auditable-item-graph/commit/88ad4e6421132c3c6c45579b078d982a26f16990))
* update immutable proof usage ([#73](https://github.com/iotaledger/twin-auditable-item-graph/issues/73)) ([a5181d1](https://github.com/iotaledger/twin-auditable-item-graph/commit/a5181d172cbc492c7cc964d22724cc10c46fc52e))
* use new nameof operators ([3921c4c](https://github.com/iotaledger/twin-auditable-item-graph/commit/3921c4c9ac53e42459e45f10d9e702afb2797a23))
* use shared store mechanism ([#10](https://github.com/iotaledger/twin-auditable-item-graph/issues/10)) ([da035e5](https://github.com/iotaledger/twin-auditable-item-graph/commit/da035e5eb8f157482b4eb2bdbc689c6c0647ff7d))


### Bug Fixes

* implement removeProof on AuditableItemGraphRestClient and expose DELETE /:id/proof route ([#85](https://github.com/iotaledger/twin-auditable-item-graph/issues/85)) ([ed74458](https://github.com/iotaledger/twin-auditable-item-graph/commit/ed74458aff9bc8606b75657a7bff15af4884189e))
* incremental edge merge and per-vertex update queue ([#70](https://github.com/iotaledger/twin-auditable-item-graph/issues/70)) ([91eb51d](https://github.com/iotaledger/twin-auditable-item-graph/commit/91eb51d135d2e609eebce90de099670f08eb20ca))
* only include alias in index if not deleted ([#6](https://github.com/iotaledger/twin-auditable-item-graph/issues/6)) ([5da3c41](https://github.com/iotaledger/twin-auditable-item-graph/commit/5da3c419fafa2afefd34b1c570d103012b888a75))
* query params force coercion ([2dd9afe](https://github.com/iotaledger/twin-auditable-item-graph/commit/2dd9afe9ec37e2a91c110317fe289f7495c187a0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.9.1-next.0 to 0.9.1-next.1

## [0.9.0](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.9.0...auditable-item-graph-rest-client-v0.9.0) (2026-06-25)


### Features

* release to production ([0ce06f7](https://github.com/iotaledger/twin-auditable-item-graph/commit/0ce06f7825aa72d04b7a2ffd8c98cb56290b9d16))
* release to production ([#110](https://github.com/iotaledger/twin-auditable-item-graph/issues/110)) ([3117da3](https://github.com/iotaledger/twin-auditable-item-graph/commit/3117da373b462d1c8dcb7e1416bcb223f2a28664))
* release to production ([#113](https://github.com/iotaledger/twin-auditable-item-graph/issues/113)) ([4efe407](https://github.com/iotaledger/twin-auditable-item-graph/commit/4efe40774803f01eb70043b8cfd607e8c050bc64))

## [0.9.0-next.2](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.9.0-next.1...auditable-item-graph-rest-client-v0.9.0-next.2) (2026-06-25)


### Features

* additional query conditions ([#100](https://github.com/iotaledger/twin-auditable-item-graph/issues/100)) ([4fc6b7a](https://github.com/iotaledger/twin-auditable-item-graph/commit/4fc6b7afd7a854806537954fcd334619304da49c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.9.0-next.1 to 0.9.0-next.2

## [0.9.0-next.1](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.9.0-next.0...auditable-item-graph-rest-client-v0.9.0-next.1) (2026-06-24)


### Features

* add context id features ([#30](https://github.com/iotaledger/twin-auditable-item-graph/issues/30)) ([a35d37c](https://github.com/iotaledger/twin-auditable-item-graph/commit/a35d37c0db62a240adde493965c0a9f7971fec45))
* add unique flag for alias, and exact match option for id query ([33dbd19](https://github.com/iotaledger/twin-auditable-item-graph/commit/33dbd19cabd9fbfaba81032f1d1a6527584c3f5a))
* add validate-locales ([e76e6f6](https://github.com/iotaledger/twin-auditable-item-graph/commit/e76e6f6b3ec9c447a04315d353442e32233601d3))
* add versions ([#60](https://github.com/iotaledger/twin-auditable-item-graph/issues/60)) ([5c36f94](https://github.com/iotaledger/twin-auditable-item-graph/commit/5c36f94b1155c01dddbc8d62f3f65d599916c521))
* add vertex validation ([#54](https://github.com/iotaledger/twin-auditable-item-graph/issues/54)) ([d3ef124](https://github.com/iotaledger/twin-auditable-item-graph/commit/d3ef1241f60956dc296e22d063f188921255d68c))
* changeset endpoints ([#44](https://github.com/iotaledger/twin-auditable-item-graph/issues/44)) ([7c854de](https://github.com/iotaledger/twin-auditable-item-graph/commit/7c854de39b247d6f24cd94a04a9f99fa9edde51d))
* eslint migration to flat config ([1b42a3a](https://github.com/iotaledger/twin-auditable-item-graph/commit/1b42a3a27bd6e32d7816de406b92b6332472edf6))
* id optional in edge updates ([6b63fe3](https://github.com/iotaledger/twin-auditable-item-graph/commit/6b63fe34553104843ae15aa5066775f5872859e9))
* improved versioning ([#66](https://github.com/iotaledger/twin-auditable-item-graph/issues/66)) ([1b497cd](https://github.com/iotaledger/twin-auditable-item-graph/commit/1b497cdc88eec9b6707b097283773e109baae3aa))
* replace nextItem property with Link header ([#39](https://github.com/iotaledger/twin-auditable-item-graph/issues/39)) ([b29a333](https://github.com/iotaledger/twin-auditable-item-graph/commit/b29a333ca78ca2091e54e3e6f4355f84c350007d))
* rest client expose remove verifiable ([a22a743](https://github.com/iotaledger/twin-auditable-item-graph/commit/a22a743ddc39377630ea0a51ca3f6e97890832c9))
* typescript 6 update ([2483c31](https://github.com/iotaledger/twin-auditable-item-graph/commit/2483c3171cff4c5ecedc83d958ab551291a4a487))
* update background task service ([e483ddb](https://github.com/iotaledger/twin-auditable-item-graph/commit/e483ddbc948f035334f92b8342248caa6abbe441))
* update dependencies ([6986689](https://github.com/iotaledger/twin-auditable-item-graph/commit/698668957a1fcb7f85ce2f117914d5980043924f))
* update edges to use targetId instead of id ([6c5d0e3](https://github.com/iotaledger/twin-auditable-item-graph/commit/6c5d0e31b6e2ea74bfa2f3344e4be628e5f237af))
* update framework core ([88ad4e6](https://github.com/iotaledger/twin-auditable-item-graph/commit/88ad4e6421132c3c6c45579b078d982a26f16990))
* update immutable proof usage ([#73](https://github.com/iotaledger/twin-auditable-item-graph/issues/73)) ([a5181d1](https://github.com/iotaledger/twin-auditable-item-graph/commit/a5181d172cbc492c7cc964d22724cc10c46fc52e))
* use new nameof operators ([3921c4c](https://github.com/iotaledger/twin-auditable-item-graph/commit/3921c4c9ac53e42459e45f10d9e702afb2797a23))
* use shared store mechanism ([#10](https://github.com/iotaledger/twin-auditable-item-graph/issues/10)) ([da035e5](https://github.com/iotaledger/twin-auditable-item-graph/commit/da035e5eb8f157482b4eb2bdbc689c6c0647ff7d))


### Bug Fixes

* implement removeProof on AuditableItemGraphRestClient and expose DELETE /:id/proof route ([#85](https://github.com/iotaledger/twin-auditable-item-graph/issues/85)) ([ed74458](https://github.com/iotaledger/twin-auditable-item-graph/commit/ed74458aff9bc8606b75657a7bff15af4884189e))
* incremental edge merge and per-vertex update queue ([#70](https://github.com/iotaledger/twin-auditable-item-graph/issues/70)) ([91eb51d](https://github.com/iotaledger/twin-auditable-item-graph/commit/91eb51d135d2e609eebce90de099670f08eb20ca))
* only include alias in index if not deleted ([#6](https://github.com/iotaledger/twin-auditable-item-graph/issues/6)) ([5da3c41](https://github.com/iotaledger/twin-auditable-item-graph/commit/5da3c419fafa2afefd34b1c570d103012b888a75))
* query params force coercion ([2dd9afe](https://github.com/iotaledger/twin-auditable-item-graph/commit/2dd9afe9ec37e2a91c110317fe289f7495c187a0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.9.0-next.0 to 0.9.0-next.1

## [0.0.3-next.25](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.24...auditable-item-graph-rest-client-v0.0.3-next.25) (2026-06-19)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.24 to 0.0.3-next.25

## [0.0.3-next.24](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.23...auditable-item-graph-rest-client-v0.0.3-next.24) (2026-06-18)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.23 to 0.0.3-next.24

## [0.0.3-next.23](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.22...auditable-item-graph-rest-client-v0.0.3-next.23) (2026-06-11)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.22 to 0.0.3-next.23

## [0.0.3-next.22](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.21...auditable-item-graph-rest-client-v0.0.3-next.22) (2026-06-09)


### Bug Fixes

* implement removeProof on AuditableItemGraphRestClient and expose DELETE /:id/proof route ([#85](https://github.com/iotaledger/twin-auditable-item-graph/issues/85)) ([ed74458](https://github.com/iotaledger/twin-auditable-item-graph/commit/ed74458aff9bc8606b75657a7bff15af4884189e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.21 to 0.0.3-next.22

## [0.0.3-next.21](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.20...auditable-item-graph-rest-client-v0.0.3-next.21) (2026-06-03)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.20 to 0.0.3-next.21

## [0.0.3-next.20](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.19...auditable-item-graph-rest-client-v0.0.3-next.20) (2026-06-03)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.19 to 0.0.3-next.20

## [0.0.3-next.19](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.18...auditable-item-graph-rest-client-v0.0.3-next.19) (2026-06-02)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.18 to 0.0.3-next.19

## [0.0.3-next.18](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.17...auditable-item-graph-rest-client-v0.0.3-next.18) (2026-05-29)


### Features

* update immutable proof usage ([#73](https://github.com/iotaledger/twin-auditable-item-graph/issues/73)) ([a5181d1](https://github.com/iotaledger/twin-auditable-item-graph/commit/a5181d172cbc492c7cc964d22724cc10c46fc52e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.17 to 0.0.3-next.18

## [0.0.3-next.17](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.16...auditable-item-graph-rest-client-v0.0.3-next.17) (2026-05-27)


### Bug Fixes

* incremental edge merge and per-vertex update queue ([#70](https://github.com/iotaledger/twin-auditable-item-graph/issues/70)) ([91eb51d](https://github.com/iotaledger/twin-auditable-item-graph/commit/91eb51d135d2e609eebce90de099670f08eb20ca))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.16 to 0.0.3-next.17

## [0.0.3-next.16](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.15...auditable-item-graph-rest-client-v0.0.3-next.16) (2026-05-22)


### Features

* improved versioning ([#66](https://github.com/iotaledger/twin-auditable-item-graph/issues/66)) ([1b497cd](https://github.com/iotaledger/twin-auditable-item-graph/commit/1b497cdc88eec9b6707b097283773e109baae3aa))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.15 to 0.0.3-next.16

## [0.0.3-next.15](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.14...auditable-item-graph-rest-client-v0.0.3-next.15) (2026-05-20)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.14 to 0.0.3-next.15

## [0.0.3-next.14](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.13...auditable-item-graph-rest-client-v0.0.3-next.14) (2026-05-18)


### Features

* add versions ([#60](https://github.com/iotaledger/twin-auditable-item-graph/issues/60)) ([5c36f94](https://github.com/iotaledger/twin-auditable-item-graph/commit/5c36f94b1155c01dddbc8d62f3f65d599916c521))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.13 to 0.0.3-next.14

## [0.0.3-next.13](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.12...auditable-item-graph-rest-client-v0.0.3-next.13) (2026-05-12)


### Features

* typescript 6 update ([2483c31](https://github.com/iotaledger/twin-auditable-item-graph/commit/2483c3171cff4c5ecedc83d958ab551291a4a487))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.12 to 0.0.3-next.13

## [0.0.3-next.12](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.11...auditable-item-graph-rest-client-v0.0.3-next.12) (2026-03-24)


### Features

* add vertex validation ([#54](https://github.com/iotaledger/twin-auditable-item-graph/issues/54)) ([d3ef124](https://github.com/iotaledger/twin-auditable-item-graph/commit/d3ef1241f60956dc296e22d063f188921255d68c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.11 to 0.0.3-next.12

## [0.0.3-next.11](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.10...auditable-item-graph-rest-client-v0.0.3-next.11) (2026-02-25)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.10 to 0.0.3-next.11

## [0.0.3-next.10](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.9...auditable-item-graph-rest-client-v0.0.3-next.10) (2026-02-24)


### Features

* add context id features ([#30](https://github.com/iotaledger/twin-auditable-item-graph/issues/30)) ([a35d37c](https://github.com/iotaledger/twin-auditable-item-graph/commit/a35d37c0db62a240adde493965c0a9f7971fec45))
* add unique flag for alias, and exact match option for id query ([33dbd19](https://github.com/iotaledger/twin-auditable-item-graph/commit/33dbd19cabd9fbfaba81032f1d1a6527584c3f5a))
* add validate-locales ([e76e6f6](https://github.com/iotaledger/twin-auditable-item-graph/commit/e76e6f6b3ec9c447a04315d353442e32233601d3))
* changeset endpoints ([#44](https://github.com/iotaledger/twin-auditable-item-graph/issues/44)) ([7c854de](https://github.com/iotaledger/twin-auditable-item-graph/commit/7c854de39b247d6f24cd94a04a9f99fa9edde51d))
* eslint migration to flat config ([1b42a3a](https://github.com/iotaledger/twin-auditable-item-graph/commit/1b42a3a27bd6e32d7816de406b92b6332472edf6))
* id optional in edge updates ([6b63fe3](https://github.com/iotaledger/twin-auditable-item-graph/commit/6b63fe34553104843ae15aa5066775f5872859e9))
* replace nextItem property with Link header ([#39](https://github.com/iotaledger/twin-auditable-item-graph/issues/39)) ([b29a333](https://github.com/iotaledger/twin-auditable-item-graph/commit/b29a333ca78ca2091e54e3e6f4355f84c350007d))
* rest client expose remove verifiable ([a22a743](https://github.com/iotaledger/twin-auditable-item-graph/commit/a22a743ddc39377630ea0a51ca3f6e97890832c9))
* update background task service ([e483ddb](https://github.com/iotaledger/twin-auditable-item-graph/commit/e483ddbc948f035334f92b8342248caa6abbe441))
* update dependencies ([6986689](https://github.com/iotaledger/twin-auditable-item-graph/commit/698668957a1fcb7f85ce2f117914d5980043924f))
* update edges to use targetId instead of id ([6c5d0e3](https://github.com/iotaledger/twin-auditable-item-graph/commit/6c5d0e31b6e2ea74bfa2f3344e4be628e5f237af))
* update framework core ([88ad4e6](https://github.com/iotaledger/twin-auditable-item-graph/commit/88ad4e6421132c3c6c45579b078d982a26f16990))
* use new nameof operators ([3921c4c](https://github.com/iotaledger/twin-auditable-item-graph/commit/3921c4c9ac53e42459e45f10d9e702afb2797a23))
* use shared store mechanism ([#10](https://github.com/iotaledger/twin-auditable-item-graph/issues/10)) ([da035e5](https://github.com/iotaledger/twin-auditable-item-graph/commit/da035e5eb8f157482b4eb2bdbc689c6c0647ff7d))


### Bug Fixes

* only include alias in index if not deleted ([#6](https://github.com/iotaledger/twin-auditable-item-graph/issues/6)) ([5da3c41](https://github.com/iotaledger/twin-auditable-item-graph/commit/5da3c419fafa2afefd34b1c570d103012b888a75))
* query params force coercion ([2dd9afe](https://github.com/iotaledger/twin-auditable-item-graph/commit/2dd9afe9ec37e2a91c110317fe289f7495c187a0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.9 to 0.0.3-next.10

## [0.0.3-next.9](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.8...auditable-item-graph-rest-client-v0.0.3-next.9) (2026-02-23)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.8 to 0.0.3-next.9

## [0.0.3-next.8](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.7...auditable-item-graph-rest-client-v0.0.3-next.8) (2026-02-11)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.7 to 0.0.3-next.8

## [0.0.3-next.7](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.6...auditable-item-graph-rest-client-v0.0.3-next.7) (2026-02-11)


### Features

* changeset endpoints ([#44](https://github.com/iotaledger/twin-auditable-item-graph/issues/44)) ([7c854de](https://github.com/iotaledger/twin-auditable-item-graph/commit/7c854de39b247d6f24cd94a04a9f99fa9edde51d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.6 to 0.0.3-next.7

## [0.0.3-next.6](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.5...auditable-item-graph-rest-client-v0.0.3-next.6) (2026-01-26)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.5 to 0.0.3-next.6

## [0.0.3-next.5](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.4...auditable-item-graph-rest-client-v0.0.3-next.5) (2026-01-23)


### Features

* replace nextItem property with Link header ([#39](https://github.com/iotaledger/twin-auditable-item-graph/issues/39)) ([b29a333](https://github.com/iotaledger/twin-auditable-item-graph/commit/b29a333ca78ca2091e54e3e6f4355f84c350007d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.4 to 0.0.3-next.5

## [0.0.3-next.4](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.3...auditable-item-graph-rest-client-v0.0.3-next.4) (2026-01-22)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.3 to 0.0.3-next.4

## [0.0.3-next.3](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.2...auditable-item-graph-rest-client-v0.0.3-next.3) (2026-01-21)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.2 to 0.0.3-next.3

## [0.0.3-next.2](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.1...auditable-item-graph-rest-client-v0.0.3-next.2) (2026-01-14)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.1 to 0.0.3-next.2

## [0.0.3-next.1](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.3-next.0...auditable-item-graph-rest-client-v0.0.3-next.1) (2025-11-28)


### Features

* add context id features ([#30](https://github.com/iotaledger/twin-auditable-item-graph/issues/30)) ([a35d37c](https://github.com/iotaledger/twin-auditable-item-graph/commit/a35d37c0db62a240adde493965c0a9f7971fec45))
* add unique flag for alias, and exact match option for id query ([33dbd19](https://github.com/iotaledger/twin-auditable-item-graph/commit/33dbd19cabd9fbfaba81032f1d1a6527584c3f5a))
* add validate-locales ([e76e6f6](https://github.com/iotaledger/twin-auditable-item-graph/commit/e76e6f6b3ec9c447a04315d353442e32233601d3))
* eslint migration to flat config ([1b42a3a](https://github.com/iotaledger/twin-auditable-item-graph/commit/1b42a3a27bd6e32d7816de406b92b6332472edf6))
* id optional in edge updates ([6b63fe3](https://github.com/iotaledger/twin-auditable-item-graph/commit/6b63fe34553104843ae15aa5066775f5872859e9))
* rest client expose remove verifiable ([a22a743](https://github.com/iotaledger/twin-auditable-item-graph/commit/a22a743ddc39377630ea0a51ca3f6e97890832c9))
* update background task service ([e483ddb](https://github.com/iotaledger/twin-auditable-item-graph/commit/e483ddbc948f035334f92b8342248caa6abbe441))
* update dependencies ([6986689](https://github.com/iotaledger/twin-auditable-item-graph/commit/698668957a1fcb7f85ce2f117914d5980043924f))
* update edges to use targetId instead of id ([6c5d0e3](https://github.com/iotaledger/twin-auditable-item-graph/commit/6c5d0e31b6e2ea74bfa2f3344e4be628e5f237af))
* update framework core ([88ad4e6](https://github.com/iotaledger/twin-auditable-item-graph/commit/88ad4e6421132c3c6c45579b078d982a26f16990))
* use new nameof operators ([3921c4c](https://github.com/iotaledger/twin-auditable-item-graph/commit/3921c4c9ac53e42459e45f10d9e702afb2797a23))
* use shared store mechanism ([#10](https://github.com/iotaledger/twin-auditable-item-graph/issues/10)) ([da035e5](https://github.com/iotaledger/twin-auditable-item-graph/commit/da035e5eb8f157482b4eb2bdbc689c6c0647ff7d))


### Bug Fixes

* only include alias in index if not deleted ([#6](https://github.com/iotaledger/twin-auditable-item-graph/issues/6)) ([5da3c41](https://github.com/iotaledger/twin-auditable-item-graph/commit/5da3c419fafa2afefd34b1c570d103012b888a75))
* query params force coercion ([2dd9afe](https://github.com/iotaledger/twin-auditable-item-graph/commit/2dd9afe9ec37e2a91c110317fe289f7495c187a0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.3-next.0 to 0.0.3-next.1

## [0.0.2-next.8](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.2-next.7...auditable-item-graph-rest-client-v0.0.2-next.8) (2025-10-09)


### Features

* add validate-locales ([e76e6f6](https://github.com/iotaledger/twin-auditable-item-graph/commit/e76e6f6b3ec9c447a04315d353442e32233601d3))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.2-next.7 to 0.0.2-next.8

## [0.0.2-next.7](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.2-next.6...auditable-item-graph-rest-client-v0.0.2-next.7) (2025-09-29)


### Features

* id optional in edge updates ([6b63fe3](https://github.com/iotaledger/twin-auditable-item-graph/commit/6b63fe34553104843ae15aa5066775f5872859e9))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.2-next.6 to 0.0.2-next.7

## [0.0.2-next.6](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.2-next.5...auditable-item-graph-rest-client-v0.0.2-next.6) (2025-09-29)


### Features

* use new nameof operators ([3921c4c](https://github.com/iotaledger/twin-auditable-item-graph/commit/3921c4c9ac53e42459e45f10d9e702afb2797a23))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.2-next.5 to 0.0.2-next.6

## [0.0.2-next.5](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.2-next.4...auditable-item-graph-rest-client-v0.0.2-next.5) (2025-09-26)


### Features

* update edges to use targetId instead of id ([6c5d0e3](https://github.com/iotaledger/twin-auditable-item-graph/commit/6c5d0e31b6e2ea74bfa2f3344e4be628e5f237af))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.2-next.4 to 0.0.2-next.5

## [0.0.2-next.4](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.2-next.3...auditable-item-graph-rest-client-v0.0.2-next.4) (2025-09-24)


### Features

* add unique flag for alias, and exact match option for id query ([33dbd19](https://github.com/iotaledger/twin-auditable-item-graph/commit/33dbd19cabd9fbfaba81032f1d1a6527584c3f5a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.2-next.3 to 0.0.2-next.4

## [0.0.2-next.3](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.2-next.2...auditable-item-graph-rest-client-v0.0.2-next.3) (2025-08-29)


### Features

* eslint migration to flat config ([1b42a3a](https://github.com/iotaledger/twin-auditable-item-graph/commit/1b42a3a27bd6e32d7816de406b92b6332472edf6))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.2-next.2 to 0.0.2-next.3

## [0.0.2-next.2](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.2-next.1...auditable-item-graph-rest-client-v0.0.2-next.2) (2025-08-20)


### Features

* update framework core ([88ad4e6](https://github.com/iotaledger/twin-auditable-item-graph/commit/88ad4e6421132c3c6c45579b078d982a26f16990))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.2-next.1 to 0.0.2-next.2

## [0.0.2-next.1](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.2-next.0...auditable-item-graph-rest-client-v0.0.2-next.1) (2025-07-21)


### Features

* rest client expose remove verifiable ([a22a743](https://github.com/iotaledger/twin-auditable-item-graph/commit/a22a743ddc39377630ea0a51ca3f6e97890832c9))
* update dependencies ([6986689](https://github.com/iotaledger/twin-auditable-item-graph/commit/698668957a1fcb7f85ce2f117914d5980043924f))
* use shared store mechanism ([#10](https://github.com/iotaledger/twin-auditable-item-graph/issues/10)) ([da035e5](https://github.com/iotaledger/twin-auditable-item-graph/commit/da035e5eb8f157482b4eb2bdbc689c6c0647ff7d))


### Bug Fixes

* only include alias in index if not deleted ([#6](https://github.com/iotaledger/twin-auditable-item-graph/issues/6)) ([5da3c41](https://github.com/iotaledger/twin-auditable-item-graph/commit/5da3c419fafa2afefd34b1c570d103012b888a75))
* query params force coercion ([2dd9afe](https://github.com/iotaledger/twin-auditable-item-graph/commit/2dd9afe9ec37e2a91c110317fe289f7495c187a0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.2-next.0 to 0.0.2-next.1

## 0.0.1 (2025-07-09)


### Features

* release to production ([0ce06f7](https://github.com/iotaledger/twin-auditable-item-graph/commit/0ce06f7825aa72d04b7a2ffd8c98cb56290b9d16))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from ^0.0.0 to ^0.0.1

## [0.0.1-next.44](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.1-next.43...auditable-item-graph-rest-client-v0.0.1-next.44) (2025-06-20)


### Bug Fixes

* query params force coercion ([2dd9afe](https://github.com/iotaledger/twin-auditable-item-graph/commit/2dd9afe9ec37e2a91c110317fe289f7495c187a0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.1-next.43 to 0.0.1-next.44

## [0.0.1-next.43](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.1-next.42...auditable-item-graph-rest-client-v0.0.1-next.43) (2025-06-17)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.1-next.42 to 0.0.1-next.43

## [0.0.1-next.42](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.1-next.41...auditable-item-graph-rest-client-v0.0.1-next.42) (2025-06-12)


### Features

* update dependencies ([6986689](https://github.com/iotaledger/twin-auditable-item-graph/commit/698668957a1fcb7f85ce2f117914d5980043924f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.1-next.41 to 0.0.1-next.42

## [0.0.1-next.41](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.1-next.40...auditable-item-graph-rest-client-v0.0.1-next.41) (2025-06-03)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.1-next.40 to 0.0.1-next.41

## [0.0.1-next.40](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.1-next.39...auditable-item-graph-rest-client-v0.0.1-next.40) (2025-05-28)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.1-next.39 to 0.0.1-next.40

## [0.0.1-next.39](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.1-next.38...auditable-item-graph-rest-client-v0.0.1-next.39) (2025-05-08)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.1-next.38 to 0.0.1-next.39

## [0.0.1-next.38](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.1-next.37...auditable-item-graph-rest-client-v0.0.1-next.38) (2025-04-17)


### Features

* use shared store mechanism ([#10](https://github.com/iotaledger/twin-auditable-item-graph/issues/10)) ([da035e5](https://github.com/iotaledger/twin-auditable-item-graph/commit/da035e5eb8f157482b4eb2bdbc689c6c0647ff7d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.1-next.37 to 0.0.1-next.38

## [0.0.1-next.37](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.1-next.36...auditable-item-graph-rest-client-v0.0.1-next.37) (2025-04-11)


### Bug Fixes

* only include alias in index if not deleted ([#6](https://github.com/iotaledger/twin-auditable-item-graph/issues/6)) ([5da3c41](https://github.com/iotaledger/twin-auditable-item-graph/commit/5da3c419fafa2afefd34b1c570d103012b888a75))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.1-next.36 to 0.0.1-next.37

## [0.0.1-next.36](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.1-next.35...auditable-item-graph-rest-client-v0.0.1-next.36) (2025-04-11)


### Bug Fixes

* only include alias in index if not deleted ([#6](https://github.com/iotaledger/twin-auditable-item-graph/issues/6)) ([5da3c41](https://github.com/iotaledger/twin-auditable-item-graph/commit/5da3c419fafa2afefd34b1c570d103012b888a75))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.1-next.35 to 0.0.1-next.36

## [0.0.1-next.35](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.1-next.34...auditable-item-graph-rest-client-v0.0.1-next.35) (2025-04-10)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.1-next.34 to 0.0.1-next.35

## [0.0.1-next.34](https://github.com/iotaledger/twin-auditable-item-graph/compare/auditable-item-graph-rest-client-v0.0.1-next.33...auditable-item-graph-rest-client-v0.0.1-next.34) (2025-03-28)


### Miscellaneous Chores

* **auditable-item-graph-rest-client:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/auditable-item-graph-models bumped from 0.0.1-next.33 to 0.0.1-next.34

## v0.0.1-next.33

- Initial Release
