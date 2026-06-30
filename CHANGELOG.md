# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## 1.1.0 (2026-06-30)


### Features

* add global search functionality in TopNav component ([9788438](https://github.com/eapolancovelmar/msp_client_portal/commit/9788438260abcedd39b3e8fb43561f5cc17c7abb))
* add invoicing management for admin dashboard ([d7f70e2](https://github.com/eapolancovelmar/msp_client_portal/commit/d7f70e2d45f70c2cc042f2978c4890852a331561))
* add multi-plan selection for clients ([a07c6fa](https://github.com/eapolancovelmar/msp_client_portal/commit/a07c6fa7039486f831ffd4bb6446fe20e81d2b5d))
* add notifications feature and preferences ([fc9fb01](https://github.com/eapolancovelmar/msp_client_portal/commit/fc9fb0109ec1038bc1cc26a242d1a63638c1641c))
* add skill for bussines logic helper ([f20d177](https://github.com/eapolancovelmar/msp_client_portal/commit/f20d177ad8b5426ca4935a36589e84277d24bb73))
* add support for attachments ([b4872fe](https://github.com/eapolancovelmar/msp_client_portal/commit/b4872fe7ac762e1e313a5fc33f63fb5c1d96df55))
* add support for last login data in profile page ([77d428d](https://github.com/eapolancovelmar/msp_client_portal/commit/77d428d5bd1b164105c1826b484019f977398740))
* add support for paypal checkout ([0253263](https://github.com/eapolancovelmar/msp_client_portal/commit/0253263c8005598f15819f7dc35f0e04076b9749))
* add support for responses on tickets ([e6b319a](https://github.com/eapolancovelmar/msp_client_portal/commit/e6b319aee3ac0028227b52ced773501cde99ddbf))
* add zustand store for state management ([0e86e0c](https://github.com/eapolancovelmar/msp_client_portal/commit/0e86e0c796d462d74b70fa5d2719000aef87b429))
* agent ticketing assign system ([e9c688b](https://github.com/eapolancovelmar/msp_client_portal/commit/e9c688b5e3722831df4643b110b7a972a0077f77))
* allow change profile picture ([fa823ed](https://github.com/eapolancovelmar/msp_client_portal/commit/fa823eda3456fab13ed6950c2d5d3db1e0ee5023))
* **api:** add catch-all 404 middleware for unknown API routes ([d9e231f](https://github.com/eapolancovelmar/msp_client_portal/commit/d9e231ff8ba9b94c9400390d431f39bbfdde5d0e))
* **db:** ensure at least one admin is created on database migration ([09046f7](https://github.com/eapolancovelmar/msp_client_portal/commit/09046f73fe0017b7bf70375cc07d2bae9da2d953))
* deploy in docker vps ([2dd5d9b](https://github.com/eapolancovelmar/msp_client_portal/commit/2dd5d9b573e93e187a5ed39e00e8a22add9f1db9))
* **errors:** integrate @shared/errors across server and client with unified adapters and tests ([ef3175e](https://github.com/eapolancovelmar/msp_client_portal/commit/ef3175eef54a51057e210c775d089c3aec5c5dd0))
* implement comprehensive subscription management system for plans, billing, and user access control ([9791175](https://github.com/eapolancovelmar/msp_client_portal/commit/9791175bc5af6bf20bf23e10e03b9b4d29de77f0))
* implement subscription quotation mailing for client-side in plans interface ([5b3f77a](https://github.com/eapolancovelmar/msp_client_portal/commit/5b3f77a08b15234319f5d6384e9167fa9bd915dc))
* implement user profile password change functionality, and associated API endpoints ([30cad98](https://github.com/eapolancovelmar/msp_client_portal/commit/30cad985e28072e1630bc9a594bdb362bd2f61c6))
* integrate Google OAuth protocol for sign up/sign in. ([9dfdc0f](https://github.com/eapolancovelmar/msp_client_portal/commit/9dfdc0f6371c417a8d83d67a8a350f577f37b9d0))
* introduce drizzle orm to the app ([5eb13db](https://github.com/eapolancovelmar/msp_client_portal/commit/5eb13db20b0716151bad7607e071e9ae718f8c77))
* introduce multi-tenantcy in the whole app ([0b698df](https://github.com/eapolancovelmar/msp_client_portal/commit/0b698df9e5e0f427c14a81ce7c21e051d0cf8152))
* NextCloud api connection established ([7418894](https://github.com/eapolancovelmar/msp_client_portal/commit/74188944ba6761189d0b11b269fe575f3f9ba216))
* nextcloud provisioning successfully connected and verified ([8398e51](https://github.com/eapolancovelmar/msp_client_portal/commit/8398e515645f50f1d2513bf94aedab8ad1191bf3))
* **plans:** add paypal checkout integration and sliding checkout sheet ([b9ebfe2](https://github.com/eapolancovelmar/msp_client_portal/commit/b9ebfe2fa71d12c3f34b6c451daabb13e99c9d5d))
* unified, centralized error-handling system inside the monorepo workspace ([d1dc90e](https://github.com/eapolancovelmar/msp_client_portal/commit/d1dc90e0ad273c5311469a0b86b6ff065b6bb9f4))


### Bug Fixes

* **client:** resolve client typescript compilation errors and exclude tests from tsc build ([890d65f](https://github.com/eapolancovelmar/msp_client_portal/commit/890d65fa72d08f40a8ba9fc763fdc0da552cf8c3))
* db migration faults ([edca7f0](https://github.com/eapolancovelmar/msp_client_portal/commit/edca7f0a4621cb6d9cbf2d0c540ef21abd8cab98))
* **deploy:** add legacy-peer-deps to dockerfiles to resolve eresolve ([08e2c4c](https://github.com/eapolancovelmar/msp_client_portal/commit/08e2c4c0ae4c67e82db18db7498e2da87b1a6a19))
* **deploy:** explicitly install tailwind oxide gnu binary in client dockerfile ([c67eec6](https://github.com/eapolancovelmar/msp_client_portal/commit/c67eec628cb46558dfabccbdabf3ef13b28397ad))
* **deploy:** explicitly install zod in server production stage to resolve workspaces bug ([005ab55](https://github.com/eapolancovelmar/msp_client_portal/commit/005ab550292278199a6e8dad731afae775cbc06e))
* **deploy:** omit package-lock.json in builder stage to force dynamic binary resolution ([e7353e1](https://github.com/eapolancovelmar/msp_client_portal/commit/e7353e1432c19c4c13732ed1520338c888da07c3))
* **deploy:** restore package-lock.json and explicitly install lightningcss gnu binary ([780730c](https://github.com/eapolancovelmar/msp_client_portal/commit/780730c9a022b5cf1c03bb37bc658418e270f3ac))
* **deploy:** switch to node:22-slim base image to resolve lightningcss musl resolution error ([3dcf62a](https://github.com/eapolancovelmar/msp_client_portal/commit/3dcf62ac5e9ca402dda4a181991642daf37c9f79))
* **deploy:** use npm install in builder stage to fetch cross-platform binaries ([9c8ba61](https://github.com/eapolancovelmar/msp_client_portal/commit/9c8ba6129719ee792aaa3c9532d76211bab42c47))
* **deploy:** use npm install in server production stage to hoist peer dependencies ([7b494db](https://github.com/eapolancovelmar/msp_client_portal/commit/7b494db90512477fdce0fc27d811ec36ad286d48))
* email settings ([ee44654](https://github.com/eapolancovelmar/msp_client_portal/commit/ee44654ae1076859c69cf8f47032f9a6fde73387))
* ITBIS for quotation ([584d1a0](https://github.com/eapolancovelmar/msp_client_portal/commit/584d1a062158b483d37d8a76fa6ae41280fd1438))
* npm error on build the images ([5e2e04c](https://github.com/eapolancovelmar/msp_client_portal/commit/5e2e04c5255c4b1e76608738182c4625ad6167ab))
* Shadcn installation fixed ([af0286b](https://github.com/eapolancovelmar/msp_client_portal/commit/af0286b08e7bb578f46ea65a675974a903e73cba))
* Uncaught SyntaxError: The requested module does not provide an export named 'ClientError' ([d2f75b9](https://github.com/eapolancovelmar/msp_client_portal/commit/d2f75b9a78686e4a4c900a4335730f5e6d3014d4))
